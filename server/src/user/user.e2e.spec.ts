import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  const svc = {
    getUserById: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
  };
  let authed = true;

  beforeEach(async () => {
    authed = true;
    Object.values(svc).forEach((fn: any) => fn.mockReset());
    const moduleRef = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: svc }],
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

  it('未登录访问 profile 返回 401', async () => {
    authed = false;
    await request(app.getHttpServer()).get('/api/user/profile').expect(401);
    expect(svc.getUserById).not.toHaveBeenCalled();
  });

  it('GET /api/user/profile 透传 userId', async () => {
    svc.getUserById.mockResolvedValue({ id: 'u1', nickname: '小明' });
    const res = await request(app.getHttpServer()).get('/api/user/profile').expect(200);
    expect(svc.getUserById).toHaveBeenCalledWith('u1');
    expect(res.body).toEqual({ id: 'u1', nickname: '小明' });
  });

  it('PUT /api/user/profile 透传 body 到 updateProfile', async () => {
    svc.updateProfile.mockResolvedValue({ id: 'u1', height: 175 });
    await request(app.getHttpServer()).put('/api/user/profile').send({ height: 175 }).expect(200);
    expect(svc.updateProfile).toHaveBeenCalledWith('u1', { height: 175 });
  });

  it('DELETE /api/user/account 命中 deleteAccount', async () => {
    svc.deleteAccount.mockResolvedValue({ id: 'u1', status: 'DELETED' });
    await request(app.getHttpServer()).delete('/api/user/account').expect(200);
    expect(svc.deleteAccount).toHaveBeenCalledWith('u1');
  });
});
