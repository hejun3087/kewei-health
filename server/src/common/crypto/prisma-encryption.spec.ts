import {
  encryptWriteParams,
  decryptResultParams,
  createEncryptionMiddleware,
  SENSITIVE_ENCRYPTION_FIELDS,
} from './prisma-encryption';
import { encryptField, isEncrypted } from './encryption';

describe('Prisma 透明字段加解密（PIA R-2 / 6.1.6）', () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  describe('encryptWriteParams', () => {
    it('Report.create：data.summary 明文→密文，其他字段不动', () => {
      const args = { data: { summary: '血糖偏高', hospital: '协和' } };
      encryptWriteParams('Report', 'create', args);
      expect(isEncrypted(args.data.summary)).toBe(true);
      expect(args.data.summary).not.toBe('血糖偏高');
      expect(args.data.hospital).toBe('协和'); // 非敏感字段保持明文
    });

    it('Diagnosis.update：三个文本字段全部加密', () => {
      const args = { data: { complaint: '头晕', diagnosisText: '高血压', advice: '低盐' } };
      encryptWriteParams('Diagnosis', 'update', args);
      for (const f of SENSITIVE_ENCRYPTION_FIELDS.Diagnosis) {
        expect(isEncrypted(args.data[f])).toBe(true);
      }
    });

    it('upsert：加密 create 与 update 两个分支', () => {
      const args = { create: { notes: '饭后服' }, update: { notes: '饭前服' } };
      encryptWriteParams('Medication', 'upsert', args);
      expect(isEncrypted(args.create.notes)).toBe(true);
      expect(isEncrypted(args.update.notes)).toBe(true);
    });

    it('未提交敏感字段时不注入（不新增 key）', () => {
      const args: any = { data: { hospital: '协和' } };
      encryptWriteParams('Report', 'update', args);
      expect('summary' in args.data).toBe(false);
    });

    it('非写动作（findMany）不改参数', () => {
      const args = { where: { summary: '血糖' } };
      encryptWriteParams('Report', 'findMany', args);
      expect(args.where.summary).toBe('血糖');
    });

    it('非目标模型（FamilyMember）跳过', () => {
      const args = { data: { name: '张三' } };
      encryptWriteParams('FamilyMember', 'create', args);
      expect(args.data.name).toBe('张三');
    });
  });

  describe('decryptResultParams', () => {
    it('单对象：密文→明文', () => {
      const rec = { id: 'r1', summary: encryptField('报告结论') };
      const out = decryptResultParams('Report', rec);
      expect(out.summary).toBe('报告结论');
    });

    it('数组：逐条解密', () => {
      const list = [
        { complaint: encryptField('头痛'), diagnosisText: '感冒' },
        { complaint: null, diagnosisText: '发烧' },
      ];
      const out = decryptResultParams('Diagnosis', list);
      expect(out[0].complaint).toBe('头痛');
      expect(out[1].complaint).toBeNull();
    });

    it('存量明文（无前缀）原样透传', () => {
      const rec = { summary: '迁移前的明文摘要' };
      expect(decryptResultParams('Report', rec).summary).toBe('迁移前的明文摘要');
    });

    it('select 未含该字段时不新增 key', () => {
      const rec = { id: 'r1', hospital: '协和' };
      const out = decryptResultParams('Report', rec);
      expect('summary' in out).toBe(false);
    });

    it('标量/null 结果安全返回', () => {
      expect(decryptResultParams('Report', null)).toBeNull();
      expect(decryptResultParams('Report', 42)).toBe(42);
    });
  });

  describe('createEncryptionMiddleware（端到端串联）', () => {
    it('写前加密、next 回传后读解密；null 字段不报错', async () => {
      const mw = createEncryptionMiddleware();
      let seenWrite: any;
      const next = async (params: any) => {
        seenWrite = params.args.data; // 中间件已就地加密
        // 模拟 DB 返回：把写入的（密文）行回传
        return { id: 'r1', ...params.args.data };
      };

      const result = await mw(
        { model: 'Report', action: 'create', args: { data: { summary: '结论A', hospital: 'X' } } },
        next,
      );

      expect(isEncrypted(seenWrite.summary)).toBe(true); // 落库为密文
      expect(result.summary).toBe('结论A'); // 返回给 service 为明文
      expect(result.hospital).toBe('X');
    });

    it('幂等：对已密文值再次写不会二次包裹', async () => {
      const once = encryptField('糖尿病') as string;
      const args = { data: { summary: once } };
      encryptWriteParams('Report', 'update', args);
      expect(args.data.summary).toBe(once); // encryptField 幂等
    });
  });
});
