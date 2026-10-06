import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionsPage from './Subscriptions';

vi.mock('../../utils/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn(() => ({ user: { roles: ['SUPER_ADMIN'] } })) }));
import api from '../../utils/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGet = api.get as any;

const sampleSub = (overrides: any = {}) => ({
  id: 'sub1',
  userId: 'u1',
  user: { id: 'u1', phone: '138****8888', nickname: '张三' },
  plan: 'STANDARD',
  status: 'ACTIVE',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2027-01-01T00:00:00.000Z',
  autoRenew: true,
  amount: 10800,
  paymentMethod: 'WECHAT',
  aiUsageCount: 5,
  quotaResetAt: '2026-11-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

const sampleOrder = (overrides: any = {}) => ({
  id: 'o1',
  orderId: 'KW123456',
  userId: 'u1',
  user: { id: 'u1', phone: '138****8888', nickname: '张三' },
  plan: 'PROFESSIONAL',
  amount: 22800,
  paymentMethod: 'WECHAT',
  status: 'PAID',
  paidAt: '2026-09-15T12:00:00.000Z',
  createdAt: '2026-09-15T11:59:00.000Z',
  updatedAt: '2026-09-15T12:00:00.000Z',
  ...overrides,
});

describe('SubscriptionsPage（RBAC P3 订阅/订单管理）', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('初始渲染订阅列表：请求 /admin/subscriptions，显示脱敏手机号与套餐标签', async () => {
    mockGet.mockResolvedValue({ data: { total: 1, items: [sampleSub()], page: 1, pageSize: 20 } });
    render(<SubscriptionsPage />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/subscriptions', expect.objectContaining({ params: expect.objectContaining({ page: 1, pageSize: 20 }) }));
    });
    // 用户列渲染为 "张三 (138****8888)"，用正则匹配
    expect(await screen.findByText(/138\*{4}8888/)).toBeInTheDocument();
    expect(screen.getByText('标准版')).toBeInTheDocument();
    expect(screen.getByText('生效中')).toBeInTheDocument();
  });

  it('切换 Tab 到订单：请求 /admin/orders，渲染订单行', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { total: 0, items: [], page: 1, pageSize: 20 } }) // subscriptions
      .mockResolvedValueOnce({ data: { total: 1, items: [sampleOrder()], page: 1, pageSize: 20 } }); // orders
    render(<SubscriptionsPage />);
    const tab = await screen.findByRole('tab', { name: /订单列表/ });
    await userEvent.click(tab);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/orders', expect.objectContaining({ params: expect.objectContaining({ page: 1 }) }));
    });
    expect(await screen.findByText('KW123456')).toBeInTheDocument();
    expect(screen.getByText('¥228.00')).toBeInTheDocument();
    expect(screen.getByText('已支付')).toBeInTheDocument();
  });

  it('按用户 ID 筛选后重新请求带 userId 参数', async () => {
    mockGet.mockResolvedValue({ data: { total: 0, items: [], page: 1, pageSize: 20 } });
    render(<SubscriptionsPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    // 找到用户 ID 输入框并回车触发筛选
    const input = screen.getByPlaceholderText('按用户 ID 过滤');
    await userEvent.clear(input);
    await userEvent.type(input, 'u-target{enter}');
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/admin/subscriptions', expect.objectContaining({ params: expect.objectContaining({ userId: 'u-target' }) }));
    });
  });

  it('空态展示', async () => {
    mockGet.mockResolvedValue({ data: { total: 0, items: [], page: 1, pageSize: 20 } });
    render(<SubscriptionsPage />);
    expect(await screen.findByText('暂无订阅记录')).toBeInTheDocument();
  });
});
