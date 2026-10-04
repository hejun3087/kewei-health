import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 注销后数据保留期到期清理（PIA R-9 / PIPL 删除权，承接 6.1.8 遗留的"到期物理清除"）。
 *
 * 背景：用户注销当前是【软删除】（`status=DELETED` + `deletedAt`），登录与所有数据查询均过滤，
 * 但健康数据行仍留在库中。R-9 要求在合理保留期后【彻底清除】，本任务即落地该机制。
 *
 * 策略（既满足删除权、又不破坏法定留存义务）：
 *  1) 物理删除该用户全部健康数据：报告（其项目/图片由 DB `onDelete: Cascade` 级联）、诊断（含图片）、
 *     用药、上传、家庭成员，以及无外键、需显式清理的分享链接（其指向的报告即将不存在）。
 *  2) 匿名化账号 PII：手机号置为不可逆墓碑、清空密码/昵称/头像/性别/出生日期/身高体重/过敏史/慢性病史/微信 ID。
 *     【保留 User 行】以维系支付订单、订阅等账务外键（《电子商务法》要求交易信息自交易完成留存≥3 年），
 *     匿名化后该账号已不可识别到个人。
 *  3) 【保留 AuditLog】：等保三级要求安全审计日志留存≥6 个月，且 userId 随匿名化已失去可识别性，故不删除。
 *
 * 幂等：已匿名化账号的手机号以 `deleted_` 前缀作墓碑，命中即跳过，避免每日重复处理；
 *       删除操作对已清空的数据为无副作用空操作。
 *
 * 保留期天数由 `DATA_RETENTION_DAYS` 配置（默认 15 天，作为注销后不可撤销清除前的缓冲；
 * 最终法定/合同留存天数以隐私政策律师终稿为准，可据此 env 调整）。
 */
@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  /** 手机号墓碑前缀，用于幂等识别"已匿名化"账号。 */
  static readonly TOMBSTONE_PREFIX = 'deleted_';

  /** 缺省保留期（天）。 */
  static readonly DEFAULT_RETENTION_DAYS = 15;

  constructor(private readonly prisma: PrismaService) {}

  /** 保留期天数：读 `DATA_RETENTION_DAYS`，非法/缺省回退默认 15。 */
  getRetentionDays(): number {
    const raw = Number(process.env.DATA_RETENTION_DAYS);
    return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : DataRetentionService.DEFAULT_RETENTION_DAYS;
  }

  /** 保留期截止线：`deletedAt` 早于该时刻（即注销已超过保留期）的账号将被清除。 */
  computeCutoff(now = new Date()): Date {
    return new Date(now.getTime() - this.getRetentionDays() * 24 * 60 * 60 * 1000);
  }

  /** 每天 03:00 运行；异常仅告警、绝不抛出（等待下次调度重试）。 */
  @Cron('0 3 * * *')
  async handleCron(): Promise<{ purged: number; cutoff: Date } | undefined> {
    try {
      const result = await this.purgeExpiredDeletions();
      if (result.purged > 0) {
        this.logger.log(`保留期到期清理：匿名化并物理删除 ${result.purged} 个已注销账号的健康数据`);
      }
      return result;
    } catch (e) {
      this.logger.warn(`数据保留期清理任务执行失败: ${e}`);
      return undefined;
    }
  }

  /** 扫描并清理"注销且已过保留期"的账号，返回处理条数与截止线。 */
  async purgeExpiredDeletions(now = new Date()): Promise<{ purged: number; cutoff: Date }> {
    const cutoff = this.computeCutoff(now);
    const users = await this.prisma.user.findMany({
      where: { status: 'DELETED', deletedAt: { lte: cutoff } },
      select: { id: true, phone: true },
    });

    let purged = 0;
    for (const u of users) {
      // 幂等：手机号已是墓碑说明此前已清理，跳过
      if (typeof u.phone === 'string' && u.phone.startsWith(DataRetentionService.TOMBSTONE_PREFIX)) {
        continue;
      }
      await this.purgeUser(u.id);
      purged++;
    }
    return { purged, cutoff };
  }

  /** 单账号清理：事务内物理删健康数据 + 匿名化账号（AuditLog 保持不动）。 */
  private async purgeUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      // 分享链接无外键、不随用户级联，需显式删除
      this.prisma.shareLink.deleteMany({ where: { userId } }),
      // 健康数据（子表 items/images/diagnosisImages 由 DB onDelete: Cascade 级联）
      this.prisma.report.deleteMany({ where: { userId } }),
      this.prisma.diagnosis.deleteMany({ where: { userId } }),
      this.prisma.medication.deleteMany({ where: { userId } }),
      this.prisma.upload.deleteMany({ where: { userId } }),
      this.prisma.familyMember.deleteMany({ where: { userId } }),
      // 匿名化账号 PII（保留行以维系账务外键；不可识别到个人）
      this.prisma.user.update({
        where: { id: userId },
        data: {
          phone: `${DataRetentionService.TOMBSTONE_PREFIX}${userId}`,
          password: null,
          nickname: null,
          avatar: null,
          gender: null,
          birthDate: null,
          height: null,
          weight: null,
          allergyHistory: null,
          medicalHistory: null,
          wxOpenId: null,
          wxUnionId: null,
        },
      }),
    ]);
  }
}
