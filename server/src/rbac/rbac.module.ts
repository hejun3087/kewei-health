import { Module } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

/**
 * RBAC 模块（docs/rbac-design.md P0）：
 * 仅导出 `RolesGuard`；装饰器与权限矩阵为纯常量/函数，无状态，直接引用即可。
 * Reflector 由 Nest 根模块提供，无需重复注册。
 */
@Module({
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class RbacModule {}
