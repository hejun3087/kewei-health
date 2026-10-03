// PIA R-1：敏感个人信息（健康数据）处理的「单独同意」——小程序端
// 独立于用户协议/隐私政策的一般同意（PIPL 第 29 条）。
// 受限于小程序 uni.showModal 能力（无法内嵌必勾 checkbox），以「显著提示文案 + 用户主动点击『同意并继续』」
// 构成单独、明示同意；未同意则中止录入。服务端对健康数据写入另有 AuditLog 留痕。
const KEY = 'healthConsent';

export const hasSensitiveConsent = (): boolean => {
  try {
    return uni.getStorageSync(KEY) === '1';
  } catch {
    return false;
  }
};

export const grantSensitiveConsent = (): void => {
  try {
    uni.setStorageSync(KEY, '1');
  } catch {
    /* ignore */
  }
};

/** 一次性同意闸门：已同意直接 resolve(true)，否则弹 uni.showModal，同意返回 true / 不同意返回 false。 */
export function requestSensitiveConsent(): Promise<boolean> {
  return new Promise((resolve) => {
    if (hasSensitiveConsent()) {
      resolve(true);
      return;
    }
    uni.showModal({
      title: '敏感个人信息处理单独同意',
      content:
        '健康医疗信息（检查报告、就诊诊断、用药记录、过敏史/慢性病史等）属于敏感个人信息，仅用于为您建立健康档案、趋势分析与导出，境内存储不出境。是否同意平台处理您的健康敏感个人信息？',
      confirmText: '同意并继续',
      cancelText: '不同意',
      success: (res: any) => {
        if (res.confirm) {
          grantSensitiveConsent();
          resolve(true);
        } else {
          resolve(false);
        }
      },
      fail: () => resolve(false),
    });
  });
}
