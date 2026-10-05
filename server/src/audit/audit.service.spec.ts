import { AuditService, maskIdentity } from './audit.service';

describe('AuditService.record', () => {
  let prisma: any;
  let svc: AuditService;

  beforeEach(() => {
    prisma = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'a1' }) } };
    svc = new AuditService(prisma);
  });

  it('正常写入：各字段透传到 prisma.auditLog.create', async () => {
    await svc.record({
      userId: 'u1',
      action: 'READ',
      resourceType: 'REPORT',
      resourceId: 'r1',
      ip: '1.2.3.4',
      userAgent: 'UA',
      success: true,
      meta: { n: 3 },
    });
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: 'u1',
      action: 'READ',
      resourceType: 'REPORT',
      resourceId: 'r1',
      ip: '1.2.3.4',
      userAgent: 'UA',
      success: true,
      meta: { n: 3 },
    });
  });

  it('缺省字段归一：空值转 null、success 默认 true、meta 空转 undefined', async () => {
    await svc.record({ action: 'CREATE', resourceType: 'UPLOAD' });
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.userId).toBeNull();
    expect(data.resourceId).toBeNull();
    expect(data.success).toBe(true);
    expect(data.meta).toBeUndefined();
  });

  it('DB 异常被吞掉并告警，不阻断主业务链路（不抛出）', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('db down'));
    await expect(
      svc.record({ action: 'READ', resourceType: 'REPORT' }),
    ).resolves.toBeUndefined();
  });
});

describe('maskIdentity', () => {
  it('手机号保留前 3 + 后 4，中间脱敏', () => {
    expect(maskIdentity('13800001234')).toBe('138****1234');
  });
  it('非纯数字（如 openId）仅保留前 4 位指纹', () => {
    expect(maskIdentity('oABCDEFGH12345')).toBe('oABC****');
  });
  it('空值/undefined 返回 null', () => {
    expect(maskIdentity(null)).toBeNull();
    expect(maskIdentity('')).toBeNull();
    expect(maskIdentity(undefined)).toBeNull();
  });
});

describe('AuditService.recordLogin', () => {
  let prisma: any;
  let svc: AuditService;

  beforeEach(() => {
    prisma = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'a1' }) } };
    svc = new AuditService(prisma);
  });

  it('成功：action=LOGIN/resourceType=AUTH，携带 userId，meta 仅含 method', async () => {
    await svc.recordLogin({
      ip: '1.2.3.4',
      userAgent: 'UA',
      method: 'password',
      success: true,
      userId: 'u1',
      identity: '13800001234', // 成功时不应记录 identity
    });
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: 'u1',
      action: 'LOGIN',
      resourceType: 'AUTH',
      ip: '1.2.3.4',
      userAgent: 'UA',
      success: true,
      meta: { method: 'password' },
    });
    expect(data.meta.identity).toBeUndefined();
  });

  it('失败：userId 为空，meta 含脱敏 identity 与 status', async () => {
    await svc.recordLogin({
      ip: '5.6.7.8',
      method: 'password',
      success: false,
      identity: '13800001234',
      status: 401,
    });
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.userId).toBeNull();
    expect(data.success).toBe(false);
    expect(data.meta).toEqual({ method: 'password', identity: '138****1234', status: 401 });
  });
});

