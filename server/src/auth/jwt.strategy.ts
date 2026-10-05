import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { resolveJwtSecret } from '../common/jwt-config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(),
    });
  }

  async validate(payload: any) {
    // 分享 token（scope=share）仅用于只读查看，不得作为登录凭证
    if (payload.scope === 'share') {
      throw new UnauthorizedException('无效令牌');
    }
    // step-up 短 token（typ=stepup）仅用于 x-stepup-token 二次验证，同样不得当登录凭证
    if (payload.typ === 'stepup') {
      throw new UnauthorizedException('无效令牌');
    }
    // RBAC P0：从 JWT payload 中取签发时角色快照（docs/rbac-design.md）；
    // 旧 token 无 roles 字段（向下兼容）→ 归一为空数组，此时 RolesGuard 对已标 @Roles/@Permissions 的端点自然 403。
    return {
      userId: payload.sub,
      phone: payload.phone,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
  }
}
