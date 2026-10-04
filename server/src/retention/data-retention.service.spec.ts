import { DataRetentionService } from './data-retention.service';

// PIA R-9：注销后保留期到期 → 物理删除健康数据 + 匿名化账号（保留账务外键与 AuditLog）
describe('DataRetentionService', () => {
  let prisma: any;
  let svc: DataRetentionService;
  const saved = process.env.DATA_RETENTION_DAYS;

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}) },
      shareLink: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      report: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      diagnosis: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      medication: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      upload: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      familyMember: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      auditLog: { deleteMany: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn((ops: any[]) => Promise.resolve(ops)),
    };
    svc = new DataRetentionService(prisma);
    delete process.env.DATA_RETENTION_DAYS;
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.DATA_RETENTION_DAYS;
    else process.env.DATA_RETENTION_DAYS = saved;
  });

  it('getRetentionDays：缺省 15、读取合法 env、非法值回退默认', () => {
    expect(svc.getRetentionDays()).toBe(15);
    process.env.DATA_RETENTION_DAYS = '7';
    expect(svc.getRetentionDays()).toBe(7);
    process.env.DATA_RETENTION_DAYS = 'abc';
    expect(svc.getRetentionDays()).toBe(15);
  });

  it('computeCutoff：now 减去保留期天数', () => {
    process.env.DATA_RETENTION_DAYS = '10';
    const now = new Date('2026-10-04T00:00:00Z');
    const cutoff = svc.computeCutoff(now);
    expect(cutoff.getTime()).toBe(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  });

  it('purgeExpiredDeletions：按 status=DELETED + deletedAt<=cutoff 查询，事务内删健康数据+匿名化账号，且不动 AuditLog', async () => {
    process.env.DATA_RETENTION_DAYS = '15';
    const now = new Date('2026-10-04T00:00:00Z');
    const cutoff = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', phone: '13800001234' }]);

    const res = await svc.purgeExpiredDeletions(now);

    // 查询条件：仅注销且已过保留期
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { status: 'DELETED', deletedAt: { lte: cutoff } },
      select: { id: true, phone: true },
    });

    // 各健康数据表按 userId 物理删除（含无外键的 shareLink）
    for (const model of ['shareLink', 'report', 'diagnosis', 'medication', 'upload', 'familyMember']) {
      expect(prisma[model].deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    }

    // 账号匿名化：手机号墓碑 + 清空全部 PII，保留行（不删 user，保账务外键）
    const updateArg = prisma.user.update.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: 'u1' });
    expect(updateArg.data).toMatchObject({
      phone: 'deleted_u1',
      password: null,
      nickname: null,
      gender: null,
      birthDate: null,
      height: null,
      weight: null,
      allergyHistory: null,
      medicalHistory: null,
      wxOpenId: null,
      wxUnionId: null,
    });
    expect(prisma.user.delete).toBeUndefined(); // 从不物理删除 User 行

    // AuditLog 必须保留（等保留存）
    expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    expect(prisma.auditLog.delete).not.toHaveBeenCalled();

    // 单次事务提交
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res).toEqual({ purged: 1, cutoff });
  });

  it('purgeExpiredDeletions：跳过已匿名化账号（phone 墓碑前缀），保证幂等', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u2', phone: 'deleted_u2' }]);
    const res = await svc.purgeExpiredDeletions(new Date('2026-10-04T00:00:00Z'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(res.purged).toBe(0);
  });

  it('purgeExpiredDeletions：无到期账号时不发起事务', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    const res = await svc.purgeExpiredDeletions(new Date('2026-10-04T00:00:00Z'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(res.purged).toBe(0);
  });

  it('handleCron：异常被吞并告警，绝不抛出（等待下次调度）', async () => {
    prisma.user.findMany.mockRejectedValue(new Error('db down'));
    await expect(svc.handleCron()).resolves.toBeUndefined();
  });
});
