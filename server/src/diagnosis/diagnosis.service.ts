import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiagnosisService {
  constructor(private prisma: PrismaService) {}

  // 获取诊断记录列表（就诊时间线）
  async findAll(userId: string, query: {
    memberId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = { userId, deletedAt: null };
    if (query.memberId) where.memberId = query.memberId;
    if (query.startDate || query.endDate) {
      where.visitDate = {};
      if (query.startDate) where.visitDate.gte = new Date(query.startDate);
      if (query.endDate) where.visitDate.lte = new Date(query.endDate);
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const [total, items] = await Promise.all([
      this.prisma.diagnosis.count({ where }),
      this.prisma.diagnosis.findMany({
        where,
        include: {
          member: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { visitDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, items, page, pageSize };
  }

  // 获取诊断详情
  async findOne(userId: string, diagnosisId: string) {
    const diagnosis = await this.prisma.diagnosis.findFirst({
      where: { id: diagnosisId, userId, deletedAt: null },
      include: {
        member: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!diagnosis) throw new NotFoundException('诊断记录不存在');
    return diagnosis;
  }

  // 创建诊断记录（AI识别后保存）
  async create(userId: string, data: any) {
    const { images, ...diagnosisData } = data;

    return this.prisma.diagnosis.create({
      data: {
        userId,
        ...diagnosisData,
        visitDate: new Date(diagnosisData.visitDate),
        nextVisitDate: diagnosisData.nextVisitDate ? new Date(diagnosisData.nextVisitDate) : undefined,
        images: images ? { create: images } : undefined,
      },
      include: { images: true },
    });
  }

  // 更新诊断记录
  async update(userId: string, diagnosisId: string, data: any) {
    await this.findOne(userId, diagnosisId);
    const { images, ...diagnosisData } = data;

    return this.prisma.diagnosis.update({
      where: { id: diagnosisId },
      data: {
        ...diagnosisData,
        visitDate: diagnosisData.visitDate ? new Date(diagnosisData.visitDate) : undefined,
        nextVisitDate: diagnosisData.nextVisitDate ? new Date(diagnosisData.nextVisitDate) : undefined,
      },
      include: { images: true },
    });
  }

  // 软删除诊断记录
  async remove(userId: string, diagnosisId: string) {
    await this.findOne(userId, diagnosisId);
    return this.prisma.diagnosis.update({
      where: { id: diagnosisId },
      data: { deletedAt: new Date() },
    });
  }
}
