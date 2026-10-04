import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MemberService } from '../member/member.service';

/**
 * 报告分享（4.3.2 / PIA R-6）
 *
 * 权益：仅家庭版可生成分享链接（memberService.assertShareAccess 抛 402 付费墙）。
 * 设计：只读分享 token（scope=share + reportId + ownerId + jti=ShareLink.id）。
 *   相较早期“纯无状态 JWT（不可撤销）”，现引入 `ShareLink` 记录表承载**可配置有效期 / 撤销 / 访问计数**：
 *   - 查看时以记录表为**权威**校验（撤销状态 + 绝对过期时间），JWT exp 仅作第一道快筛；
 *   - 因 JWT 无状态无法主动吊销，撤销通过给记录置 revokedAt 使旧 token 立即失效。
 * 安全：分享 token 无 sub，jwt.strategy 已拒绝其作为登录凭证；反之登录 token 无 scope=share。
 */
const DEFAULT_SHARE_TTL_DAYS = 30;
const MIN_SHARE_TTL_DAYS = 1;
const MAX_SHARE_TTL_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ShareService {
  constructor(
    private prisma: PrismaService,
    private memberService: MemberService,
    private jwtService: JwtService,
  ) {}

  /** 归一 + 校验有效期（天）：缺省 30，允许 [1,90] 整数，非法抛 400 */
  private resolveTtlDays(input?: number | string): number {
    if (input === undefined || input === null || input === '') {
      return DEFAULT_SHARE_TTL_DAYS;
    }
    const n = Number(input);
    if (!Number.isInteger(n) || n < MIN_SHARE_TTL_DAYS || n > MAX_SHARE_TTL_DAYS) {
      throw new BadRequestException(
        `有效期需为 ${MIN_SHARE_TTL_DAYS}~${MAX_SHARE_TTL_DAYS} 天的整数`,
      );
    }
    return n;
  }

  /** 生成只读分享链接：写 ShareLink 记录 + 签发带 jti 的 token（需家庭版权益 + 报告归属校验） */
  async createShareLink(userId: string, reportId: string, expiresInDays?: number | string) {
    // 权益校验：非家庭版抛 402
    await this.memberService.assertShareAccess(userId);

    const ttlDays = this.resolveTtlDays(expiresInDays);

    const report = await this.prisma.report.findFirst({
      where: { id: reportId, userId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('报告不存在');

    const expiresAt = new Date(Date.now() + ttlDays * DAY_MS);

    // 先落记录，token 的 jti 指向它，从而支持后续撤销 / 权威过期校验
    const link = await this.prisma.shareLink.create({
      data: { userId, reportId, expiresAt },
    });

    const token = this.jwtService.sign(
      { scope: 'share', reportId, ownerId: userId, jti: link.id },
      { expiresIn: ttlDays * 60 * 60 }, // 秒
    );

    return {
      token,
      // 前端拼接完整地址：`${window.location.origin}/share/report/${token}`
      path: `/share/report/${token}`,
      shareId: link.id,
      reportId,
      expiresAt: expiresAt.toISOString(),
      expiresInDays: ttlDays,
    };
  }

  /** 凭 token 免登录获取只读报告（校验签名/记录权威撤销与过期/归属，并累计访问） */
  async getSharedReport(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new ForbiddenException('分享链接无效或已过期');
    }

    if (payload.scope !== 'share' || !payload.reportId || !payload.ownerId || !payload.jti) {
      throw new ForbiddenException('分享链接无效');
    }

    // 以 ShareLink 记录为权威：撤销 / 过期即刻失效（旧 token 无法绕过）
    const link = await this.prisma.shareLink.findUnique({ where: { id: payload.jti } });
    if (!link) throw new ForbiddenException('分享链接已失效');
    if (link.revokedAt) throw new ForbiddenException('分享链接已被撤销');
    if (link.expiresAt.getTime() < Date.now()) throw new ForbiddenException('分享链接已过期');

    const report = await this.prisma.report.findFirst({
      where: { id: payload.reportId, userId: payload.ownerId, deletedAt: null },
      include: {
        member: { select: { name: true, relation: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!report) throw new NotFoundException('报告不存在或已被删除');

    // 访问计数为旁路信息，失败不阻断查看
    try {
      await this.prisma.shareLink.update({
        where: { id: link.id },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      });
    } catch {
      /* 忽略计数失败 */
    }

    return this.toShareDto(report);
  }

  /** 我的分享链接列表（可按报告过滤），用于管理端撤销；active = 未撤销且未过期 */
  async listMyShareLinks(userId: string, reportId?: string) {
    const where: any = { userId };
    if (reportId) where.reportId = reportId;
    const now = Date.now();
    const links = await this.prisma.shareLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return links.map((l: any) => ({
      shareId: l.id,
      reportId: l.reportId,
      expiresAt: l.expiresAt,
      revokedAt: l.revokedAt,
      viewCount: l.viewCount,
      lastViewedAt: l.lastViewedAt,
      createdAt: l.createdAt,
      active: !l.revokedAt && l.expiresAt.getTime() > now,
    }));
  }

  /** 撤销分享链接（仅 owner 可撤；幂等：重复撤销不报错） */
  async revokeShareLink(userId: string, shareId: string) {
    const link = await this.prisma.shareLink.findFirst({ where: { id: shareId, userId } });
    if (!link) throw new NotFoundException('分享链接不存在');
    if (link.revokedAt) return { shareId, revoked: true, revokedAt: link.revokedAt };
    const updated = await this.prisma.shareLink.update({
      where: { id: shareId },
      data: { revokedAt: new Date() },
    });
    return { shareId, revoked: true, revokedAt: updated.revokedAt };
  }

  /** 只读脱敏：仅暴露展示所需字段，隐藏 userId 等内部标识 */
  private toShareDto(report: any) {
    return {
      reportDate: report.reportDate,
      reportType: report.reportType,
      categoryL1: report.categoryL1,
      categoryL2: report.categoryL2,
      hospital: report.hospital,
      department: report.department,
      summary: report.summary,
      member: report.member,
      items: (report.items || []).map((it: any) => ({
        name: it.name,
        value: it.value,
        unit: it.unit,
        referenceMin: it.referenceMin,
        referenceMax: it.referenceMax,
        referenceText: it.referenceText,
        abnormal: it.abnormal,
      })),
      images: (report.images || []).map((img: any) => ({
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
      })),
    };
  }
}
