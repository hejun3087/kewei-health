import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RolesGuard } from './roles.guard';
import { StepUpGuard } from './stepup.guard';
import { resolveJwtSecret } from '../common/jwt-config';

/**
 * RBAC 模块（docs/rbac-design.md P0 + P2）：
 * 导出 `RolesGuard` / `StepUpGuard`；装饰器与权限矩阵为纯常量/函数，无状态，直接引用即可。
 * Reflector 由 Nest 根模块提供，无需重复注册。
 * StepUpGuard 仅需验签（不签发），自带独立 JwtService 实例（同 secret，verify 无状态），
 * 避免依赖 AuthModule 造成模块耦合；密钥统一走 resolveJwtSecret（生产 fail-fast，见 5.2.3）。
 * 同时导出 JwtService：@nestjs/testing 下 TestingModule 会在 RootTestModule 作用域中尝试重新
 * 实例化 guard（而非复用 RbacModule 实例），若未导出会抛 "can't resolve JwtService"；导出后与
 * 使用方共享同一实例，语义不变。
 */
@Module({
  providers: [
    RolesGuard,
    StepUpGuard,
    { provide: JwtService, useFactory: () => new JwtService({ secret: resolveJwtSecret() }) },
  ],
  exports: [RolesGuard, StepUpGuard, JwtService],
})
export class RbacModule {}
