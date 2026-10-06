import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { StepUpGuard } from '../rbac/stepup.guard';
import { Permissions, RequireStepUp, Roles } from '../rbac/roles.decorator';
import { Permission, Role } from '../rbac/permissions';
import { AuditService } from '../audit/audit.service';
import { AuditExportService } from '../audit/audit-export.service';
import { AdminService } from './admin.service';

/**
 * 管理端接口（docs/rbac-design.md P0 + P1）。
 *
 * 前缀 `/admin/*`，全类叠加 `JwtAuthGuard → RolesGuard → StepUpGuard` 三层守卫链：
 *   Throttler（全局）→ JwtAuthGuard（401 未登录）→ RolesGuard（403 无角色/权限）
 *   → StepUpGuard（仅 @RequireStepUp 端点：缺/非法 x-stepup-token 403，RBAC P2）→ AuditInterceptor。
 *
 * P0：`GET /admin/audit` 跨用户全量审计查询（解锁 PIA R-3）。
 * P1：跨用户用户管理（列表/详情/启停）、角色授予/撤销、分享列表/强制撤销（解锁 PIA R-6）。
 * P3：`GET /admin/audit/export` 审计日志导出 xlsx/csv（audit:export，导出行为自身落审计）。
 *
 * 每个端点用 `@Roles`（角色白名单）+ `@Permissions`（矩阵权限项）双重声明，
 * 危险写操作（启停/授撤角色/强撤分享）仅 SUPER_ADMIN；Service 层统一落 resourceType=ADMIN 审计。
 */
@ApiTags('管理端')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, StepUpGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly auditService: AuditService,
    private readonly auditExportService: AuditExportService,
    private readonly adminService: AdminService,
  ) {}

  // ==================== 审计（P0，解锁 R-3） ====================

  @Get('audit')
  @Roles(Role.SUPER_ADMIN, Role.AUDITOR)
  @Permissions(Permission.AUDIT_READ_ALL)
  @ApiOperation({ summary: '跨用户全量审计日志查询（仅 SUPER_ADMIN/AUDITOR）' })
  getAllAudit(@Query() query: any) {
    return this.auditService.queryAll(query ?? {});
  }

  /**
   * 审计日志导出（RBAC P3）：能查（audit:read_all）不等于能整包拉走（audit:export），
   * 权限项独立且仅 SUPER_ADMIN/AUDITOR；只读动作，不需要 step-up。
   * 导出行为自身落一条 action=AUDIT_EXPORT 审计（meta 记 actorRoles/filters/count/truncated），
   * 满足等保三级「谁拉走了全量审计」可追溯；单次行数上限与截断标记由 AuditExportService 保证。
   */
  @Get('audit/export')
  @Roles(Role.SUPER_ADMIN, Role.AUDITOR)
  @Permissions(Permission.AUDIT_EXPORT)
  @ApiOperation({ summary: '导出审计日志 xlsx/csv（仅 SUPER_ADMIN/AUDITOR，导出行为留痕）' })
  @ApiQuery({ name: 'format', required: false, description: 'xlsx（默认）| csv' })
  async exportAudit(@Req() req: any, @Res() res: Response, @Query() query: any) {
    const { buffer, filename, count, total, truncated, format } = await this.auditExportService.export(
      query ?? {},
      query?.format,
    );
    await this.auditService.record({
      userId: req?.user?.userId ?? null,
      action: 'AUDIT_EXPORT',
      resourceType: 'ADMIN',
      ip: req?.ip ?? null,
      userAgent: req?.headers?.['user-agent'] ?? null,
      success: true,
      meta: {
        actorRoles: req?.user?.roles ?? [],
        format,
        count,
        total,
        truncated,
        filters: this.pickFilters(query ?? {}),
      },
    });
    res.set({
      'Content-Type':
        format === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
      'X-Audit-Export-Truncated': String(truncated),
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Audit-Export-Truncated',
      'Cache-Control': 'no-store',
    });
    res.end(buffer);
  }

  /** 导出审计留痕用的筛选快照：白名单 + 单值限长 200，防 meta 无限膨胀 */
  private pickFilters(q: any): Record<string, string> {
    const allow = ['userId', 'action', 'resourceType', 'success', 'from', 'to', 'format'];
    const out: Record<string, string> = {};
    for (const k of allow) {
      if (typeof q?.[k] === 'string' && q[k]) out[k] = q[k].slice(0, 200);
    }
    return out;
  }

  // ==================== 用户管理（P1） ====================

  @Get('users')
  @Roles(Role.SUPER_ADMIN, Role.OPERATOR, Role.AUDITOR)
  @Permissions(Permission.USER_READ)
  @ApiOperation({ summary: '跨用户列表（脱敏 PII，仅 user:read 角色）' })
  listUsers(@Req() req: any, @Query() query: any) {
    return this.adminService.listUsers(req, query ?? {});
  }

  @Get('users/:id')
  @Roles(Role.SUPER_ADMIN, Role.OPERATOR, Role.AUDITOR)
  @Permissions(Permission.USER_READ)
  @ApiOperation({ summary: '用户详情（脱敏 PII + 活跃角色）' })
  getUser(@Req() req: any, @Param('id') id: string) {
    return this.adminService.getUser(req, id);
  }

  @Patch('users/:id/status')
  @Roles(Role.SUPER_ADMIN)
  @Permissions(Permission.USER_DISABLE)
  @RequireStepUp()
  @ApiOperation({ summary: '启用/禁用账号（仅 SUPER_ADMIN，需 step-up 二次验证）' })
  setUserStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status?: string; reason?: string },
  ) {
    return this.adminService.setUserStatus(req, id, body?.status as string, body?.reason);
  }

  // ==================== 角色授予/撤销（P1，仅 SUPER_ADMIN） ====================

  @Post('users/:id/roles')
  @Roles(Role.SUPER_ADMIN)
  @Permissions(Permission.ROLE_GRANT)
  @RequireStepUp()
  @ApiOperation({ summary: '授予角色（仅 SUPER_ADMIN，需 step-up，落审计）' })
  grantRole(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { role?: string; reason?: string },
  ) {
    return this.adminService.grantRole(req, id, body?.role as string, body?.reason);
  }

  @Delete('users/:id/roles/:role')
  @Roles(Role.SUPER_ADMIN)
  @Permissions(Permission.ROLE_REVOKE)
  @RequireStepUp()
  @HttpCode(200)
  @ApiOperation({ summary: '撤销角色（仅 SUPER_ADMIN，需 step-up，软撤销保留历史）' })
  revokeRole(
    @Req() req: any,
    @Param('id') id: string,
    @Param('role') role: string,
    @Query('reason') reason?: string,
  ) {
    return this.adminService.revokeRole(req, id, role, reason);
  }

  // ==================== 跨用户分享管理（P1，解锁 R-6） ====================

  @Get('shares')
  @Roles(Role.SUPER_ADMIN, Role.OPERATOR, Role.AUDITOR)
  @Permissions(Permission.SHARE_READ_ALL)
  @ApiOperation({ summary: '跨用户分享链接列表（share:read_all）' })
  listShares(@Req() req: any, @Query() query: any) {
    return this.adminService.listShares(req, query ?? {});
  }

  @Delete('shares/:id')
  @Roles(Role.SUPER_ADMIN)
  @Permissions(Permission.SHARE_REVOKE_ALL)
  @RequireStepUp()
  @ApiOperation({ summary: '强制撤销任意分享链接（仅 SUPER_ADMIN，需 step-up，应急不良内容）' })
  revokeShare(
    @Req() req: any,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    return this.adminService.revokeShare(req, id, reason);
  }
}
