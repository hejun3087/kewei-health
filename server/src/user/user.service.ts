import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptField, decryptField } from '../common/crypto/encryption';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /** 敏感健康字段解密（过敏史/慢性病史），保证返回给客户端的是明文；存量明文原样返回。 */
  private decryptHealthFields<T extends { allergyHistory?: string | null; medicalHistory?: string | null }>(user: T | null): T | null {
    if (!user) return user;
    return {
      ...user,
      allergyHistory: decryptField(user.allergyHistory),
      medicalHistory: decryptField(user.medicalHistory),
    };
  }

  async updateProfile(userId: string, data: {
    nickname?: string;
    avatar?: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    height?: number;
    weight?: number;
    allergyHistory?: string;
    medicalHistory?: string;
  }) {
    // 静态加密（PIA R-2）：仅在字段被提交时加密敏感健康文本
    const writeData: Record<string, any> = {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    };
    if ('allergyHistory' in data) writeData.allergyHistory = encryptField(data.allergyHistory);
    if ('medicalHistory' in data) writeData.medicalHistory = encryptField(data.medicalHistory);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: writeData,
    });
    const { password, ...result } = updated as any;
    return this.decryptHealthFields(result);
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { familyMembers: true },
    });
    if (!user) return null;
    const { password, ...result } = user;
    return this.decryptHealthFields(result);
  }

  async deleteAccount(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
  }
}
