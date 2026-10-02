import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MemberService } from '../member/member.service';

/**
 * 报告分享（4.3.2）
 *
 * 权益：仅家庭版可生成分享链接（memberService.assertShareAccess 抛 402 付费墙）。
 * 设计：不新增数据表，用 JWT 签发只读分享 token（scope=share + reportId + ownerId，
 *   有效期 30 天）。查看端凭 token 免登录读取，且校验归属，返回脱敏只读数据。
 * 安全：分享 token 无 sub，jwt.strategy 已拒绝其作为登录凭证；反之登录 token
 *   无 scope=share，无法访问分享查看逻辑。
 */
const SHARE_TTL = '30d';

@Injectable()
export class ShareService {
  constructor(
    private prisma: PrismaService,
    private memberService: MemberService,
    private jwtService: JwtService,
  ) {}

  /** 生成只读分享 token（需家庭版权益 + 报告归属校验） */
  async createShareLink(userId: string, reportId: string) {
    // 权益校验：非家庭版抛 402
    await this.memberService.assertShareAccess(userId);

    const report = await this.prisma.report.findFirst({
      where: { id: reportId, userId, deletedAt: null },
    });
    if (!report) throw new NotFoundException('报告不存在');

    const token = this.jwtService.sign(
      { scope: 'share', reportId, ownerId: userId },
      { expiresIn: SHARE_TTL },
    );

    return {
      token,
      // 前端拼接完整地址：`${window.location.origin}/share/report/${token}`
      path: `/share/report/${token}`,
      reportId,
      expiresInDays: 30,
    };
  }

  /** 凭 token 免登录获取只读报告（校验签名/有效期/归属） */
  async getSharedReport(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new ForbiddenException('分享链接无效或已过期');
    }

    if (payload.scope !== 'share' || !payload.reportId || !payload.ownerId) {
      throw new ForbiddenException('分享链接无效');
    }

    const report = await this.prisma.report.findFirst({
      where: { id: payload.reportId, userId: payload.ownerId, deletedAt: null },
      include: {
        member: { select: { name: true, relation: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!report) throw new NotFoundException('报告不存在或已被删除');

    return this.toShareDto(report);
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
