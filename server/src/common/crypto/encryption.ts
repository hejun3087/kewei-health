import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { resolveDataEncryptionKey } from './encryption-config';

/**
 * 敏感字段应用层静态加密（PIA R-2 / 任务 6.1.6）——AES-256-GCM。
 *
 * Token 自描述格式：`enc:v1:<base64(iv(12) | authTag(16) | ciphertext)>`
 *  - 版本前缀便于后续轮换算法/密钥；
 *  - 解密时「非该前缀」视为存量明文原样返回，保证迁移前后可读、且 encrypt 幂等；
 *  - GCM 自带认证标签，密文被篡改解密会抛错（完整性保护）。
 *
 * 仅用于无 SQL 检索/聚合需求的自由文本健康字段（如过敏史、诊断文本、医嘱、报告摘要）。
 */
const PREFIX = 'enc:v1:';
const IV_LEN = 12; // GCM 推荐 96-bit IV
const TAG_LEN = 16; // 128-bit 认证标签

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (!cachedKey) cachedKey = resolveDataEncryptionKey();
  return cachedKey;
}

/** 仅测试用：密钥轮换/环境切换时重置缓存 */
export function __resetKeyCache(): void {
  cachedKey = null;
}

export function isEncrypted(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/** 加密单个字段：null/undefined/空串原样返回；已加密则幂等返回，不重复包裹。 */
export function encryptField(plain?: string | null): string | null {
  if (plain == null) return plain ?? null;
  if (plain === '') return '';
  if (isEncrypted(plain)) return plain;

  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/** 解密单个字段：null/空串原样返回；无前缀视为存量明文原样返回；GCM 校验失败抛错。 */
export function decryptField(value?: string | null): string | null {
  if (value == null) return value ?? null;
  if (value === '') return '';
  if (!isEncrypted(value)) return value; // 存量明文（迁移前）兼容

  const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
