import { Injectable, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_CONFIG, UNLIMITED, PlanConfig } from './plan.config';

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户当前订阅；不存在则初始化免费版。
   * 自动处理过期降级（endDate 已过 → FREE）。
   */
  async getOrCreate(userId: string) {
    let sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      sub = await this.prisma.subscription.create({ data: { userId, plan: 'FREE', status: 'ACTIVE' } });
    }

    // 过期自动降级为 FREE（数据保留不删除，符合 PRD 2.8.3）
    if (sub.plan !== 'FREE' && sub.endDate && sub.endDate < new Date()) {
      sub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { plan: 'FREE', status: 'EXPIRED' },
      });
    }

    // 跨月重置 AI 用量
    if (sub.quotaResetAt < new Date()) {
      const next = new Date();
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(0, 0, 0, 0);
      sub = await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { aiUsageCount: 0, quotaResetAt: next },
      });
    }

    return sub;
  }

  /** 对外返回：订阅信息 + 套餐权益 + 配额余量 */
  async getSubscriptionInfo(userId: string) {
    const sub = await this.getOrCreate(userId);
    const plan = PLAN_CONFIG[sub.plan as keyof typeof PLAN_CONFIG];
    return {
      plan: sub.plan,
      planName: plan.name,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      autoRenew: sub.autoRenew,
      quotaResetAt: sub.quotaResetAt,
      quotas: {
        aiPerMonth: plan.aiPerMonth,
        aiUsed: sub.aiUsageCount,
        aiRemaining: plan.aiPerMonth === UNLIMITED ? UNLIMITED : Math.max(0, plan.aiPerMonth - sub.aiUsageCount),
        maxMembers: plan.maxMembers,
        storageLimit: plan.storageLimit,
      },
      features: plan.features,
    };
  }

  /** 列出所有套餐（供前端展示升级选项） */
  listPlans() {
    return Object.entries(PLAN_CONFIG).map(([key, p]: [string, PlanConfig]) => ({
      plan: key,
      name: p.name,
      priceYearly: p.priceYearly,
      aiPerMonth: p.aiPerMonth,
      maxMembers: p.maxMembers,
      storageLimit: p.storageLimit,
      features: p.features,
    }));
  }

  /**
   * 创建升级订单（前期支付网关未接入，orderId 为占位，直接激活）。
   * 微信支付接入后：此处生成预支付单，回调 paymentCallback 再激活。
   */
  async createUpgradeOrder(userId: string, plan: string, paymentMethod: string) {
    if (!PLAN_CONFIG[plan]) throw new BadRequestException('套餐不存在');
    if (plan === 'FREE') throw new BadRequestException('免费版无需支付');

    const cfg = PLAN_CONFIG[plan];
    const orderId = `KW${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // 订单落库（PENDING），支付网关接入后由回调更新状态
    const order = await this.prisma.paymentOrder.create({
      data: {
        orderId,
        userId,
        plan: plan as any,
        amount: cfg.priceYearly * 100,
        paymentMethod: paymentMethod as any,
      },
    });

    // TODO: 接入微信支付统一下单 API，返回前端调起支付所需参数
    // 当前无支付凭证，采用"模拟支付成功直接激活"以便联调
    return {
      id: order.id,
      orderId,
      plan,
      planName: cfg.name,
      amount: cfg.priceYearly * 100, // 转分
      paymentMethod,
      status: order.status,
      // 真实环境应返回 prepay_id / code_url，前端调起支付
      mockPaid: true,
      message: '支付网关未接入，已模拟支付成功并激活订阅',
    };
  }

  /** 激活订阅（支付回调或模拟支付后调用） */
  async activate(userId: string, plan: string, paymentMethod: string, amount: number, orderId: string) {
    const cfg = PLAN_CONFIG[plan];
    const start = new Date();
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1); // 年费

    const sub = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId, plan: plan as any, status: 'ACTIVE', startDate: start, endDate: end,
        paymentMethod: paymentMethod as any, amount, orderId, quotaResetAt: this.nextMonthStart(),
      },
      update: {
        plan: plan as any, status: 'ACTIVE', startDate: start, endDate: end,
        paymentMethod: paymentMethod as any, amount, orderId,
      },
    });

    // 同步订单状态为已支付（模拟支付或支付回调均走此处置 PAID）
    if (orderId) {
      await this.prisma.paymentOrder.updateMany({
        where: { orderId, userId },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }

    // 同步用户存储上限
    await this.prisma.user.update({
      where: { id: userId },
      data: { storageLimit: BigInt(cfg.storageLimit) },
    });

    this.logger.log(`用户 ${userId} 已升级为 ${plan}`);
    return sub;
  }

  /** 支付订单历史列表（分页对象契约 {total,items}） */
  async listOrders(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [total, items] = await Promise.all([
      this.prisma.paymentOrder.count({ where }),
      this.prisma.paymentOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, items, page, pageSize };
  }

  /** 取消自动续费 */
  async cancelAutoRenew(userId: string) {
    await this.getOrCreate(userId);
    return this.prisma.subscription.update({ where: { userId }, data: { autoRenew: false } });
  }

  /**
   * AI 识别配额校验 + 用量递增。超限抛 402（付费墙）。
   */
  async consumeAiQuota(userId: string) {
    const sub = await this.getOrCreate(userId);
    const cfg = PLAN_CONFIG[sub.plan as keyof typeof PLAN_CONFIG];
    if (cfg.aiPerMonth !== UNLIMITED && sub.aiUsageCount >= cfg.aiPerMonth) {
      throw new HttpException(
        `本月AI识别次数已用尽（${cfg.aiPerMonth}次），升级套餐可享更多额度`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { aiUsageCount: { increment: 1 } },
    });
    return { allowed: true, remaining: cfg.aiPerMonth === UNLIMITED ? UNLIMITED : cfg.aiPerMonth - sub.aiUsageCount - 1 };
  }

  /**
   * 数据导出权益校验（4.3.1）：标准版及以上可用，免费版抛 402（付费墙）。
   */
  async assertExportAccess(userId: string) {
    const sub = await this.getOrCreate(userId);
    const cfg = PLAN_CONFIG[sub.plan as keyof typeof PLAN_CONFIG];
    if (!cfg.canExport) {
      throw new HttpException(
        '数据导出为标准版及以上权益，升级套餐后可一键导出全部健康档案',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return { allowed: true, plan: sub.plan };
  }

  /**
   * 报告分享权益校验（4.3.2）：仅家庭版可用，其余抛 402（付费墙）。
   */
  async assertShareAccess(userId: string) {
    const sub = await this.getOrCreate(userId);
    const cfg = PLAN_CONFIG[sub.plan as keyof typeof PLAN_CONFIG];
    if (!cfg.canShare) {
      throw new HttpException(
        '报告分享为家庭版专属权益，升级家庭版后可生成只读链接与家人共享',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return { allowed: true, plan: sub.plan };
  }

  /**
   * 通知中心（4.3.4 + 4.3.3 指标异常预警）：聚合订阅到期/续费提醒 + AI 额度预警 + 近期异常指标。
   * 数据源单一化，前端只渲染；不新增表，基于现有 Subscription 与 ReportItem 字段计算。
   */
  async getNotifications(userId: string) {
    const sub = await this.getOrCreate(userId);
    const cfg = PLAN_CONFIG[sub.plan as keyof typeof PLAN_CONFIG];
    const notices: any[] = [];

    // 1) 订阅到期/续费提醒
    if (sub.status === 'EXPIRED') {
      notices.push({
        type: 'expired',
        level: 'error',
        title: '套餐已到期，已自动降级为免费版',
        message: '数据完整保留，续费可恢复全部套餐权益',
        actionText: '去续费',
        actionUrl: '/membership',
      });
    } else if (sub.plan !== 'FREE' && sub.endDate) {
      const days = Math.round((sub.endDate.getTime() - Date.now()) / 86400000);
      if (days >= 0 && days <= 30) {
        notices.push({
          type: 'renewal',
          level: days <= 7 ? 'error' : 'warning',
          title: `${cfg.name}将在 ${days} 天后到期`,
          message: '及时续费以继续享受套餐权益',
          actionText: '去续费',
          actionUrl: '/membership',
        });
      }
    }

    // 2) AI 识别额度预警（非不限额套餐，用量 ≥ 80%）
    if (cfg.aiPerMonth !== UNLIMITED) {
      const remaining = Math.max(0, cfg.aiPerMonth - sub.aiUsageCount);
      const ratio = sub.aiUsageCount / cfg.aiPerMonth;
      if (ratio >= 1) {
        notices.push({
          type: 'quota',
          level: 'error',
          title: `本月AI识别次数已用尽（${cfg.aiPerMonth}次）`,
          message: '下月自动重置，升级套餐可享更多额度',
          actionText: '升级套餐',
          actionUrl: '/membership',
        });
      } else if (ratio >= 0.8) {
        notices.push({
          type: 'quota',
          level: 'warning',
          title: `本月AI识别仅剩 ${remaining} 次`,
          message: '升级套餐可享不限次/更多额度',
          actionText: '升级套餐',
          actionUrl: '/membership',
        });
      }
    }

    // 3) 指标异常预警（4.3.3）：近 14 天报告中的异常指标（纯读取，不新增表）
    // 以 reportDate（检查日期）而非上传日期为窗口，旧报告补录不触发“近期”提醒。
    try {
      const since = new Date(Date.now() - 14 * 86400000);
      const abnormalItems = await this.prisma.reportItem.findMany({
        where: {
          abnormal: { in: ['HIGH', 'LOW', 'ABNORMAL'] },
          report: { userId, deletedAt: null, reportDate: { gte: since } },
        },
        select: { name: true },
        orderBy: { report: { reportDate: 'desc' } },
        take: 100,
      });
      if (abnormalItems && abnormalItems.length > 0) {
        const uniqNames = Array.from(new Set(abnormalItems.map((i: any) => i.name)));
        const preview = uniqNames.slice(0, 3).join('、');
        const more = abnormalItems.length > 3 || uniqNames.length > 3 ? ' 等' : '';
        notices.unshift({
          type: 'health',
          level: 'warning',
          title: `近期检查有 ${abnormalItems.length} 项指标异常`,
          message: `重点关注：${preview}${more}，建议咨询医生`,
          actionText: '查看报告',
          actionUrl: '/reports',
        });
      }
    } catch (e) {
      // 异常预警为附加信息，查询失败不影响订阅/额度类通知返回
      this.logger.warn(`指标异常预警计算失败: ${e}`);
    }

    return notices;
  }

  /**
   * 家庭成员配额校验，返回当前套餐允许的上限。
   */
  async getMemberLimit(userId: string): Promise<number> {
    const sub = await this.getOrCreate(userId);
    const cfg = PLAN_CONFIG[sub.plan as keyof typeof PLAN_CONFIG];
    return cfg.maxMembers;
  }

  private nextMonthStart(): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
