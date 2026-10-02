import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('ExportController (e2e)', () => {
  let app: INestApplication;
  const svc = {
    exportHealthData: jest.fn(),
    exportHealthDataPdf: jest.fn(),
  };
  let authed = true;

  beforeEach(async () => {
    authed = true;
    Object.values(svc).forEach((fn: any) => fn.mockReset());
    const moduleRef = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [{ provide: ExportService, useValue: svc }],
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

  it('未登录导出返回 401', async () => {
    authed = false;
    await request(app.getHttpServer()).get('/api/export/health-data').expect(401);
    expect(svc.exportHealthData).not.toHaveBeenCalled();
  });

  it('GET /api/export/health-data 返回 xlsx 下载头 + buffer', async () => {
    svc.exportHealthData.mockResolvedValue({ buffer: Buffer.from('PKzipdata'), filename: 'export.xlsx' });

    const res = await request(app.getHttpServer()).get('/api/export/health-data?memberId=m1').expect(200);

    expect(svc.exportHealthData).toHaveBeenCalledWith('u1', 'm1');
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
    expect(res.headers['content-disposition']).toContain('export.xlsx');
    // buffer 为 'PKzipdata'（9 字节），controller 以 Content-Length 透传字节数
    expect(res.headers['content-length']).toBe('9');
  });

  it('GET /api/export/health-data/pdf 返回 application/pdf 下载头', async () => {
    svc.exportHealthDataPdf.mockResolvedValue({ buffer: Buffer.from('%PDF-1.4'), filename: 'export.pdf' });

    const res = await request(app.getHttpServer()).get('/api/export/health-data/pdf').expect(200);

    expect(svc.exportHealthDataPdf).toHaveBeenCalledWith('u1', undefined);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toContain('export.pdf');
  });

  it('免费版导出返回 402（service 抛 402）', async () => {
    svc.exportHealthData.mockRejectedValue(new HttpException('需升级', HttpStatus.PAYMENT_REQUIRED));
    await request(app.getHttpServer()).get('/api/export/health-data').expect(402);
  });
});
