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

  // 复诊预警：未来 N 天内到期 + 近 30 天已逾期的就诊提醒
  async getUpcomingVisits(userId: string, days = 7) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upper = new Date(today);
    upper.setDate(upper.getDate() + days);
    const lower = new Date(today);
    lower.setDate(lower.getDate() - 30); // 逾期一个月的也提醒（补录/遗忘场景）

    const list = await this.prisma.diagnosis.findMany({
      where: {
        userId,
        deletedAt: null,
        nextVisitDate: { gte: lower, lte: upper },
      },
      include: { member: true },
      orderBy: { nextVisitDate: 'asc' },
    });

    return list.map((d: any) => {
      const diffDays = Math.round(
        (new Date(d.nextVisitDate).getTime() - today.getTime()) / 86400000,
      );
      return { ...d, daysLeft: diffDays, overdue: diffDays < 0 };
    });
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
