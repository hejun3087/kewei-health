import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('ReportController (e2e)', () => {
  let app: INestApplication;
  const reportService = {
    findAll: jest.fn(),
    getDashboard: jest.fn(),
    search: jest.fn(),
    getTrend: jest.fn(),
    getTrackableItems: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  let authed = true;

  beforeEach(async () => {
    authed = true;
    Object.values(reportService).forEach((fn: any) => fn.mockReset());

    const moduleRef = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [{ provide: ReportService, useValue: reportService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          if (!authed) throw new UnauthorizedException();
          ctx.switchToHttp().getRequest().user = { userId: 'u1' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => await app.close());

  it('未登录访问列表返回 401', async () => {
    authed = false;
    await request(app.getHttpServer()).get('/api/reports').expect(401);
    expect(reportService.findAll).not.toHaveBeenCalled();
  });

  it('GET /api/reports 透传 query 到 findAll', async () => {
    reportService.findAll.mockResolvedValue({ total: 0, items: [] });

    await request(app.getHttpServer()).get('/api/reports?memberId=m1&page=2').expect(200);

    expect(reportService.findAll).toHaveBeenCalledWith('u1', { memberId: 'm1', page: '2' });
  });

  it('GET /api/reports/search 命中 search 而非 :id（路由顺序）', async () => {
    reportService.search.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/api/reports/search?keyword=血糖').expect(200);

    expect(reportService.search).toHaveBeenCalledWith('u1', '血糖');
    expect(reportService.findOne).not.toHaveBeenCalled();
  });

  it('GET /api/reports/:id 命中 findOne', async () => {
    reportService.findOne.mockResolvedValue({ id: 'r1' });

    const res = await request(app.getHttpServer()).get('/api/reports/r1').expect(200);

    expect(reportService.findOne).toHaveBeenCalledWith('u1', 'r1');
    expect(res.body).toEqual({ id: 'r1' });
  });

  it('POST /api/reports 透传 body 到 create', async () => {
    reportService.create.mockResolvedValue({ id: 'r9' });

    const res = await request(app.getHttpServer())
      .post('/api/reports')
      .send({ title: '血常规', items: [{ name: 'WBC' }] })
      .expect(201);

    expect(reportService.create).toHaveBeenCalledWith('u1', { title: '血常规', items: [{ name: 'WBC' }] });
    expect(res.body).toEqual({ id: 'r9' });
  });

  it('DELETE /api/reports/:id 命中 remove', async () => {
    reportService.remove.mockResolvedValue({ success: true });

    await request(app.getHttpServer()).delete('/api/reports/r5').expect(200);

    expect(reportService.remove).toHaveBeenCalledWith('u1', 'r5');
  });
});
