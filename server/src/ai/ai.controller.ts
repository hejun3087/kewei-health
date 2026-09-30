import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('AI识别')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('recognize')
  @ApiOperation({ summary: 'AI识别医疗报告图片（基于上传记录ID）' })
  async recognize(
    @Request() req,
    @Body() body: { uploadId: string; type?: 'report' | 'prescription' },
  ) {
    const type = body.type || 'report';
    return this.aiService.recognizeByUpload(body.uploadId, req.user.userId, type);
  }
}
