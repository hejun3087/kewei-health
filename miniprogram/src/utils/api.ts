import { http, uploadFile } from './request';

// ==================== 认证 ====================
export interface UserInfo {
  id: string;
  phone: string;
  nickname?: string;
  avatar?: string;
  storageUsed?: string;
  storageLimit?: string;
}
export interface LoginResult {
  token: string;
  user: UserInfo;
}

export const authApi = {
  // 登录；后端若返回 401（未注册）由页面捕获后改走注册
  login: (phone: string, password: string) =>
    http.post<LoginResult>('/auth/login/password', { phone, password }),
  register: (phone: string, password: string, nickname?: string) =>
    http.post<LoginResult>('/auth/register', { phone, password, nickname }),
  me: () => http.get<UserInfo>('/auth/me'),
};

// ==================== 家庭成员 ====================
export const memberApi = {
  list: () => http.get<any>('/family-members').then((res: any) =>
    Array.isArray(res) ? res : res?.members || res?.items || []),
  create: (data: any) => http.post('/family-members', data),
};

// ==================== 检查报告 ====================
// 后端列表统一返回 { total, items, page, pageSize }
export const reportApi = {
  list: (params?: any) =>
    http.get<any>('/reports', params).then((res: any) =>
      Array.isArray(res) ? res : res?.items || []),
  detail: (id: string) => http.get<any>(`/reports/${id}`),
  dashboard: () => http.get<any>('/reports/dashboard'),
  trackableItems: (memberId?: string) =>
    http.get<any>('/reports/trackable-items', memberId ? { memberId } : undefined),
  // 趋势数据点字段为 date（非 reportDate）
  trend: (memberId: string, itemName: string) =>
    http.get<any>('/reports/trend', { memberId, itemName }),
  create: (data: any) => http.post('/reports', data),
};

// ==================== 就诊记录 ====================
export const diagnosisApi = {
  list: (params?: any) => http.get<any>('/diagnoses', params).then((res: any) =>
    Array.isArray(res) ? res : res?.items || []),
  detail: (id: string) => http.get<any>(`/diagnoses/${id}`),
  create: (data: any) => http.post('/diagnoses', data),
  update: (id: string, data: any) => http.put(`/diagnoses/${id}`, data),
  remove: (id: string) => http.del(`/diagnoses/${id}`),
  // 复诊提醒：逾期(近30天) + 未来 N 天内到期，含 daysLeft/overdue 标记
  upcomingVisits: (days = 7) =>
    http.get<any>('/diagnoses/upcoming-visits', { days }).then((res: any) =>
      Array.isArray(res) ? res : res?.items || []),
};

// ==================== 用药记录 ====================
export const medicationApi = {
  list: () => http.get<any>('/medications').then((res: any) =>
    Array.isArray(res) ? res : res?.items || []),
  current: () => http.get<any>('/medications/current').then((res: any) =>
    Array.isArray(res) ? res : res?.items || []),
};

// ==================== 上传 + AI 识别 ====================
export const uploadApi = {
  // 图片上传，返回含 id（uploadId）与 storagePath
  image: (filePath: string) => uploadFile<any>('/upload', filePath, 'file'),
  recognize: (uploadId: string, type: 'report' | 'prescription' = 'report') =>
    http.post<any>('/ai/recognize', { uploadId, type }),
};

// ==================== 会员订阅 ====================
export const memberSubscriptionApi = {
  subscription: () => http.get<any>('/member/subscription'),
  plans: () => http.get<any>('/member/plans'),
  upgrade: (plan: string, paymentMethod = 'WECHAT') =>
    http.post<any>('/member/upgrade', { plan, paymentMethod }),
  // 通知中心（4.3.4）：订阅到期/续费 + AI 额度预警，返回 notices 数组
  notifications: () => http.get<any>('/member/notifications').then((res: any) =>
    Array.isArray(res) ? res : []),
};

// ==================== 报告分享（4.3.2，家庭版 / PIA R-6） ====================
// 后端基于 ShareLink 记录表签发只读分享 token（可撤销）：
//   创建返回 { token, path, shareId, expiresAt, expiresInDays }；可传 expiresInDays（1~90）。
//   GET /share/my 返回本人分享记录【纯数组】（含 shareId/reportId/expiresAt/revokedAt/viewCount/active）。
// 非家庭版权益时创建返回 402，由 request.ts 统一弹升级引导；list/revoke 仅需登录。
export const shareApi = {
  createReport: (reportId: string, expiresInDays?: number) =>
    http.post<any>(`/share/report/${reportId}`, expiresInDays ? { expiresInDays } : {}),
  listMine: () =>
    http.get<any>('/share/my').then((res: any) => (Array.isArray(res) ? res : [])),
  revoke: (shareId: string) => http.del<any>(`/share/${shareId}`),
};

// ==================== 访问记录（PIA R-3 数据主体知情权） ====================
// GET /audit/me 返回分页对象 { total, items, page, pageSize }；query 支持 action/resourceType/success/from/to/page/pageSize。
export const auditApi = {
  listMine: (params?: { action?: string; resourceType?: string; success?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    http.get<any>('/audit/me', params),
};
