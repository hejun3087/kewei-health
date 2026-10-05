/**
 * RBAC 权限项与角色×权限矩阵（docs/rbac-design.md P0）。
 *
 * 决策要点：
 * - 4 内置角色硬编码 Prisma enum（`Role`），DB 动态角色明确不做（单人项目 + 权限项少 + 静态审计友好）；
 * - 权限项以代码 enum 定义，权限矩阵以常量维护，随版本演进，避免运维复杂度；
 * - `SUPPORT` 角色默认无健康数据读取权（PIPL 最小必要）；
 * - `health:read_full` 为跨用户全量健康数据读取，P0 暂不落到具体端点，为 P1 step-up 二次验证预留。
 */

// 与 Prisma enum `Role` 一一对应；代码内使用字符串枚举便于与 JWT payload.roles 直接比对。
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATOR = 'OPERATOR',
  SUPPORT = 'SUPPORT',
  AUDITOR = 'AUDITOR',
}

/** 权限项（约 15 项，代码 enum，与矩阵常量一起静态可审计） */
export enum Permission {
  // 用户与角色管理
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DISABLE = 'user:disable',
  ROLE_GRANT = 'role:grant',
  ROLE_REVOKE = 'role:revoke',
  // 健康数据（跨用户）
  HEALTH_READ_ALL = 'health:read_all',
  HEALTH_READ_FULL = 'health:read_full', // 预留：step-up 二次验证后才授予
  // 审计（跨用户）
  AUDIT_READ_ALL = 'audit:read_all',
  AUDIT_EXPORT = 'audit:export',
  // 分享（跨用户）
  SHARE_READ_ALL = 'share:read_all',
  SHARE_REVOKE_ALL = 'share:revoke_all',
  // 订阅/订单
  SUBSCRIPTION_READ = 'subscription:read',
  SUBSCRIPTION_WRITE = 'subscription:write',
  ORDER_READ = 'order:read',
  // 内容运营
  CONTENT_PUBLISH = 'content:publish',
}

/**
 * 角色 × 权限矩阵（v1 P0）：
 * - SUPER_ADMIN：全量（含角色授予/撤销、跨用户审计/健康数据/分享）
 * - AUDITOR：只读跨用户审计 + 只读用户列表；不接触健康数据明细
 * - OPERATOR：用户运营 + 订阅/订单 + 内容发布；不默认读取健康数据明细
 * - SUPPORT：仅工单/基础信息；无健康数据、无审计（PIPL 最小必要）
 */
export const RBAC_MATRIX: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_DISABLE,
    Permission.ROLE_GRANT,
    Permission.ROLE_REVOKE,
    Permission.HEALTH_READ_ALL,
    Permission.HEALTH_READ_FULL,
    Permission.AUDIT_READ_ALL,
    Permission.AUDIT_EXPORT,
    Permission.SHARE_READ_ALL,
    Permission.SHARE_REVOKE_ALL,
    Permission.SUBSCRIPTION_READ,
    Permission.SUBSCRIPTION_WRITE,
    Permission.ORDER_READ,
    Permission.CONTENT_PUBLISH,
  ],
  [Role.AUDITOR]: [
    Permission.USER_READ,
    Permission.AUDIT_READ_ALL,
    Permission.AUDIT_EXPORT,
    Permission.SHARE_READ_ALL,
  ],
  [Role.OPERATOR]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.SUBSCRIPTION_READ,
    Permission.SUBSCRIPTION_WRITE,
    Permission.ORDER_READ,
    Permission.CONTENT_PUBLISH,
    Permission.SHARE_READ_ALL,
  ],
  // SUPPORT：P0 无实际端点，权限矩阵预留；无 health 相关读取权是关键边界。
  [Role.SUPPORT]: [],
};

/** 展开多个角色的并集权限；用于 Guard 判定 `@Permissions(...)` 是否被覆盖。 */
export function permissionsOf(roles: Role[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const r of roles) {
    const list = RBAC_MATRIX[r as Role];
    if (Array.isArray(list)) for (const p of list) set.add(p);
  }
  return set;
}