describe('AuditService.queryOwn', () => {
  let prisma: any;
  let svc: AuditService;

  beforeEach(() => {
    prisma = {
      auditLog: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    svc = new AuditService(prisma);
  });

  it('强制以 userId 为过滤条件（仅能查本人）', async () => {
    await svc.queryOwn('u1', {});
    expect(prisma.auditLog.findMany.mock.calls[0][0].where.userId).toBe('u1');
    expect(prisma.auditLog.count.mock.calls[0][0].where.userId).toBe('u1');
  });

  it('过滤映射：action/resourceType/success(字符串)→布尔', async () => {
    await svc.queryOwn('u1', { action: 'LOGIN', resourceType: 'AUTH', success: 'false' });
    const where = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ userId: 'u1', action: 'LOGIN', resourceType: 'AUTH', success: false });
  });

  it('时间范围：合法日期转 gte/lte，非法日期忽略', async () => {
    await svc.queryOwn('u1', { from: '2026-01-01', to: 'not-a-date' });
    const range = prisma.auditLog.findMany.mock.calls[0][0].where.createdAt;
    expect(range.gte).toBeInstanceOf(Date);
    expect(range.lte).toBeUndefined();
  });

  it('分页：默认 page=1/pageSize=20，pageSize 上限 100，skip 正确', async () => {
    await svc.queryOwn('u1', { page: '3', pageSize: '500' });
    const arg = prisma.auditLog.findMany.mock.calls[0][0];
    expect(arg.take).toBe(100);
    expect(arg.skip).toBe(200); // (3-1)*100
  });

  it('返回结构：{ total, items, page, pageSize }', async () => {
    prisma.auditLog.count.mockResolvedValue(7);
    prisma.auditLog.findMany.mockResolvedValue([{ id: 'x' }]);
    const res = await svc.queryOwn('u1', { page: 2, pageSize: 10 });
    expect(res).toEqual({ total: 7, items: [{ id: 'x' }], page: 2, pageSize: 10 });
  });

  it('按 createdAt 倒序', async () => {
    await svc.queryOwn('u1', {});
    expect(prisma.auditLog.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
  });
});

describe('AuditService.queryAll（RBAC P0 管理端跨用户查询）', () => {
  let prisma: any;
  let svc: AuditService;

  beforeEach(() => {
    prisma = {
      auditLog: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    svc = new AuditService(prisma);
  });

  it('无 userId 时 where 不包含 userId（不强制本人，全量可查）', async () => {
    await svc.queryAll({});
    const where = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(where.userId).toBeUndefined();
    expect(where).toEqual({});
  });

  it('可选 userId 过滤：传入即写进 where（定位单一主体）', async () => {
    await svc.queryAll({ userId: 'u42', action: 'EXPORT' });
    const where = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ userId: 'u42', action: 'EXPORT' });
  });

  it('RBAC P2：action 逗号分隔多值 → where.action = { in: [...] }，去空且去重后仍保持顺序', async () => {
    await svc.queryAll({ action: 'ROLE_GRANT, ROLE_REVOKE,ROLE_GRANT ' });
    const where = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(where.action).toEqual({ in: ['ROLE_GRANT', 'ROLE_REVOKE', 'ROLE_GRANT'] });
  });

  it('RBAC P2：action 单值保持旧行为（直接赋值，不套 in）', async () => {
    await svc.queryAll({ action: 'STEPUP' });
    const where = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(where.action).toBe('STEPUP');
  });

  it('分页与上限：pageSize>100 截断为 100，skip 与 queryOwn 同构', async () => {
    await svc.queryAll({ page: '2', pageSize: '500' });
    const arg = prisma.auditLog.findMany.mock.calls[0][0];
    expect(arg.take).toBe(100);
    expect(arg.skip).toBe(100);
  });

  it('时间范围与 success 归一与 queryOwn 一致', async () => {
    await svc.queryAll({ success: 'true', from: '2026-01-01', to: '2026-12-31' });
    const where = prisma.auditLog.findMany.mock.calls[0][0].where;
    expect(where.success).toBe(true);
    expect(where.createdAt.gte).toBeInstanceOf(Date);
    expect(where.createdAt.lte).toBeInstanceOf(Date);
  });

  it('返回结构：{ total, items, page, pageSize }', async () => {
    prisma.auditLog.count.mockResolvedValue(128);
    prisma.auditLog.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const res = await svc.queryAll({ page: 3, pageSize: 20 });
    expect(res).toEqual({ total: 128, items: [{ id: 'a' }, { id: 'b' }], page: 3, pageSize: 20 });
  });
});
