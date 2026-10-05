import { SetMetadata } from '@nestjs/common';
import { Permission, Role } from './permissions';

/**
 * RBAC 装饰器（docs/rbac-design.md P0）：
 * - `@Roles(...)` 声明端点允许的角色（任一命中即通过角色维度）；
 * - `@Permissions(...)` 声明端点需要的权限项（user 所持角色并集须覆盖全部）；
 * - 二者均无 → Guard 直接放行（保持既有登录用户可访问接口不变）。
 */
export const ROLES_KEY = 'rbac:roles';
export const PERMISSIONS_KEY = 'rbac:permissions';
export const STEPUP_KEY = 'rbac:requireStepUp';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
/** 危险操作需 step-up 二次验证（docs/rbac-design.md §9.2，RBAC P2）：配合 StepUpGuard 使用 */
export const RequireStepUp = () => SetMetadata(STEPUP_KEY, true);
