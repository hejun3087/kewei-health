import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';

/**
 * 管理端模块（docs/rbac-design.md P0）：
 * 引入 `AuditModule`（提供 `AuditService`）+ `RbacModule`（提供 `RolesGuard`）。
 * JwtAuthGuard 无状态，直接引用类即可（各业务模块同样用法）。
 */
@Module({
  imports: [AuditModule, RbacModule],
  controllers: [AdminController],
})
export class AdminModule {}
