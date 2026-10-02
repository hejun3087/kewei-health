import { Test } from '@nestjs/testing';
import { INestApplication, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('ShareController (e2e)', () => {
  let app: INestApplication;
  const shareService = {
    createShareLink: jest.fn(),
    getSharedReport: jest.fn(),
  };
  let authed = true;

  beforeEach(async () => {
    authed = true;
    Object.values(shareService).forEach((fn: any) => fn.mockReset());

    const moduleRef = await Test.createTestingModule({
      controllers: [ShareController],
      providers: [{ provide: ShareService, useValue: shareService }],
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

  it('POST /api/share/report/:reportId 透传 userId + reportId 生成链接', async () => {
    shareService.createShareLink.mockResolvedValue({ path: '/share/report/tok' });

    const res = await request(app.getHttpServer())
      .post('/api/share/report/r1')
      .expect(201);

    expect(shareService.createShareLink).toHaveBeenCalledWith('u1', 'r1');
    expect(res.body).toEqual({ path: '/share/report/tok' });
  });

  it('POST /api/share/report/:reportId 未登录返回 401', async () => {
    authed = false;
    await request(app.getHttpServer()).post('/api/share/report/r1').expect(401);
    expect(shareService.createShareLink).not.toHaveBeenCalled();
  });

  it('GET /api/share/view/:token 免登录只读查看', async () => {
    shareService.getSharedReport.mockResolvedValue({ id: 'r1', shared: true });

    const res = await request(app.getHttpServer()).get('/api/share/view/tok123').expect(200);

    expect(shareService.getSharedReport).toHaveBeenCalledWith('tok123');
    expect(res.body).toEqual({ id: 'r1', shared: true });
  });

  it('GET /api/share/view/:token token 失效返回 404', async () => {
    shareService.getSharedReport.mockRejectedValue(new NotFoundException('链接已失效'));

    await request(app.getHttpServer()).get('/api/share/view/bad').expect(404);
  });
});
