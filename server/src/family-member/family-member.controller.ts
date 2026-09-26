import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FamilyMemberService } from './family-member.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('家庭成员')
@Controller('family-members')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FamilyMemberController {
  constructor(private familyMemberService: FamilyMemberService) {}

  @Get()
  @ApiOperation({ summary: '获取所有家庭成员' })
  findAll(@Request() req) {
    return this.familyMemberService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个家庭成员' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.familyMemberService.findOne(req.user.userId, id);
  }

  @Post()
  @ApiOperation({ summary: '添加家庭成员' })
  create(@Request() req, @Body() body: any) {
    return this.familyMemberService.create(req.user.userId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新家庭成员' })
  update(@Request() req, @Param('id') id: string, @Body() body: any) {
    return this.familyMemberService.update(req.user.userId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除家庭成员' })
  remove(@Request() req, @Param('id') id: string) {
    return this.familyMemberService.remove(req.user.userId, id);
  }
}
