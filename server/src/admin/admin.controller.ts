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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Permissions, Roles } from '../rbac/roles.decorator';
import { Permission, Role } from '../rbac/permissions';
import { AuditService } from '../audit/audit.service';
import { AdminService } from './admin.service';

/**
 * 管理端接口（docs/rbac-design.md P0 + P1）。
 *
 * 前缀 `/admin/*`，全类叠加 `JwtAuthGuard → RolesGuard` 双层守卫链：
 *   Throttler（全局）→ JwtAuthGuard（401 未登录）→ RolesGuard（403 无角色/权限）→ AuditInterceptor。
 *
 * P0：`GET /admin/audit` 跨用户全量审计查询（解锁 PIA R-3）。
 * P1：跨用户用户管理（列表/详情/启停）、角色授予/撤销、分享列表/强制撤销（解锁 PIA R-6）。
 *
 * 每个端点用 `@Roles`（角色白名单）+ `@Permissions`（矩阵权限项）双重声明，
 * 危险写操作（启停/授撤角色/强撤分享）仅 SUPER_ADMIN；Service 层统一落 resourceType=ADMIN 审计。
 */
@ApiTags('管理端')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly auditService: AuditService,
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
  @ApiOperation({ summary: '启用/禁用账号（仅 SUPER_ADMIN，ACTIVE↔DISABLED）' })
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
  @ApiOperation({ summary: '授予角色（仅 SUPER_ADMIN，落审计）' })
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
  @HttpCode(200)
  @ApiOperation({ summary: '撤销角色（仅 SUPER_ADMIN，软撤销保留历史）' })
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
  @ApiOperation({ summary: '强制撤销任意分享链接（仅 SUPER_ADMIN，应急不良内容）' })
  revokeShare(
    @Req() req: any,
    @Param('id') id: string,
    @Query('reason') reason?: string,
  ) {
    return this.adminService.revokeShare(req, id, reason);
  }
}
