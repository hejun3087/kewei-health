import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RequireRole from './RequireRole';

// 前端路由守卫测试：mock useAuth 返回不同 roles 组合，验证 children/ForbiddenPage 分支。
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
// 隔离 403 页对 useNavigate 的依赖，替换为轻量占位组件
vi.mock('../pages/Forbidden', () => ({
  default: () => <div data-testid="forbidden">403</div>,
}));
import { useAuth } from '../contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authMock = useAuth as any;

describe('RequireRole（RBAC P0 前端路由守卫）', () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it('用户持有匹配角色 → 渲染 children', () => {
    authMock.mockReturnValue({ user: { roles: ['SUPER_ADMIN'] } });
    render(
      <RequireRole roles={['SUPER_ADMIN', 'AUDITOR']}>
        <div>admin-content</div>
      </RequireRole>,
    );
    expect(screen.getByText('admin-content')).toBeInTheDocument();
    expect(screen.queryByTestId('forbidden')).not.toBeInTheDocument();
  });

  it('用户持有其它角色（AUDITOR 之一命中）→ 渲染 children', () => {
    authMock.mockReturnValue({ user: { roles: ['AUDITOR', 'OPERATOR'] } });
    render(
      <RequireRole roles={['SUPER_ADMIN', 'AUDITOR']}>
        <div>admin-content</div>
      </RequireRole>,
    );
    expect(screen.getByText('admin-content')).toBeInTheDocument();
  });

  it('用户无匹配角色 → 渲染 ForbiddenPage', () => {
    authMock.mockReturnValue({ user: { roles: ['SUPPORT'] } });
    render(
      <RequireRole roles={['SUPER_ADMIN', 'AUDITOR']}>
        <div>admin-content</div>
      </RequireRole>,
    );
    expect(screen.getByTestId('forbidden')).toBeInTheDocument();
    expect(screen.queryByText('admin-content')).not.toBeInTheDocument();
  });

  it('user 为 null（未登录）→ 渲染 ForbiddenPage（正常链路 JwtAuthGuard 已重定向 /login，此为兜底）', () => {
    authMock.mockReturnValue({ user: null });
    render(
      <RequireRole roles={['SUPER_ADMIN']}>
        <div>admin-content</div>
      </RequireRole>,
    );
    expect(screen.getByTestId('forbidden')).toBeInTheDocument();
  });

  it('旧后端未返回 roles 字段 → 视为空数组，命中 ForbiddenPage', () => {
    authMock.mockReturnValue({ user: { id: 'u1' } });
    render(
      <RequireRole roles={['SUPER_ADMIN']}>
        <div>admin-content</div>
      </RequireRole>,
    );
    expect(screen.getByTestId('forbidden')).toBeInTheDocument();
  });
});
