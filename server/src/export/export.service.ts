import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
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
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private prisma: PrismaService,
    private memberService: MemberService,
  ) {}

  private fmtDate(d?: Date | null): string {
    return d ? new Date(d).toISOString().slice(0, 10) : '';
  }

  /** 加载导出所需数据（Excel/PDF 共用）：限定 userId + deletedAt:null，可选 memberId 过滤 */
  private async gatherData(userId: string, memberId?: string) {
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
    return { reports, diagnoses, medications };
  }

  /** 生成导出工作簿，返回 buffer 与建议文件名 */
  async exportHealthData(userId: string, memberId?: string): Promise<{ buffer: Buffer; filename: string }> {
    // 权益校验：免费版抛 402
    await this.memberService.assertExportAccess(userId);

    const { reports, diagnoses, medications } = await this.gatherData(userId, memberId);

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

  /**
   * 解析可用于中文渲染的 CJK 字体文件。
   * 优先环境变量 PDF_CJK_FONT；其次常见 Windows/Linux/macOS 路径。
   * 找不到返回 null（调用方降级为内置字体，中文会显示为空格但不会报错）。
   */
  private resolveCjkFont(): string | null {
    const candidates = [
      process.env.PDF_CJK_FONT,
      'C:/Windows/Fonts/NotoSansSC-VF.ttf',
      'C:/Windows/Fonts/simhei.ttf',
      'C:/Windows/Fonts/msyh.ttc',
      'C:/Windows/Fonts/simsun.ttc',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.otf',
      '/System/Library/Fonts/PingFang.ttc',
    ].filter(Boolean) as string[];
    for (const p of candidates) {
      try {
        if (existsSync(p)) return p;
      } catch {
        /* ignore unreadable path */
      }
    }
    return null;
  }

  /** 生成健康档案 PDF，返回 buffer 与建议文件名 */
  async exportHealthDataPdf(userId: string, memberId?: string): Promise<{ buffer: Buffer; filename: string }> {
    // 权益校验：免费版抛 402
    await this.memberService.assertExportAccess(userId);

    const { reports, diagnoses, medications } = await this.gatherData(userId, memberId);

    const doc = new PDFDocument({ size: 'A4', margin: 42, info: { Title: '可为健康档案' } });
    const fontPath = this.resolveCjkFont();
    if (fontPath) {
      try {
        doc.font(fontPath);
      } catch (e) {
        this.logger.warn(`PDF 字体加载失败，降级为内置字体: ${e}`);
      }
    } else {
      this.logger.warn('未检测到 CJK 字体，PDF 中文可能无法渲染（可设置环境变量 PDF_CJK_FONT）');
    }

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<void>((resolve) => doc.on('end', () => resolve()));

    // ---- 标题 ----
    doc.fontSize(20).text('可为健康 · 个人健康档案', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#666').text(
      `导出时间：${new Date().toLocaleString('zh-CN')}    报告 ${reports.length} 份 · 就诊 ${diagnoses.length} 次 · 用药 ${medications.length} 种`,
      { align: 'center' },
    );
    doc.moveDown(1);
    doc.fillColor('#000');

    const heading = (t: string) => {
      if (doc.y > 720) doc.addPage();
      doc.moveDown(0.6);
      doc.fontSize(14).text(t);
      doc.moveDown(0.2);
    };
    const kv = (label: string, value?: string | null) => {
      doc.fontSize(9).fillColor('#888').text(`${label}：`, { continued: true }).fillColor('#000').text(value || '-');
    };

    // ---- 一、检查报告 ----
    heading('一、检查报告');
    if (reports.length === 0) doc.fontSize(10).text('（无记录）');
    reports.forEach((r: any, i: number) => {
      doc.fontSize(11).text(`${i + 1}. ${r.categoryL1 || ''} ${r.categoryL2 || ''}　${this.fmtDate(r.reportDate)}`);
      kv('成员', r.member?.name);
      kv('医院/科室', `${r.hospital || '-'} ${r.department || ''}`);
      if (r.summary) kv('摘要', r.summary);
      const items = r.items || [];
      if (items.length) {
        doc.fontSize(9).fillColor('#888').text('检查明细：').fillColor('#000');
        items.forEach((it: any) => {
          const ref = it.referenceText || (it.referenceMin != null && it.referenceMax != null ? `${it.referenceMin}-${it.referenceMax}` : '');
          const flag = it.abnormal && it.abnormal !== 'NORMAL' ? ` [${it.abnormal}]` : '';
          doc.fontSize(10).text(`  · ${it.name} ${it.value}${it.unit || ''}（参考 ${ref || '-'}）${flag}`);
        });
      }
      doc.moveDown(0.4);
    });

    // ---- 二、就诊记录 ----
    heading('二、就诊记录');
    if (diagnoses.length === 0) doc.fontSize(10).text('（无记录）');
    diagnoses.forEach((d: any, i: number) => {
      doc.fontSize(11).text(`${i + 1}. ${d.diagnosisText || '就诊'}　${this.fmtDate(d.visitDate)}`);
      kv('成员', d.member?.name);
      kv('医院/科室', `${d.hospital || '-'} ${d.department || ''}`);
      if (d.complaint) kv('主诉', d.complaint);
      if (d.advice) kv('医嘱', d.advice);
      if (d.nextVisitDate) kv('下次复诊', this.fmtDate(d.nextVisitDate));
      doc.moveDown(0.4);
    });

    // ---- 三、用药记录 ----
    heading('三、用药记录');
    if (medications.length === 0) doc.fontSize(10).text('（无记录）');
    medications.forEach((m: any, i: number) => {
      doc.fontSize(11).text(`${i + 1}. ${m.drugName || ''} ${m.tradeName ? `(${m.tradeName})` : ''}`);
      kv('成员', m.member?.name);
      kv('用法用量', `${m.usage || ''} ${m.dosage || ''} ${m.frequency || ''}`.trim());
      kv('起止', `${this.fmtDate(m.startDate) || '-'} ~ ${this.fmtDate(m.endDate) || '-'}`);
      kv('状态', m.status);
      doc.moveDown(0.4);
    });

    doc.end();
    await done;

    const buffer = Buffer.concat(chunks);
    const filename = `kewei-health-export-${this.fmtDate(new Date())}.pdf`;
    return { buffer, filename };
  }
}
