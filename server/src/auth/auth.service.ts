import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { decryptField } from '../common/crypto/encryption';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /** 账号状态校验：非 ACTIVE（已注销 DELETED / 已禁用 DISABLED）不得登录，确保注销后无法重新获取访问权（合规 6.1.8） */
  private assertActive(user: { status?: string }) {
    if (user.status && user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        user.status === 'DELETED' ? '账号已注销，无法登录' : '账号已被禁用',
      );
    }
  }

  /**
   * 读取用户当前活跃角色列表（docs/rbac-design.md P0）：
   * 仅取 `revokedAt IS NULL` 行（软撤销保留历史）。新建档用户默认无任何管理角色，返回空数组。
   * 失败（无 userRole 表/异常）回退为空数组，不阻断登录主链路（JWT payload 无 roles 时 Guard 自然 403）。
   */
  private async loadUserRoles(userId: string): Promise<string[]> {
    try {
      const rows = await this.prisma.userRole.findMany({
        where: { userId, revokedAt: null },
        select: { role: true },
      });
      return rows.map((r: { role: string }) => r.role);
    } catch {
      return [];
    }
  }

  // 手机号 + 验证码登录（简化版：验证码暂不实现，直接用手机号注册/登录）
  async loginByPhone(phone: string) {
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      // 自动注册
      user = await this.prisma.user.create({
        data: {
          phone,
          nickname: `用户${phone.slice(-4)}`,
        },
      });
      // 自动创建默认家庭成员（本人）
      await this.prisma.familyMember.create({
        data: {
          userId: user.id,
          name: user.nickname || '本人',
          relation: 'SELF',
          isDefault: true,
        },
      });
    }

    this.assertActive(user);
    const roles = await this.loadUserRoles(user.id);
    const token = this.jwtService.sign({ sub: user.id, phone: user.phone, roles });
    return { token, user: this.sanitizeUser(user, roles) };
  }

  // 账号密码登录
  async loginByPassword(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.password) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    this.assertActive(user);
    const roles = await this.loadUserRoles(user.id);
    const token = this.jwtService.sign({ sub: user.id, phone: user.phone, roles });
    return { token, user: this.sanitizeUser(user, roles) };
  }

  // 注册（设置密码）
  async register(phone: string, password: string, nickname?: string) {
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new UnauthorizedException('该手机号已注册');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { phone, password: hashedPassword, nickname: nickname || `用户${phone.slice(-4)}` },
    });

    // 创建默认家庭成员
    await this.prisma.familyMember.create({
      data: {
        userId: user.id,
        name: user.nickname || '本人',
        relation: 'SELF',
        isDefault: true,
      },
    });

    // 新建账号无角色（SUPER_ADMIN 由 seed 脚本事后分配）
    const roles = await this.loadUserRoles(user.id);
    const token = this.jwtService.sign({ sub: user.id, phone: user.phone, roles });
    return { token, user: this.sanitizeUser(user, roles) };
  }

  // 微信登录
  async loginByWechat(openId: string, unionId?: string) {
    let user = await this.prisma.user.findUnique({ where: { wxOpenId: openId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: `wx_${openId}`, // 临时手机号
          wxOpenId: openId,
          wxUnionId: unionId,
          nickname: '微信用户',
        },
      });
      await this.prisma.familyMember.create({
        data: {
          userId: user.id,
          name: '本人',
          relation: 'SELF',
          isDefault: true,
        },
      });
    }

    this.assertActive(user);
    const roles = await this.loadUserRoles(user.id);
    const token = this.jwtService.sign({ sub: user.id, roles });
    return { token, user: this.sanitizeUser(user, roles) };
  }

  // 验证Token
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }
    const roles = await this.loadUserRoles(userId);
    return this.sanitizeUser(user, roles);
  }

  private sanitizeUser(user: any, roles: string[] = []) {
    const { password, ...result } = user;
    // BigInt 转 String，避免 JSON 序列化报错
    return {
      ...result,
      // 敏感健康字段静态解密（PIA R-2）后返回：登录/刷新//auth/me 统一走此收敛点
      allergyHistory: decryptField(result.allergyHistory),
      medicalHistory: decryptField(result.medicalHistory),
      storageUsed: result.storageUsed?.toString() || '0',
      storageLimit: result.storageLimit?.toString() || '1073741824',
      // RBAC P0：前端据此显隐管理端菜单/路由；JWT payload 同名字段为签发时快照
      roles,
    };
  }
}
