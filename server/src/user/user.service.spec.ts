import { UserService } from './user.service';

describe('UserService', () => {
  let prisma: any;
  let service: UserService;

  const USER_ID = 'u1';

  beforeEach(() => {
    prisma = {
      user: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new UserService(prisma);
  });

  describe('updateProfile', () => {
    it('birthDate 字符串转 Date，其余字段透传', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID });

      await service.updateProfile(USER_ID, {
        nickname: '小明',
        gender: 'MALE',
        birthDate: '1990-05-06',
      });

      const arg = prisma.user.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: USER_ID });
      expect(arg.data.nickname).toBe('小明');
      expect(arg.data.gender).toBe('MALE');
      expect(arg.data.birthDate).toBeInstanceOf(Date);
      expect(arg.data.birthDate.toISOString().slice(0, 10)).toBe('1990-05-06');
    });

    it('未传 birthDate 时不写入该字段（undefined）', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID });

      await service.updateProfile(USER_ID, { height: 175 });

      const arg = prisma.user.update.mock.calls[0][0];
      expect(arg.data.height).toBe(175);
      expect(arg.data.birthDate).toBeUndefined();
    });
  });

  describe('getUserById', () => {
    it('存在则返回并剔除 password 字段', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: USER_ID,
        phone: '13800000000',
        nickname: '小明',
        password: 'hashed-secret',
        familyMembers: [{ id: 'm1' }],
      });

      const res = await service.getUserById(USER_ID);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: USER_ID },
        include: { familyMembers: true },
      });
      expect(res).toBeDefined();
      expect((res as any).password).toBeUndefined();
      expect((res as any).phone).toBe('13800000000');
      expect((res as any).familyMembers).toHaveLength(1);
    });

    it('不存在返回 null', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserById('missing')).resolves.toBeNull();
    });
  });

  describe('deleteAccount（软删除）', () => {
    it('置 status=DELETED 且写入 deletedAt 时间', async () => {
      prisma.user.update.mockResolvedValue({ id: USER_ID, status: 'DELETED' });

      await service.deleteAccount(USER_ID);

      const arg = prisma.user.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: USER_ID });
      expect(arg.data.status).toBe('DELETED');
      expect(arg.data.deletedAt).toBeInstanceOf(Date);
    });
  });
});
