import { NotFoundException } from '@nestjs/common';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let prisma: any;
  let service: ReportService;

  const USER_ID = 'user-1';

  beforeEach(() => {
    prisma = {
      report: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      reportItem: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        groupBy: jest.fn(),
      },
    };
    service = new ReportService(prisma);
  });

  describe('findAll', () => {
    it('返回分页契约 {total,items,page,pageSize}，默认 page=1 pageSize=20', async () => {
      prisma.report.count.mockResolvedValue(3);
      prisma.report.findMany.mockResolvedValue([{ id: 'r1' }]);

      const res = await service.findAll(USER_ID, {});

      expect(res).toEqual({ total: 3, items: [{ id: 'r1' }], page: 1, pageSize: 20 });
      // 必须过滤软删除并限定归属用户
      expect(prisma.report.findMany.mock.calls[0][0].where).toMatchObject({
        userId: USER_ID,
        deletedAt: null,
      });
    });

    it('memberId/reportType 筛选透传 where，日期范围转 Date', async () => {
      prisma.report.count.mockResolvedValue(0);
      prisma.report.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, {
        memberId: 'm1',
        reportType: 'LAB',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        page: 2,
        pageSize: 5,
      });

      const arg = prisma.report.findMany.mock.calls[0][0];
      expect(arg.where).toMatchObject({ memberId: 'm1', reportType: 'LAB' });
      expect(arg.where.reportDate.gte).toEqual(new Date('2026-01-01'));
      expect(arg.where.reportDate.lte).toEqual(new Date('2026-06-30'));
      expect(arg.skip).toBe(5); // (2-1)*5
      expect(arg.take).toBe(5);
    });
  });

  describe('findOne', () => {
    it('不存在时抛 NotFoundException', async () => {
      prisma.report.findFirst.mockResolvedValue(null);
      await expect(service.findOne(USER_ID, 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('查询条件包含 userId 归属校验与软删除过滤', async () => {
      prisma.report.findFirst.mockResolvedValue({ id: 'r1' });
      await service.findOne(USER_ID, 'r1');
      expect(prisma.report.findFirst.mock.calls[0][0].where).toEqual({
        id: 'r1',
        userId: USER_ID,
        deletedAt: null,
      });
    });
  });

  describe('create', () => {
    it('items/images 拆为嵌套 create，reportDate 转 Date', async () => {
      prisma.report.create.mockResolvedValue({ id: 'r1' });

      await service.create(USER_ID, {
        title: '血常规',
        reportDate: '2026-05-01',
        items: [{ name: 'WBC', value: '6.1', isNumeric: true }],
        images: [{ url: '/uploads/a.png' }],
      });

      const arg = prisma.report.create.mock.calls[0][0];
      expect(arg.data).toMatchObject({ userId: USER_ID, title: '血常规' });
      expect(arg.data.reportDate).toEqual(new Date('2026-05-01'));
      expect(arg.data.items).toEqual({ create: [{ name: 'WBC', value: '6.1', isNumeric: true }] });
      expect(arg.data.images).toEqual({ create: [{ url: '/uploads/a.png' }] });
      // 顶层不应再带 items/images（避免非法字段）
      expect(arg.data.items instanceof Array).toBe(false);
    });

    it('无 items/images 时对应字段为 undefined', async () => {
      prisma.report.create.mockResolvedValue({ id: 'r2' });
      await service.create(USER_ID, { reportDate: '2026-05-01' });
      const data = prisma.report.create.mock.calls[0][0].data;
      expect(data.items).toBeUndefined();
      expect(data.images).toBeUndefined();
    });
  });

  describe('update', () => {
    it('先验证归属（findOne），有 items 时先 deleteMany 重建', async () => {
      prisma.report.findFirst.mockResolvedValue({ id: 'r1' });
      prisma.report.update.mockResolvedValue({ id: 'r1' });

      await service.update(USER_ID, 'r1', { items: [{ name: 'PLT' }] });

      expect(prisma.reportItem.deleteMany).toHaveBeenCalledWith({ where: { reportId: 'r1' } });
      expect(prisma.report.update.mock.calls[0][0].data.items).toEqual({ create: [{ name: 'PLT' }] });
    });
  });

  describe('remove', () => {
    it('软删除：update deletedAt 而非 delete', async () => {
      prisma.report.findFirst.mockResolvedValue({ id: 'r1' });
      prisma.report.update.mockResolvedValue({ id: 'r1' });

      await service.remove(USER_ID, 'r1');

      expect(prisma.report.delete).toBeUndefined(); // 绝无硬删除 API
      const arg = prisma.report.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: 'r1' });
      expect(arg.data.deletedAt).toBeInstanceOf(Date);
    });

    it('无权访问他人报告时抛 NotFoundException 且不执行删除', async () => {
      prisma.report.findFirst.mockResolvedValue(null);
      await expect(service.remove('other-user', 'r1')).rejects.toThrow(NotFoundException);
      expect(prisma.report.update).not.toHaveBeenCalled();
    });
  });

  describe('getTrend', () => {
    it('过滤无匹配指标的报告，映射为 {date,value,unit,abnormal} 结构', async () => {
      prisma.report.findMany.mockResolvedValue([
        {
          id: 'r1',
          reportDate: new Date('2026-01-01'),
          items: [{ value: '6.1', unit: '10^9/L', abnormal: false, referenceMin: '3.5', referenceMax: '9.5' }],
        },
        { id: 'r2', reportDate: new Date('2026-02-01'), items: [] }, // 无该指标
        {
          id: 'r3',
          reportDate: new Date('2026-03-01'),
          items: [{ value: '12.8', unit: '10^9/L', abnormal: true, referenceMin: '3.5', referenceMax: '9.5' }],
        },
      ]);

      const res = await service.getTrend(USER_ID, { memberId: 'm1', itemName: 'WBC' });

      expect(res).toHaveLength(2); // r2 被过滤
      expect(res[0]).toEqual({
        date: new Date('2026-01-01'),
        value: 6.1,
        unit: '10^9/L',
        abnormal: false,
        referenceMin: '3.5',
        referenceMax: '9.5',
        reportId: 'r1',
      });
      expect(res[1].value).toBe(12.8);
      expect(res[1].abnormal).toBe(true);
    });
  });

  describe('search', () => {
    it('按医院/摘要/指标名 OR 模糊匹配，限定本人且未删除，上限 50 条', async () => {
      prisma.report.findMany.mockResolvedValue([]);

      await service.search(USER_ID, '协和');

      const arg = prisma.report.findMany.mock.calls[0][0];
      expect(arg.where.userId).toBe(USER_ID);
      expect(arg.where.deletedAt).toBeNull();
      expect(arg.where.OR).toHaveLength(3);
      expect(arg.take).toBe(50);
    });
  });
});
