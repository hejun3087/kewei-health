import { HealthController } from './health.controller';

describe('HealthController', () => {
  let prisma: any;
  let controller: HealthController;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn() };
    controller = new HealthController(prisma);
  });

  it('数据库连通时返回 ok/up', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await controller.health();

    expect(res).toMatchObject({ status: 'ok', db: 'up' });
    expect(typeof res.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(res.timestamp))).toBe(false);
  });

  it('数据库异常时降级为 degraded/down（不抛错）', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection lost'));

    const res = await controller.health();

    expect(res).toMatchObject({ status: 'degraded', db: 'down' });
  });
});
