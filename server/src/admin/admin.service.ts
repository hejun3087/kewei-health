import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, maskIdentity } from '../audit/audit.service';
import { Role } from '../rbac/permissions';

/**
 * 管理端业务（docs/rbac-design.md P1）：跨用户 / 角色 / 分享的运维操作封装。
 *
 * 职责边界：
 * - 授权判定在 controller 层 `@Roles`/`@Permissions` + RolesGuard 完成，本服务不重复判权（单一职责，与 queryAll 一致）；
 * - 每个操作**强制**落审计（resourceType=ADMIN），meta 记 `actorRoles` 快照、`targetUserId`（被操作对象）、`reason`（若提供），
 *   满足等保三级“操作行为可追溯”与 §八 审计扩展要求；
 * - 响应脱敏纪律（§六）：任何 /admin/users* 输出**不得**含 password hash、wxOpenId/wxUnionId、明文健康字段；手机号统一 mask。
 */

const ROLE_VALUES = Object.values(Role) as string[];
const SETTABLE_STATUS = ['ACTIVE', 'DISABLED'];
const VALID_PLANS = ['FREE', 'STANDARD', 'PROFESSIONAL', 'FAMILY'];
const VALID_SUB_STATUSES = ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING'];
const VALID_ORDER_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** actor 上下文（从已鉴权 req 提取），用于审计留痕 */
  private actor(req: any): { userId: string; roles: string[]; ip: string | null; userAgent: string | null } {
    const user = req?.user ?? {};
    return {
      userId: user.userId ?? null,
      roles: Array.isArray(user.roles) ? user.roles : [],
      ip: req?.ip ?? null,
      userAgent: (req?.headers?.['user-agent'] as string) ?? null,
    };
  }

  /** 管理端用户 DTO：仅安全标量字段 + 手机号 mask；剔除 password hash、wx 标识、健康明文、BigInt 存储字段 */
  private toAdminUserDto(u: any) {
    return {
      id: u.id,
      phone: maskIdentity(u.phone),
      nickname: u.nickname ?? null,
      avatar: u.avatar ?? null,
      gender: u.gender ?? null,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  /** 分页/关键词查用户（user:read）。keyword 命中手机号或昵称；status 精确过滤。 */
  async listUsers(
    req: any,
    query: { keyword?: string; status?: string; page?: number | string; pageSize?: number | string } = {},
  ) {
    const where: any = {};
    if (query.status && SETTABLE_STATUS.concat('DELETED').includes(String(query.status))) {
      where.status = String(query.status);
    }
    const kw = query.keyword ? String(query.keyword).trim() : '';
    if (kw) {
      where.OR = [{ phone: { contains: kw } }, { nickname: { contains: kw } }];
    }
    const page = Math.max(1, parseInt(String(query.page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize), 10) || 20));

    const select = {
      id: true, phone: true, nickname: true, avatar: true, gender: true,
      status: true, createdAt: true, updatedAt: true,
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where, select,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    await this.audit.record({
      userId: this.actor(req).userId,
      action: 'ADMIN_USERS_LIST',
      resourceType: 'ADMIN',
      ip: this.actor(req).ip,
      userAgent: this.actor(req).userAgent,
      meta: { actorRoles: this.actor(req).roles, keyword: kw || null, matched: total },
    });

    return { total, items: rows.map((r: any) => this.toAdminUserDto(r)), page, pageSize };
  }

  /** 用户详情（user:read）：脱敏 PII + 附带其当前活跃角色列表。 */
  async getUser(req: any, id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, phone: true, nickname: true, avatar: true, gender: true,
        status: true, createdAt: true, updatedAt: true,
      },
    });
    if (!u) throw new NotFoundException('用户不存在');
    const roleRows = await this.prisma.userRole.findMany({
      where: { userId: id, revokedAt: null },
      select: { role: true, grantedAt: true, grantedBy: true },
      orderBy: { grantedAt: 'asc' },
    });

    await this.audit.record({
      userId: this.actor(req).userId,
      action: 'ADMIN_USER_READ',
      resourceType: 'ADMIN',
      resourceId: id,
      ip: this.actor(req).ip,
      userAgent: this.actor(req).userAgent,
      meta: { actorRoles: this.actor(req).roles, targetUserId: id },
    });

    return { ...this.toAdminUserDto(u), roles: roleRows.map((r: any) => r.role) };
  }

  /** 启用/禁用账号（user:disable）：仅 ACTIVE↔DISABLED，不覆盖 DELETED。 */
  async setUserStatus(req: any, id: string, status: string, reason?: string) {
    if (!SETTABLE_STATUS.includes(String(status))) {
      throw new BadRequestException('状态仅支持 ACTIVE 或 DISABLED');
    }
    const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!u) throw new NotFoundException('用户不存在');
    if (u.status === 'DELETED') throw new BadRequestException('已注销账号不可变更状态');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: status as any },
      select: {
        id: true, phone: true, nickname: true, avatar: true, gender: true,
        status: true, createdAt: true, updatedAt: true,
      },
    });

    await this.audit.record({
      userId: this.actor(req).userId,
      action: 'USER_DISABLE',
      resourceType: 'ADMIN',
      resourceId: id,
      ip: this.actor(req).ip,
      userAgent: this.actor(req).userAgent,
      meta: { actorRoles: this.actor(req).roles, targetUserId: id, from: u.status, to: status, reason: reason ?? null },
    });

    return this.toAdminUserDto(updated);
  }

  /** 授予角色（role:grant）：先软撤销同 (userId,role) 旧活跃行再新建，保证仅一条活跃行。 */
  async grantRole(req: any, targetUserId: string, role: string, reason?: string) {
    if (!ROLE_VALUES.includes(String(role))) {
      throw new BadRequestException('无效角色');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!target) throw new NotFoundException('用户不存在');

    const a = this.actor(req);
    // 幂等：撤销既有活跃同角色行（应用层保证唯一活跃）
    await this.prisma.userRole.updateMany({
      where: { userId: targetUserId, role: role as Role, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const row = await this.prisma.userRole.create({
      data: { userId: targetUserId, role: role as Role, grantedBy: a.userId },
    });

    await this.audit.record({
      userId: a.userId,
      action: 'ROLE_GRANT',
      resourceType: 'ADMIN',
      resourceId: row.id,
      ip: a.ip,
      userAgent: a.userAgent,
      meta: { actorRoles: a.roles, targetUserId, role, reason: reason ?? null },
    });

    return { userId: targetUserId, role, grantedAt: row.grantedAt };
  }

  /** 撤销角色（role:revoke）：软撤销活跃匹配行；无匹配则幂等返回。 */
  async revokeRole(req: any, targetUserId: string, role: string, reason?: string) {
    if (!ROLE_VALUES.includes(String(role))) {
      throw new BadRequestException('无效角色');
    }
    const a = this.actor(req);
    const res = await this.prisma.userRole.updateMany({
      where: { userId: targetUserId, role: role as Role, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.audit.record({
      userId: a.userId,
      action: 'ROLE_REVOKE',
      resourceType: 'ADMIN',
      resourceId: targetUserId,
      success: res.count > 0,
      ip: a.ip,
      userAgent: a.userAgent,
      meta: { actorRoles: a.roles, targetUserId, role, revoked: res.count, reason: reason ?? null },
    });

    return { userId: targetUserId, role, revoked: res.count > 0 };
  }

  /** 跨用户分享列表（share:read_all）：可选 userId/active 过滤，join 报告元数据。 */
  async listShares(
    req: any,
    query: { userId?: string; active?: string | boolean; page?: number | string; pageSize?: number | string } = {},
  ) {
    const where: any = {};
    if (query.userId) where.userId = String(query.userId);
    const now = Date.now();
    const wantActive =
      query.active !== undefined && query.active !== '' && query.active !== null
        ? String(query.active) === 'true'
        : undefined;

    const page = Math.max(1, parseInt(String(query.page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize), 10) || 20));

    // active 需结合 revokedAt/expiresAt 计算，无法直接下推简单 where，取全量匹配 userId 后内存过滤再分页
    const baseLinks = await this.prisma.shareLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    const withFlag = baseLinks.map((l: any) => ({
      shareId: l.id,
      userId: l.userId,
      reportId: l.reportId,
      expiresAt: l.expiresAt,
      revokedAt: l.revokedAt,
      viewCount: l.viewCount,
      lastViewedAt: l.lastViewedAt,
      createdAt: l.createdAt,
      active: !l.revokedAt && l.expiresAt.getTime() > now,
    }));
    const filtered = wantActive === undefined ? withFlag : withFlag.filter((x) => x.active === wantActive);
    const total = filtered.length;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize);

    // join 报告元数据（医院/类型/日期），未匹配（已删）降级
    const reportIds = Array.from(new Set(items.map((x) => x.reportId)));
    let reportMap: Record<string, any> = {};
    if (reportIds.length) {
      const reports = await this.prisma.report.findMany({
        where: { id: { in: reportIds } },
        select: { id: true, hospital: true, reportType: true, reportDate: true },
      });
      reportMap = Object.fromEntries(reports.map((r: any) => [r.id, r]));
    }
    const enriched = items.map((x) => ({ ...x, report: reportMap[x.reportId] ?? null }));

    const a = this.actor(req);
    await this.audit.record({
      userId: a.userId,
      action: 'ADMIN_SHARES_LIST',
      resourceType: 'ADMIN',
      ip: a.ip,
      userAgent: a.userAgent,
      meta: { actorRoles: a.roles, filterUserId: query.userId ?? null, matched: total },
    });

    return { total, items: enriched, page, pageSize };
  }

  // ==================== 订阅/订单管理（P3，subscription:read / order:read） ====================

  /** 跨用户订阅列表（subscription:read）：可按 plan / status / userId 过滤，分页。 */
  async listSubscriptions(
    req: any,
    query: { plan?: string; status?: string; userId?: string; page?: number | string; pageSize?: number | string } = {},
  ) {
    const where: any = {};
    if (query.plan && VALID_PLANS.includes(String(query.plan))) where.plan = String(query.plan);
    if (query.status && VALID_SUB_STATUSES.includes(String(query.status))) where.status = String(query.status);
    if (query.userId) where.userId = String(query.userId);

    const page = Math.max(1, parseInt(String(query.page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize), 10) || 20));

    const [total, rows] = await Promise.all([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        include: { user: { select: { id: true, phone: true, nickname: true } } },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const a = this.actor(req);
    await this.audit.record({
      userId: a.userId,
      action: 'ADMIN_SUBSCRIPTIONS_LIST',
      resourceType: 'ADMIN',
      ip: a.ip,
      userAgent: a.userAgent,
      meta: { actorRoles: a.roles, filterPlan: query.plan ?? null, filterStatus: query.status ?? null, matched: total },
    });

    return {
      total,
      items: rows.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        user: r.user ? { id: r.user.id, phone: maskIdentity(r.user.phone), nickname: r.user.nickname ?? null } : null,
        plan: r.plan,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        autoRenew: r.autoRenew,
        amount: r.amount,
        paymentMethod: r.paymentMethod,
        aiUsageCount: r.aiUsageCount,
        quotaResetAt: r.quotaResetAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      page,
      pageSize,
    };
  }

  /** 跨用户订单列表（order:read）：可按 userId / status / plan 过滤，分页。 */
  async listOrders(
    req: any,
    query: { userId?: string; status?: string; plan?: string; page?: number | string; pageSize?: number | string } = {},
  ) {
    const where: any = {};
    if (query.userId) where.userId = String(query.userId);
    if (query.status && VALID_ORDER_STATUSES.includes(String(query.status))) where.status = String(query.status);
    if (query.plan && VALID_PLANS.includes(String(query.plan))) where.plan = String(query.plan);

    const page = Math.max(1, parseInt(String(query.page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize), 10) || 20));

    const [total, rows] = await Promise.all([
      this.prisma.paymentOrder.count({ where }),
      this.prisma.paymentOrder.findMany({
        where,
        include: { user: { select: { id: true, phone: true, nickname: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const a = this.actor(req);
    await this.audit.record({
      userId: a.userId,
      action: 'ADMIN_ORDERS_LIST',
      resourceType: 'ADMIN',
      ip: a.ip,
      userAgent: a.userAgent,
      meta: { actorRoles: a.roles, filterUserId: query.userId ?? null, filterStatus: query.status ?? null, matched: total },
    });

    return {
      total,
      items: rows.map((r: any) => ({
        id: r.id,
        orderId: r.orderId,
        userId: r.userId,
        user: r.user ? { id: r.user.id, phone: maskIdentity(r.user.phone), nickname: r.user.nickname ?? null } : null,
        plan: r.plan,
        amount: r.amount,
        paymentMethod: r.paymentMethod,
        status: r.status,
        paidAt: r.paidAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      page,
      pageSize,
    };
  }

  /** 强制撤销任意分享链接（share:revoke_all，应急）：跨 owner，幂等。 */
  async revokeShare(req: any, shareId: string, reason?: string) {
    const link = await this.prisma.shareLink.findUnique({ where: { id: shareId } });
    if (!link) throw new NotFoundException('分享链接不存在');
    const a = this.actor(req);

    if (link.revokedAt) {
      await this.audit.record({
        userId: a.userId,
        action: 'SHARE_REVOKE_ANY',
        resourceType: 'ADMIN',
        resourceId: shareId,
        ip: a.ip,
        userAgent: a.userAgent,
        meta: { actorRoles: a.roles, targetUserId: link.userId, already: true, reason: reason ?? null },
      });
      return { shareId, revoked: true, revokedAt: link.revokedAt };
    }

    const updated = await this.prisma.shareLink.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });

    await this.audit.record({
      userId: a.userId,
      action: 'SHARE_REVOKE_ANY',
      resourceType: 'ADMIN',
      resourceId: shareId,
      ip: a.ip,
      userAgent: a.userAgent,
      meta: { actorRoles: a.roles, targetUserId: link.userId, reason: reason ?? null },
    });

    return { shareId, revoked: true, revokedAt: updated.revokedAt };
  }
}
