import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { message, Modal } from 'antd';
import api from './api';

// 直接取拦截器回调（axios InterceptorManager 内部 handlers），无需真实网络
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const respErr = (err: any) => (api.interceptors.response as any).handlers[0].rejected(err);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reqCfg = (config: any) => (api.interceptors.request as any).handlers[0].fulfilled(config);

describe('utils/api 拦截器（5.1.3 前端测试扩面）', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let msgSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let confirmSpy: any;
  let loc: { href: string };

  beforeEach(() => {
    localStorage.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    msgSpy = vi.spyOn(message, 'error').mockImplementation(() => ({}) as any);
    // 不调用 afterClose，以保留 paywallShown 去重行为供断言
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation(() => ({}) as any);
    loc = { href: '' };
    Object.defineProperty(window, 'location', { value: loc, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('请求拦截器', () => {
    it('有 token 时附加 Authorization Bearer', () => {
      localStorage.setItem('token', 'abc');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = reqCfg({ headers: {} }) as any;
      expect(cfg.headers.Authorization).toBe('Bearer abc');
    });

    it('无 token 时不附加 Authorization', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfg = reqCfg({ headers: {} }) as any;
      expect(cfg.headers.Authorization).toBeUndefined();
    });
  });

  describe('响应错误拦截器', () => {
    it('401：清除本地登录态、跳转 /login 并提示', async () => {
      localStorage.setItem('token', 't');
      localStorage.setItem('user', 'u');
      const err = { response: { status: 401, data: {} } };
      await expect(respErr(err)).rejects.toBe(err);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(loc.href).toBe('/login');
      expect(msgSpy).toHaveBeenCalledWith('登录已过期，请重新登录');
    });

    it('402：弹出付费墙，并发请求只弹一次（防重复）', async () => {
      const err1 = { response: { status: 402, data: { message: '额度不够' } } };
      const err2 = { response: { status: 402, data: { message: '额度不够' } } };
      await expect(respErr(err1)).rejects.toBe(err1);
      await expect(respErr(err2)).rejects.toBe(err2);
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(confirmSpy.mock.calls[0][0]).toMatchObject({ content: '额度不够', okText: '去升级套餐' });
    });

    it('其他状态码：提示后端返回的 message', async () => {
      const err = { response: { status: 500, data: { message: '服务器开小差' } } };
      await expect(respErr(err)).rejects.toBe(err);
      expect(msgSpy).toHaveBeenCalledWith('服务器开小差');
    });

    it('无响应（网络错误）：提示网络连接失败', async () => {
      const err = { request: {}, message: 'Network Error' };
      await expect(respErr(err)).rejects.toBe(err);
      expect(msgSpy).toHaveBeenCalledWith('网络连接失败');
    });
  });
});
