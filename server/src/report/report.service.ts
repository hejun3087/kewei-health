import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppCacheService } from '../common/app-cache.service';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    // 可选注入：单元测试直接 new ReportService(prisma) 时 cache 为 undefined，走无缓存分支
    @Optional() private cache?: AppCacheService,
  ) {}

  // 获取报告列表（时间线）
  async findAll(userId: string, query: {
    memberId?: string;
    categoryL1?: string;
    reportType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const where: any = { userId, deletedAt: null };
    if (query.memberId) where.memberId = query.memberId;
    if (query.categoryL1) where.categoryL1 = query.categoryL1;
    if (query.reportType) where.reportType = query.reportType;
    if (query.startDate || query.endDate) {
      where.reportDate = {};
      if (query.startDate) where.reportDate.gte = new Date(query.startDate);
      if (query.endDate) where.reportDate.lte = new Date(query.endDate);
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;

    const [total, items] = await Promise.all([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        include: {
          member: true,
          items: { where: { isNumeric: true }, orderBy: { sortOrder: 'asc' } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
        orderBy: { reportDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { total, items, page, pageSize };
  }

  // 获取报告详情
  async findOne(userId: string, reportId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, userId, deletedAt: null },
      include: {
        member: true,
        items: { orderBy: { sortOrder: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        medications: true,
      },
    });
    if (!report) throw new NotFoundException('报告不存在');
    return report;
  }

  // 创建报告（AI识别后保存）
  async create(userId: string, data: any) {
    const { items, images, ...reportData } = data;

    const created = await this.prisma.report.create({
      data: {
        userId,
        ...reportData,
        reportDate: new Date(reportData.reportDate),
        items: items ? { create: items } : undefined,
        images: images ? { create: images } : undefined,
      },
      include: { items: true, images: true },
    });
    await this.cache?.bump(userId); // 写后失效：趋势/概览缓存版本+1
    return created;
  }

  // 更新报告
  async update(userId: string, reportId: string, data: any) {
    await this.findOne(userId, reportId); // 验证归属
    const { items, images, ...reportData } = data;

    // 如果有items更新，先删除再重建
    if (items) {
      await this.prisma.reportItem.deleteMany({ where: { reportId } });
    }

    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        ...reportData,
        reportDate: reportData.reportDate ? new Date(reportData.reportDate) : undefined,
        items: items ? { create: items } : undefined,
      },
      include: { items: true, images: true },
    });
    await this.cache?.bump(userId);
    return updated;
  }

  // 软删除报告
  async remove(userId: string, reportId: string) {
    await this.findOne(userId, reportId);
    const removed = await this.prisma.report.update({
      where: { id: reportId },
      data: { deletedAt: new Date() },
    });
    await this.cache?.bump(userId);
    return removed;
  }

  // 获取指标趋势数据（读多写少，接入缓存）
  async getTrend(userId: string, query: {
    memberId: string;
    itemName: string;
    startDate?: string;
    endDate?: string;
  }) {
    if (!this.cache) return this.computeTrend(userId, query);
    return this.cache.getOrSet('trend', userId, query, () => this.computeTrend(userId, query));
  }

  private async computeTrend(userId: string, query: {
    memberId: string;
    itemName: string;
    startDate?: string;
    endDate?: string;
  }) {
    const reports = await this.prisma.report.findMany({
      where: {
        userId,
        memberId: query.memberId,
        deletedAt: null,
        reportDate: {
          gte: query.startDate ? new Date(query.startDate) : new Date('2000-01-01'),
          lte: query.endDate ? new Date(query.endDate) : new Date(),
        },
      },
      include: {
        items: {
          where: { name: query.itemName, isNumeric: true },
        },
      },
      orderBy: { reportDate: 'asc' },
    });

    return reports
      .filter(r => r.items.length > 0)
      .map(r => ({
        date: r.reportDate,
        value: parseFloat(r.items[0].value),
        unit: r.items[0].unit,
        abnormal: r.items[0].abnormal,
        referenceMin: r.items[0].referenceMin,
        referenceMax: r.items[0].referenceMax,
        reportId: r.id,
      }));
  }

  // 获取可追踪的指标列表（有历史数据的数值型指标）
  async getTrackableItems(userId: string, memberId: string) {
    const items = await this.prisma.reportItem.findMany({
      where: {
        report: { userId, memberId, deletedAt: null },
        isNumeric: true,
      },
      select: {
        name: true,
        unit: true,
        referenceMin: true,
        referenceMax: true,
        referenceText: true,
      },
      distinct: ['name'],
    });

    // 统计每个指标的出现次数
    const itemCounts = await this.prisma.reportItem.groupBy({
      by: ['name'],
      where: {
        report: { userId, memberId, deletedAt: null },
        isNumeric: true,
      },
      _count: { name: true },
    });

    const countMap = new Map(itemCounts.map(i => [i.name, i._count.name]));

    return items.map(item => ({
      ...item,
      count: countMap.get(item.name) || 0,
    })).sort((a, b) => b.count - a.count);
  }

  // 搜索报告
  async search(userId: string, keyword: string) {
    return this.prisma.report.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { hospital: { contains: keyword, mode: 'insensitive' } },
          { summary: { contains: keyword, mode: 'insensitive' } },
          { items: { some: { name: { contains: keyword, mode: 'insensitive' } } } },
        ],
      },
      include: { items: true, images: true, member: true },
      orderBy: { reportDate: 'desc' },
      take: 50,
    });
  }

  // 获取首页概览（读多写少，接入缓存）
  async getDashboard(userId: string, memberId: string) {
    if (!this.cache) return this.computeDashboard(userId, memberId);
    return this.cache.getOrSet('dashboard', userId, { memberId }, () =>
      this.computeDashboard(userId, memberId),
    );
  }

  private async computeDashboard(userId: string, memberId: string) {
    const [recentReports, totalReports, trackableItems] = await Promise.all([
      // 最近5条记录
      this.prisma.report.findMany({
        where: { userId, memberId, deletedAt: null },
        include: { items: { take: 5 }, images: { take: 1 } },
        orderBy: { reportDate: 'desc' },
        take: 5,
      }),
      // 总报告数
      this.prisma.report.count({ where: { userId, memberId, deletedAt: null } }),
      // 可追踪指标
      this.getTrackableItems(userId, memberId),
    ]);

    return {
      recentReports,
      totalReports,
      trackableItems: trackableItems.slice(0, 10), // 首页展示前10个指标
    };
  }
}
