import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuditService } from '../audit/audit.service';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
  ) {}

  /** 从请求中提取 ip / User-Agent（审计留痕用） */
  private reqMeta(req: any) {
    return { ip: req?.ip ?? null, userAgent: req?.headers?.['user-agent'] ?? null };
  }

  /**
   * 统一登录审计包装：成功记 LOGIN(success, userId)，失败记 LOGIN(failure, 脱敏 identity) 后原样抛出。
   * recordLogin 内部吞异常，审计故障绝不影响登录主链路。
   */
  private async auditedLogin<T extends { user?: { id?: string } }>(
    req: any,
    method: string,
    identity: string | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    const m = this.reqMeta(req);
    try {
      const res = await fn();
      await this.auditService.recordLogin({
        ...m,
        method,
        success: true,
        userId: res?.user?.id ?? null,
      });
      return res;
    } catch (e: any) {
      await this.auditService.recordLogin({
        ...m,
        method,
        success: false,
        identity: identity ?? null,
        status: e?.status ?? e?.statusCode ?? null,
      });
      throw e;
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 登录/注册防爆破：每 IP 5 次/分钟
  @Post('login/phone')
  @ApiOperation({ summary: '手机号登录' })
  loginByPhone(@Body() body: { phone: string }, @Request() req) {
    return this.auditedLogin(req, 'phone', body.phone, () =>
      this.authService.loginByPhone(body.phone),
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login/password')
  @ApiOperation({ summary: '密码登录' })
  loginByPassword(@Body() body: { phone: string; password: string }, @Request() req) {
    return this.auditedLogin(req, 'password', body.phone, () =>
      this.authService.loginByPassword(body.phone, body.password),
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: '注册' })
  register(@Body() body: { phone: string; password: string; nickname?: string }) {
    return this.authService.register(body.phone, body.password, body.nickname);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login/wechat')
  @ApiOperation({ summary: '微信登录' })
  loginByWechat(@Body() body: { openId: string; unionId?: string }, @Request() req) {
    return this.auditedLogin(req, 'wechat', body.openId, () =>
      this.authService.loginByWechat(body.openId, body.unionId),
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  getProfile(@Request() req) {
    return this.authService.validateUser(req.user.userId);
  }

  /**
   * 危险操作 step-up 二次验证（RBAC P2，docs/rbac-design.md §9.2）：
   * 需已登录，重输当前密码 → 返回 5min TTL 的 `typ:stepup` 短 token。
   * 成功/失败均落审计（action=STEPUP, resourceType=AUTH），便于追溯密码探测尝试。
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('stepup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '二次验证（重输密码换取短时特权 token）' })
  async stepUp(@Request() req, @Body() body: { password?: string }) {
    const m = this.reqMeta(req);
    try {
      const res = await this.authService.stepUp(req.user.userId, body?.password);
      await this.auditService.record({
        userId: req.user.userId,
        action: 'STEPUP',
        resourceType: 'AUTH',
        ip: m.ip,
        userAgent: m.userAgent,
        success: true,
      });
      return res;
    } catch (e: any) {
      await this.auditService.record({
        userId: req?.user?.userId ?? null,
        action: 'STEPUP',
        resourceType: 'AUTH',
        ip: m.ip,
        userAgent: m.userAgent,
        success: false,
        meta: { status: e?.status ?? e?.statusCode ?? null },
      });
      throw e;
    }
  }
}
