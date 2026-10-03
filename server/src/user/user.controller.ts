import { Controller, Get, Put, Body, UseGuards, Request, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';

@ApiTags('用户')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Audit('USER') // 个人档案读/改/注销留痕（6.1.7）
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取个人信息' })
  getProfile(@Request() req) {
    return this.userService.getUserById(req.user.userId);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新个人信息' })
  updateProfile(@Request() req, @Body() body: any) {
    return this.userService.updateProfile(req.user.userId, body);
  }

  @Delete('account')
  @ApiOperation({ summary: '注销账号' })
  deleteAccount(@Request() req) {
    return this.userService.deleteAccount(req.user.userId);
  }
}
