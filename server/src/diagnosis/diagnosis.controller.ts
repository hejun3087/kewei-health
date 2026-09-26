import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DiagnosisService } from './diagnosis.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('就诊诊断')
@Controller('diagnoses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiagnosisController {
  constructor(private diagnosisService: DiagnosisService) {}

  @Get()
  @ApiOperation({ summary: '获取诊断记录列表（就诊时间线）' })
  findAll(@Request() req, @Query() query: any) {
    return this.diagnosisService.findAll(req.user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取诊断详情' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.diagnosisService.findOne(req.user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: '创建诊断记录（AI识别后保存）' })
  create(@Request() req, @Body() body: any) {
    return this.diagnosisService.create(req.user.userId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新诊断记录' })
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.diagnosisService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除诊断记录' })
  remove(@Request() req, @Param('id') id: string) {
    return this.diagnosisService.remove(req.user.userId, id);
  }
}
