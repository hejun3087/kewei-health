import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ForbiddenPage from '../pages/Forbidden';

/**
 * 前端路由守卫（docs/rbac-design.md P0）：
 * 用于渲染层"隐藏 / 拒绝" 管理端入口，改善 UX；<strong>非安全边界</strong>，
 * 后端 RolesGuard 才是最终判定者（前端可被绕过，后端 403 兜底）。
 *
 * 用法：`<RequireRole roles={['SUPER_ADMIN','AUDITOR']}><AdminPage/></RequireRole>`
 * 无匹配 → 渲染 ForbiddenPage（403）。
 */
export default function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  const userRoles = Array.isArray(user?.roles) ? user!.roles! : [];
  const ok = roles.some((r) => userRoles.includes(r));
  if (!ok) return <ForbiddenPage />;
  return <>{children}</>;
}
