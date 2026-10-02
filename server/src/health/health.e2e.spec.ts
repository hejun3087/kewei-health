import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication;
  const prisma = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api'); // 与 main.ts 一致
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health 数据库连通返回 200 ok/up', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const res = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('GET /api/health 数据库异常返回 200 degraded/down（探活不抛 500）', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection lost'));

    const res = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(res.body).toMatchObject({ status: 'degraded', db: 'down' });
  });
});
