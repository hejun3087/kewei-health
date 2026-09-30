import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi, type UserInfo, type LoginResult } from '../utils/api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(uni.getStorageSync('token') || '');
  const user = ref<UserInfo | null>(
    (() => {
      try {
        const raw = uni.getStorageSync('user');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })(),
  );

  function setAuth(login: LoginResult) {
    token.value = login.token;
    user.value = login.user;
    uni.setStorageSync('token', login.token);
    uni.setStorageSync('user', JSON.stringify(login.user));
  }

  function clear() {
    token.value = '';
    user.value = null;
    uni.removeStorageSync('token');
    uni.removeStorageSync('user');
  }

  /** 手机号+密码登录，失败（含未注册）时尝试注册 */
  async function login(phone: string, password: string) {
    try {
      const res = await authApi.login(phone, password);
      setAuth(res);
      return res;
    } catch (err: any) {
      // 后端登录接口对不存在用户/密码错误均可能返回 401/400；
      // 前端约定：手机号+密码，未注册自动创建账号
      const reg = await authApi.register(phone, password);
      setAuth(reg);
      return reg;
    }
  }

  /** 刷新当前用户信息 */
  async function refreshUser() {
    const info = await authApi.me();
    user.value = info;
    uni.setStorageSync('user', JSON.stringify(info));
    return info;
  }

  function logout() {
    clear();
    uni.reLaunch({ url: '/pages/login/index' });
  }

  return { token, user, setAuth, clear, login, refreshUser, logout };
});
