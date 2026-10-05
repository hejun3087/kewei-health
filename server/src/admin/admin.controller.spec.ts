import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RbacModule } from '../rbac/rbac.module';
import { PERMISSIONS_KEY, ROLES_KEY } from '../rbac/roles.decorator';
import { Permission, Role } from '../rbac/permissions';

/**
 * AdminController 集成测试（docs/rbac-design.md P0 + P1）：
 * - 走完整守卫链：mock JwtAuthGuard 注入指定 user（含 roles）+ 真实 RolesGuard；
 * - AuditService/AdminService 提供 spy，返回固定对象，仅验证授权链与路由映射，不测 Service 内部逻辑（见 admin.service.spec）；
 * - 覆盖：各端点角色/权限白名单命中与未命中、SUPER_ADMIN 专属写操作、跨用户读、未登录 401。
 */
describe('AdminController 集成（守卫链 + P0/P1 端点）', () => {
  let app: INestApplication;
  let auditService: { queryAll: jest.Mock };
  let adminService: {
    listUsers: jest.Mock;
    getUser: jest.Mock;
    setUserStatus: jest.Mock;
    grantRole: jest.Mock;
    revokeRole: jest.Mock;
    listShares: jest.Mock;
    revokeShare: jest.Mock;
  };
  let injectedUser: any;

  class MockJwtAuthGuard extends JwtAuthGuard {
    canActivate(ctx: any) {
      if (!injectedUser) {
        const { UnauthorizedException } = require('@nestjs/common');
        throw new UnauthorizedException('未登录');
      }
      ctx.switchToHttp().getRequest().user = injectedUser;
      return true;
    }
  }

  beforeEach(async () => {
    injectedUser = null;
    auditService = { queryAll: jest.fn().mockResolvedValue({ total: 0, items: [], page: 1, pageSize: 20 }) };
    adminService = {
      listUsers: jest.fn().mockResolvedValue({ total: 0, items: [], page: 1, pageSize: 20 }),
      getUser: jest.fn().mockResolvedValue({ id: 'u1', roles: [] }),
      setUserStatus: jest.fn().mockResolvedValue({ id: 'u1', status: 'DISABLED' }),
      grantRole: jest.fn().mockResolvedValue({ userId: 'u1', role: 'AUDITOR' }),
      revokeRole: jest.fn().mockResolvedValue({ userId: 'u1', role: 'AUDITOR', revoked: true }),
      listShares: jest.fn().mockResolvedValue({ total: 0, items: [], page: 1, pageSize: 20 }),
      revokeShare: jest.fn().mockResolvedValue({ shareId: 's1', revoked: true }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [RbacModule],
      controllers: [AdminController],
      providers: [
        { provide: AuditService, useValue: auditService },
        { provide: AdminService, useValue: adminService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const meta = (handler: any) => ({
    roles: Reflect.getMetadata(ROLES_KEY, handler) as Role[],
    perms: Reflect.getMetadata(PERMISSIONS_KEY, handler) as Permission[],
  });

  // -------- 元数据：装饰器挂载正确（防遗漏） --------

  it('元数据：各端点 @Roles/@Permissions 符合矩阵设计', () => {
    expect(meta(AdminController.prototype.getAllAudit)).toEqual({
      roles: [Role.SUPER_ADMIN, Role.AUDITOR],
      perms: [Permission.AUDIT_READ_ALL],
    });
    expect(meta(AdminController.prototype.listUsers).roles).toEqual([Role.SUPER_ADMIN, Role.OPERATOR, Role.AUDITOR]);
    expect(meta(AdminController.prototype.listUsers).perms).toEqual([Permission.USER_READ]);
    expect(meta(AdminController.prototype.setUserStatus)).toEqual({
      roles: [Role.SUPER_ADMIN],
      perms: [Permission.USER_DISABLE],
    });
    expect(meta(AdminController.prototype.grantRole).perms).toEqual([Permission.ROLE_GRANT]);
    expect(meta(AdminController.prototype.revokeRole).perms).toEqual([Permission.ROLE_REVOKE]);
    expect(meta(AdminController.prototype.listShares).perms).toEqual([Permission.SHARE_READ_ALL]);
    expect(meta(AdminController.prototype.revokeShare)).toEqual({
      roles: [Role.SUPER_ADMIN],
      perms: [Permission.SHARE_REVOKE_ALL],
    });
  });

  // -------- P0 审计 --------

  it('GET /admin/audit：SUPER_ADMIN → 200 透传 queryAll', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer()).get('/admin/audit').query({ action: 'EXPORT' }).expect(200);
    expect(auditService.queryAll).toHaveBeenCalledWith(expect.objectContaining({ action: 'EXPORT' }));
  });

  it('GET /admin/audit：SUPPORT → 403', async () => {
    injectedUser = { userId: 'sup1', roles: [Role.SUPPORT] };
    await request(app.getHttpServer()).get('/admin/audit').expect(403);
  });

  // -------- P1 用户读（SUPER_ADMIN/OPERATOR/AUDITOR 均可，SUPPORT 拒） --------

  it('GET /admin/users：OPERATOR → 200（含 USER_READ）', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).get('/admin/users').query({ keyword: '138' }).expect(200);
    expect(adminService.listUsers).toHaveBeenCalled();
  });

  it('GET /admin/users：AUDITOR → 200', async () => {
    injectedUser = { userId: 'aud1', roles: [Role.AUDITOR] };
    await request(app.getHttpServer()).get('/admin/users/u1').expect(200);
    expect(adminService.getUser).toHaveBeenCalledWith(expect.anything(), 'u1');
  });

  it('GET /admin/users：SUPPORT → 403（无 USER_READ，PIPL 边界）', async () => {
    injectedUser = { userId: 'sup1', roles: [Role.SUPPORT] };
    await request(app.getHttpServer()).get('/admin/users').expect(403);
    expect(adminService.listUsers).not.toHaveBeenCalled();
  });

  // -------- P1 启停 / 角色（仅 SUPER_ADMIN） --------

  it('PATCH /admin/users/:id/status：SUPER_ADMIN → 200', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer())
      .patch('/admin/users/u1/status')
      .send({ status: 'DISABLED', reason: '风控' })
      .expect(200);
    expect(adminService.setUserStatus).toHaveBeenCalledWith(expect.anything(), 'u1', 'DISABLED', '风控');
  });

  it('PATCH /admin/users/:id/status：OPERATOR → 403（无 USER_DISABLE）', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).patch('/admin/users/u1/status').send({ status: 'DISABLED' }).expect(403);
    expect(adminService.setUserStatus).not.toHaveBeenCalled();
  });

  it('POST /admin/users/:id/roles：SUPER_ADMIN → 201', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer())
      .post('/admin/users/u1/roles')
      .send({ role: 'AUDITOR', reason: '合规审计' })
      .expect(201);
    expect(adminService.grantRole).toHaveBeenCalledWith(expect.anything(), 'u1', 'AUDITOR', '合规审计');
  });

  it('POST /admin/users/:id/roles：AUDITOR → 403（授撤角色仅 SUPER_ADMIN）', async () => {
    injectedUser = { userId: 'aud1', roles: [Role.AUDITOR] };
    await request(app.getHttpServer()).post('/admin/users/u1/roles').send({ role: 'OPERATOR' }).expect(403);
    expect(adminService.grantRole).not.toHaveBeenCalled();
  });

  it('DELETE /admin/users/:id/roles/:role：SUPER_ADMIN → 200', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer()).delete('/admin/users/u1/roles/AUDITOR').expect(200);
    expect(adminService.revokeRole).toHaveBeenCalledWith(expect.anything(), 'u1', 'AUDITOR', undefined);
  });

  // -------- P1 跨用户分享（解锁 R-6） --------

  it('GET /admin/shares：OPERATOR → 200（含 SHARE_READ_ALL）', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).get('/admin/shares').expect(200);
    expect(adminService.listShares).toHaveBeenCalled();
  });

  it('DELETE /admin/shares/:id：SUPER_ADMIN → 200', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer()).delete('/admin/shares/s1').expect(200);
    expect(adminService.revokeShare).toHaveBeenCalledWith(expect.anything(), 's1', undefined);
  });

  it('DELETE /admin/shares/:id：OPERATOR → 403（强撤仅 SUPER_ADMIN）', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).delete('/admin/shares/s1').expect(403);
    expect(adminService.revokeShare).not.toHaveBeenCalled();
  });

  // -------- 未登录 --------

  it('普通用户 roles=[] → 403；未鉴权 → 401', async () => {
    injectedUser = { userId: 'u1', roles: [] };
    await request(app.getHttpServer()).get('/admin/users').expect(403);
    injectedUser = null;
    await request(app.getHttpServer()).get('/admin/shares').expect(401);
  });

  it('矩阵不变量：授撤角色/强撤分享权限仅 SUPER_ADMIN 持有', () => {
    const { permissionsOf } = require('../rbac/permissions');
    for (const role of [Role.OPERATOR, Role.SUPPORT, Role.AUDITOR]) {
      const p = permissionsOf([role]);
      expect(p.has(Permission.ROLE_GRANT)).toBe(false);
      expect(p.has(Permission.ROLE_REVOKE)).toBe(false);
      expect(p.has(Permission.SHARE_REVOKE_ALL)).toBe(false);
      expect(p.has(Permission.USER_DISABLE)).toBe(false);
    }
    const sup = permissionsOf([Role.SUPER_ADMIN]);
    expect(sup.has(Permission.ROLE_GRANT)).toBe(true);
    expect(sup.has(Permission.SHARE_REVOKE_ALL)).toBe(true);
  });
});
