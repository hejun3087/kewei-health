import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });
  }

  async getUserById(userId: string) {
    const { password, ...user } = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { familyMembers: true },
    });
    return user;
  }

  async deleteAccount(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
  }
}
