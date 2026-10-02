import { Controller, Get, Query, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('数据导出')
@Controller('export')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get('health-data')
  @ApiOperation({ summary: '导出健康档案为 Excel（标准版及以上，免费版返回 402）' })
  @ApiQuery({ name: 'memberId', required: false, description: '可选，按家庭成员过滤' })
  async exportHealthData(
    @Request() req,
    @Res() res: Response,
    @Query('memberId') memberId?: string,
  ) {
    const { buffer, filename } = await this.exportService.exportHealthData(
      req.user.userId,
      memberId,
    );
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('health-data/pdf')
  @ApiOperation({ summary: '导出健康档案为 PDF（标准版及以上，免费版返回 402）' })
  @ApiQuery({ name: 'memberId', required: false, description: '可选，按家庭成员过滤' })
  async exportHealthDataPdf(
    @Request() req,
    @Res() res: Response,
    @Query('memberId') memberId?: string,
  ) {
    const { buffer, filename } = await this.exportService.exportHealthDataPdf(
      req.user.userId,
      memberId,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
