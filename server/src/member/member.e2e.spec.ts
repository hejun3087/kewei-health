import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('MemberController (e2e)', () => {
  let app: INestApplication;
  const memberService = {
    getSubscriptionInfo: jest.fn(),
    getNotifications: jest.fn(),
    listOrders: jest.fn(),
  };
  let authed = true; // 控制守卫是否放行，模拟有/无登录态

  beforeEach(async () => {
    authed = true;
    Object.values(memberService).forEach((fn: any) => fn.mockReset());

    const moduleRef = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [{ provide: MemberService, useValue: memberService }],
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

  afterEach(async () => {
    await app.close();
  });

  it('未登录（守卫拒绝）访问受保护路由返回 401', async () => {
    authed = false;
    await request(app.getHttpServer()).get('/api/member/notifications').expect(401);
    expect(memberService.getNotifications).not.toHaveBeenCalled();
  });

  it('GET /api/member/notifications 透传 req.user.userId 并返回数组', async () => {
    memberService.getNotifications.mockResolvedValue([{ type: 'health', title: 'x' }]);

    const res = await request(app.getHttpServer()).get('/api/member/notifications').expect(200);

    expect(memberService.getNotifications).toHaveBeenCalledWith('u1');
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ type: 'health' });
  });

  it('GET /api/member/subscription 返回订阅信息', async () => {
    memberService.getSubscriptionInfo.mockResolvedValue({ plan: 'FREE' });

    const res = await request(app.getHttpServer()).get('/api/member/subscription').expect(200);

    expect(memberService.getSubscriptionInfo).toHaveBeenCalledWith('u1');
    expect(res.body).toEqual({ plan: 'FREE' });
  });

  it('GET /api/member/orders 解析分页 query 为数字（默认 1/20）', async () => {
    memberService.listOrders.mockResolvedValue({ total: 0, items: [], page: 2, pageSize: 5 });

    await request(app.getHttpServer()).get('/api/member/orders?page=2&pageSize=5').expect(200);
    expect(memberService.listOrders).toHaveBeenCalledWith('u1', 2, 5);

    await request(app.getHttpServer()).get('/api/member/orders').expect(200);
    expect(memberService.listOrders).toHaveBeenLastCalledWith('u1', 1, 20);
  });
});
