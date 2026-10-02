import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { DiagnosisController } from './diagnosis.controller';
import { DiagnosisService } from './diagnosis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('DiagnosisController (e2e)', () => {
  let app: INestApplication;
  const svc = {
    findAll: jest.fn(),
    getUpcomingVisits: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  let authed = true;

  beforeEach(async () => {
    authed = true;
    Object.values(svc).forEach((fn: any) => fn.mockReset());
    const moduleRef = await Test.createTestingModule({
      controllers: [DiagnosisController],
      providers: [{ provide: DiagnosisService, useValue: svc }],
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
    await request(app.getHttpServer()).get('/api/diagnoses').expect(401);
    expect(svc.findAll).not.toHaveBeenCalled();
  });

  it('GET /api/diagnoses 透传 query', async () => {
    svc.findAll.mockResolvedValue({ total: 0, items: [] });
    await request(app.getHttpServer()).get('/api/diagnoses?memberId=m1').expect(200);
    expect(svc.findAll).toHaveBeenCalledWith('u1', { memberId: 'm1' });
  });

  it('GET /api/diagnoses/upcoming-visits 命中静态路由（非 :id）并转数字 days', async () => {
    svc.getUpcomingVisits.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/api/diagnoses/upcoming-visits?days=14').expect(200);
    expect(svc.getUpcomingVisits).toHaveBeenCalledWith('u1', 14);
    expect(svc.findOne).not.toHaveBeenCalled();
  });

  it('upcoming-visits 无 days 默认 7', async () => {
    svc.getUpcomingVisits.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/api/diagnoses/upcoming-visits').expect(200);
    expect(svc.getUpcomingVisits).toHaveBeenCalledWith('u1', 7);
  });

  it('GET /api/diagnoses/:id 命中 findOne', async () => {
    svc.findOne.mockResolvedValue({ id: 'd1' });
    const res = await request(app.getHttpServer()).get('/api/diagnoses/d1').expect(200);
    expect(svc.findOne).toHaveBeenCalledWith('u1', 'd1');
    expect(res.body).toEqual({ id: 'd1' });
  });

  it('POST /api/diagnoses 透传 body 到 create', async () => {
    svc.create.mockResolvedValue({ id: 'd9' });
    await request(app.getHttpServer()).post('/api/diagnoses').send({ disease: '高血压' }).expect(201);
    expect(svc.create).toHaveBeenCalledWith('u1', { disease: '高血压' });
  });

  it('DELETE /api/diagnoses/:id 命中 remove', async () => {
    svc.remove.mockResolvedValue({ success: true });
    await request(app.getHttpServer()).delete('/api/diagnoses/d5').expect(200);
    expect(svc.remove).toHaveBeenCalledWith('u1', 'd5');
  });
});
