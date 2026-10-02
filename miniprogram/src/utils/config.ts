// 全局配置
// 开发环境：后端运行在本地 3000。真机/发布时改为 HTTPS 域名并在小程序后台配置合法请求域名。
export const BASE_URL = 'http://localhost:3000/api';

// 请求超时（毫秒）
export const TIMEOUT = 30000;

// 分享链接的 Web 端域名（4.3.2）：小程序生成的只读分享链接指向 Web 查看页。
// 开发期为 Vite 本地地址；发布时改为已备案的线上域名。
export const WEB_BASE_URL = 'http://localhost:5173';
