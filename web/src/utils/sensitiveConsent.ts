// PIA R-1：敏感个人信息（健康数据）处理的「单独同意」状态（前端留痕标记）
// 独立于隐私政策/用户协议的一般同意——PIPL 第 29 条要求处理敏感个人信息须取得单独同意。
// 该标记仅记录"用户是否已完成单独同意"这一交互事实；服务端对健康数据的写入另有审计日志（AuditLog）留痕。
const KEY = 'healthConsent';

export const hasSensitiveConsent = (): boolean => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const grantSensitiveConsent = (): void => {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* 隐私模式等场景忽略写入失败 */
  }
};

export const revokeSensitiveConsent = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
