import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { MedicationController } from './medication.controller';
import { MedicationService } from './medication.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('MedicationController (e2e)', () => {
  let app: INestApplication;
  const svc = {
    findAll: jest.fn(),
    getCurrentMedications: jest.fn(),
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
      controllers: [MedicationController],
      providers: [{ provide: MedicationService, useValue: svc }],
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

  it('未登录返回 401', async () => {
    authed = false;
    await request(app.getHttpServer()).get('/api/medications').expect(401);
    expect(svc.findAll).not.toHaveBeenCalled();
  });

  it('GET /api/medications 透传 query', async () => {
    svc.findAll.mockResolvedValue({ total: 0, items: [] });
    await request(app.getHttpServer()).get('/api/medications?memberId=m1').expect(200);
    expect(svc.findAll).toHaveBeenCalledWith('u1', { memberId: 'm1' });
  });

  it('GET /api/medications/current 命中静态路由（非 :id）', async () => {
    svc.getCurrentMedications.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/api/medications/current?memberId=m1').expect(200);
    expect(svc.getCurrentMedications).toHaveBeenCalledWith('u1', 'm1');
    expect(svc.findOne).not.toHaveBeenCalled();
  });

  it('GET /api/medications/:id 命中 findOne', async () => {
    svc.findOne.mockResolvedValue({ id: 'md1' });
    await request(app.getHttpServer()).get('/api/medications/md1').expect(200);
    expect(svc.findOne).toHaveBeenCalledWith('u1', 'md1');
  });

  it('POST /api/medications 透传 body 到 create', async () => {
    svc.create.mockResolvedValue({ id: 'md9' });
    await request(app.getHttpServer()).post('/api/medications').send({ drugName: '阿司匹林' }).expect(201);
    expect(svc.create).toHaveBeenCalledWith('u1', { drugName: '阿司匹林' });
  });

  it('DELETE /api/medications/:id 命中 remove', async () => {
    svc.remove.mockResolvedValue({ success: true });
    await request(app.getHttpServer()).delete('/api/medications/md5').expect(200);
    expect(svc.remove).toHaveBeenCalledWith('u1', 'md5');
  });
});
