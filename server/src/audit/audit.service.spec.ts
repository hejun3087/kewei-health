import { AuditService } from './audit.service';

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
