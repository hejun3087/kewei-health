import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'AUDIT';

export interface AuditMeta {
  resourceType: string;
  action?: string; // 缺省时由拦截器按 HTTP 方法推断（GET→READ 等）
}

/**
 * 标记控制器/方法需写入数据访问审计日志（合规 6.1.7）。
 * 可置于类级（覆盖该控制器全部路由）或方法级（方法级优先）。
 * @param resourceType 资源类别（REPORT/DIAGNOSIS/...）
 * @param action 动作，可选；不填则由拦截器依据 HTTP 方法推断
 */
export const Audit = (resourceType: string, action?: string) =>
  SetMetadata(AUDIT_KEY, { resourceType, action } as AuditMeta);
