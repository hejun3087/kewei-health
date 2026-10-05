import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { StepUpGuard } from './stepup.guard';
import { STEPUP_KEY } from './roles.decorator';

/**
 * StepUpGuard 单元测试（docs/rbac-design.md §9.2，RBAC P2）：
 * 直接构造 Guard + mock Reflector & JwtService，覆盖 opt-in 短路 / header 缺失 / 验签失败 /
 * typ 非 stepup / sub 不匹配 / 全通 六个分支。与 roles.guard.spec 同模式。
 */
function ctxOf(req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function makeReflector(meta: Record<string, any>): Reflector {
  return {
    getAllAndOverride: jest.fn((key: string) => meta[key]),
  } as unknown as Reflector;
}

describe('StepUpGuard（危险操作二次验证守卫）', () => {
  const jwtVerify = jest.fn();
  const jwt = { verify: jwtVerify } as unknown as JwtService;

  beforeEach(() => {
    jwtVerify.mockReset();
  });

  it('未标注 @RequireStepUp() → 直接放行（既有端点零影响）', () => {
    const guard = new StepUpGuard(makeReflector({}), jwt);
    expect(guard.canActivate(ctxOf({ user: { userId: 'u1' }, headers: {} }))).toBe(true);
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('标注但 req.user 缺失 → 403（异常配置，与 RolesGuard 同语义）', () => {
    const guard = new StepUpGuard(makeReflector({ [STEPUP_KEY]: true }), jwt);
    expect(() => guard.canActivate(ctxOf({ headers: { 'x-stepup-token': 't' } }))).toThrow(
      ForbiddenException,
    );
  });

  it('header x-stepup-token 缺失/为空 → 403（未通过二次验证）', () => {
    const guard = new StepUpGuard(makeReflector({ [STEPUP_KEY]: true }), jwt);
    expect(() =>
      guard.canActivate(ctxOf({ user: { userId: 'u1' }, headers: {} })),
    ).toThrow('该操作需二次验证');
    expect(() =>
      guard.canActivate(ctxOf({ user: { userId: 'u1' }, headers: { 'x-stepup-token': '' } })),
    ).toThrow(ForbiddenException);
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('验签抛异常（过期/篡改）→ 403 且提示重新验证', () => {
    jwtVerify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const guard = new StepUpGuard(makeReflector({ [STEPUP_KEY]: true }), jwt);
    expect(() =>
      guard.canActivate(
        ctxOf({ user: { userId: 'u1' }, headers: { 'x-stepup-token': 'expired' } }),
      ),
    ).toThrow('二次验证已失效或无效');
  });

  it('payload.typ ≠ stepup → 403（防止登录 token 冒充 step-up）', () => {
    jwtVerify.mockReturnValue({ sub: 'u1', roles: ['SUPER_ADMIN'] });
    const guard = new StepUpGuard(makeReflector({ [STEPUP_KEY]: true }), jwt);
    expect(() =>
      guard.canActivate(
        ctxOf({ user: { userId: 'u1' }, headers: { 'x-stepup-token': 'login-jwt' } }),
      ),
    ).toThrow('二次验证令牌无效');
  });

  it('payload.sub ≠ 当前 userId → 403（防止跨账号复用他人 step-up token）', () => {
    jwtVerify.mockReturnValue({ sub: 'attacker', typ: 'stepup' });
    const guard = new StepUpGuard(makeReflector({ [STEPUP_KEY]: true }), jwt);
    expect(() =>
      guard.canActivate(
        ctxOf({ user: { userId: 'victim' }, headers: { 'x-stepup-token': 't' } }),
      ),
    ).toThrow('二次验证令牌与当前账号不匹配');
  });

  it('全部匹配（typ=stepup + sub=当前用户）→ 放行', () => {
    jwtVerify.mockReturnValue({ sub: 'u1', typ: 'stepup', exp: 9999999999 });
    const guard = new StepUpGuard(makeReflector({ [STEPUP_KEY]: true }), jwt);
    expect(
      guard.canActivate(
        ctxOf({ user: { userId: 'u1' }, headers: { 'x-stepup-token': 'good' } }),
      ),
    ).toBe(true);
    expect(jwtVerify).toHaveBeenCalledWith('good');
  });
});
