import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';

@ApiTags('报告分享')
@Controller('share')
export class ShareController {
  constructor(private shareService: ShareService) {}

  @Post('report/:reportId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Audit('REPORT', 'SHARE_CREATE') // 生成对外分享链接留痕（6.1.7 / R-6）
  @ApiOperation({ summary: '生成报告只读分享链接（家庭版，其余返回 402；可传 expiresInDays 1~90）' })
  createLink(
    @Request() req,
    @Param('reportId') reportId: string,
    @Body() body: { expiresInDays?: number },
  ) {
    return this.shareService.createShareLink(req.user.userId, reportId, body?.expiresInDays);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Audit('REPORT', 'SHARE_LIST') // 查看自己的分享列表留痕
  @ApiOperation({ summary: '我的分享链接列表（含有效期/撤销状态/访问次数，可按 reportId 过滤）' })
  listMine(@Request() req, @Query('reportId') reportId?: string) {
    return this.shareService.listMyShareLinks(req.user.userId, reportId);
  }

  @Delete(':shareId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Audit('REPORT', 'SHARE_REVOKE') // 撤销是重要安全操作，必须留痕（R-6）
  @ApiOperation({ summary: '撤销分享链接（仅本人；旧 token 立即失效，幂等）' })
  revoke(@Request() req, @Param('shareId') shareId: string) {
    return this.shareService.revokeShareLink(req.user.userId, shareId);
  }

  @Get('view/:token')
  @Audit('REPORT', 'SHARE_VIEW') // 免登录对外访问健康报告，必须留痕（6.1.7）
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 免登录接口，收紧限流防 token 爆破
  @ApiOperation({ summary: '凭分享 token 免登录只读查看报告' })
  view(@Param('token') token: string) {
    return this.shareService.getSharedReport(token);
  }
}
