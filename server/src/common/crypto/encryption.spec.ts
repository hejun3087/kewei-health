import { encryptField, decryptField, isEncrypted } from './encryption';

describe('敏感字段加密 util（AES-256-GCM，PIA R-2 / 6.1.6）', () => {
  beforeAll(() => {
    // 静音开发兜底密钥告警
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  it('往返：加密后解密还原原文', () => {
    const plain = '青霉素过敏；高血压病史 5 年';
    const enc = encryptField(plain);
    expect(enc).not.toBe(plain);
    expect(isEncrypted(enc)).toBe(true);
    expect(decryptField(enc)).toBe(plain);
  });

  it('随机 IV：同明文两次加密密文不同，但都可解密', () => {
    const a = encryptField('糖尿病') as string;
    const b = encryptField('糖尿病') as string;
    expect(a).not.toBe(b);
    expect(decryptField(a)).toBe('糖尿病');
    expect(decryptField(b)).toBe('糖尿病');
  });

  it('null/undefined/空串原样返回，不加密', () => {
    expect(encryptField(null)).toBeNull();
    expect(encryptField(undefined)).toBeNull();
    expect(encryptField('')).toBe('');
    expect(decryptField(null)).toBeNull();
    expect(decryptField('')).toBe('');
  });

  it('幂等：对已加密值再加密不重复包裹', () => {
    const once = encryptField('阿斯匹林') as string;
    const twice = encryptField(once) as string;
    expect(twice).toBe(once);
  });

  it('存量明文兼容：无前缀值解密原样返回（迁移前可读）', () => {
    expect(decryptField('历史明文病历')).toBe('历史明文病历');
    expect(isEncrypted('历史明文病历')).toBe(false);
  });

  it('完整性：篡改密文解密抛错（GCM 认证标签校验）', () => {
    const enc = encryptField('冠心病') as string;
    const body = enc.slice('enc:v1:'.length);
    const buf = Buffer.from(body, 'base64');
    buf[buf.length - 1] ^= 0xff; // 翻转最后一字节
    const tampered = 'enc:v1:' + buf.toString('base64');
    expect(() => decryptField(tampered)).toThrow();
  });
});
