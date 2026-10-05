import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { STEPUP_KEY } from './roles.decorator';

/**
 * Step-up 二次验证守卫（docs/rbac-design.md §9.2，RBAC P2）：
 * - 仅对标注 `@RequireStepUp()` 的端点生效（opt-in，未标注直接放行，与 RolesGuard 同模式）；
 * - 位于 Guard 链 `JwtAuthGuard → RolesGuard → StepUpGuard`：先确认登录与角色，再验二次凭证；
 * - 要求 header `x-stepup-token` 为 `POST /auth/stepup` 签发的 `typ:'stepup'` 短 token（5min TTL），
 *   且 `sub` 必须等于当前登录用户（防拿他人/其它会话的 step-up token 复用）；
 * - 验签失败/过期/类型不符/主体不匹配统一 403（区分于未登录 401，与 §9.2 "额外因子缺失" 语义一致）。
 *
 * 已知边界（如实标注）：step-up token 签发后 5min 内无法主动吊销（无 jti 黑名单，设计 defer v2）；
 * 密钥与登录 JWT 同 secret，靠 `typ` 声明隔离用途。
 */
@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(STEPUP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const userId = req?.user?.userId;
    if (!userId) throw new ForbiddenException('未授权访问');

    const token = req?.headers?.['x-stepup-token'];
    if (!token || typeof token !== 'string') {
      throw new ForbiddenException('该操作需二次验证，请先验证密码');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new ForbiddenException('二次验证已失效或无效，请重新验证密码');
    }
    if (payload?.typ !== 'stepup') {
      throw new ForbiddenException('二次验证令牌无效');
    }
    if (payload?.sub !== userId) {
      throw new ForbiddenException('二次验证令牌与当前账号不匹配');
    }
    return true;
  }
}
