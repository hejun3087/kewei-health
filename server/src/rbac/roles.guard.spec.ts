import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Permission, Role } from './permissions';
import { PERMISSIONS_KEY, ROLES_KEY } from './roles.decorator';

/**
 * RolesGuard 单元测试（docs/rbac-design.md P0）。
 * 直接构造 Guard + mock Reflector.getAllAndOverride，避免完整 Nest 容器；
 * ExecutionContext 用最小形状模拟（switchToHttp().getRequest()）。
 */
function ctxOf(user: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function makeReflector(meta: Record<string, any>): Reflector {
  return {
    getAllAndOverride: jest.fn((key: string) => meta[key]),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('无 @Roles/@Permissions 标注 → 放行（既有已鉴权接口零影响）', () => {
    const guard = new RolesGuard(makeReflector({}));
    expect(guard.canActivate(ctxOf({ userId: 'u1', roles: [] }))).toBe(true);
  });

  it('有 @Roles 且用户命中其一 → 放行', () => {
    const guard = new RolesGuard(
      makeReflector({ [ROLES_KEY]: [Role.SUPER_ADMIN, Role.AUDITOR] }),
    );
    expect(guard.canActivate(ctxOf({ userId: 'u1', roles: [Role.AUDITOR] }))).toBe(true);
  });

  it('有 @Roles 但用户未持有 → 403', () => {
    const guard = new RolesGuard(
      makeReflector({ [ROLES_KEY]: [Role.SUPER_ADMIN] }),
    );
    expect(() => guard.canActivate(ctxOf({ userId: 'u1', roles: [Role.OPERATOR] }))).toThrow(
      ForbiddenException,
    );
  });

  it('有 @Roles 但用户 roles 缺失/空数组 → 403', () => {
    const guard = new RolesGuard(
      makeReflector({ [ROLES_KEY]: [Role.SUPER_ADMIN] }),
    );
    expect(() => guard.canActivate(ctxOf({ userId: 'u1' }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctxOf({ userId: 'u1', roles: [] }))).toThrow(
      ForbiddenException,
    );
  });

  it('@Permissions 且用户角色并集覆盖全部 → 放行', () => {
    const guard = new RolesGuard(
      makeReflector({
        [PERMISSIONS_KEY]: [Permission.AUDIT_READ_ALL, Permission.AUDIT_EXPORT],
      }),
    );
    // AUDITOR 矩阵包含 AUDIT_READ_ALL + AUDIT_EXPORT
    expect(guard.canActivate(ctxOf({ userId: 'u1', roles: [Role.AUDITOR] }))).toBe(true);
  });

  it('@Permissions 且用户角色并集缺失任一 → 403', () => {
    const guard = new RolesGuard(
      makeReflector({
        [PERMISSIONS_KEY]: [Permission.AUDIT_READ_ALL, Permission.ROLE_GRANT],
      }),
    );
    // AUDITOR 无 ROLE_GRANT
    expect(() =>
      guard.canActivate(ctxOf({ userId: 'u1', roles: [Role.AUDITOR] })),
    ).toThrow(ForbiddenException);
  });

  it('SUPPORT 无 health 权限：任何 HEALTH_* 都拒（PIPL 最小必要关键边界）', () => {
    const guard = new RolesGuard(
      makeReflector({ [PERMISSIONS_KEY]: [Permission.HEALTH_READ_ALL] }),
    );
    expect(() =>
      guard.canActivate(ctxOf({ userId: 'u1', roles: [Role.SUPPORT] })),
    ).toThrow(ForbiddenException);
  });

  it('有标注但 req.user 缺失（异常配置）→ 403', () => {
    const guard = new RolesGuard(
      makeReflector({ [ROLES_KEY]: [Role.SUPER_ADMIN] }),
    );
    expect(() => guard.canActivate(ctxOf(undefined))).toThrow(ForbiddenException);
  });

  it('@Roles + @Permissions 同时存在：两者均需满足', () => {
    const guard = new RolesGuard(
      makeReflector({
        [ROLES_KEY]: [Role.SUPER_ADMIN],
        [PERMISSIONS_KEY]: [Permission.ROLE_GRANT],
      }),
    );
    // SUPER_ADMIN 且含 ROLE_GRANT → 放行
    expect(
      guard.canActivate(ctxOf({ userId: 'u1', roles: [Role.SUPER_ADMIN] })),
    ).toBe(true);
    // 角色不命中（OPERATOR 有 USER_WRITE 但无 ROLE_GRANT）→ 角色维度先拒
    expect(() =>
      guard.canActivate(ctxOf({ userId: 'u1', roles: [Role.OPERATOR] })),
    ).toThrow(ForbiddenException);
  });
});
