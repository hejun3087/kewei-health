import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AllSharesPage from './AllShares';

// 沿用 AllAudit.test.tsx 的 mock 风格：整模块 api 默认导出；另 mock useAuth 控制角色。
vi.mock('../../utils/api', () => ({ default: { get: vi.fn(), delete: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGet = api.get as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authMock = useAuth as any;

const sampleShare = (overrides: any = {}) => ({
  shareId: 's1',
  userId: 'u-owner',
  reportId: 'r1',
  expiresAt: '2026-12-31T00:00:00.000Z',
  revokedAt: null,
  viewCount: 3,
  lastViewedAt: null,
  createdAt: '2026-10-05T10:00:00.000Z',
  active: true,
  report: { hospital: '协和', reportType: 'LAB', reportDate: '2026-10-01T00:00:00.000Z' },
  ...overrides,
});

const setRoles = (roles: string[]) => authMock.mockReturnValue({ user: { roles } });

describe('AllSharesPage（RBAC P1 跨用户分享管理）', () => {
  beforeEach(() => {
    mockGet.mockReset();
    authMock.mockReset();
  });

  it('挂载即以分页参数请求 /admin/shares，渲染分享行（所有者/报告/状态）', async () => {
    setRoles(['SUPER_ADMIN']);
    mockGet.mockResolvedValue({
      data: { total: 2, items: [sampleShare(), sampleShare({ shareId: 's2', userId: 'u-owner2', active: false, revokedAt: '2026-10-04T00:00:00.000Z', report: { hospital: '华山', reportType: 'IMAGING', reportDate: '2026-09-20T00:00:00.000Z' } })], page: 1, pageSize: 20 },
    });
    render(<AllSharesPage />);
    await waitFor(() => expect(screen.getByText('u-owner')).toBeInTheDocument());
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/shares',
      expect.objectContaining({ params: expect.objectContaining({ page: 1, pageSize: 20 }) }),
    );
    expect(screen.getByText('协和')).toBeInTheDocument();
    expect(screen.getByText('已撤销')).toBeInTheDocument();
  });

  it('SUPER_ADMIN + active 行 → 展示"强制撤销"按钮', async () => {
    setRoles(['SUPER_ADMIN']);
    mockGet.mockResolvedValue({ data: { total: 1, items: [sampleShare()], page: 1, pageSize: 20 } });
    render(<AllSharesPage />);
    await waitFor(() => expect(screen.getByText('强制撤销')).toBeInTheDocument());
  });

  it('非 SUPER_ADMIN（OPERATOR）→ 只读，不展示撤销按钮', async () => {
    setRoles(['OPERATOR']);
    mockGet.mockResolvedValue({ data: { total: 1, items: [sampleShare()], page: 1, pageSize: 20 } });
    render(<AllSharesPage />);
    await waitFor(() => expect(screen.getByText('u-owner')).toBeInTheDocument());
    expect(screen.queryByText('强制撤销')).not.toBeInTheDocument();
    expect(screen.getByText('生效中')).toBeInTheDocument();
  });

  it('报告已删除（join 未匹配）→ 显示占位文案', async () => {
    setRoles(['AUDITOR']);
    mockGet.mockResolvedValue({
      data: { total: 1, items: [sampleShare({ report: null, active: false })], page: 1, pageSize: 20 },
    });
    render(<AllSharesPage />);
    await waitFor(() => expect(screen.getByText(/报告已删除/)).toBeInTheDocument());
  });

  it('空态：items 为空时展示"暂无分享链接"', async () => {
    setRoles(['SUPER_ADMIN']);
    mockGet.mockResolvedValue({ data: { total: 0, items: [], page: 1, pageSize: 20 } });
    render(<AllSharesPage />);
    await waitFor(() => expect(screen.getByText(/暂无分享链接/)).toBeInTheDocument());
  }, 10000);
});
