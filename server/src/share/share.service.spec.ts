import {
  HttpException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ShareService } from './share.service';

describe('ShareService', () => {
  let prisma: any;
  let memberService: any;
  let jwtService: JwtService;
  let service: ShareService;

  const USER_ID = 'u1';
  const REPORT_ID = 'r1';
  const SECRET = 'test-share-secret';
  const DAY_MS = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    prisma = {
      report: { findFirst: jest.fn() },
      shareLink: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    memberService = {
      assertShareAccess: jest.fn().mockResolvedValue({ allowed: true, plan: 'FAMILY' }),
    };
    jwtService = new JwtService({ secret: SECRET });
    service = new ShareService(prisma, memberService, jwtService);
  });

  describe('createShareLink（生成分享链接）', () => {
    it('非家庭版：assertShareAccess 抛 402，不查询报告、不建记录', async () => {
      memberService.assertShareAccess.mockRejectedValue(new HttpException('需升级家庭版', 402));
      await expect(service.createShareLink(USER_ID, REPORT_ID)).rejects.toThrow(HttpException);
      expect(prisma.report.findFirst).not.toHaveBeenCalled();
      expect(prisma.shareLink.create).not.toHaveBeenCalled();
    });

    it('报告不存在/非本人：抛 NotFoundException，不建记录', async () => {
      prisma.report.findFirst.mockResolvedValue(null);
      await expect(service.createShareLink(USER_ID, REPORT_ID)).rejects.toThrow(NotFoundException);
      expect(prisma.report.findFirst.mock.calls[0][0].where).toMatchObject({
        id: REPORT_ID,
        userId: USER_ID,
        deletedAt: null,
      });
      expect(prisma.shareLink.create).not.toHaveBeenCalled();
    });

    it('非法有效期（0/91/非整数/非数字）：抛 400，不建记录', async () => {
      for (const bad of [0, 91, 7.5, 'abc']) {
        prisma.report.findFirst.mockResolvedValue({ id: REPORT_ID, userId: USER_ID });
        await expect(service.createShareLink(USER_ID, REPORT_ID, bad as any)).rejects.toThrow(
          BadRequestException,
        );
      }
      expect(prisma.shareLink.create).not.toHaveBeenCalled();
    });

    it('默认有效期 30 天：建记录 + 签发带 jti 的 token（不含登录 sub）', async () => {
      prisma.report.findFirst.mockResolvedValue({ id: REPORT_ID, userId: USER_ID });
      prisma.shareLink.create.mockResolvedValue({ id: 'sl1' });

      const before = Date.now();
      const res = await service.createShareLink(USER_ID, REPORT_ID);

      expect(prisma.shareLink.create).toHaveBeenCalledTimes(1);
      const createdExpiresAt = new Date(prisma.shareLink.create.mock.calls[0][0].data.expiresAt).getTime();
      expect(createdExpiresAt).toBeGreaterThanOrEqual(before + 30 * DAY_MS - 5000);
      expect(createdExpiresAt).toBeLessThanOrEqual(Date.now() + 30 * DAY_MS + 5000);

      expect(res.shareId).toBe('sl1');
      expect(res.reportId).toBe(REPORT_ID);
      expect(res.expiresInDays).toBe(30);
      expect(res.path).toBe(`/share/report/${res.token}`);

      const payload = jwtService.verify(res.token);
      expect(payload).toMatchObject({ scope: 'share', reportId: REPORT_ID, ownerId: USER_ID, jti: 'sl1' });
      expect(payload.sub).toBeUndefined();
    });

    it('自定义有效期（7 天）：expiresInDays 与记录 expiresAt 随之变化', async () => {
      prisma.report.findFirst.mockResolvedValue({ id: REPORT_ID, userId: USER_ID });
      prisma.shareLink.create.mockResolvedValue({ id: 'sl2' });
      const res = await service.createShareLink(USER_ID, REPORT_ID, 7);
      expect(res.expiresInDays).toBe(7);
      const created = new Date(prisma.shareLink.create.mock.calls[0][0].data.expiresAt).getTime();
      expect(created).toBeGreaterThanOrEqual(Date.now() + 7 * DAY_MS - 5000);
    });
  });

  describe('getSharedReport（免登录只读查看，以 ShareLink 为权威）', () => {
    const shareToken = (jti = 'sl1') =>
      jwtService.sign({ scope: 'share', reportId: REPORT_ID, ownerId: USER_ID, jti });

    it('非法/伪造 token：抛 Forbidden，不查库', async () => {
      await expect(service.getSharedReport('not-a-jwt')).rejects.toThrow(ForbiddenException);
      expect(prisma.shareLink.findUnique).not.toHaveBeenCalled();
    });

    it('登录 token（无 scope=share）不能查看：Forbidden', async () => {
      const loginToken = jwtService.sign({ sub: USER_ID });
      await expect(service.getSharedReport(loginToken)).rejects.toThrow(ForbiddenException);
      expect(prisma.shareLink.findUnique).not.toHaveBeenCalled();
    });

    it('缺 jti 的旧 token：视为无效（Forbidden），不查 ShareLink', async () => {
      const legacy = jwtService.sign({ scope: 'share', reportId: REPORT_ID, ownerId: USER_ID });
      await expect(service.getSharedReport(legacy)).rejects.toThrow(ForbiddenException);
      expect(prisma.shareLink.findUnique).not.toHaveBeenCalled();
    });

    it('jti 无对应记录：Forbidden（已失效）', async () => {
      prisma.shareLink.findUnique.mockResolvedValue(null);
      await expect(service.getSharedReport(shareToken('ghost'))).rejects.toThrow(ForbiddenException);
    });

    it('记录已撤销：Forbidden（已被撤销）', async () => {
      prisma.shareLink.findUnique.mockResolvedValue({
        id: 'sl1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + DAY_MS),
      });
      await expect(service.getSharedReport(shareToken())).rejects.toThrow(/撤销/);
    });

    it('记录已过期：Forbidden（已过期）', async () => {
      prisma.shareLink.findUnique.mockResolvedValue({
        id: 'sl1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - DAY_MS),
      });
      await expect(service.getSharedReport(shareToken())).rejects.toThrow(/过期/);
    });

    it('有效记录但报告已删除：NotFound', async () => {
      prisma.shareLink.findUnique.mockResolvedValue({
        id: 'sl1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + DAY_MS),
      });
      prisma.report.findFirst.mockResolvedValue(null);
      await expect(service.getSharedReport(shareToken())).rejects.toThrow(NotFoundException);
    });

    it('有效：返回脱敏只读数据并累计访问计数', async () => {
      prisma.shareLink.findUnique.mockResolvedValue({
        id: 'sl1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + DAY_MS),
      });
      prisma.shareLink.update.mockResolvedValue({});
      prisma.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        userId: USER_ID,
        memberId: 'm1',
        reportDate: new Date('2026-01-01'),
        reportType: 'LAB',
        hospital: '协和',
        summary: '各项正常',
        member: { name: '本人', relation: 'SELF' },
        items: [{ id: 'i1', name: '白细胞', value: '5.0', unit: '10^9/L', abnormal: 'NORMAL', sortOrder: 0 }],
        images: [{ id: 'img1', imageUrl: '/a.jpg', thumbnailUrl: '/a_t.jpg', fileSize: 100 }],
      });

      const dto: any = await service.getSharedReport(shareToken());

      expect(dto.hospital).toBe('协和');
      expect(dto.userId).toBeUndefined();
      expect(dto.memberId).toBeUndefined();
      expect(dto.id).toBeUndefined();
      expect(dto.images[0]).not.toHaveProperty('fileSize');
      // 计数旁路写入
      expect(prisma.shareLink.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sl1' } }),
      );
      expect(prisma.shareLink.update.mock.calls[0][0].data.viewCount).toEqual({ increment: 1 });
    });

    it('计数写入失败不阻断查看', async () => {
      prisma.shareLink.findUnique.mockResolvedValue({
        id: 'sl1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + DAY_MS),
      });
      prisma.shareLink.update.mockRejectedValue(new Error('db down'));
      prisma.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        userId: USER_ID,
        hospital: '协和',
        items: [],
        images: [],
      });
      const dto: any = await service.getSharedReport(shareToken());
      expect(dto.hospital).toBe('协和');
    });
  });

  describe('listMyShareLinks', () => {
    it('按 userId（+reportId）过滤，映射 active', async () => {
      prisma.shareLink.findMany.mockResolvedValue([
        { id: 'a', reportId: 'r1', expiresAt: new Date(Date.now() + DAY_MS), revokedAt: null, viewCount: 2, lastViewedAt: null, createdAt: new Date() },
        { id: 'b', reportId: 'r1', expiresAt: new Date(Date.now() - DAY_MS), revokedAt: null, viewCount: 0, lastViewedAt: null, createdAt: new Date() },
      ]);
      const res = await service.listMyShareLinks(USER_ID, 'r1');
      expect(prisma.shareLink.findMany.mock.calls[0][0].where).toMatchObject({ userId: USER_ID, reportId: 'r1' });
      expect(res[0].active).toBe(true);
      expect(res[0].shareId).toBe('a');
      expect(res[1].active).toBe(false);
    });
  });

  describe('revokeShareLink', () => {
    it('非本人/不存在：NotFound', async () => {
      prisma.shareLink.findFirst.mockResolvedValue(null);
      await expect(service.revokeShareLink(USER_ID, 'x')).rejects.toThrow(NotFoundException);
      expect(prisma.shareLink.update).not.toHaveBeenCalled();
    });

    it('未撤销：写 revokedAt 并返回 revoked', async () => {
      prisma.shareLink.findFirst.mockResolvedValue({ id: 'sl1', userId: USER_ID, revokedAt: null });
      prisma.shareLink.update.mockResolvedValue({ revokedAt: new Date() });
      const res = await service.revokeShareLink(USER_ID, 'sl1');
      expect(res).toMatchObject({ shareId: 'sl1', revoked: true });
      expect(prisma.shareLink.update).toHaveBeenCalled();
    });

    it('已撤销：幂等返回，不再次 update', async () => {
      const t = new Date();
      prisma.shareLink.findFirst.mockResolvedValue({ id: 'sl1', userId: USER_ID, revokedAt: t });
      const res = await service.revokeShareLink(USER_ID, 'sl1');
      expect(res).toMatchObject({ shareId: 'sl1', revoked: true });
      expect(prisma.shareLink.update).not.toHaveBeenCalled();
    });
  });
});
