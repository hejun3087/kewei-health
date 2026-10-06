import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { AuditExportService } from '../audit/audit-export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RbacModule } from '../rbac/rbac.module';
import { PERMISSIONS_KEY, ROLES_KEY, STEPUP_KEY } from '../rbac/roles.decorator';
import { Permission, Role } from '../rbac/permissions';
import { resolveJwtSecret } from '../common/jwt-config';

/**
 * AdminController 集成测试（docs/rbac-design.md P0 + P1）：
 * - 走完整守卫链：mock JwtAuthGuard 注入指定 user（含 roles）+ 真实 RolesGuard；
 * - AuditService/AdminService 提供 spy，返回固定对象，仅验证授权链与路由映射，不测 Service 内部逻辑（见 admin.service.spec）；
 * - 覆盖：各端点角色/权限白名单命中与未命中、SUPER_ADMIN 专属写操作、跨用户读、未登录 401。
 */
describe('AdminController 集成（守卫链 + P0/P1/P3 端点）', () => {
  let app: INestApplication;
  let auditService: { queryAll: jest.Mock; record: jest.Mock };
  let auditExportService: { export: jest.Mock };
  let adminService: {
    listUsers: jest.Mock;
    getUser: jest.Mock;
    setUserStatus: jest.Mock;
    grantRole: jest.Mock;
    revokeRole: jest.Mock;
    listShares: jest.Mock;
    revokeShare: jest.Mock;
    listSubscriptions: jest.Mock;
    listOrders: jest.Mock;
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
    auditService = {
      queryAll: jest.fn().mockResolvedValue({ total: 0, items: [], page: 1, pageSize: 20 }),
      record: jest.fn().mockResolvedValue(undefined),
    };
    auditExportService = {
      export: jest.fn().mockResolvedValue({
        buffer: Buffer.from('PK-fake-xlsx-bytes'),
        filename: 'kewei-audit-export-20261006-083000.xlsx',
        count: 3,
        total: 3,
        truncated: false,
        format: 'xlsx',
      }),
    };
    adminService = {
      listUsers: jest.fn().mockResolvedValue({ total: 0, items: [], page: 1, pageSize: 20 }),
      getUser: jest.fn().mockResolvedValue({ id: 'u1', roles: [] }),
      setUserStatus: jest.fn().mockResolvedValue({ id: 'u1', status: 'DISABLED' }),
      grantRole: jest.fn().mockResolvedValue({ userId: 'u1', role: 'AUDITOR' }),
      revokeRole: jest.fn().mockResolvedValue({ userId: 'u1', role: 'AUDITOR', revoked: true }),
      listShares: jest.fn().mockResolvedValue({ total: 0, items: [], page: 1, pageSize: 20 }),
      revokeShare: jest.fn().mockResolvedValue({ shareId: 's1', revoked: true }),
      listSubscriptions: jest.fn().mockResolvedValue({ total: 0, items: [], page: 1, pageSize: 20 }),
      listOrders: jest.fn().mockResolvedValue({ total: 0, items: [], page: 1, pageSize: 20 }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [RbacModule],
      controllers: [AdminController],
      providers: [
        { provide: AuditService, useValue: auditService },
        { provide: AuditExportService, useValue: auditExportService },
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
    stepup: Reflect.getMetadata(STEPUP_KEY, handler) === true,
  });

  // 为 @RequireStepUp 端点签发一个合法 5min step-up token（与 StepUpGuard 同 secret，typ=stepup）
  const signStepup = (userId: string) =>
    new JwtService({ secret: resolveJwtSecret() }).sign({ sub: userId, typ: 'stepup' }, { expiresIn: '5m' });

  // -------- 元数据：装饰器挂载正确（防遗漏） --------

  it('元数据：各端点 @Roles/@Permissions/@RequireStepUp 符合矩阵设计', () => {
    expect(meta(AdminController.prototype.getAllAudit)).toEqual({
      roles: [Role.SUPER_ADMIN, Role.AUDITOR],
      perms: [Permission.AUDIT_READ_ALL],
      stepup: false,
    });
    // RBAC P3：审计导出权限项独立于查询（能查≠能拉走），只读动作无需 step-up
    expect(meta(AdminController.prototype.exportAudit)).toEqual({
      roles: [Role.SUPER_ADMIN, Role.AUDITOR],
      perms: [Permission.AUDIT_EXPORT],
      stepup: false,
    });
    expect(meta(AdminController.prototype.listUsers).roles).toEqual([Role.SUPER_ADMIN, Role.OPERATOR, Role.AUDITOR]);
    expect(meta(AdminController.prototype.listUsers).perms).toEqual([Permission.USER_READ]);
    expect(meta(AdminController.prototype.listUsers).stepup).toBe(false);
    expect(meta(AdminController.prototype.setUserStatus)).toEqual({
      roles: [Role.SUPER_ADMIN],
      perms: [Permission.USER_DISABLE],
      stepup: true,
    });
    expect(meta(AdminController.prototype.grantRole)).toEqual({
      roles: [Role.SUPER_ADMIN],
      perms: [Permission.ROLE_GRANT],
      stepup: true,
    });
    expect(meta(AdminController.prototype.revokeRole).perms).toEqual([Permission.ROLE_REVOKE]);
    expect(meta(AdminController.prototype.revokeRole).stepup).toBe(true);
    expect(meta(AdminController.prototype.listShares).perms).toEqual([Permission.SHARE_READ_ALL]);
    expect(meta(AdminController.prototype.listShares).stepup).toBe(false);
    expect(meta(AdminController.prototype.revokeShare)).toEqual({
      roles: [Role.SUPER_ADMIN],
      perms: [Permission.SHARE_REVOKE_ALL],
      stepup: true,
    });
    // RBAC P3：订阅/订单列表
    expect(meta(AdminController.prototype.listSubscriptions)).toEqual({
      roles: [Role.SUPER_ADMIN, Role.OPERATOR],
      perms: [Permission.SUBSCRIPTION_READ],
      stepup: false,
    });
    expect(meta(AdminController.prototype.listOrders)).toEqual({
      roles: [Role.SUPER_ADMIN, Role.OPERATOR],
      perms: [Permission.ORDER_READ],
      stepup: false,
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

  // -------- P3 审计导出（audit:export，解锁 R-3「审计记录可导出」尾项） --------

  it('GET /admin/audit/export：SUPER_ADMIN → 200 + 下载头（xlsx）', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    const res = await request(app.getHttpServer())
      .get('/admin/audit/export')
      .query({ resourceType: 'ADMIN', action: 'ROLE_GRANT,ROLE_REVOKE' })
      .expect(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('attachment; filename="kewei-audit-export-');
    expect(res.headers['x-audit-export-truncated']).toBe('false');
    expect(auditExportService.export).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: 'ADMIN', action: 'ROLE_GRANT,ROLE_REVOKE' }),
      undefined,
    );
  });

  it('GET /admin/audit/export：format=csv 透传给 Service，响应为 text/csv', async () => {
    injectedUser = { userId: 'aud1', roles: [Role.AUDITOR] };
    auditExportService.export.mockResolvedValueOnce({
      buffer: Buffer.from('\ufeff"时间(UTC)"'),
      filename: 'kewei-audit-export-20261006-083000.csv',
      count: 1,
      total: 1,
      truncated: false,
      format: 'csv',
    });
    const res = await request(app.getHttpServer()).get('/admin/audit/export').query({ format: 'csv' }).expect(200);
    expect(auditExportService.export).toHaveBeenCalledWith(expect.objectContaining({ format: 'csv' }), 'csv');
    expect(res.headers['content-type']).toContain('text/csv');
  });

  it('GET /admin/audit/export：导出动作本身落审计（谁用什么条件拉走全量审计，等保可追溯）', async () => {
    injectedUser = { userId: 'admin1', phone: '138****0000', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer()).get('/admin/audit/export').query({ action: 'EXPORT', page: 2 }).expect(200);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin1',
        action: 'AUDIT_EXPORT',
        resourceType: 'ADMIN',
        success: true,
        meta: expect.objectContaining({
          actorRoles: [Role.SUPER_ADMIN],
          count: 3,
          total: 3,
          truncated: false,
          format: 'xlsx',
          filters: { action: 'EXPORT' },
        }),
      }),
    );
    // 分页/呈现参数不进 filters
    expect(auditService.record.mock.calls[0][0].meta.filters).not.toHaveProperty('page');
  });

  it('GET /admin/audit/export：OPERATOR → 403（无 audit:export，不生成文件）', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).get('/admin/audit/export').expect(403);
    expect(auditExportService.export).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('GET /admin/audit/export：SUPPORT → 403', async () => {
    injectedUser = { userId: 'sup1', roles: [Role.SUPPORT] };
    await request(app.getHttpServer()).get('/admin/audit/export').expect(403);
    expect(auditExportService.export).not.toHaveBeenCalled();
  });

  it('GET /admin/audit/export：未登录 → 401', async () => {
    await request(app.getHttpServer()).get('/admin/audit/export').expect(401);
    expect(auditExportService.export).not.toHaveBeenCalled();
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

  it('PATCH /admin/users/:id/status：SUPER_ADMIN + stepup token → 200', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer())
      .patch('/admin/users/u1/status')
      .set('x-stepup-token', signStepup('admin1'))
      .send({ status: 'DISABLED', reason: '风控' })
      .expect(200);
    expect(adminService.setUserStatus).toHaveBeenCalledWith(expect.anything(), 'u1', 'DISABLED', '风控');
  });

  it('PATCH /admin/users/:id/status：缺 stepup token → 403（RBAC P2）', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer())
      .patch('/admin/users/u1/status')
      .send({ status: 'DISABLED', reason: '风控' })
      .expect(403);
    expect(adminService.setUserStatus).not.toHaveBeenCalled();
  });

  it('PATCH /admin/users/:id/status：stepup token sub 不匹配 → 403（防跨账号复用）', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer())
      .patch('/admin/users/u1/status')
      .set('x-stepup-token', signStepup('attacker'))
      .send({ status: 'DISABLED', reason: 'x' })
      .expect(403);
    expect(adminService.setUserStatus).not.toHaveBeenCalled();
  });

  it('PATCH /admin/users/:id/status：登录 token 冒充 stepup（typ 不为 stepup）→ 403', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    const fakeToken = new JwtService({ secret: resolveJwtSecret() }).sign({ sub: 'admin1', roles: ['SUPER_ADMIN'] });
    await request(app.getHttpServer())
      .patch('/admin/users/u1/status')
      .set('x-stepup-token', fakeToken)
      .send({ status: 'DISABLED', reason: 'x' })
      .expect(403);
    expect(adminService.setUserStatus).not.toHaveBeenCalled();
  });

  it('PATCH /admin/users/:id/status：OPERATOR → 403（无 USER_DISABLE）', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).patch('/admin/users/u1/status').send({ status: 'DISABLED' }).expect(403);
    expect(adminService.setUserStatus).not.toHaveBeenCalled();
  });

  it('POST /admin/users/:id/roles：SUPER_ADMIN + stepup → 201', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer())
      .post('/admin/users/u1/roles')
      .set('x-stepup-token', signStepup('admin1'))
      .send({ role: 'AUDITOR', reason: '合规审计' })
      .expect(201);
    expect(adminService.grantRole).toHaveBeenCalledWith(expect.anything(), 'u1', 'AUDITOR', '合规审计');
  });

  it('POST /admin/users/:id/roles：SUPER_ADMIN 但缺 stepup → 403（RBAC P2）', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer())
      .post('/admin/users/u1/roles')
      .send({ role: 'AUDITOR', reason: 'x' })
      .expect(403);
    expect(adminService.grantRole).not.toHaveBeenCalled();
  });

  it('POST /admin/users/:id/roles：AUDITOR → 403（授撤角色仅 SUPER_ADMIN）', async () => {
    injectedUser = { userId: 'aud1', roles: [Role.AUDITOR] };
    await request(app.getHttpServer()).post('/admin/users/u1/roles').send({ role: 'OPERATOR' }).expect(403);
    expect(adminService.grantRole).not.toHaveBeenCalled();
  });

  it('DELETE /admin/users/:id/roles/:role：SUPER_ADMIN + stepup → 200', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer())
      .delete('/admin/users/u1/roles/AUDITOR')
      .set('x-stepup-token', signStepup('admin1'))
      .expect(200);
    expect(adminService.revokeRole).toHaveBeenCalledWith(expect.anything(), 'u1', 'AUDITOR', undefined);
  });

  // -------- P3 订阅/订单（subscription:read / order:read） --------

  it('GET /admin/subscriptions：SUPER_ADMIN → 200', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer()).get('/admin/subscriptions').query({ plan: 'STANDARD', status: 'ACTIVE' }).expect(200);
    expect(adminService.listSubscriptions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ plan: 'STANDARD', status: 'ACTIVE' }));
  });

  it('GET /admin/subscriptions：OPERATOR → 200（含 SUBSCRIPTION_READ）', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).get('/admin/subscriptions').expect(200);
    expect(adminService.listSubscriptions).toHaveBeenCalled();
  });

  it('GET /admin/subscriptions：AUDITOR → 403（无 subscription:read）', async () => {
    injectedUser = { userId: 'aud1', roles: [Role.AUDITOR] };
    await request(app.getHttpServer()).get('/admin/subscriptions').expect(403);
    expect(adminService.listSubscriptions).not.toHaveBeenCalled();
  });

  it('GET /admin/subscriptions：SUPPORT → 403', async () => {
    injectedUser = { userId: 'sup1', roles: [Role.SUPPORT] };
    await request(app.getHttpServer()).get('/admin/subscriptions').expect(403);
  });

  it('GET /admin/orders：SUPER_ADMIN → 200', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer()).get('/admin/orders').query({ status: 'PAID' }).expect(200);
    expect(adminService.listOrders).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'PAID' }));
  });

  it('GET /admin/orders：OPERATOR → 200', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).get('/admin/orders').expect(200);
    expect(adminService.listOrders).toHaveBeenCalled();
  });

  it('GET /admin/orders：AUDITOR → 403（无 order:read）', async () => {
    injectedUser = { userId: 'aud1', roles: [Role.AUDITOR] };
    await request(app.getHttpServer()).get('/admin/orders').expect(403);
    expect(adminService.listOrders).not.toHaveBeenCalled();
  });

  it('未登录 → 401', async () => {
    await request(app.getHttpServer()).get('/admin/subscriptions').expect(401);
    await request(app.getHttpServer()).get('/admin/orders').expect(401);
  });

  // -------- P1 跨用户分享（解锁 R-6） --------

  it('GET /admin/shares：OPERATOR → 200（含 SHARE_READ_ALL）', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).get('/admin/shares').expect(200);
    expect(adminService.listShares).toHaveBeenCalled();
  });

  it('DELETE /admin/shares/:id：SUPER_ADMIN + stepup → 200', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer())
      .delete('/admin/shares/s1')
      .set('x-stepup-token', signStepup('admin1'))
      .expect(200);
    expect(adminService.revokeShare).toHaveBeenCalledWith(expect.anything(), 's1', undefined);
  });

  it('DELETE /admin/shares/:id：SUPER_ADMIN 但缺 stepup → 403（RBAC P2）', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    await request(app.getHttpServer()).delete('/admin/shares/s1').expect(403);
    expect(adminService.revokeShare).not.toHaveBeenCalled();
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
