import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicationService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: { memberId?: string; status?: string; page?: number; pageSize?: number }) {
    const where: any = { userId, deletedAt: null };
    if (query.memberId) where.memberId = query.memberId;
    if (query.status) where.status = query.status;

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const [total, items] = await Promise.all([
      this.prisma.medication.count({ where }),
      this.prisma.medication.findMany({
        where,
        include: { member: true },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, items, page, pageSize };
  }

  async findOne(userId: string, id: string) {
    const med = await this.prisma.medication.findFirst({ where: { id, userId, deletedAt: null } });
    if (!med) throw new NotFoundException('用药记录不存在');
    return med;
  }

  async create(userId: string, data: any) {
    return this.prisma.medication.create({
      data: {
        userId,
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async update(userId: string, id: string, data: any) {
    await this.findOne(userId, id);
    return this.prisma.medication.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.medication.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // 获取当前在用药物
  async getCurrentMedications(userId: string, memberId: string) {
    return this.prisma.medication.findMany({
      where: { userId, memberId, status: 'USING', deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
  }
}
