import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AccessRecordsPage from './AccessRecords';

// R-3 前端「我的访问记录」：mock api（GET /audit/me 返回分页对象 { total, items, page, pageSize }）
const mockGet = vi.fn();
vi.mock('../utils/api', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const items = [
  { id: 'a1', action: 'READ', resourceType: 'REPORT', resourceId: 'r1', ip: '1.1.1.1', userAgent: 'Mozilla/5.0 Chrome', success: true, meta: null, createdAt: '2026-09-20T10:00:00Z' },
  { id: 'a2', action: 'LOGIN', resourceType: 'AUTH', resourceId: null, ip: '2.2.2.2', userAgent: null, success: false, meta: { method: 'password' }, createdAt: '2026-09-21T10:00:00Z' },
];

const renderPage = () => render(<MemoryRouter><AccessRecordsPage /></MemoryRouter>);

describe('AccessRecordsPage 我的访问记录（PIA R-3 知情权）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === '/audit/me') return Promise.resolve({ data: { total: 2, items, page: 1, pageSize: 20 } });
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('渲染列表：映射中文操作/数据对象标签、结果状态，并以分页展示总数', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('查看')).toBeInTheDocument());
    expect(screen.getByText('检查报告')).toBeInTheDocument();
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('登录认证')).toBeInTheDocument();
    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('失败')).toBeInTheDocument();
    expect(screen.getByText('1.1.1.1')).toBeInTheDocument();
    expect(screen.getByText('共 2 条')).toBeInTheDocument();
    // 初次挂载即以分页参数请求本人审计记录
    expect(mockGet).toHaveBeenCalledWith('/audit/me', expect.objectContaining({ params: expect.objectContaining({ page: 1, pageSize: 20 }) }));
  });

  it('按操作类型筛选：选择“导出”后以 action=EXPORT 重新请求', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('查看')).toBeInTheDocument());

    await userEvent.click(screen.getAllByRole('combobox')[0]); // 操作类型
    await userEvent.click(await screen.findByText('导出'));

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        '/audit/me',
        expect.objectContaining({ params: expect.objectContaining({ action: 'EXPORT' }) }),
      ),
    );
  });

  it('空态：无访问记录时展示引导文案', async () => {
    mockGet.mockImplementation((url: string) =>
      url === '/audit/me' ? Promise.resolve({ data: { total: 0, items: [], page: 1, pageSize: 20 } }) : Promise.resolve({ data: {} }),
    );
    renderPage();
    expect(await screen.findByText(/暂无数据访问记录/)).toBeInTheDocument();
  });
});
