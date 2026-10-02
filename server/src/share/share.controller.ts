import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('报告分享')
@Controller('share')
export class ShareController {
  constructor(private shareService: ShareService) {}

  @Post('report/:reportId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成报告只读分享链接（家庭版，其余返回 402）' })
  createLink(@Request() req, @Param('reportId') reportId: string) {
    return this.shareService.createShareLink(req.user.userId, reportId);
  }

  @Get('view/:token')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 免登录接口，收紧限流防 token 爆破
  @ApiOperation({ summary: '凭分享 token 免登录只读查看报告' })
  view(@Param('token') token: string) {
    return this.shareService.getSharedReport(token);
  }
}
