import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * 审计日志只读查询（合规 6.1.7 / PIA R-3 尾项）。
 *
 * 安全边界：审计记录包含「谁在何时访问了哪些健康数据」，属敏感运维数据。
 * 项目当前尚未建立 RBAC / 管理员角色体系，因此这里仅开放【本人】维度：
 * userId 由已鉴权的 req.user 强制注入，任何登录用户只能查询与自己数据相关的访问记录
 * （对应个人信息保护法中的数据主体知情权）。跨用户的全量管理端查询待 RBAC 落地后再开放。
 */
@ApiTags('审计')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('me')
  @ApiOperation({ summary: '查询我的健康数据访问审计记录（只读、仅本人）' })
  getMyAudit(@Request() req, @Query() query: any) {
    return this.auditService.queryOwn(req.user.userId, query ?? {});
  }
}
