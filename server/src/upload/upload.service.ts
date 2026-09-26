import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // 保存图片文件
  async saveImage(file: Express.Multer.File, userId: string) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    const upload = await this.prisma.upload.create({
      data: {
        userId,
        originalName: file.originalname,
        storagePath: `/uploads/${filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'PENDING',
      },
    });

    return upload;
  }

  // 更新上传状态
  async updateStatus(uploadId: string, status: string, aiResult?: any) {
    return this.prisma.upload.update({
      where: { id: uploadId },
      data: { status: status as any, aiResult },
    });
  }

  // 获取用户的上传记录
  async findAll(userId: string, page = 1, pageSize = 20) {
    const where = { userId };
    const [total, items] = await Promise.all([
      this.prisma.upload.count({ where }),
      this.prisma.upload.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, items, page, pageSize };
  }
}
