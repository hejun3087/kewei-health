import { HttpException, HttpStatus } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExportService } from './export.service';

describe('ExportService', () => {
  let prisma: any;
  let memberService: any;
  let service: ExportService;

  const USER_ID = 'u1';

  beforeEach(() => {
    prisma = {
      report: { findMany: jest.fn() },
      diagnosis: { findMany: jest.fn() },
      medication: { findMany: jest.fn() },
    };
    memberService = {
      assertExportAccess: jest.fn().mockResolvedValue({ allowed: true, plan: 'STANDARD' }),
    };
    service = new ExportService(prisma, memberService);
  });

  describe('权益校验（付费墙）', () => {
    it('免费版：assertExportAccess 抛 402，且不查询任何数据', async () => {
      memberService.assertExportAccess.mockRejectedValue(
        new HttpException('需升级', HttpStatus.PAYMENT_REQUIRED),
      );

      await expect(service.exportHealthData(USER_ID)).rejects.toThrow(HttpException);
      expect(memberService.assertExportAccess).toHaveBeenCalledWith(USER_ID);
      expect(prisma.report.findMany).not.toHaveBeenCalled();
      expect(prisma.diagnosis.findMany).not.toHaveBeenCalled();
      expect(prisma.medication.findMany).not.toHaveBeenCalled();
    });
  });

  describe('数据查询契约', () => {
    it('全部查询限定 userId + deletedAt:null', async () => {
      prisma.report.findMany.mockResolvedValue([]);
      prisma.diagnosis.findMany.mockResolvedValue([]);
      prisma.medication.findMany.mockResolvedValue([]);

      await service.exportHealthData(USER_ID);

      for (const mock of [prisma.report.findMany, prisma.diagnosis.findMany, prisma.medication.findMany]) {
        const arg = mock.mock.calls[0][0];
        expect(arg.where.userId).toBe(USER_ID);
        expect(arg.where.deletedAt).toBeNull();
      }
    });

    it('传 memberId 时按成员过滤（数据隔离）', async () => {
      prisma.report.findMany.mockResolvedValue([]);
      prisma.diagnosis.findMany.mockResolvedValue([]);
      prisma.medication.findMany.mockResolvedValue([]);

      await service.exportHealthData(USER_ID, 'm1');

      expect(prisma.report.findMany.mock.calls[0][0].where.memberId).toBe('m1');
      expect(prisma.diagnosis.findMany.mock.calls[0][0].where.memberId).toBe('m1');
      expect(prisma.medication.findMany.mock.calls[0][0].where.memberId).toBe('m1');
    });
  });

  describe('工作簿生成', () => {
    it('返回非空 xlsx buffer 与规范文件名，含四张表', async () => {
      prisma.report.findMany.mockResolvedValue([
        {
          reportDate: new Date('2026-01-01'),
          member: { name: '张三' },
          categoryL1: '血液检查',
          categoryL2: '血常规',
          hospital: '协和',
          department: '内科',
          doctor: '李医生',
          summary: '正常',
          items: [{ name: '白细胞', value: '6.1', unit: '10^9/L', referenceMin: 3.5, referenceMax: 9.5, abnormal: 'NORMAL' }],
        },
      ]);
      prisma.diagnosis.findMany.mockResolvedValue([
        { visitDate: new Date('2026-01-02'), member: { name: '张三' }, diagnosisText: '上呼吸道感染', nextVisitDate: new Date('2026-01-16') },
      ]);
      prisma.medication.findMany.mockResolvedValue([
        { drugName: '阿莫西林', member: { name: '张三' }, status: 'USING', startDate: new Date('2026-01-02') },
      ]);

      const { buffer, filename } = await service.exportHealthData(USER_ID);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      expect(filename).toMatch(/^kewei-health-export-\d{4}-\d{2}-\d{2}\.xlsx$/);

      // 回读工作簿验证四张表与行数
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);
      expect(wb.worksheets.map((w) => w.name)).toEqual(['检查报告', '报告明细', '就诊记录', '用药记录']);
      expect(wb.getWorksheet('检查报告')!.rowCount).toBe(2); // 表头 + 1 行
      expect(wb.getWorksheet('报告明细')!.rowCount).toBe(2); // 1 条明细
      expect(wb.getWorksheet('就诊记录')!.rowCount).toBe(2);
      expect(wb.getWorksheet('用药记录')!.rowCount).toBe(2);
    });
  });
});
