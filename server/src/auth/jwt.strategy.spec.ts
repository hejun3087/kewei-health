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

  it('step-up 短 token（typ=stepup）被拒绝，不得当登录凭证复用（RBAC P2）', async () => {
    await expect(
      strategy.validate({ sub: 'u1', typ: 'stepup' }),
    ).rejects.toThrow('无效令牌');
  });

  it('普通登录令牌返回 {userId, phone, roles}', async () => {
    const res = await strategy.validate({ sub: 'u1', phone: '13800000000', roles: ['SUPER_ADMIN'] });
    expect(res).toEqual({ userId: 'u1', phone: '13800000000', roles: ['SUPER_ADMIN'] });
  });

  it('仅含 sub 的令牌（微信登录）userId 正常、phone 为 undefined、roles 为空数组', async () => {
    const res = await strategy.validate({ sub: 'u2' });
    expect(res).toEqual({ userId: 'u2', phone: undefined, roles: [] });
  });

  it('向下兼容：旧 token 无 roles 字段 → 归一为空数组（RBAC P0前签发的 token不抛错）', async () => {
    const res = await strategy.validate({ sub: 'u3', phone: '13800000003' });
    expect(res.roles).toEqual([]);
  });

  it('容错：roles 非数组（垃圾 payload）→ 归一为空数组', async () => {
    const res = await strategy.validate({ sub: 'u4', roles: 'not-array' });
    expect(res.roles).toEqual([]);
  });
});
