import { createHash } from 'crypto';

/**
 * 健康数据静态加密密钥解析（PIA R-2 / 任务 6.1.6）
 *
 * 与 JWT 密钥同样的 fail-fast 策略：
 *  - 设置了 DATA_ENCRYPTION_KEY → 采用（任意长度口令经 SHA-256 归一为 32 字节 AES-256 密钥）；
 *  - 生产环境（NODE_ENV=production）缺失 → 抛错，拒绝以不安全密钥启动；
 *  - 非生产（dev/test）缺失 → 返回开发兜底密钥并告警，保证本地/CI 可运行。
 *
 * 密钥绝不入仓库；生产由部署环境（KMS/密管）注入 DATA_ENCRYPTION_KEY。
 */
const DEV_ONLY_KEY_MATERIAL = 'kewei-health-dev-data-encryption-key-2026';

function sha256(s: string): Buffer {
  return createHash('sha256').update(s, 'utf8').digest();
}

export function resolveDataEncryptionKey(): Buffer {
  const secret = process.env.DATA_ENCRYPTION_KEY;
  if (secret) return sha256(secret);

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY] 生产环境必须设置 DATA_ENCRYPTION_KEY（健康数据静态加密密钥），禁止使用内置默认密钥',
    );
  }

  // eslint-disable-next-line no-console
  console.warn(
    '[SECURITY] 未检测到 DATA_ENCRYPTION_KEY，正在使用开发环境默认加密密钥，切勿用于生产部署',
  );
  return sha256(DEV_ONLY_KEY_MATERIAL);
}
