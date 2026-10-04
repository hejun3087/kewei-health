import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MySharesPage from './MyShares';

// R-6 前端「我的分享列表/撤销」：mock api（GET /share/my 返回数组，GET /reports 供 join 展示）
const mockGet = vi.fn();
const mockDelete = vi.fn();
vi.mock('../utils/api', () => ({
  default: {
    get: (...args: any[]) => mockGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

const shares = [
  { shareId: 's1', reportId: 'r1', expiresAt: '2026-12-01T00:00:00Z', revokedAt: null, viewCount: 3, lastViewedAt: '2026-10-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z', active: true },
  { shareId: 's2', reportId: 'r2', expiresAt: '2026-09-20T00:00:00Z', revokedAt: null, viewCount: 0, lastViewedAt: null, createdAt: '2026-08-20T00:00:00Z', active: false },
  { shareId: 's3', reportId: 'r3', expiresAt: '2026-10-10T00:00:00Z', revokedAt: '2026-10-02T00:00:00Z', viewCount: 1, lastViewedAt: null, createdAt: '2026-09-10T00:00:00Z', active: false },
];
const reports = [
  { id: 'r1', hospital: '协和医院', reportType: 'LAB', reportDate: '2026-05-01' },
  { id: 'r2', hospital: '同仁医院', reportType: 'IMAGING', reportDate: '2026-06-01' },
];

const renderPage = () => render(<MemoryRouter><MySharesPage /></MemoryRouter>);

describe('MySharesPage 我的分享列表与撤销（PIA R-6）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === '/share/my') return Promise.resolve({ data: shares });
      if (url.startsWith('/reports')) return Promise.resolve({ data: { items: reports } });
      return Promise.resolve({ data: [] });
    });
    mockDelete.mockResolvedValue({ data: { shareId: 's1', revoked: true } });
  });

  afterEach(() => {
    cleanup();
    // antd Modal.confirm 渲染到 body 的独立容器，testing-library cleanup 不回收，手动清理避免跨用例串扰
    document.body.querySelectorAll('.ant-modal-root, .ant-modal-mask, .ant-modal-wrap').forEach((n) => n.remove());
  });

  it('渲染列表：与 /reports join 出报告信息，并按状态标记生效中/已过期/已撤销', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('协和医院 · 化验报告')).toBeInTheDocument());
    expect(screen.getByText('同仁医院 · 影像检查')).toBeInTheDocument();
    expect(screen.getByText('生效中')).toBeInTheDocument();
    expect(screen.getByText('已过期')).toBeInTheDocument();
    expect(screen.getByText('已撤销')).toBeInTheDocument();
    // s3 指向未匹配报告，展示 fallback
    expect(screen.getByText(/报告 r3/)).toBeInTheDocument();
  });

  it('撤销：确认后调用 DELETE /share/:id 并刷新列表', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('协和医院 · 化验报告')).toBeInTheDocument());

    const revokeButtons = screen.getAllByRole('button', { name: /撤销/ });
    await userEvent.click(revokeButtons[0]); // s1

    // 二次确认弹窗：点“确认撤销”
    await userEvent.click(await screen.findByText('确认撤销'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/share/s1'));
    // 撤销后重新拉取列表（初次 2 次 GET + 撤销后 2 次）
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(4));
  });

  it('空态：无分享记录时展示引导文案', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/share/my') return Promise.resolve({ data: [] });
      if (url.startsWith('/reports')) return Promise.resolve({ data: { items: [] } });
      return Promise.resolve({ data: [] });
    });
    renderPage();
    expect(await screen.findByText(/还没有生成过分享链接/)).toBeInTheDocument();
  });
});
