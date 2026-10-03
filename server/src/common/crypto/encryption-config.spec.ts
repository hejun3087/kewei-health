import { resolveDataEncryptionKey } from './encryption-config';

describe('resolveDataEncryptionKey（PIA R-2 密钥 fail-fast，6.1.6）', () => {
  const originalKey = process.env.DATA_ENCRYPTION_KEY;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.DATA_ENCRYPTION_KEY;
    else process.env.DATA_ENCRYPTION_KEY = originalKey;
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it('设置了 DATA_ENCRYPTION_KEY：归一为 32 字节 AES-256 密钥', () => {
    process.env.DATA_ENCRYPTION_KEY = 'a-strong-unique-secret';
    process.env.NODE_ENV = 'production';
    const k = resolveDataEncryptionKey();
    expect(Buffer.isBuffer(k)).toBe(true);
    expect(k.length).toBe(32);
  });

  it('任意长度口令经 SHA-256 归一：同口令结果稳定', () => {
    process.env.DATA_ENCRYPTION_KEY = 'short';
    process.env.NODE_ENV = 'production';
    expect(resolveDataEncryptionKey().equals(resolveDataEncryptionKey())).toBe(true);
  });

  it('生产环境缺失：fail-fast 抛错，拒绝以默认密钥启动', () => {
    delete process.env.DATA_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'production';
    expect(() => resolveDataEncryptionKey()).toThrow(/DATA_ENCRYPTION_KEY/);
  });

  it('非生产缺失：告警并返回开发兜底密钥（保证本地/CI 可运行）', () => {
    delete process.env.DATA_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'test';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const k = resolveDataEncryptionKey();
    expect(k.length).toBe(32);
    expect(warn).toHaveBeenCalled();
  });
});
