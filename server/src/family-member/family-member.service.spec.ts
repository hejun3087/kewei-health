import { NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { FamilyMemberService } from './family-member.service';

describe('FamilyMemberService', () => {
  let prisma: any;
  let memberService: any;
  let service: FamilyMemberService;

  const USER_ID = 'u1';

  beforeEach(() => {
    prisma = {
      familyMember: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    memberService = { getMemberLimit: jest.fn() };
    service = new FamilyMemberService(prisma, memberService);
  });

  describe('findAll', () => {
    it('按 userId 过滤，默认成员优先、创建时间升序', async () => {
      prisma.familyMember.findMany.mockResolvedValue([{ id: 'm1' }]);

      const res = await service.findAll(USER_ID);

      expect(prisma.familyMember.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      expect(res).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('命中返回成员', async () => {
      prisma.familyMember.findFirst.mockResolvedValue({ id: 'm1', userId: USER_ID });
      const res = await service.findOne(USER_ID, 'm1');
      expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({ where: { id: 'm1', userId: USER_ID } });
      expect(res).toEqual({ id: 'm1', userId: USER_ID });
    });

    it('越权/不存在抛 NotFoundException', async () => {
      prisma.familyMember.findFirst.mockResolvedValue(null);
      await expect(service.findOne(USER_ID, 'other')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create（按套餐上限拦截）', () => {
    it('未达上限：创建并转换 birthDate', async () => {
      memberService.getMemberLimit.mockResolvedValue(3);
      prisma.familyMember.count.mockResolvedValue(1);
      prisma.familyMember.create.mockResolvedValue({ id: 'm2' });

      const res = await service.create(USER_ID, {
        name: '妈妈',
        relation: 'MOTHER',
        birthDate: '1965-03-08',
      });

      expect(memberService.getMemberLimit).toHaveBeenCalledWith(USER_ID);
      const arg = prisma.familyMember.create.mock.calls[0][0];
      expect(arg.data.userId).toBe(USER_ID);
      expect(arg.data.name).toBe('妈妈');
      expect(arg.data.relation).toBe('MOTHER');
      expect(arg.data.birthDate).toBeInstanceOf(Date);
      expect(res).toEqual({ id: 'm2' });
    });

    it('达到上限：抛 402 且不创建', async () => {
      memberService.getMemberLimit.mockResolvedValue(1);
      prisma.familyMember.count.mockResolvedValue(1);

      await expect(
        service.create(USER_ID, { name: '爸爸', relation: 'FATHER' }),
      ).rejects.toThrow(HttpException);

      try {
        await service.create(USER_ID, { name: '爸爸', relation: 'FATHER' });
      } catch (e: any) {
        expect(e.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      }
      expect(prisma.familyMember.create).not.toHaveBeenCalled();
    });
  });

  describe('update（先校验归属）', () => {
    it('归属校验通过后更新', async () => {
      prisma.familyMember.findFirst.mockResolvedValue({ id: 'm1', userId: USER_ID });
      prisma.familyMember.update.mockResolvedValue({ id: 'm1', name: '新名' });

      const res = await service.update(USER_ID, 'm1', { name: '新名', birthDate: '1990-01-01' });

      const arg = prisma.familyMember.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: 'm1' });
      expect(arg.data.name).toBe('新名');
      expect(arg.data.birthDate).toBeInstanceOf(Date);
      expect(res).toEqual({ id: 'm1', name: '新名' });
    });

    it('非本人成员：抛 NotFound 且不更新', async () => {
      prisma.familyMember.findFirst.mockResolvedValue(null);
      await expect(service.update(USER_ID, 'x', { name: 'hack' })).rejects.toThrow(NotFoundException);
      expect(prisma.familyMember.update).not.toHaveBeenCalled();
    });
  });

  describe('remove（先校验归属）', () => {
    it('归属校验通过后删除', async () => {
      prisma.familyMember.findFirst.mockResolvedValue({ id: 'm1', userId: USER_ID });
      prisma.familyMember.delete.mockResolvedValue({ id: 'm1' });

      await service.remove(USER_ID, 'm1');
      expect(prisma.familyMember.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });

    it('非本人成员：抛 NotFound 且不删除', async () => {
      prisma.familyMember.findFirst.mockResolvedValue(null);
      await expect(service.remove(USER_ID, 'x')).rejects.toThrow(NotFoundException);
      expect(prisma.familyMember.delete).not.toHaveBeenCalled();
    });
  });
});
