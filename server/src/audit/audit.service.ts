import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
  meta?: Record<string, any> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /** 写入一条审计日志。任何异常仅告警、绝不抛出，避免审计故障阻断主业务链路 */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          success: entry.success ?? true,
          meta: (entry.meta ?? undefined) as any,
        },
      });
    } catch (e) {
      this.logger.warn(`审计日志写入失败: ${e}`);
    }
  }
}
