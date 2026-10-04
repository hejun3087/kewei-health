import { encryptField, decryptField, isEncrypted } from './encryption';

/**
 * Prisma 透明字段加解密（PIA R-2 / 任务 6.1.6 剩余敏感字段）
 *
 * 为何用集中式中间件而非逐 service 钩子：
 *  这些自由文本健康字段的「读取面」高度分散——列表/详情/搜索/首页概览，
 *  以及导出（Excel/PDF）与分享查看都会消费同一批字段。逐点解密极易漏掉某个
 *  出口而把密文直接暴露给客户端。放在 Prisma 中间件里「写加密 / 读解密」，
 *  可一次性覆盖全部读写路径（含未来新增）， service 层拿到的永远明文。
 *
 * 注意：User.allergyHistory/medicalHistory 已在 service 层（updateProfile/
 *  getUserById/sanitizeUser）完成加解密并有单测覆盖，故此处「不」重复纳入，
 *  以免二次加密。后续可择机统一收敛到本中间件。
 */

/** 模型 → 需静态加密的敏感自由文本字段（均为 Prisma text 列，密文变长不截断） */
export const SENSITIVE_ENCRYPTION_FIELDS: Record<string, string[]> = {
  Report: ['summary'],
  Diagnosis: ['complaint', 'diagnosisText', 'advice'],
  Medication: ['notes'],
};

/** 会产生「写入 payload」的动作；这些动作的参数里带明文需加密 */
const WRITE_ACTIONS = new Set(['create', 'update', 'updateMany', 'upsert']);

function encryptFieldsInPlace(data: any, fields: string[]): void {
  if (!data || typeof data !== 'object') return;
  for (const f of fields) {
    if (f in data) data[f] = encryptField(data[f]);
  }
}

function decryptFieldsInPlace<T>(record: T, fields: string[]): T {
  if (!record || typeof record !== 'object') return record;
  for (const f of fields) {
    const rec = record as any;
    if (typeof rec[f] === 'string' && isEncrypted(rec[f])) {
      rec[f] = decryptField(rec[f]);
    }
  }
  return record;
}

/** 就地加密写操作参数中的敏感字段（无匹配模型/动作则原样跳过）。 */
export function encryptWriteParams(
  model: string | undefined,
  action: string,
  args: any,
): void {
  if (!model || !args) return;
  const fields = SENSITIVE_ENCRYPTION_FIELDS[model];
  if (!fields) return;
  if (!WRITE_ACTIONS.has(action)) return;

  if (args.data) encryptFieldsInPlace(args.data, fields);
  // upsert 用 create/update 两个分支，而非 data
  if (action === 'upsert') {
    if (args.create) encryptFieldsInPlace(args.create, fields);
    if (args.update) encryptFieldsInPlace(args.update, fields);
  }
}

/** 解密查询结果中的敏感字段（数组/单对象/标量/null 均安全处理）。 */
export function decryptResultParams(model: string | undefined, result: any): any {
  if (!model) return result;
  const fields = SENSITIVE_ENCRYPTION_FIELDS[model];
  if (!fields) return result;

  if (Array.isArray(result)) {
    return result.map((r) => decryptFieldsInPlace(r, fields));
  }
  if (result && typeof result === 'object') {
    return decryptFieldsInPlace(result, fields);
  }
  return result;
}

/**
 * 构造 Prisma 中间件：写前加密、读后解密。
 * 加密幂等（encryptField 对已带前缀值原样返回），解密对存量明文透传
 * （decryptField 无前缀视为明文原样返回），故迁移前后均安全。
 */
export function createEncryptionMiddleware() {
  return async (params: any, next: (p: any) => Promise<any>) => {
    encryptWriteParams(params.model, params.action, params.args);
    const result = await next(params);
    return decryptResultParams(params.model, result);
  };
}
