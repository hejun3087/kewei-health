import { HttpException, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  beforeEach(() => {
    prisma = {
      report: { findFirst: jest.fn() },
    };
    memberService = {
      assertShareAccess: jest.fn().mockResolvedValue({ allowed: true, plan: 'FAMILY' }),
    };
    jwtService = new JwtService({ secret: SECRET });
    service = new ShareService(prisma, memberService, jwtService);
  });

  describe('createShareLink（生成分享链接）', () => {
    it('非家庭版：assertShareAccess 抛 402，且不查询报告', async () => {
      memberService.assertShareAccess.mockRejectedValue(
        new HttpException('需升级家庭版', 402),
      );

      await expect(service.createShareLink(USER_ID, REPORT_ID)).rejects.toThrow(HttpException);
      expect(prisma.report.findFirst).not.toHaveBeenCalled();
    });

    it('报告不存在/非本人：抛 NotFoundException，不签发 token', async () => {
      prisma.report.findFirst.mockResolvedValue(null);

      await expect(service.createShareLink(USER_ID, REPORT_ID)).rejects.toThrow(NotFoundException);
      // 归属校验条件
      expect(prisma.report.findFirst.mock.calls[0][0].where).toMatchObject({
        id: REPORT_ID,
        userId: USER_ID,
        deletedAt: null,
      });
    });

    it('家庭版：签发 scope=share 的只读 token，返回 path', async () => {
      prisma.report.findFirst.mockResolvedValue({ id: REPORT_ID, userId: USER_ID });

      const res = await service.createShareLink(USER_ID, REPORT_ID);

      expect(res.reportId).toBe(REPORT_ID);
      expect(res.path).toBe(`/share/report/${res.token}`);
      expect(res.expiresInDays).toBe(30);
      // token 载荷正确且不含登录 sub
      const payload = jwtService.verify(res.token);
      expect(payload).toMatchObject({ scope: 'share', reportId: REPORT_ID, ownerId: USER_ID });
      expect(payload.sub).toBeUndefined();
    });
  });

  describe('getSharedReport（免登录只读查看）', () => {
    it('非法/伪造 token：抛 Forbidden，不查库', async () => {
      await expect(service.getSharedReport('not-a-jwt')).rejects.toThrow(ForbiddenException);
      expect(prisma.report.findFirst).not.toHaveBeenCalled();
    });

    it('登录 token（无 scope=share）不能用于查看：抛 Forbidden', async () => {
      const loginToken = jwtService.sign({ sub: USER_ID });
      await expect(service.getSharedReport(loginToken)).rejects.toThrow(ForbiddenException);
      expect(prisma.report.findFirst).not.toHaveBeenCalled();
    });

    it('报告已删除：抛 NotFoundException', async () => {
      const token = jwtService.sign({ scope: 'share', reportId: REPORT_ID, ownerId: USER_ID });
      prisma.report.findFirst.mockResolvedValue(null);

      await expect(service.getSharedReport(token)).rejects.toThrow(NotFoundException);
    });

    it('有效 token：返回脱敏只读数据（不含 userId/memberId 内部标识）', async () => {
      const token = jwtService.sign({ scope: 'share', reportId: REPORT_ID, ownerId: USER_ID });
      prisma.report.findFirst.mockResolvedValue({
        id: REPORT_ID,
        userId: USER_ID,
        memberId: 'm1',
        reportDate: new Date('2026-01-01'),
        reportType: 'LAB',
        categoryL1: '血液检查',
        categoryL2: '血常规',
        hospital: '协和',
        department: '内科',
        summary: '各项正常',
        member: { name: '本人', relation: 'SELF' },
        items: [{ id: 'i1', name: '白细胞', value: '5.0', unit: '10^9/L', abnormal: 'NORMAL', sortOrder: 0 }],
        images: [{ id: 'img1', imageUrl: '/uploads/a.jpg', thumbnailUrl: '/uploads/a_thumb.jpg', fileSize: 100 }],
      });

      const dto = await service.getSharedReport(token);

      expect(dto.hospital).toBe('协和');
      expect(dto.member).toEqual({ name: '本人', relation: 'SELF' });
      expect(dto.items).toHaveLength(1);
      expect(dto.items[0]).toMatchObject({ name: '白细胞', value: '5.0' });
      // 脱敏：不含内部标识
      expect((dto as any).userId).toBeUndefined();
      expect((dto as any).memberId).toBeUndefined();
      expect((dto as any).id).toBeUndefined();
      expect(dto.images[0]).not.toHaveProperty('fileSize');
    });
  });
});
