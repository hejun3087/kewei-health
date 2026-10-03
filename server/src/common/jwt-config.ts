/**
 * JWT 密钥解析（安全审计 5.2.3）
 *
 * 背景：jwt.strategy 与 auth.module 曾内联 `process.env.JWT_SECRET || '默认值'`，
 * 该默认值在仓库中可见。若生产部署漏配 JWT_SECRET，会静默使用可预测常量签名，
 * 攻击者可据此伪造登录 token / 分享 token（高危）。
 *
 * 策略：
 *  - 设置了 JWT_SECRET → 直接采用；
 *  - 生产环境（NODE_ENV=production）缺失 → fail-fast 抛错，阻止以不安全密钥启动；
 *  - 非生产（dev/test）缺失 → 返回开发兜底密钥并打印醒目告警，保证本地/CI 可运行。
 */
const DEV_ONLY_FALLBACK = 'kewei-health-jwt-secret-2026';

export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY] 生产环境必须设置 JWT_SECRET，禁止使用内置默认密钥（可被伪造登录/分享 token）',
    );
  }

  // eslint-disable-next-line no-console
  console.warn(
    '[SECURITY] 未检测到 JWT_SECRET，正在使用开发环境默认密钥，切勿用于生产部署',
  );
  return DEV_ONLY_FALLBACK;
}
