import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';

@ApiTags('检查报告')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Audit('REPORT') // 健康数据读写留痕（6.1.7）
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get()
  @ApiOperation({ summary: '获取报告列表（时间线）' })
  findAll(@Request() req, @Query() query: any) {
    return this.reportService.findAll(req.user.userId, query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: '获取首页概览' })
  getDashboard(@Request() req, @Query('memberId') memberId: string) {
    return this.reportService.getDashboard(req.user.userId, memberId);
  }

  @Get('search')
  @ApiOperation({ summary: '搜索报告' })
  search(@Request() req, @Query('keyword') keyword: string) {
    return this.reportService.search(req.user.userId, keyword);
  }

  @Get('trend')
  @ApiOperation({ summary: '获取指标趋势数据' })
  getTrend(@Request() req, @Query() query: any) {
    return this.reportService.getTrend(req.user.userId, query);
  }

  @Get('trackable-items')
  @ApiOperation({ summary: '获取可追踪的指标列表' })
  getTrackableItems(@Request() req, @Query('memberId') memberId: string) {
    return this.reportService.getTrackableItems(req.user.userId, memberId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取报告详情' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.reportService.findOne(req.user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: '创建报告（AI识别后保存）' })
  create(@Request() req, @Body() body: any) {
    return this.reportService.create(req.user.userId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新报告' })
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.reportService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除报告' })
  remove(@Request() req, @Param('id') id: string) {
    return this.reportService.remove(req.user.userId, id);
  }
}
