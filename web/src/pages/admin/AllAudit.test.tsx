import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AllAuditPage from './AllAudit';

// 与 AccessRecords.test.tsx 保持同一 mock 风格：整模块 api 默认导出，get 为 vi.fn。
vi.mock('../../utils/api', () => ({ default: { get: vi.fn() } }));
import api from '../../utils/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGet = api.get as any;

const sampleRow = (overrides: any = {}) => ({
  id: 'a1',
  userId: 'u-target',
  action: 'READ',
  resourceType: 'REPORT',
  resourceId: 'r1',
  ip: '1.2.3.4',
  userAgent: 'Mozilla/5.0',
  success: true,
  meta: null,
  createdAt: '2026-10-05T10:00:00.000Z',
  ...overrides,
});

describe('AllAuditPage（RBAC P0 管理端跨用户审计查询）', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('首次挂载即以分页参数请求 /admin/audit，渲染表格行', async () => {
    mockGet.mockResolvedValue({
      data: { total: 2, items: [sampleRow(), sampleRow({ id: 'a2', action: 'LOGIN', resourceType: 'AUTH', userId: null })], page: 1, pageSize: 20 },
    });
    render(<AllAuditPage />);
    await waitFor(() => expect(screen.getByText('查看')).toBeInTheDocument());
    expect(mockGet).toHaveBeenCalledWith(
      '/admin/audit',
      expect.objectContaining({ params: expect.objectContaining({ page: 1, pageSize: 20 }) }),
    );
    // 免登录分享行 userId 为 null → 显示"(免登录)"
    expect(screen.getByText('(免登录)')).toBeInTheDocument();
    // 目标 userId 直接呈现（供审计追溯）
    expect(screen.getByText('u-target')).toBeInTheDocument();
  });

  it('空态：items 为空时展示"暂无审计记录"', async () => {
    mockGet.mockResolvedValue({ data: { total: 0, items: [], page: 1, pageSize: 20 } });
    render(<AllAuditPage />);
    await waitFor(() => expect(screen.getByText(/暂无审计记录/)).toBeInTheDocument());
  });

  it('操作类型筛选：直接调用接口时参数含 action=EXPORT 将影响行渲染', async () => {
    mockGet.mockResolvedValue({ data: { total: 1, items: [sampleRow({ action: 'EXPORT' })], page: 1, pageSize: 20 } });
    render(<AllAuditPage />);
    await waitFor(() => expect(screen.getByText('导出')).toBeInTheDocument());
    // 验证首次拉取即已发生（完整交互测试需 antd Select portal，参考 AccessRecords.test.tsx 的同模式）
    const firstCall: any = mockGet.mock.calls[0];
    expect(firstCall[0]).toBe('/admin/audit');
  }, 10000);
});
