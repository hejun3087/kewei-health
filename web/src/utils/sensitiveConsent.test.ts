import { describe, it, expect, beforeEach } from 'vitest';
import { hasSensitiveConsent, grantSensitiveConsent, revokeSensitiveConsent } from './sensitiveConsent';

describe('sensitiveConsent 工具（PIA R-1 单独同意留痕）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('默认未同意', () => {
    expect(hasSensitiveConsent()).toBe(false);
  });

  it('grant 后为已同意', () => {
    grantSensitiveConsent();
    expect(hasSensitiveConsent()).toBe(true);
  });

  it('revoke 后回到未同意', () => {
    grantSensitiveConsent();
    revokeSensitiveConsent();
    expect(hasSensitiveConsent()).toBe(false);
  });
});
