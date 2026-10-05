import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, Role, permissionsOf } from './permissions';
import { PERMISSIONS_KEY, ROLES_KEY } from './roles.decorator';

/**
 * 授权守卫（docs/rbac-design.md P0）：
 * - 位于 Guard 链 `Throttler → JwtAuthGuard → RolesGuard → AuditInterceptor`；
 * - 无 `@Roles` / `@Permissions` 标注 → 放行，保证既有已鉴权接口零改动；
 * - 有 `@Roles` → user.roles 至少命中其一（角色维度任一）；
 * - 有 `@Permissions` → 用户所持角色的权限并集覆盖全部所需权限（权限维度全与）；
 * - 未通过抛 `ForbiddenException`（HTTP 403），区分于 JwtAuthGuard 的 401。
 *
 * 前置约定：`req.user.roles` 由 `JwtStrategy.validate` 从 JWT payload 快照注入；
 * 若上游未鉴权（异常配置）则 `req.user` 为空，此处按 403 处理，实际生产链路不会走到（JwtAuthGuard 已在前面拒 401）。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPerms = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const hasRolesReq = Array.isArray(requiredRoles) && requiredRoles.length > 0;
    const hasPermReq = Array.isArray(requiredPerms) && requiredPerms.length > 0;
    // 未标注 → 视为无需 RBAC，放行（保证既有登录接口不受影响）
    if (!hasRolesReq && !hasPermReq) return true;

    const req = context.switchToHttp().getRequest();
    const user = req?.user;
    if (!user || !user.userId) {
      throw new ForbiddenException('未授权访问');
    }
    const userRoles: Role[] = Array.isArray(user.roles) ? (user.roles as Role[]) : [];

    if (hasRolesReq) {
      const hit = (requiredRoles as Role[]).some((r) => userRoles.includes(r));
      if (!hit) throw new ForbiddenException('权限不足');
    }

    if (hasPermReq) {
      const granted = permissionsOf(userRoles);
      const missing = (requiredPerms as Permission[]).filter((p) => !granted.has(p));
      if (missing.length > 0) throw new ForbiddenException('权限不足');
    }

    return true;
  }
}
