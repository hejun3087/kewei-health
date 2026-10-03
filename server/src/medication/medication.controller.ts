import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MedicationService } from './medication.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';

@ApiTags('用药记录')
@Controller('medications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Audit('MEDICATION') // 健康数据读写留痕（6.1.7）
export class MedicationController {
  constructor(private medicationService: MedicationService) {}

  @Get()
  @ApiOperation({ summary: '获取用药记录列表' })
  findAll(@Request() req, @Query() query: any) {
    return this.medicationService.findAll(req.user.userId, query);
  }

  @Get('current')
  @ApiOperation({ summary: '获取当前在用药物' })
  getCurrent(@Request() req, @Query('memberId') memberId: string) {
    return this.medicationService.getCurrentMedications(req.user.userId, memberId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用药详情' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.medicationService.findOne(req.user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: '创建用药记录' })
  create(@Request() req, @Body() body: any) {
    return this.medicationService.create(req.user.userId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新用药记录' })
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.medicationService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用药记录' })
  remove(@Request() req, @Param('id') id: string) {
    return this.medicationService.remove(req.user.userId, id);
  }
}
