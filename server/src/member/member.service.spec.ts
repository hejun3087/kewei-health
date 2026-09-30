import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { MemberService } from './member.service';
import { PLAN_CONFIG, UNLIMITED } from './plan.config';

const NOW = new Date();
const FUTURE = new Date(NOW.getTime() + 365 * 24 * 3600 * 1000);
const PAST = new Date(NOW.getTime() - 24 * 3600 * 1000);

function makeSub(overrides: any = {}) {
  return {
    id: 'sub-1',
    userId: 'u1',
    plan: 'FREE',
    status: 'ACTIVE',
    startDate: NOW,
    endDate: null,
    autoRenew: false,
    aiUsageCount: 0,
    quotaResetAt: FUTURE,
    ...overrides,
  };
}

describe('MemberService', () => {
  let prisma: any;
  let service: MemberService;

  beforeEach(() => {
    prisma = {
      subscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      paymentOrder: {
        create: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      user: { update: jest.fn() },
    };
    service = new MemberService(prisma as any);
  });

  describe('getOrCreate 初始化与自动降级', () => {
    it('无订阅时初始化为免费版', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue(makeSub());

      const sub = await service.getOrCreate('u1');

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: { userId: 'u1', plan: 'FREE', status: 'ACTIVE' },
      });
      expect(sub.plan).toBe('FREE');
    });

    it('订阅过期自动降级为 FREE（数据保留）', async () => {
      prisma.subscription.findUnique.mockResolvedValue(
        makeSub({ plan: 'STANDARD', endDate: PAST }),
      );
      prisma.subscription.update.mockResolvedValue(
        makeSub({ plan: 'FREE', status: 'EXPIRED' }),
      );

      const sub = await service.getOrCreate('u1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plan: 'FREE', status: 'EXPIRED' }),
        }),
      );
      expect(sub.plan).toBe('FREE');
    });

    it('跨自然月重置 AI 用量', async () => {
      prisma.subscription.findUnique.mockResolvedValue(
        makeSub({ plan: 'STANDARD', quotaResetAt: PAST, aiUsageCount: 5 }),
      );
      prisma.subscription.update.mockResolvedValue(
        makeSub({ plan: 'STANDARD', aiUsageCount: 0, quotaResetAt: FUTURE }),
      );

      const sub = await service.getOrCreate('u1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ aiUsageCount: 0 }),
        }),
      );
      expect(sub.aiUsageCount).toBe(0);
    });
  });

  describe('consumeAiQuota 付费墙', () => {
    it('免费版配额用尽抛 402', async () => {
      prisma.subscription.findUnique.mockResolvedValue(
        makeSub({ plan: 'FREE', aiUsageCount: PLAN_CONFIG.FREE.aiPerMonth }),
      );

      await expect(service.consumeAiQuota('u1')).rejects.toThrow(HttpException);
      await expect(service.consumeAiQuota('u1')).rejects.toMatchObject({
        status: HttpStatus.PAYMENT_REQUIRED,
      });
      // 被拦截时不应递增用量
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('配额内消费成功并返回余量', async () => {
      prisma.subscription.findUnique.mockResolvedValue(
        makeSub({ plan: 'FREE', aiUsageCount: 0 }),
      );
      prisma.subscription.update.mockResolvedValue(makeSub());

      const res = await service.consumeAiQuota('u1');

      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(PLAN_CONFIG.FREE.aiPerMonth - 1);
      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { aiUsageCount: { increment: 1 } },
        }),
      );
    });

    it('不限量套餐永不拦截', async () => {
      expect(PLAN_CONFIG.FAMILY.aiPerMonth).toBe(UNLIMITED);
      prisma.subscription.findUnique.mockResolvedValue(
        makeSub({ plan: 'FAMILY', aiUsageCount: 99999 }),
      );
      prisma.subscription.update.mockResolvedValue(makeSub({ plan: 'FAMILY' }));

      const res = await service.consumeAiQuota('u1');

      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(UNLIMITED);
    });
  });

  describe('createUpgradeOrder 订单落库', () => {
    it('套餐不存在抛 400', async () => {
      await expect(
        service.createUpgradeOrder('u1', 'NOT_A_PLAN', 'WECHAT'),
      ).rejects.toThrow(BadRequestException);
    });

    it('免费版无需支付抛 400', async () => {
      await expect(
        service.createUpgradeOrder('u1', 'FREE', 'WECHAT'),
      ).rejects.toThrow(BadRequestException);
    });

    it('合法升级：订单以 PENDING 落库并返回 mockPaid', async () => {
      prisma.paymentOrder.create.mockResolvedValue({ id: 'o1', status: 'PENDING' });

      const order = await service.createUpgradeOrder('u1', 'STANDARD', 'WECHAT');

      expect(prisma.paymentOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          plan: 'STANDARD',
          amount: PLAN_CONFIG.STANDARD.priceYearly * 100,
          paymentMethod: 'WECHAT',
        }),
      });
      expect(order.mockPaid).toBe(true);
      expect(order.status).toBe('PENDING');
      expect(order.orderId).toMatch(/^KW\d+$/);
    });
  });

  describe('activate 激活链路', () => {
    it('upsert 订阅 + 订单置 PAID + 同步存储上限', async () => {
      prisma.subscription.upsert.mockResolvedValue(makeSub({ plan: 'STANDARD' }));
      prisma.paymentOrder.updateMany.mockResolvedValue({ count: 1 });
      prisma.user.update.mockResolvedValue({});

      await service.activate('u1', 'STANDARD', 'WECHAT', 10800, 'KW123');

      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      );
      const orderUpdate = prisma.paymentOrder.updateMany.mock.calls[0][0];
      expect(orderUpdate.where).toEqual({ orderId: 'KW123', userId: 'u1' });
      expect(orderUpdate.data.status).toBe('PAID');
      expect(orderUpdate.data.paidAt).toBeInstanceOf(Date);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { storageLimit: BigInt(PLAN_CONFIG.STANDARD.storageLimit) },
        }),
      );
    });
  });

  describe('listOrders 契约', () => {
    it('返回分页对象 {total,items,page,pageSize}', async () => {
      prisma.paymentOrder.count.mockResolvedValue(1);
      prisma.paymentOrder.findMany.mockResolvedValue([{ id: 'o1' }]);

      const res = await service.listOrders('u1');

      expect(res).toMatchObject({
        total: 1,
        items: [{ id: 'o1' }],
        page: 1,
        pageSize: 20,
      });
    });
  });
});
