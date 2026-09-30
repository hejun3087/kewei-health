import { NotFoundException, HttpException } from '@nestjs/common';
import { AiService } from './ai.service';

// mock 文件系统：避免真实读图
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));
import * as fs from 'fs';

describe('AiService', () => {
  let prisma: any;
  let memberService: any;
  let service: AiService;

  const USER_ID = 'u1';
  const UPLOAD_ID = 'up1';

  const mockUpload = {
    id: UPLOAD_ID,
    userId: USER_ID,
    storagePath: '/uploads/img-001.jpg',
    status: 'PENDING',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      upload: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    memberService = {
      consumeAiQuota: jest.fn().mockResolvedValue({ remaining: 49, limit: 50 }),
    };
    process.env.AI_PROVIDER = 'mock';
    delete process.env.BAIDU_API_KEY;
    delete process.env.BAIDU_SECRET_KEY;
    service = new AiService(prisma, memberService);
  });

  describe('recognizeByUpload 前置校验', () => {
    it('上传记录不存在或不属于本人：抛 404 且不扣额度', async () => {
      prisma.upload.findFirst.mockResolvedValue(null);

      await expect(service.recognizeByUpload(UPLOAD_ID, USER_ID)).rejects.toThrow(NotFoundException);
      expect(memberService.consumeAiQuota).not.toHaveBeenCalled();
    });

    it('图片文件缺失：抛 404 且不扣额度（避免白扣次数）', async () => {
      prisma.upload.findFirst.mockResolvedValue(mockUpload);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.recognizeByUpload(UPLOAD_ID, USER_ID)).rejects.toThrow(
        '图片文件不存在',
      );
      expect(memberService.consumeAiQuota).not.toHaveBeenCalled();
    });

    it('额度超限（402）：识别中止，不回写 upload 状态', async () => {
      prisma.upload.findFirst.mockResolvedValue(mockUpload);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake'));
      memberService.consumeAiQuota.mockRejectedValue(
        new HttpException('次数已用尽', 402),
      );

      await expect(service.recognizeByUpload(UPLOAD_ID, USER_ID)).rejects.toThrow(HttpException);
      expect(prisma.upload.update).not.toHaveBeenCalled();
    });
  });

  describe('mock provider 识别流程', () => {
    it('报告类型：扣额度 → 回写 COMPLETED+aiResult → 返回结果含 quota', async () => {
      prisma.upload.findFirst.mockResolvedValue(mockUpload);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake-image'));

      const res = await service.recognizeByUpload(UPLOAD_ID, USER_ID, 'report');

      expect(memberService.consumeAiQuota).toHaveBeenCalledWith(USER_ID);
      const updateArg = prisma.upload.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: UPLOAD_ID });
      expect(updateArg.data.status).toBe('COMPLETED');
      expect(updateArg.data.aiResult.reportType).toBe('LAB');
      expect(updateArg.data.aiResult.items.length).toBeGreaterThan(0);
      expect(res.quota).toEqual({ remaining: 49, limit: 50 });
      expect(res.reportType).toBe('LAB');
    });

    it('处方类型：返回 medications 结构（处方走用药记录而非报告指标）', async () => {
      prisma.upload.findFirst.mockResolvedValue(mockUpload);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake-image'));

      const res = await service.recognizeByUpload(UPLOAD_ID, USER_ID, 'prescription');

      expect(res.reportType).toBe('PRESCRIPTION');
      expect(res.medications.length).toBeGreaterThan(0);
      expect(res.medications[0]).toHaveProperty('drugName');
    });

    it('mock 结果标记 needManualReview=true（低置信度必须人工确认）', async () => {
      prisma.upload.findFirst.mockResolvedValue(mockUpload);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake-image'));

      const res = await service.recognizeByUpload(UPLOAD_ID, USER_ID);

      expect(res.needManualReview).toBe(true);
    });
  });

  describe('provider 降级策略', () => {
    it('baidu provider 但未配密钥：降级 mock 结果，流程不中断', async () => {
      process.env.AI_PROVIDER = 'baidu';
      service = new AiService(prisma, memberService);
      prisma.upload.findFirst.mockResolvedValue(mockUpload);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake-image'));

      const res = await service.recognizeByUpload(UPLOAD_ID, USER_ID);

      // 降级后仍是结构化 mock 结果，且额度正常扣减
      expect(res.reportType).toBe('LAB');
      expect(res.items).toBeDefined();
      expect(memberService.consumeAiQuota).toHaveBeenCalled();
    });

    it('storagePath 解析取 basename，防目录穿越（../../etc/passwd）', async () => {
      prisma.upload.findFirst.mockResolvedValue({
        ...mockUpload,
        storagePath: '/uploads/../../windows/system32/config',
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.recognizeByUpload(UPLOAD_ID, USER_ID)).rejects.toThrow(
        '图片文件不存在',
      );
      // 实际查找路径只落在 uploads 目录内的文件名层
      const joined = (fs.existsSync as jest.Mock).mock.calls[0][0];
      expect(joined).not.toContain('..');
    });
  });
});
