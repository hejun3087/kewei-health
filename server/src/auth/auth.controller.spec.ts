import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController 登录审计留痕（PIA R-3）', () => {
  let authService: any;
  let auditService: any;
  let ctrl: AuthController;
  const req = { ip: '1.2.3.4', headers: { 'user-agent': 'UA' } };

  beforeEach(() => {
    authService = {
      loginByPhone: jest.fn(),
      loginByPassword: jest.fn(),
      register: jest.fn(),
      loginByWechat: jest.fn(),
      validateUser: jest.fn(),
      stepUp: jest.fn(),
    };
    auditService = {
      recordLogin: jest.fn().mockResolvedValue(undefined),
      record: jest.fn().mockResolvedValue(undefined),
    };
    ctrl = new AuthController(authService, auditService);
  });

  it('密码登录成功：记录 LOGIN success 且带 userId，不记录 identity', async () => {
    authService.loginByPassword.mockResolvedValue({ token: 't1', user: { id: 'u1' } });
    const res = await ctrl.loginByPassword({ phone: '13800001234', password: 'p' }, req);
    expect(res).toEqual({ token: 't1', user: { id: 'u1' } });
    expect(auditService.recordLogin).toHaveBeenCalledWith({
      ip: '1.2.3.4',
      userAgent: 'UA',
      method: 'password',
      success: true,
      userId: 'u1',
    });
  });

  it('密码登录失败：记录 LOGIN failure（脱敏 identity + status）并原样抛出', async () => {
    authService.loginByPassword.mockRejectedValue(new UnauthorizedException('手机号或密码错误'));
    await expect(
      ctrl.loginByPassword({ phone: '13800001234', password: 'bad' }, req),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const arg = auditService.recordLogin.mock.calls[0][0];
    expect(arg).toMatchObject({ method: 'password', success: false, identity: '13800001234', status: 401 });
  });

  it('手机号登录成功：method=phone', async () => {
    authService.loginByPhone.mockResolvedValue({ token: 't1', user: { id: 'u9' } });
    await ctrl.loginByPhone({ phone: '13800001234' }, req);
    expect(auditService.recordLogin).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'phone', success: true, userId: 'u9' }),
    );
  });

  it('微信登录失败：以 openId 作 identity 脱敏', async () => {
    authService.loginByWechat.mockRejectedValue(new UnauthorizedException('x'));
    await expect(ctrl.loginByWechat({ openId: 'oABCDEFGH12345' }, req)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditService.recordLogin).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'wechat', success: false, identity: 'oABCDEFGH12345' }),
    );
  });

  it('注册不触发登录审计', async () => {
    authService.register.mockResolvedValue({ token: 't', user: { id: 'u1' } });
    await ctrl.register({ phone: '13800001234', password: 'p', nickname: 'n' });
    expect(auditService.recordLogin).not.toHaveBeenCalled();
  });

  it('GET me 透传 validateUser，不触发审计', async () => {
    authService.validateUser.mockResolvedValue({ id: 'u1' });
    await ctrl.getProfile({ user: { userId: 'u1' } });
    expect(authService.validateUser).toHaveBeenCalledWith('u1');
    expect(auditService.recordLogin).not.toHaveBeenCalled();
  });

  // -------- POST /auth/stepup（RBAC P2） --------

  it('stepup 成功：签发 token 后落 STEPUP/success 审计（带 userId/ip/ua）', async () => {
    authService.stepUp.mockResolvedValue({ token: 'stepup-jwt', expiresIn: 300 });
    const res = await ctrl.stepUp({ user: { userId: 'admin1' }, ...req }, { password: 'pw' });
    expect(res).toEqual({ token: 'stepup-jwt', expiresIn: 300 });
    expect(authService.stepUp).toHaveBeenCalledWith('admin1', 'pw');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin1',
        action: 'STEPUP',
        resourceType: 'AUTH',
        ip: '1.2.3.4',
        userAgent: 'UA',
        success: true,
      }),
    );
  });

  it('stepup 密码错误：抛 401 且落 STEPUP/failure 审计（携带 status=401）', async () => {
    authService.stepUp.mockRejectedValue(new UnauthorizedException('密码错误'));
    await expect(
      ctrl.stepUp({ user: { userId: 'admin1' }, ...req }, { password: 'bad' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin1',
        action: 'STEPUP',
        resourceType: 'AUTH',
        success: false,
        meta: { status: 401 },
      }),
    );
  });
});

