import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FamilyMemberService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.familyMember.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(userId: string, memberId: string) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, userId },
    });
    if (!member) throw new NotFoundException('家庭成员不存在');
    return member;
  }

  async create(userId: string, data: {
    name: string;
    relation: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    avatar?: string;
  }) {
    return this.prisma.familyMember.create({
      data: {
        userId,
        name: data.name,
        relation: data.relation as any,
        gender: data.gender,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        avatar: data.avatar,
      },
    });
  }

  async update(userId: string, memberId: string, data: any) {
    await this.findOne(userId, memberId); // 验证归属
    return this.prisma.familyMember.update({
      where: { id: memberId },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    });
  }

  async remove(userId: string, memberId: string) {
    await this.findOne(userId, memberId);
    return this.prisma.familyMember.delete({ where: { id: memberId } });
  }
}
