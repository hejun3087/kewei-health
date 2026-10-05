import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AdminController } from './admin.controller';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { RbacModule } from '../rbac/rbac.module';
import { ROLES_KEY } from '../rbac/roles.decorator';
import { Permission, Role } from '../rbac/permissions';

/**
 * AdminController 集成测试（docs/rbac-design.md P0 首落点）：
 * - 走完整守卫链：mock JwtAuthGuard 注入指定 user（含 roles）+ 真实 RolesGuard；
 * - AuditService 提供 spy，返回固定分页对象；
 * - 覆盖：SUPER_ADMIN/AUDITOR 通过、SUPPORT/普通用户 403、未登录 401（模拟 guard 抛错）。
 */
describe('AdminController 集成（守卫链 + queryAll）', () => {
  let app: INestApplication;
  let auditService: { queryAll: jest.Mock };
  let injectedUser: any;

  class MockJwtAuthGuard extends JwtAuthGuard {
    canActivate(ctx: any) {
      if (!injectedUser) {
        // 模拟未鉴权：抛 401（生产由 passport 处理）
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

    const moduleRef = await Test.createTestingModule({
      imports: [RbacModule],
      controllers: [AdminController],
      providers: [{ provide: AuditService, useValue: auditService }],
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

  it('方法元数据：@Roles 挂载 SUPER_ADMIN + AUDITOR（防止装饰器遗漏）', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AdminController.prototype.getAllAudit,
    ) as Role[];
    expect(roles).toEqual([Role.SUPER_ADMIN, Role.AUDITOR]);
  });

  it('SUPER_ADMIN → 200，透传 query 至 queryAll', async () => {
    injectedUser = { userId: 'admin1', roles: [Role.SUPER_ADMIN] };
    const res = await request(app.getHttpServer())
      .get('/admin/audit')
      .query({ action: 'EXPORT', page: 2, pageSize: 50 })
      .expect(200);
    expect(res.body).toEqual({ total: 0, items: [], page: 1, pageSize: 20 });
    expect(auditService.queryAll).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'EXPORT', page: '2', pageSize: '50' }),
    );
  });

  it('AUDITOR → 200（矩阵含 audit:read_all）', async () => {
    injectedUser = { userId: 'auditor1', roles: [Role.AUDITOR] };
    await request(app.getHttpServer()).get('/admin/audit').expect(200);
    expect(auditService.queryAll).toHaveBeenCalled();
  });

  it('SUPPORT → 403（无 SUPER_ADMIN/AUDITOR 角色命中）', async () => {
    injectedUser = { userId: 'sup1', roles: [Role.SUPPORT] };
    await request(app.getHttpServer()).get('/admin/audit').expect(403);
    expect(auditService.queryAll).not.toHaveBeenCalled();
  });

  it('OPERATOR → 403（不在 @Roles 白名单）', async () => {
    injectedUser = { userId: 'op1', roles: [Role.OPERATOR] };
    await request(app.getHttpServer()).get('/admin/audit').expect(403);
  });

  it('普通用户 roles=[] → 403（RBAC P0 关键：默认无管理权限）', async () => {
    injectedUser = { userId: 'u1', roles: [] };
    await request(app.getHttpServer()).get('/admin/audit').expect(403);
  });

  it('未鉴权（模拟 guard 抛 401） → 401', async () => {
    injectedUser = null;
    await request(app.getHttpServer()).get('/admin/audit').expect(401);
  });

  it('权限项引用完整性：AUDIT_READ_ALL 出现在 SUPER_ADMIN/AUDITOR 矩阵中', () => {
    // 通过 RolesGuard 走 @Permissions 时依赖该不变量；本用例仅静态锁定矩阵，防未来误删
    const sup = new RolesGuard({ getAllAndOverride: () => undefined } as any);
    expect(sup).toBeDefined();
    // 直接检查 permissionsOf 逻辑（在 roles.guard.spec 已详细覆盖，此处仅锚定矩阵）
    const { permissionsOf } = require('../rbac/permissions');
    expect(permissionsOf([Role.SUPER_ADMIN]).has(Permission.AUDIT_READ_ALL)).toBe(true);
    expect(permissionsOf([Role.AUDITOR]).has(Permission.AUDIT_READ_ALL)).toBe(true);
    expect(permissionsOf([Role.SUPPORT]).has(Permission.AUDIT_READ_ALL)).toBe(false);
    expect(permissionsOf([Role.OPERATOR]).has(Permission.AUDIT_READ_ALL)).toBe(false);
  });
});
