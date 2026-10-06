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

/**
 * 身份标识脱敏：用于失败登录留痕时记录被尝试的账号，避免明文手机号/openId 扩散（PIA R-3）。
 * 手机号保留前 3 + 后 4；其余（如微信 openId）仅保留前 4 位指纹。
 */
export function maskIdentity(raw?: string | null): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const s = String(raw);
  if (/^\d{7,}$/.test(s)) {
    return `${s.slice(0, 3)}****${s.slice(-4)}`;
  }
  return `${s.slice(0, 4)}****`;
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

  /**
   * 登录事件留痕（PIA R-3 尾项）：成功/失败均写一条 action=LOGIN、resourceType=AUTH 记录。
   * 失败时以脱敏 identity 记录被尝试账号，便于追溯爆破/枚举。委托 record()，绝不抛出。
   */
  async recordLogin(p: {
    ip?: string | null;
    userAgent?: string | null;
    method: string; // password / phone / wechat
    success: boolean;
    userId?: string | null;
    identity?: string | null; // 失败时传入原始手机号/openId，内部脱敏
    status?: number | null; // 失败时的 HTTP 状态码
  }): Promise<void> {
    const meta: Record<string, any> = { method: p.method };
    if (!p.success) {
      const masked = maskIdentity(p.identity);
      if (masked) meta.identity = masked;
      if (p.status != null) meta.status = p.status;
    }
    await this.record({
      userId: p.userId ?? null,
      action: 'LOGIN',
      resourceType: 'AUTH',
      ip: p.ip ?? null,
      userAgent: p.userAgent ?? null,
      success: p.success,
      meta,
    });
  }

  /**
   * 只读查询「指定用户」的审计记录（数据主体知情权，PIA R-3）。
   * userId 由调用方（控制器）从已鉴权的 req.user 强制注入，不接受外部传入，保证仅能查本人记录。
   * 支持按 action/resourceType/success/时间范围过滤 + 分页（pageSize 上限 100）。
   */
  async queryOwn(
    userId: string,
    query: {
      action?: string;
      resourceType?: string;
      success?: string | boolean;
      from?: string;
      to?: string;
      page?: number | string;
      pageSize?: number | string;
    } = {},
  ) {
    const where: any = { userId };
    if (query.action) where.action = String(query.action);
    if (query.resourceType) where.resourceType = String(query.resourceType);
    if (query.success !== undefined && query.success !== '' && query.success !== null) {
      where.success = String(query.success) === 'true';
    }
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) {
        const d = new Date(query.from);
        if (!isNaN(d.getTime())) range.gte = d;
      }
      if (query.to) {
        const d = new Date(query.to);
        if (!isNaN(d.getTime())) range.lte = d;
      }
      if (Object.keys(range).length) where.createdAt = range;
    }

    const page = Math.max(1, parseInt(String(query.page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize), 10) || 20));

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // createdAt 等 Date/BigInt 字段序列化：Date 由 Nest JSON 输出为 ISO 串，此处原样返回
    return { total, items, page, pageSize };
  }

  /**
   * 跨用户全量审计日志查询（管理端，docs/rbac-design.md P0 首落点）。
   * 与 queryOwn 同构，但不强制 userId；可选 userId 过滤定位单一主体。
   * 需与 `@Roles(SUPER_ADMIN, AUDITOR)` + `@Permissions(AUDIT_READ_ALL)` 配合使用，
   * 控制器侧未命中即 403；Service 层不重复授权判定，以保持单一职责（与 queryOwn 对齐）。
   *
   * RBAC P2 扩展：`action` 支持逗号分隔多值（如 `ROLE_GRANT,ROLE_REVOKE`）以支撑
   * “权限变更履历”页面一次拉取同资源类型的多个动作；单值行为向后兼容。
   *
   * RBAC P3：条件构造抽取为 buildAdminWhere，分页查询与导出（queryForExport）共用，
   * 保证「管理端列表看到的」与「导出的」筛选语义完全一致。
   */
  async queryAll(
    query: {
      userId?: string;
      action?: string;
      resourceType?: string;
      success?: string | boolean;
      from?: string;
      to?: string;
      page?: number | string;
      pageSize?: number | string;
    } = {},
  ) {
    const where = this.buildAdminWhere(query);

    const page = Math.max(1, parseInt(String(query.page), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize), 10) || 20));

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, items, page, pageSize };
  }

  /**
   * 管理端（跨用户）审计查询条件构造：queryAll 与 queryForExport 共用（RBAC P3）。
   * 多值 action 支持逗号分隔（P2 行为），其余过滤与 queryOwn 同构（不强制 userId）。
   */
  private buildAdminWhere(
    query: {
      userId?: string;
      action?: string;
      resourceType?: string;
      success?: string | boolean;
      from?: string;
      to?: string;
    } = {},
  ): any {
    const where: any = {};
    if (query.userId) where.userId = String(query.userId);
    if (query.action) {
      const actions = String(query.action)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (actions.length === 1) where.action = actions[0];
      else if (actions.length > 1) where.action = { in: actions };
    }
    if (query.resourceType) where.resourceType = String(query.resourceType);
    if (query.success !== undefined && query.success !== '' && query.success !== null) {
      where.success = String(query.success) === 'true';
    }
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) {
        const d = new Date(query.from);
        if (!isNaN(d.getTime())) range.gte = d;
      }
      if (query.to) {
        const d = new Date(query.to);
        if (!isNaN(d.getTime())) range.lte = d;
      }
      if (Object.keys(range).length) where.createdAt = range;
    }
    return where;
  }

  /** 导出单次行数硬上限（防整表导出打爆 Node 堆）；超限由渲染层显式标注截断，绝不静默丢弃 */
  static readonly EXPORT_MAX_ROWS = 10000;

  /**
   * 审计导出取数（RBAC P3）：与 queryAll 共用 buildAdminWhere，但不分页。
   * 取 cap+1 条探测是否超限，返回 { total, rows, truncated, cap } 由渲染层决定如何标注。
   */
  async queryForExport(
    query: {
      userId?: string;
      action?: string;
      resourceType?: string;
      success?: string | boolean;
      from?: string;
      to?: string;
    } = {},
    maxRowsInput?: number | string,
  ) {
    const cap = Math.min(
      AuditService.EXPORT_MAX_ROWS,
      Math.max(1, parseInt(String(maxRowsInput ?? ''), 10) || AuditService.EXPORT_MAX_ROWS),
    );
    const where = this.buildAdminWhere(query);
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: cap + 1 }),
    ]);
    const truncated = rows.length > cap;
    return { total, rows: truncated ? rows.slice(0, cap) : rows, truncated, cap };
  }
}
