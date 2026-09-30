import { NotFoundException } from '@nestjs/common';
import { MedicationService } from './medication.service';

describe('MedicationService', () => {
  let prisma: any;
  let service: MedicationService;

  const USER_ID = 'user-1';

  beforeEach(() => {
    prisma = {
      medication: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new MedicationService(prisma);
  });

  describe('findAll', () => {
    it('返回分页契约 {total,items,page,pageSize}', async () => {
      prisma.medication.count.mockResolvedValue(2);
      prisma.medication.findMany.mockResolvedValue([{ id: 'm1' }]);

      const res = await service.findAll(USER_ID, {});

      expect(res).toEqual({ total: 2, items: [{ id: 'm1' }], page: 1, pageSize: 20 });
      expect(prisma.medication.findMany.mock.calls[0][0].where).toMatchObject({
        userId: USER_ID,
        deletedAt: null,
      });
    });

    it('status=USING 筛选透传（当前用药 Tab 依赖）', async () => {
      prisma.medication.count.mockResolvedValue(0);
      prisma.medication.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { status: 'USING', memberId: 'mem-1' });

      expect(prisma.medication.findMany.mock.calls[0][0].where).toMatchObject({
        status: 'USING',
        memberId: 'mem-1',
      });
    });
  });

  describe('findOne', () => {
    it('不存在或越权时抛 NotFoundException', async () => {
      prisma.medication.findFirst.mockResolvedValue(null);
      await expect(service.findOne(USER_ID, 'bad')).rejects.toThrow(NotFoundException);
      expect(prisma.medication.findFirst.mock.calls[0][0].where).toEqual({
        id: 'bad',
        userId: USER_ID,
        deletedAt: null,
      });
    });
  });

  describe('create', () => {
    it('startDate/endDate 转 Date，缺省不写入', async () => {
      prisma.medication.create.mockResolvedValue({ id: 'm1' });

      await service.create(USER_ID, {
        drugName: '二甲双胍',
        startDate: '2026-01-10',
      });

      const data = prisma.medication.create.mock.calls[0][0].data;
      expect(data.userId).toBe(USER_ID);
      expect(data.drugName).toBe('二甲双胍');
      expect(data.startDate).toEqual(new Date('2026-01-10'));
      expect(data.endDate).toBeUndefined();
    });
  });

  describe('update', () => {
    it('先归属校验再更新，置停用状态可正常传递', async () => {
      prisma.medication.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.medication.update.mockResolvedValue({ id: 'm1' });

      await service.update(USER_ID, 'm1', { status: 'STOPPED' });

      expect(prisma.medication.findFirst).toHaveBeenCalled();
      expect(prisma.medication.update.mock.calls[0][0].data.status).toBe('STOPPED');
    });

    it('越权更新抛 NotFoundException 且不落库', async () => {
      prisma.medication.findFirst.mockResolvedValue(null);
      await expect(service.update('other', 'm1', { status: 'STOPPED' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.medication.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('软删除：update deletedAt', async () => {
      prisma.medication.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.medication.update.mockResolvedValue({ id: 'm1' });

      await service.remove(USER_ID, 'm1');

      expect(prisma.medication.update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('getCurrentMedications', () => {
    it('只查 USING 且未删除的记录', async () => {
      prisma.medication.findMany.mockResolvedValue([]);

      await service.getCurrentMedications(USER_ID, 'mem-1');

      expect(prisma.medication.findMany.mock.calls[0][0].where).toEqual({
        userId: USER_ID,
        memberId: 'mem-1',
        status: 'USING',
        deletedAt: null,
      });
    });
  });
});
