/**
 * 存量明文 → 静态加密 一次性回填脚本（PIA R-2 / 任务 6.1.6）
 *
 * 背景：应用层透明加解密只作用于「新写入」；上线前已存在的明文健康字段
 * 需一次性加密，才能真正满足「健康数据静态加密（at rest）」。
 *
 * 用法（本地无 DB 不执行；部署环境运行）：
 *   DATA_ENCRYPTION_KEY 必须与 App 运行时使用的那把一致，否则 App 将无法解密。
 *   cd server && npm run db:backfill-encrypt
 *   （脚本会尝试加载当前目录 .env；部署环境若已由密管注入 env 则无需文件）
 *
 * 安全性：
 *  - 幂等：已是密文（enc:v1: 前缀）的行跳过，可反复执行；
 *  - 用「裸」PrismaClient（不挂加解密中间件），读到的即库中原值，写回的即最终密文，避免中间件反复转换；
 *  - 生产未设置 DATA_ENCRYPTION_KEY 时，encryptField 经 resolveDataEncryptionKey 直接 fail-fast 抛错，
 *    拒绝用内置兜底密钥加密生产数据。
 */
import { PrismaClient } from '@prisma/client';
import { encryptField, isEncrypted } from '../common/crypto/encryption';

// 尽力加载 .env（Node ≥20.12/21/24 提供 process.loadEnvFile；低版本或已注入 env 时静默跳过）
try {
  (process as any).loadEnvFile?.();
} catch {
  /* 忽略：部署环境通常已注入 process.env */
}

/** 模型 → 需回填加密的敏感字段。User 字段由 service 层加解密，此处一并把存量明文补齐。 */
const TARGETS: Array<{ model: 'user' | 'report' | 'diagnosis' | 'medication'; fields: string[] }> = [
  { model: 'user', fields: ['allergyHistory', 'medicalHistory'] },
  { model: 'report', fields: ['summary'] },
  { model: 'diagnosis', fields: ['complaint', 'diagnosisText', 'advice'] },
  { model: 'medication', fields: ['notes'] },
];

async function main() {
  const prisma = new PrismaClient();
  let grandTotal = 0;

  try {
    for (const { model, fields } of TARGETS) {
      const client: any = (prisma as any)[model];
      const select: any = { id: true };
      for (const f of fields) select[f] = true;

      // 含软删除行：只要库里有明文就应加密（数据静止态全覆盖）
      const rows: any[] = await client.findMany({ select });

      let updated = 0;
      for (const row of rows) {
        const data: any = {};
        let changed = false;
        for (const f of fields) {
          const v = row[f];
          if (typeof v === 'string' && v.length > 0 && !isEncrypted(v)) {
            data[f] = encryptField(v);
            changed = true;
          }
        }
        if (changed) {
          await client.update({ where: { id: row.id }, data });
          updated++;
        }
      }
      grandTotal += updated;
      // eslint-disable-next-line no-console
      console.log(`[backfill] ${model}: 扫描 ${rows.length} 行，加密更新 ${updated} 行`);
    }
    // eslint-disable-next-line no-console
    console.log(`[backfill] 完成，共更新 ${grandTotal} 行。`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[backfill] 失败：', err);
  process.exitCode = 1;
});
