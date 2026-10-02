import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('UploadController (e2e)', () => {
  let app: INestApplication;
  const uploadService = {
    saveImage: jest.fn(),
    findAll: jest.fn(),
  };
  let authed = true;

  beforeEach(async () => {
    authed = true;
    Object.values(uploadService).forEach((fn: any) => fn.mockReset());

    const moduleRef = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: uploadService }],
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

  it('POST /api/upload 上传 png 命中 saveImage（multipart + FileInterceptor）', async () => {
    uploadService.saveImage.mockImplementation((file: any, userId: string) => ({
      id: 'up1',
      originalName: file.originalname,
      userId,
    }));

    const res = await request(app.getHttpServer())
      .post('/api/upload')
      .attach('file', Buffer.from('fake-png-bytes'), 'report.png')
      .expect(201);

    expect(uploadService.saveImage).toHaveBeenCalledTimes(1);
    expect(uploadService.saveImage.mock.calls[0][1]).toBe('u1'); // userId
    expect(res.body).toEqual({ id: 'up1', originalName: 'report.png', userId: 'u1' });
  });

  it('未登录上传返回 401 且不落库', async () => {
    authed = false;
    await request(app.getHttpServer())
      .post('/api/upload')
      .attach('file', Buffer.from('x'), 'a.png')
      .expect(401);
    expect(uploadService.saveImage).not.toHaveBeenCalled();
  });

  it('GET /api/upload 透传 userId + page 到 findAll', async () => {
    uploadService.findAll.mockResolvedValue({ total: 0, items: [] });

    await request(app.getHttpServer()).get('/api/upload?page=3').expect(200);

    // page 由 Express query 解析为字符串 '3'，转发给 service
    expect(uploadService.findAll).toHaveBeenCalledWith('u1', '3');
  });
});
