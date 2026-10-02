import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { FamilyMemberController } from './family-member.controller';
import { FamilyMemberService } from './family-member.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('FamilyMemberController (e2e)', () => {
  let app: INestApplication;
  const svc = {
    findAll: jest.fn(),
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
      controllers: [FamilyMemberController],
      providers: [{ provide: FamilyMemberService, useValue: svc }],
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
    await request(app.getHttpServer()).get('/api/family-members').expect(401);
    expect(svc.findAll).not.toHaveBeenCalled();
  });

  it('GET /api/family-members 仅透传 userId', async () => {
    svc.findAll.mockResolvedValue([{ id: 'm1' }]);
    const res = await request(app.getHttpServer()).get('/api/family-members').expect(200);
    expect(svc.findAll).toHaveBeenCalledWith('u1');
    expect(res.body).toEqual([{ id: 'm1' }]);
  });

  it('GET /api/family-members/:id 命中 findOne', async () => {
    svc.findOne.mockResolvedValue({ id: 'm1' });
    await request(app.getHttpServer()).get('/api/family-members/m1').expect(200);
    expect(svc.findOne).toHaveBeenCalledWith('u1', 'm1');
  });

  it('POST /api/family-members 透传 body 到 create', async () => {
    svc.create.mockResolvedValue({ id: 'm2' });
    await request(app.getHttpServer()).post('/api/family-members').send({ name: '妈妈', relation: 'MOTHER' }).expect(201);
    expect(svc.create).toHaveBeenCalledWith('u1', { name: '妈妈', relation: 'MOTHER' });
  });

  it('POST 达套餐上限透传 service 抛出的 402', async () => {
    svc.create.mockRejectedValue(new HttpException('上限', HttpStatus.PAYMENT_REQUIRED));
    await request(app.getHttpServer()).post('/api/family-members').send({ name: '爸爸', relation: 'FATHER' }).expect(402);
  });

  it('DELETE /api/family-members/:id 命中 remove', async () => {
    svc.remove.mockResolvedValue({ success: true });
    await request(app.getHttpServer()).delete('/api/family-members/m5').expect(200);
    expect(svc.remove).toHaveBeenCalledWith('u1', 'm5');
  });
});
