import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('AiController (e2e)', () => {
  let app: INestApplication;
  const svc = { recognizeByUpload: jest.fn() };
  let authed = true;

  beforeEach(async () => {
    authed = true;
    svc.recognizeByUpload.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: svc }],
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

  it('未登录识别返回 401', async () => {
    authed = false;
    await request(app.getHttpServer()).post('/api/ai/recognize').send({ uploadId: 'up1' }).expect(401);
    expect(svc.recognizeByUpload).not.toHaveBeenCalled();
  });

  it('POST /api/ai/recognize 默认 type=report 并按 (uploadId, userId, type) 调用', async () => {
    svc.recognizeByUpload.mockResolvedValue({ status: 'DONE' });
    const res = await request(app.getHttpServer()).post('/api/ai/recognize').send({ uploadId: 'up1' }).expect(201);
    expect(svc.recognizeByUpload).toHaveBeenCalledWith('up1', 'u1', 'report');
    expect(res.body).toEqual({ status: 'DONE' });
  });

  it('显式 type=prescription 透传', async () => {
    svc.recognizeByUpload.mockResolvedValue({ status: 'DONE' });
    await request(app.getHttpServer()).post('/api/ai/recognize').send({ uploadId: 'up2', type: 'prescription' }).expect(201);
    expect(svc.recognizeByUpload).toHaveBeenCalledWith('up2', 'u1', 'prescription');
  });
});
