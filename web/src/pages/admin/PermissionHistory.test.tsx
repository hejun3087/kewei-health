import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PermissionHistoryPage from './PermissionHistory';

// 沿用 AllAudit/AllShares 测试风格：整模块 mock api；页面自身不依赖 useAuth（路由级 RequireRole 已保证），
// 但内部通过 api.get 拉取 /admin/audit。校验：预置参数、动作标签、meta 字段渲染、空态。
vi.mock('../../utils/api', () => ({ default: { get: vi.fn() } }));
import api from '../../utils/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGet = api.get as any;

const grantRow = (overrides: any = {}) => ({
  id: 'evt-1',
  userId: 'admin1',
  action: 'ROLE_GRANT',
  resourceType: 'ADMIN',
  resourceId: 'ur1',
  ip: '10.0.0.1',
  userAgent: 'UA',
  success: true,
  meta: {
    actorRoles: ['SUPER_ADMIN'],
    targetUserId: 'target-alice',
    role: 'AUDITOR',
    reason: '合规审计需要',
  },
  createdAt: '2026-10-05T10:00:00.000Z',
  ...overrides,
});

const revokeRow = (overrides: any = {}) => ({
  id: 'evt-2',
  userId: 'admin1',
  action: 'ROLE_REVOKE',
  resourceType: 'ADMIN',
  resourceId: 'target-bob',
  ip: '10.0.0.2',
  userAgent: 'UA',
  success: true,
  meta: {
    actorRoles: ['SUPER_ADMIN'],
    targetUserId: 'target-bob',
    role: 'OPERATOR',
    reason: '离职回收权限',
    revoked: 1,
  },
  createdAt: '2026-10-05T11:00:00.000Z',
  ...overrides,
});

describe('PermissionHistoryPage（RBAC P2 权限变更履历）', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('挂载即以 resourceType=ADMIN + action=ROLE_GRANT,ROLE_REVOKE 请求 /admin/audit', async () => {
    mockGet.mockResolvedValue({ data: { total: 0, items: [], page: 1, pageSize: 20 } });
    render(<PermissionHistoryPage />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/admin/audit',
        expect.objectContaining({
          params: expect.objectContaining({
            resourceType: 'ADMIN',
            action: 'ROLE_GRANT,ROLE_REVOKE',
            page: 1,
            pageSize: 20,
          }),
        }),
      );
    });
  });

  it('授予行渲染：动作标签「授予」+ 角色 Tag + 目标用户 + 理由', async () => {
    mockGet.mockResolvedValue({ data: { total: 1, items: [grantRow()], page: 1, pageSize: 20 } });
    render(<PermissionHistoryPage />);
    await waitFor(() => expect(screen.getByText('授予')).toBeInTheDocument());
    expect(screen.getByText('AUDITOR')).toBeInTheDocument();
    expect(screen.getByText('target-alice')).toBeInTheDocument();
    expect(screen.getByText('合规审计需要')).toBeInTheDocument();
    // 操作者 userId 与角色快照一并展示
    expect(screen.getByText('admin1')).toBeInTheDocument();
    expect(screen.getByText('(SUPER_ADMIN)')).toBeInTheDocument();
  });

  it('撤销行渲染：动作标签「撤销」+ 角色 OPERATOR + 理由「离职回收权限」', async () => {
    mockGet.mockResolvedValue({ data: { total: 1, items: [revokeRow()], page: 1, pageSize: 20 } });
    render(<PermissionHistoryPage />);
    await waitFor(() => expect(screen.getByText('撤销')).toBeInTheDocument());
    expect(screen.getByText('OPERATOR')).toBeInTheDocument();
    expect(screen.getByText('离职回收权限')).toBeInTheDocument();
  });

  it('空态：items=[] 展示「暂无权限变更事件」提示', async () => {
    mockGet.mockResolvedValue({ data: { total: 0, items: [], page: 1, pageSize: 20 } });
    render(<PermissionHistoryPage />);
    await waitFor(() => expect(screen.getByText('权限变更履历（管理端）')).toBeInTheDocument());
    expect(screen.getByText(/暂无权限变更事件/)).toBeInTheDocument();
  });

  it('meta 缺 reason 时展示占位「—」（不影响其它列渲染）', async () => {
    const noReason = grantRow({ meta: { actorRoles: ['SUPER_ADMIN'], targetUserId: 't-x', role: 'SUPPORT' } });
    mockGet.mockResolvedValue({ data: { total: 1, items: [noReason], page: 1, pageSize: 20 } });
    render(<PermissionHistoryPage />);
    await waitFor(() => expect(screen.getByText('SUPPORT')).toBeInTheDocument());
    // 至少存在一个 — 占位（理由列）
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
