import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

/**
 * 5.2.1 缺口收敛：jwt.strategy.validate 此前 0% 覆盖（真实策略未实例化，e2e 用 overrideGuard 替换）。
 * 用 Object.create 拿到原型方法，绕开 passport 构造直接验证核心鉴权逻辑。
 */
describe('JwtStrategy.validate（令牌校验）', () => {
  const strategy = Object.create(JwtStrategy.prototype) as JwtStrategy;

  it('share scope 令牌被拒绝，不得作为登录凭证', async () => {
    await expect(
      strategy.validate({ scope: 'share', reportId: 'r1', ownerId: 'u1' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('普通登录令牌返回 {userId, phone}', async () => {
    const res = await strategy.validate({ sub: 'u1', phone: '13800000000' });
    expect(res).toEqual({ userId: 'u1', phone: '13800000000' });
  });

  it('仅含 sub 的令牌（微信登录）userId 正常、phone 为 undefined', async () => {
    const res = await strategy.validate({ sub: 'u2' });
    expect(res).toEqual({ userId: 'u2', phone: undefined });
  });
});
