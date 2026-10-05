import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { encryptField } from '../common/crypto/encryption';

describe('AuthService', () => {
  let prisma: any;
  let jwtService: any;
  let service: AuthService;

  const baseUser = (overrides: any = {}) => ({
    id: 'u1',
    phone: '13800001234',
    nickname: '测试用户',
    status: 'ACTIVE',
    storageUsed: BigInt(1024),
    storageLimit: BigInt(1073741824),
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      familyMember: {
        create: jest.fn(),
      },
      userRole: {
        // RBAC P0：loadUserRoles 默认无角色（新用户 / 普通用户）；个别用例可覆盖
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    jwtService = { sign: jest.fn().mockReturnValue('fake-jwt-token') };
    service = new AuthService(prisma, jwtService);
  });

  describe('loginByPhone', () => {
    it('新用户：自动注册 + 创建默认家庭成员（本人）+ 签发 token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(baseUser({ password: null }));

      const res = await service.loginByPhone('13800001234');

      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.familyMember.create.mock.calls[0][0].data).toMatchObject({
        userId: 'u1',
        relation: 'SELF',
        isDefault: true,
      });
      expect(res.token).toBe('fake-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'u1', phone: '13800001234', roles: [] });
    });

    it('老用户：不重复注册，直接签发 token', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());

      const res = await service.loginByPhone('13800001234');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.familyMember.create).not.toHaveBeenCalled();
      expect(res.token).toBe('fake-jwt-token');
    });
  });

  describe('loginByPassword', () => {
    it('密码正确：签发 token 且返回用户不含 password 字段', async () => {
      const hash = await bcrypt.hash('secret123', 10);
      prisma.user.findUnique.mockResolvedValue(baseUser({ password: hash }));

      const res = await service.loginByPassword('13800001234', 'secret123');

      expect(res.token).toBe('fake-jwt-token');
      expect(res.user).not.toHaveProperty('password');
    });

    it('用户不存在与密码错误返回同一提示（不泄露账号是否存在）', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.loginByPassword('13800001234', 'x')).rejects.toThrow('手机号或密码错误');

      const hash = await bcrypt.hash('right-pass', 10);
      prisma.user.findUnique.mockResolvedValue(baseUser({ password: hash }));
      await expect(service.loginByPassword('13800001234', 'wrong')).rejects.toThrow('手机号或密码错误');
    });

    it('未设置密码的账号（手机号快捷注册）不能密码登录', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser({ password: null }));
      await expect(service.loginByPassword('13800001234', 'anything')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('手机号已注册时抛 401', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());
      await expect(service.register('13800001234', 'pass')).rejects.toThrow('该手机号已注册');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('成功注册：密码以 bcrypt hash 存储（非明文）+ 默认家庭成员', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(baseUser());

      const res = await service.register('13800001234', 'plain-pass', '小明');

      const created = prisma.user.create.mock.calls[0][0].data;
      expect(created.password).not.toBe('plain-pass');
      expect(await bcrypt.compare('plain-pass', created.password)).toBe(true);
      expect(created.nickname).toBe('小明');
      expect(prisma.familyMember.create).toHaveBeenCalled();
      expect(res.user.nickname).toBe('测试用户');
    });

    it('未填昵称时自动生成"用户+尾号4位"', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(baseUser());

      await service.register('1380005678', 'pass');

      expect(prisma.user.create.mock.calls[0][0].data.nickname).toBe('用户5678');
    });
  });

  describe('loginByWechat', () => {
    it('新用户：以 wx_openId 占位手机号创建 + token payload 仅含 sub', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(baseUser({ phone: 'wx_abc123' }));

      const res = await service.loginByWechat('abc123', 'union-1');

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ wxOpenId: 'abc123', wxUnionId: 'union-1', phone: 'wx_abc123' });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'u1', roles: [] });
      expect(res.token).toBe('fake-jwt-token');
    });

    it('老用户直接登录，不重复建档', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());

      await service.loginByWechat('abc123');

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.familyMember.create).not.toHaveBeenCalled();
    });
  });

  describe('账号状态校验（6.1.8 注销/禁用不得登录）', () => {
    it('loginByPhone：已注销(DELETED)手机号被拒绝，不签发 token', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser({ status: 'DELETED' }));
      await expect(service.loginByPhone('13800001234')).rejects.toThrow('账号已注销，无法登录');
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('loginByPassword：密码正确但账号被禁用(DISABLED)仍被拒绝', async () => {
      const hash = await bcrypt.hash('secret123', 10);
      prisma.user.findUnique.mockResolvedValue(baseUser({ password: hash, status: 'DISABLED' }));
      await expect(service.loginByPassword('13800001234', 'secret123')).rejects.toThrow('账号已被禁用');
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('loginByWechat：已注销的微信账号被拒绝', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser({ status: 'DELETED' }));
      await expect(service.loginByWechat('abc123')).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('ACTIVE 用户通过且剥离 password；默认返回 roles 字段（RBAC P0）', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser({ password: 'hash' }));

      const user = await service.validateUser('u1');

      expect(user).not.toHaveProperty('password');
      expect(user.status).toBe('ACTIVE');
      expect(user.roles).toEqual([]);
    });

    it('validateUser 从 userRole 读取非空角色列表（SUPER_ADMIN/AUDITOR）', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());
      prisma.userRole.findMany.mockResolvedValue([{ role: 'SUPER_ADMIN' }, { role: 'AUDITOR' }]);

      const user = await service.validateUser('u1');

      expect(user.roles).toEqual(['SUPER_ADMIN', 'AUDITOR']);
      // 仅取 revokedAt IS NULL 的活跃行
      expect(prisma.userRole.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', revokedAt: null },
          select: { role: true },
        }),
      );
    });

    it('登录时 payload 与返回体都携带 roles（与 validateUser 同一读取路径）', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());
      prisma.userRole.findMany.mockResolvedValue([{ role: 'SUPER_ADMIN' }]);

      const res = await service.loginByPhone('13800001234');

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'u1',
        phone: '13800001234',
        roles: ['SUPER_ADMIN'],
      });
      expect(res.user.roles).toEqual(['SUPER_ADMIN']);
    });

    it('loadUserRoles 容错：prisma.userRole 不存在时回退为空数组，不阻断登录主链路', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());
      prisma.userRole.findMany.mockRejectedValue(new Error('table missing'));

      const res = await service.loginByPhone('13800001234');

      expect(res.token).toBe('fake-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'u1',
        phone: '13800001234',
        roles: [],
      });
    });

    it('用户不存在或被禁用（非 ACTIVE）均抛 401', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateUser('ghost')).rejects.toThrow(UnauthorizedException);

      prisma.user.findUnique.mockResolvedValue(baseUser({ status: 'BANNED' }));
      await expect(service.validateUser('u1')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('stepUp（RBAC P2 二次验证）', () => {
    it('密码正确：签发 typ=stepup + 5min TTL 短 token，payload 仅含 sub+typ（不含 roles/scope）', async () => {
      const hash = await bcrypt.hash('current-pass', 10);
      prisma.user.findUnique.mockResolvedValue(baseUser({ password: hash }));
      jwtService.sign.mockReturnValue('stepup-jwt');

      const res = await service.stepUp('u1', 'current-pass');

      expect(res).toEqual({ token: 'stepup-jwt', expiresIn: 300 });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'u1', typ: 'stepup' },
        { expiresIn: '5m' },
      );
    });

    it('缺少密码入参 → 400（前端应先弹窗收集）', async () => {
      await expect(service.stepUp('u1', undefined)).rejects.toBeInstanceOf(BadRequestException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('用户不存在 → 401（不泄露是否为有效账号）', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.stepUp('ghost', 'pw')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('微信/验证码账号未设密码 → 400，明确无法参与危险操作', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser({ password: null }));
      await expect(service.stepUp('u1', 'whatever')).rejects.toThrow(
        '账号未设置密码，无法进行二次验证',
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('已注销/禁用账号即使密码正确也拒绝（复用 assertActive）', async () => {
      const hash = await bcrypt.hash('right', 10);
      prisma.user.findUnique.mockResolvedValue(baseUser({ password: hash, status: 'DELETED' }));
      await expect(service.stepUp('u1', 'right')).rejects.toThrow('账号已注销，无法登录');

      prisma.user.findUnique.mockResolvedValue(baseUser({ password: hash, status: 'DISABLED' }));
      await expect(service.stepUp('u1', 'right')).rejects.toThrow('账号已被禁用');
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('密码错误 → 401，且不签发 token（探测不出差异）', async () => {
      const hash = await bcrypt.hash('right-pass', 10);
      prisma.user.findUnique.mockResolvedValue(baseUser({ password: hash }));
      await expect(service.stepUp('u1', 'wrong-pass')).rejects.toThrow('密码错误');
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeUser（BigInt 序列化契约）', () => {
    it('storageUsed/storageLimit BigInt 转 string，避免 JSON 序列化崩溃', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser());

      const res = await service.loginByPhone('13800001234');

      expect(res.user.storageUsed).toBe('1024');
      expect(res.user.storageLimit).toBe('1073741824');
      expect(() => JSON.stringify(res.user)).not.toThrow();
    });

    it('静态解密（PIA R-2）：库中密文经登录返回为明文，存量明文原样透传', async () => {
      prisma.user.findUnique.mockResolvedValue(
        baseUser({
          allergyHistory: encryptField('青霉素过敏'),
          medicalHistory: '存量明文病史',
        }),
      );

      const res = await service.loginByPhone('13800001234');

      expect(res.user.allergyHistory).toBe('青霉素过敏');
      expect(res.user.medicalHistory).toBe('存量明文病史');
    });
  });
});
