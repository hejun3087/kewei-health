import { resolveJwtSecret } from './jwt-config';

describe('resolveJwtSecret（安全审计 5.2.3：JWT 密钥解析）', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalEnv = process.env.NODE_ENV;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    process.env.NODE_ENV = originalEnv;
    warn.mockRestore();
  });

  it('设置了 JWT_SECRET：直接采用，不告警（无论何种环境）', () => {
    process.env.JWT_SECRET = 'a-strong-unique-secret';
    process.env.NODE_ENV = 'production';
    expect(resolveJwtSecret()).toBe('a-strong-unique-secret');
    expect(warn).not.toHaveBeenCalled();
  });

  it('生产环境缺失 JWT_SECRET：fail-fast 抛错，拒绝以默认密钥启动', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    expect(() => resolveJwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('非生产环境缺失 JWT_SECRET：返回开发兜底密钥并打印醒目告警', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'development';
    const secret = resolveJwtSecret();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
