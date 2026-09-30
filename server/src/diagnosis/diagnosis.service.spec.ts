import { NotFoundException } from '@nestjs/common';
import { DiagnosisService } from './diagnosis.service';

describe('DiagnosisService', () => {
  let prisma: any;
  let service: DiagnosisService;

  const USER_ID = 'user-1';

  beforeEach(() => {
    prisma = {
      diagnosis: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new DiagnosisService(prisma);
  });

  describe('findAll', () => {
    it('返回分页契约，visitDate 倒序，过滤软删除', async () => {
      prisma.diagnosis.count.mockResolvedValue(1);
      prisma.diagnosis.findMany.mockResolvedValue([{ id: 'd1' }]);

      const res = await service.findAll(USER_ID, {});

      expect(res).toEqual({ total: 1, items: [{ id: 'd1' }], page: 1, pageSize: 20 });
      const arg = prisma.diagnosis.findMany.mock.calls[0][0];
      expect(arg.where).toMatchObject({ userId: USER_ID, deletedAt: null });
      expect(arg.orderBy).toEqual({ visitDate: 'desc' });
    });

    it('日期范围筛选转 Date gte/lte', async () => {
      prisma.diagnosis.count.mockResolvedValue(0);
      prisma.diagnosis.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { startDate: '2026-01-01', endDate: '2026-12-31' });

      const where = prisma.diagnosis.findMany.mock.calls[0][0].where;
      expect(where.visitDate.gte).toEqual(new Date('2026-01-01'));
      expect(where.visitDate.lte).toEqual(new Date('2026-12-31'));
    });
  });

  describe('findOne', () => {
    it('不存在或不属于本人时抛 NotFoundException', async () => {
      prisma.diagnosis.findFirst.mockResolvedValue(null);
      await expect(service.findOne(USER_ID, 'd-x')).rejects.toThrow(NotFoundException);
    });

    it('存在时返回并带 member/images 关联', async () => {
      prisma.diagnosis.findFirst.mockResolvedValue({ id: 'd1', member: {}, images: [] });
      const res = await service.findOne(USER_ID, 'd1');
      expect(res.id).toBe('d1');
      expect(prisma.diagnosis.findFirst.mock.calls[0][0].include).toHaveProperty('member');
    });
  });

  describe('create', () => {
    it('visitDate 转 Date，nextVisitDate 缺省时为 undefined，images 嵌套 create', async () => {
      prisma.diagnosis.create.mockResolvedValue({ id: 'd1' });

      await service.create(USER_ID, {
        hospital: '协和',
        visitDate: '2026-05-01',
        images: [{ url: '/uploads/d.png' }],
      });

      const data = prisma.diagnosis.create.mock.calls[0][0].data;
      expect(data.userId).toBe(USER_ID);
      expect(data.visitDate).toEqual(new Date('2026-05-01'));
      expect(data.nextVisitDate).toBeUndefined();
      expect(data.images).toEqual({ create: [{ url: '/uploads/d.png' }] });
    });

    it('nextVisitDate 提供时同样转 Date（复诊提醒依赖）', async () => {
      prisma.diagnosis.create.mockResolvedValue({ id: 'd2' });

      await service.create(USER_ID, { visitDate: '2026-05-01', nextVisitDate: '2026-06-01' });

      const data = prisma.diagnosis.create.mock.calls[0][0].data;
      expect(data.nextVisitDate).toEqual(new Date('2026-06-01'));
      expect(data.images).toBeUndefined();
    });
  });

  describe('update', () => {
    it('先做归属校验，未提供 visitDate 时不强制转换', async () => {
      prisma.diagnosis.findFirst.mockResolvedValue({ id: 'd1' });
      prisma.diagnosis.update.mockResolvedValue({ id: 'd1' });

      await service.update(USER_ID, 'd1', { advice: '低盐饮食' });

      expect(prisma.diagnosis.findFirst).toHaveBeenCalled();
      const data = prisma.diagnosis.update.mock.calls[0][0].data;
      expect(data.advice).toBe('低盐饮食');
      expect(data.visitDate).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('软删除：置 deletedAt', async () => {
      prisma.diagnosis.findFirst.mockResolvedValue({ id: 'd1' });
      prisma.diagnosis.update.mockResolvedValue({ id: 'd1' });

      await service.remove(USER_ID, 'd1');

      expect(prisma.diagnosis.update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
    });

    it('越权删除他人记录时抛错且不执行 update', async () => {
      prisma.diagnosis.findFirst.mockResolvedValue(null);
      await expect(service.remove('other', 'd1')).rejects.toThrow(NotFoundException);
      expect(prisma.diagnosis.update).not.toHaveBeenCalled();
    });
  });
});
