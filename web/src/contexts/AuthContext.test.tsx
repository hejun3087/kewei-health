import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// AuthContext 内部 `import api from '../utils/api'`，此处 mock 同一模块
vi.mock('../utils/api', () => ({ default: { get: vi.fn() } }));
import api from '../utils/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMock = api.get as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseUser: any = {
  id: 'u1',
  phone: '13800000000',
  nickname: '小明',
  status: 'active',
  storageUsed: '0',
  storageLimit: '104857600',
};

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext（登录态 Provider + useAuth，5.1.3 前端测试扩面）', () => {
  beforeEach(() => {
    localStorage.clear();
    getMock.mockReset().mockResolvedValue({ data: { ...baseUser } });
  });

  it('无 token 且无缓存用户：不请求 /auth/me，loading 结束后 user 为 null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getMock).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('无 token 但本地缓存了 user：直接回填缓存用户，不发请求', async () => {
    localStorage.setItem('user', JSON.stringify(baseUser));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getMock).not.toHaveBeenCalled();
    expect(result.current.user?.id).toBe('u1');
  });

  it('有 token：拉取 /auth/me 回填用户并写入本地缓存', async () => {
    localStorage.setItem('token', 't');
    getMock.mockResolvedValue({ data: { ...baseUser, nickname: '云端昵称' } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getMock).toHaveBeenCalledWith('/auth/me');
    expect(result.current.user?.nickname).toBe('云端昵称');
    expect(JSON.parse(localStorage.getItem('user') as string).nickname).toBe('云端昵称');
  });

  it('有 token 但 /auth/me 失败：清除 token 与用户', async () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify(baseUser));
    getMock.mockRejectedValue(new Error('401'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('login()：写入 localStorage 并更新 token 状态', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.login('tok2', { ...baseUser, id: 'u9' });
    });
    expect(localStorage.getItem('token')).toBe('tok2');
    expect(result.current.token).toBe('tok2');
  });

  it('logout()：清除 localStorage 与登录态', () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', JSON.stringify(baseUser));
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current.logout();
    });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('useAuth 在无 Provider 时返回默认上下文（未加载、未登录）', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });
});
