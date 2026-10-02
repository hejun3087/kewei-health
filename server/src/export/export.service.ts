import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { MemberService } from '../member/member.service';

/**
 * 健康档案数据导出（4.3.1）
 *
 * 权益：标准版及以上可用（memberService.assertExportAccess 抛 402 付费墙）。
 * 产物：单个 xlsx，含「检查报告 / 报告明细 / 就诊记录 / 用药记录」四张表。
 * 归属：所有查询限定 userId + deletedAt:null，可选按 memberId 过滤（数据隔离）。
 */
@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private memberService: MemberService,
  ) {}

  private fmtDate(d?: Date | null): string {
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  }

  /** 生成导出工作簿，返回 buffer 与建议文件名 */
  async exportHealthData(userId: string, memberId?: string): Promise<{ buffer: Buffer; filename: string }> {
    // 权益校验：免费版抛 402
    await this.memberService.assertExportAccess(userId);

    const memberWhere = memberId ? { memberId } : {};

    const [reports, diagnoses, medications] = await Promise.all([
      this.prisma.report.findMany({
        where: { userId, deletedAt: null, ...memberWhere },
        include: { member: true, items: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { reportDate: 'desc' },
      }),
      this.prisma.diagnosis.findMany({
        where: { userId, deletedAt: null, ...memberWhere },
        include: { member: true },
        orderBy: { visitDate: 'desc' },
      }),
      this.prisma.medication.findMany({
        where: { userId, deletedAt: null, ...memberWhere },
        include: { member: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = '可为健康';
    wb.created = new Date();

    // ---- Sheet 1: 检查报告 ----
    const rs = wb.addWorksheet('检查报告');
    rs.columns = [
      { header: '报告日期', key: 'date', width: 14 },
      { header: '成员', key: 'member', width: 12 },
      { header: '一级分类', key: 'categoryL1', width: 14 },
      { header: '二级分类', key: 'categoryL2', width: 16 },
      { header: '医院', key: 'hospital', width: 20 },
      { header: '科室', key: 'department', width: 12 },
      { header: '医生', key: 'doctor', width: 12 },
      { header: '摘要/结论', key: 'summary', width: 40 },
    ];
    reports.forEach((r: any) =>
      rs.addRow({
        date: this.fmtDate(r.reportDate),
        member: r.member?.name || '',
        categoryL1: r.categoryL1 || '',
        categoryL2: r.categoryL2 || '',
        hospital: r.hospital || '',
        department: r.department || '',
        doctor: r.doctor || '',
        summary: r.summary || '',
      }),
    );

    // ---- Sheet 2: 报告明细 ----
    const is = wb.addWorksheet('报告明细');
    is.columns = [
      { header: '报告日期', key: 'date', width: 14 },
      { header: '成员', key: 'member', width: 12 },
      { header: '项目名称', key: 'name', width: 22 },
      { header: '结果值', key: 'value', width: 14 },
      { header: '单位', key: 'unit', width: 10 },
      { header: '参考下限', key: 'refMin', width: 10 },
      { header: '参考上限', key: 'refMax', width: 10 },
      { header: '参考范围', key: 'refText', width: 18 },
      { header: '异常', key: 'abnormal', width: 10 },
    ];
    reports.forEach((r: any) =>
      (r.items || []).forEach((it: any) =>
        is.addRow({
          date: this.fmtDate(r.reportDate),
          member: r.member?.name || '',
          name: it.name,
          value: it.value,
          unit: it.unit || '',
          refMin: it.referenceMin ?? '',
          refMax: it.referenceMax ?? '',
          refText: it.referenceText || '',
          abnormal: it.abnormal || '',
        }),
      ),
    );

    // ---- Sheet 3: 就诊记录 ----
    const ds = wb.addWorksheet('就诊记录');
    ds.columns = [
      { header: '就诊日期', key: 'visitDate', width: 14 },
      { header: '成员', key: 'member', width: 12 },
      { header: '医院', key: 'hospital', width: 20 },
      { header: '科室', key: 'department', width: 12 },
      { header: '医生', key: 'doctor', width: 12 },
      { header: '主诉', key: 'complaint', width: 24 },
      { header: '诊断结果', key: 'diagnosisText', width: 32 },
      { header: 'ICD-10', key: 'diagnosisCode', width: 12 },
      { header: '医嘱', key: 'advice', width: 32 },
      { header: '下次复诊', key: 'nextVisitDate', width: 14 },
    ];
    diagnoses.forEach((d: any) =>
      ds.addRow({
        visitDate: this.fmtDate(d.visitDate),
        member: d.member?.name || '',
        hospital: d.hospital || '',
        department: d.department || '',
        doctor: d.doctor || '',
        complaint: d.complaint || '',
        diagnosisText: d.diagnosisText || '',
        diagnosisCode: d.diagnosisCode || '',
        advice: d.advice || '',
        nextVisitDate: this.fmtDate(d.nextVisitDate),
      }),
    );

    // ---- Sheet 4: 用药记录 ----
    const ms = wb.addWorksheet('用药记录');
    ms.columns = [
      { header: '药品名称', key: 'drugName', width: 22 },
      { header: '商品名', key: 'tradeName', width: 18 },
      { header: '成员', key: 'member', width: 12 },
      { header: '规格', key: 'specification', width: 16 },
      { header: '用法', key: 'usage', width: 12 },
      { header: '用量', key: 'dosage', width: 14 },
      { header: '频次', key: 'frequency', width: 14 },
      { header: '开始日期', key: 'startDate', width: 14 },
      { header: '结束日期', key: 'endDate', width: 14 },
      { header: '状态', key: 'status', width: 10 },
    ];
    medications.forEach((m: any) =>
      ms.addRow({
        drugName: m.drugName || '',
        tradeName: m.tradeName || '',
        member: m.member?.name || '',
        specification: m.specification || '',
        usage: m.usage || '',
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        startDate: this.fmtDate(m.startDate),
        endDate: this.fmtDate(m.endDate),
        status: m.status || '',
      }),
    );

    // 表头统一加粗
    [rs, is, ds, ms].forEach((ws) => {
      ws.getRow(1).font = { bold: true };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `kewei-health-export-${this.fmtDate(new Date())}.xlsx`;
    return { buffer: Buffer.from(buffer), filename };
  }
}
