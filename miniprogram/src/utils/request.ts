import { BASE_URL, TIMEOUT } from './config';

// 401 时跳转登录（防抖，避免并发请求重复跳转）
let redirecting = false;
function redirectToLogin() {
  if (redirecting) return;
  redirecting = true;
  uni.removeStorageSync('token');
  uni.removeStorageSync('user');
  uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/login/index' });
    redirecting = false;
  }, 800);
}

interface ReqOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
}

/** 统一请求封装：自动附加 JWT，统一错误处理，返回响应体 data */
export function request<T = any>(options: ReqOptions): Promise<T> {
  const token = uni.getStorageSync('token');
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      timeout: TIMEOUT,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      success: (res: any) => {
        const status = res.statusCode;
        if (status >= 200 && status < 300) {
          resolve(res.data as T);
          return;
        }
        if (status === 401) {
          redirectToLogin();
          reject(res);
          return;
        }
        const msg = res.data?.message || res.data?.error || '请求失败';
        uni.showToast({ title: Array.isArray(msg) ? msg[0] : msg, icon: 'none' });
        reject(res);
      },
      fail: (err: any) => {
        uni.showToast({ title: '网络连接失败', icon: 'none' });
        reject(err);
      },
    });
  });
}

/** 文件上传封装（multipart），用于报告图片上传 */
export function uploadFile<T = any>(url: string, filePath: string, fileKey = 'file'): Promise<T> {
  const token = uni.getStorageSync('token');
  return new Promise<T>((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + url,
      filePath,
      name: fileKey,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res: any) => {
        if (res.statusCode === 401) {
          redirectToLogin();
          reject(res);
          return;
        }
        // uni.uploadFile 返回的 body 是字符串，需手动解析
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data as T);
          } else {
            uni.showToast({ title: data?.message || '上传失败', icon: 'none' });
            reject(data);
          }
        } catch (e) {
          reject(e);
        }
      },
      fail: (err: any) => {
        uni.showToast({ title: '上传网络连接失败', icon: 'none' });
        reject(err);
      },
    });
  });
}

export const http = {
  get: <T = any>(url: string, data?: any) => request<T>({ url, method: 'GET', data }),
  post: <T = any>(url: string, data?: any) => request<T>({ url, method: 'POST', data }),
  put: <T = any>(url: string, data?: any) => request<T>({ url, method: 'PUT', data }),
  del: <T = any>(url: string, data?: any) => request<T>({ url, method: 'DELETE', data }),
};
