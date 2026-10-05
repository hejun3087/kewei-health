import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { Roles } from '../rbac/roles.decorator';
import { Permission, Role } from '../rbac/permissions';
import { AuditService } from '../audit/audit.service';

/**
 * 管理端接口（docs/rbac-design.md P0）。
 *
 * 前缀 `/admin/*`，全类叠加 `JwtAuthGuard → RolesGuard` 双层守卫链：
 *   Throttler（全局）→ JwtAuthGuard（401 未登录）→ RolesGuard（403 无角色/权限）。
 *
 * P0 首个落点：`GET /admin/audit` 跨用户全量审计查询，解锁 PIA R-3 尾项
 * （此前仅开放 `GET /audit/me` 本人维度，跨用户需 RBAC 落地）。
 *
 * 授权要求：SUPER_ADMIN 或 AUDITOR 角色 + `audit:read_all` 权限（矩阵中二者均含）。
 */
@ApiTags('管理端')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly auditService: AuditService) {}

  @Get('audit')
  @Roles(Role.SUPER_ADMIN, Role.AUDITOR)
  @ApiOperation({ summary: '跨用户全量审计日志查询（仅 SUPER_ADMIN/AUDITOR）' })
  getAllAudit(@Query() query: any) {
    return this.auditService.queryAll(query ?? {});
  }
}

// 导出装饰器 metadata 检查用键（spec 内验证守卫元数据挂载正确）
export const ADMIN_AUDIT_REQUIRED_ROLE_COUNT = 2; // SUPER_ADMIN + AUDITOR
export const ADMIN_AUDIT_REQUIRED_PERMISSION: Permission = Permission.AUDIT_READ_ALL;
