import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from './Profile';

// 6.1.5 PIA·R-5：家庭成员录入（他人个人信息）需授权声明二次确认
vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [{ id: 'm1', name: '张长辈', relation: 'FATHER', isDefault: false }] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', nickname: '我', phone: '13800000000' }, refreshUser: vi.fn() }),
}));

describe('ProfilePage 家庭成员授权二次确认（PIA R-5）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('新增成员：显示授权声明提示与必勾确认项', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText('张长辈')).toBeInTheDocument());

    await userEvent.click(screen.getByText('添加成员'));

    // 授权提示 Alert + 二次确认勾选项出现
    expect(await screen.findByText(/您正在录入他人（家庭成员）的个人健康信息/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText(/我确认已获得该成员本人（或其监护人）的授权/)).toBeInTheDocument();
  });

  it('编辑已有成员：不重复要求授权二次确认', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText('张长辈')).toBeInTheDocument());

    await userEvent.click(screen.getByText('编辑'));

    expect(await screen.findByText('编辑家庭成员')).toBeInTheDocument();
    // 编辑态不渲染授权勾选项
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/您正在录入他人（家庭成员）的个人健康信息/)).not.toBeInTheDocument();
  });
});
