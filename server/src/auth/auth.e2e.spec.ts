import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const authService = {
    loginByPhone: jest.fn(),
    loginByPassword: jest.fn(),
    register: jest.fn(),
    loginByWechat: jest.fn(),
    validateUser: jest.fn(),
  };
  let authed = true;

  beforeEach(async () => {
    authed = true;
    Object.values(authService).forEach((fn: any) => fn.mockReset());

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
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

  it('POST /api/auth/login/phone 透传 phone 并返回 token', async () => {
    authService.loginByPhone.mockResolvedValue({ token: 't1' });

    const res = await request(app.getHttpServer())
      .post('/api/auth/login/phone')
      .send({ phone: '13800000000' })
      .expect(201);

    expect(authService.loginByPhone).toHaveBeenCalledWith('13800000000');
    expect(res.body).toEqual({ token: 't1' });
  });

  it('POST /api/auth/register 透传三参数', async () => {
    authService.register.mockResolvedValue({ id: 'u1' });

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ phone: '13800000000', password: 'p123', nickname: '小明' })
      .expect(201);

    expect(authService.register).toHaveBeenCalledWith('13800000000', 'p123', '小明');
  });

  it('GET /api/auth/me 未登录返回 401', async () => {
    authed = false;
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    expect(authService.validateUser).not.toHaveBeenCalled();
  });

  it('GET /api/auth/me 已登录透传 userId', async () => {
    authService.validateUser.mockResolvedValue({ id: 'u1', phone: '138' });

    const res = await request(app.getHttpServer()).get('/api/auth/me').expect(200);

    expect(authService.validateUser).toHaveBeenCalledWith('u1');
    expect(res.body).toEqual({ id: 'u1', phone: '138' });
  });
});
