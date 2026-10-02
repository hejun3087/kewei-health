jest.mock('fs');
import * as fs from 'fs';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let prisma: any;
  let service: UploadService;

  const USER_ID = 'u1';

  beforeEach(() => {
    (fs.existsSync as jest.Mock).mockReturnValue(true); // 目录已存在，构造时不 mkdir
    (fs.mkdirSync as jest.Mock).mockClear();
    (fs.writeFileSync as jest.Mock).mockClear();
    prisma = {
      upload: {
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new UploadService(prisma);
  });

  describe('saveImage', () => {
    it('写文件并落库（storagePath 以 /uploads/ 开头、保留扩展名、状态 PENDING）', async () => {
      prisma.upload.create.mockResolvedValue({ id: 'up1' });
      const file = {
        originalname: 'report.png',
        buffer: Buffer.from('fake-image'),
        size: 1234,
        mimetype: 'image/png',
      } as any;

      const res = await service.saveImage(file, USER_ID);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const writtenPath = (fs.writeFileSync as jest.Mock).mock.calls[0][0] as string;
      expect(writtenPath.endsWith('.png')).toBe(true);

      const arg = prisma.upload.create.mock.calls[0][0];
      expect(arg.data.userId).toBe(USER_ID);
      expect(arg.data.originalName).toBe('report.png');
      expect(arg.data.storagePath).toMatch(/^\/uploads\/.+\.png$/);
      expect(arg.data.fileSize).toBe(1234);
      expect(arg.data.mimeType).toBe('image/png');
      expect(arg.data.status).toBe('PENDING');
      expect(res).toEqual({ id: 'up1' });
    });
  });

  describe('updateStatus', () => {
    it('更新状态与 aiResult', async () => {
      prisma.upload.update.mockResolvedValue({ id: 'up1', status: 'DONE' });

      await service.updateStatus('up1', 'DONE', { name: 'x' });

      const arg = prisma.upload.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: 'up1' });
      expect(arg.data.status).toBe('DONE');
      expect(arg.data.aiResult).toEqual({ name: 'x' });
    });
  });

  describe('findAll（分页）', () => {
    it('返回 {total,items,page,pageSize} 并按页计算 skip/take', async () => {
      prisma.upload.count.mockResolvedValue(5);
      prisma.upload.findMany.mockResolvedValue([{ id: 'up1' }]);

      const res = await service.findAll(USER_ID, 2, 10);

      expect(prisma.upload.count).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      const findArg = prisma.upload.findMany.mock.calls[0][0];
      expect(findArg.where).toEqual({ userId: USER_ID });
      expect(findArg.orderBy).toEqual({ createdAt: 'desc' });
      expect(findArg.skip).toBe(10); // (2-1)*10
      expect(findArg.take).toBe(10);
      expect(res).toEqual({ total: 5, items: [{ id: 'up1' }], page: 2, pageSize: 10 });
    });

    it('默认第 1 页 20 条', async () => {
      prisma.upload.count.mockResolvedValue(0);
      prisma.upload.findMany.mockResolvedValue([]);

      const res = await service.findAll(USER_ID);

      expect(prisma.upload.findMany.mock.calls[0][0].skip).toBe(0);
      expect(prisma.upload.findMany.mock.calls[0][0].take).toBe(20);
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(20);
    });
  });
});
