import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

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

    const token = this.jwtService.sign({ sub: user.id, phone: user.phone });
    return { token, user: this.sanitizeUser(user) };
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

    const token = this.jwtService.sign({ sub: user.id, phone: user.phone });
    return { token, user: this.sanitizeUser(user) };
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

    const token = this.jwtService.sign({ sub: user.id, phone: user.phone });
    return { token, user: this.sanitizeUser(user) };
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

    const token = this.jwtService.sign({ sub: user.id });
    return { token, user: this.sanitizeUser(user) };
  }

  // 验证Token
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: any) {
    const { password, ...result } = user;
    // BigInt 转 String，避免 JSON 序列化报错
    return {
      ...result,
      storageUsed: result.storageUsed?.toString() || '0',
      storageLimit: result.storageLimit?.toString() || '1073741824',
    };
  }
}
