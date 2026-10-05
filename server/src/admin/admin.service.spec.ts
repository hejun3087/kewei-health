import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Role } from '../rbac/permissions';

/**
 * AdminService 单测（docs/rbac-design.md P1）：mock Prisma + Audit，聚焦脱敏纪律、
 * 状态/角色校验、软撤销幂等、跨用户分享 active 过滤与强制撤销，及每操作必落 ADMIN 审计。
 */
describe('AdminService（P1 用户/角色/分享 + 审计）', () => {
  let prisma: any;
  let audit: { record: jest.Mock };
  let svc: AdminService;

  const req = { user: { userId: 'admin1', roles: [Role.SUPER_ADMIN] }, ip: '1.2.3.4', headers: { 'user-agent': 'jest' } };

  beforeEach(() => {
    prisma = {
      user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      userRole: { findMany: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
      shareLink: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      report: { findMany: jest.fn() },
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    svc = new AdminService(prisma as any, audit as any);
  });

  it('listUsers：手机号 mask + 分页上限 clamp + 落 ADMIN 审计', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', phone: '13800008888', nickname: '张三', avatar: null, gender: 'MALE', status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() },
    ]);
    const res = await svc.listUsers(req, { keyword: '138', page: '0', pageSize: '999' });
    expect(res.total).toBe(1);
    expect(res.pageSize).toBe(100); // clamp 上限
    expect(res.page).toBe(1);
    expect(res.items[0].phone).toBe('138****8888');
    expect(res.items[0]).not.toHaveProperty('password');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'ADMIN_USERS_LIST', resourceType: 'ADMIN' }));
  });

  it('getUser：不存在 → 404；命中附带活跃角色', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(svc.getUser(req, 'x')).rejects.toThrow(NotFoundException);

    prisma.user.findUnique.mockResolvedValue({ id: 'u1', phone: '13800008888', nickname: null, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() });
    prisma.userRole.findMany.mockResolvedValue([{ role: 'AUDITOR' }, { role: 'OPERATOR' }]);
    const u = await svc.getUser(req, 'u1');
    expect(u.roles).toEqual(['AUDITOR', 'OPERATOR']);
    expect(u.phone).toBe('138****8888');
  });

  it('setUserStatus：非法状态 → 400；DELETED → 400；正常更新并审计 USER_DISABLE', async () => {
    await expect(svc.setUserStatus(req, 'u1', 'FOO')).rejects.toThrow(BadRequestException);

    prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'DELETED' });
    await expect(svc.setUserStatus(req, 'u1', 'DISABLED')).rejects.toThrow(BadRequestException);

    prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVE' });
    prisma.user.update.mockResolvedValue({ id: 'u1', phone: '13800008888', status: 'DISABLED', createdAt: new Date(), updatedAt: new Date() });
    const out = await svc.setUserStatus(req, 'u1', 'DISABLED', '风控');
    expect(out.status).toBe('DISABLED');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'USER_DISABLE', meta: expect.objectContaining({ to: 'DISABLED', reason: '风控' }) }));
  });

  it('grantRole：无效角色 → 400；先软撤销旧活跃行再新建 + 审计 ROLE_GRANT', async () => {
    await expect(svc.grantRole(req, 'u1', 'NOT_A_ROLE')).rejects.toThrow(BadRequestException);

    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.userRole.updateMany.mockResolvedValue({ count: 1 });
    prisma.userRole.create.mockResolvedValue({ id: 'ur1', grantedAt: new Date() });
    const out = await svc.grantRole(req, 'u1', 'AUDITOR', '合规');
    expect(prisma.userRole.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1', role: 'AUDITOR', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(prisma.userRole.create).toHaveBeenCalledWith({ data: { userId: 'u1', role: 'AUDITOR', grantedBy: 'admin1' } });
    expect(out.role).toBe('AUDITOR');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'ROLE_GRANT', meta: expect.objectContaining({ targetUserId: 'u1' }) }));
  });

  it('grantRole：目标用户不存在 → 404', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(svc.grantRole(req, 'ghost', 'AUDITOR')).rejects.toThrow(NotFoundException);
  });

  it('revokeRole：软撤销活跃行，无匹配时 success=false 仍审计', async () => {
    prisma.userRole.updateMany.mockResolvedValue({ count: 0 });
    const out = await svc.revokeRole(req, 'u1', 'OPERATOR');
    expect(out.revoked).toBe(false);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'ROLE_REVOKE', success: false }));
  });

  it('listShares：active 过滤 + join 报告元数据', async () => {
    const now = Date.now();
    prisma.shareLink.findMany.mockResolvedValue([
      { id: 's1', userId: 'u1', reportId: 'r1', expiresAt: new Date(now + 86400000), revokedAt: null, viewCount: 3, lastViewedAt: null, createdAt: new Date() },
      { id: 's2', userId: 'u2', reportId: 'r2', expiresAt: new Date(now - 86400000), revokedAt: null, viewCount: 0, lastViewedAt: null, createdAt: new Date() },
    ]);
    prisma.report.findMany.mockResolvedValue([{ id: 'r1', hospital: 'H1', reportType: 'LAB', reportDate: new Date() }]);
    const res = await svc.listShares(req, { active: 'true' });
    expect(res.total).toBe(1); // 仅 s1 active
    expect(res.items[0].shareId).toBe('s1');
    expect(res.items[0].report).toEqual(expect.objectContaining({ hospital: 'H1' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'ADMIN_SHARES_LIST', resourceType: 'ADMIN' }));
  });

  it('revokeShare：不存在 → 404；已撤销幂等返回；正常置 revokedAt + 审计 SHARE_REVOKE_ANY', async () => {
    prisma.shareLink.findUnique.mockResolvedValue(null);
    await expect(svc.revokeShare(req, 'ghost')).rejects.toThrow(NotFoundException);

    prisma.shareLink.findUnique.mockResolvedValue({ id: 's1', userId: 'u1', revokedAt: new Date() });
    const idem = await svc.revokeShare(req, 's1');
    expect(idem.revoked).toBe(true);
    expect(prisma.shareLink.update).not.toHaveBeenCalled();

    prisma.shareLink.findUnique.mockResolvedValue({ id: 's2', userId: 'u2', revokedAt: null });
    prisma.shareLink.update.mockResolvedValue({ id: 's2', revokedAt: new Date() });
    const out = await svc.revokeShare(req, 's2', '涉不良内容');
    expect(out.revoked).toBe(true);
    expect(prisma.shareLink.update).toHaveBeenCalledWith({ where: { id: 's2' }, data: { revokedAt: expect.any(Date) } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'SHARE_REVOKE_ANY', meta: expect.objectContaining({ targetUserId: 'u2', reason: '涉不良内容' }) }));
  });
});
