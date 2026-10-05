import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminUsersPage from './Users';

// 沿用 AllAudit.test.tsx 的 mock 风格：整模块 api 默认导出；另 mock useAuth 控制角色。
vi.mock('../../utils/api', () => ({
  default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGet = api.get as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authMock = useAuth as any;

const sampleUser = (overrides: any = {}) => ({
  id: 'u1',
  phone: '138****8888',
  nickname: '张三',
  avatar: null,
  gender: null,
  status: 'ACTIVE',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-05T10:00:00.000Z',
  ...overrides,
});

const setRoles = (roles: string[]) => authMock.mockReturnValue({ user: { roles } });

describe('AdminUsersPage（RBAC P1 用户管理）', () => {
  beforeEach(() => {
    mockGet.mockReset();
    authMock.mockReset();
  });

  it('挂载即以分页参数请求 /admin/users，渲染脱敏手机号行', async () => {
    setRoles(['SUPER_ADMIN']);
    mockGet.mockResolvedValue({
      data: { total: 1, items: [sampleUser()], page: 1, pageSize: 20 },
    });
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText('138****8888')).toBeInTheDocument());
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/users',
      expect.objectContaining({ params: expect.objectContaining({ page: 1, pageSize: 20 }) }),
    );
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('SUPER_ADMIN + ACTIVE 用户 → 展示"禁用"按钮（危险操作入口）', async () => {
    setRoles(['SUPER_ADMIN']);
    mockGet.mockResolvedValue({ data: { total: 1, items: [sampleUser()], page: 1, pageSize: 20 } });
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText('禁用')).toBeInTheDocument());
  });

  it('非 SUPER_ADMIN（AUDITOR）→ 只保留"详情"，不展示启停按钮', async () => {
    setRoles(['AUDITOR']);
    mockGet.mockResolvedValue({ data: { total: 1, items: [sampleUser()], page: 1, pageSize: 20 } });
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText('详情')).toBeInTheDocument());
    expect(screen.queryByText('禁用')).not.toBeInTheDocument();
  });

  it('DELETED 用户即使 SUPER_ADMIN 也不提供启停（状态机不可逆）', async () => {
    setRoles(['SUPER_ADMIN']);
    mockGet.mockResolvedValue({
      data: { total: 1, items: [sampleUser({ id: 'u2', status: 'DELETED', nickname: null })], page: 1, pageSize: 20 },
    });
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText('已注销')).toBeInTheDocument());
    expect(screen.queryByText('禁用')).not.toBeInTheDocument();
    expect(screen.queryByText('启用')).not.toBeInTheDocument();
  });

  it('DISABLED 用户（SUPER_ADMIN）→ 展示"启用"按钮', async () => {
    setRoles(['SUPER_ADMIN']);
    mockGet.mockResolvedValue({
      data: { total: 1, items: [sampleUser({ id: 'u3', status: 'DISABLED' })], page: 1, pageSize: 20 },
    });
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText('启用')).toBeInTheDocument());
  });

  it('空态：items 为空时展示"暂无用户"', async () => {
    setRoles(['OPERATOR']);
    mockGet.mockResolvedValue({ data: { total: 0, items: [], page: 1, pageSize: 20 } });
    render(<AdminUsersPage />);
    await waitFor(() => expect(screen.getByText(/暂无用户/)).toBeInTheDocument());
  }, 10000);
});
