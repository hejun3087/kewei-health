import { Controller, Post, Get, UseGuards, Request, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('文件上传')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 限制上传频率：每 IP 20 次/分钟
  @Post()
  @ApiOperation({ summary: '上传图片' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|heic)$/)) {
        return cb(new Error('仅支持 JPG/PNG/HEIC 格式的图片'), false);
      }
      cb(null, true);
    },
  }))
  uploadImage(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.uploadService.saveImage(file, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: '获取上传记录' })
  findAll(@Request() req, @Query('page') page?: number) {
    return this.uploadService.findAll(req.user.userId, page);
  }
}
