import { BadRequestException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { AuditService } from './audit.service';

/** 导出结果：buffer 为 xlsx zip 或 UTF-8 BOM csv，filename 供 Content-Disposition 使用 */
export interface AuditExportResult {
  buffer: Buffer;
  filename: string;
  count: number;
  total: number;
  truncated: boolean;
  format: 'xlsx' | 'csv';
}

/** 管理端动作 → 中文标签（与 Web AllAudit.tsx 映射保持一致） */
const ACTION_LABEL: Record<string, string> = {
  READ: '查看',
  CREATE: '新增',
  UPDATE: '修改',
  DELETE: '删除',
  EXPORT: '导出',
  LOGIN: '登录',
  STEPUP: '二次验证',
  SHARE_CREATE: '创建分享',
  SHARE_LIST: '查看分享列表',
  SHARE_REVOKE: '撤销分享',
  SHARE_VIEW: '分享访问',
  SHARE_REVOKE_ANY: '强制撤销分享',
  ROLE_GRANT: '授予角色',
  ROLE_REVOKE: '撤销角色',
  USER_DISABLE: '账号启停',
  AUDIT_EXPORT: '导出审计日志',
};

const RESOURCE_LABEL: Record<string, string> = {
  REPORT: '检查报告',
  DIAGNOSIS: '就诊记录',
  MEDICATION: '用药记录',
  FAMILY_MEMBER: '家庭成员',
  UPLOAD: '上传文件',
  USER: '个人档案',
  HEALTH_DATA: '健康数据',
  AUTH: '登录认证',
  ADMIN: '管理操作',
};

/**
 * 管理端审计日志导出（RBAC P3，解锁 PIA R-3「审计记录可导出」尾项）。
 *
 * 安全设计（等保三级可追溯口径）：
 * - 复用 AuditService.queryForExport（与列表页共用 buildAdminWhere，导出=所见）；
 * - 行数硬上限 EXPORT_MAX_ROWS=10000，超限三重显式标注（概览页/响应头/前端提示），不静默丢数据；
 * - CSV 公式注入防护：以 = + - @ 等开头的可控字段（userAgent/meta）前置单引号；
 * - CSV 带 UTF-8 BOM，Excel 打开中文不乱码；时间统一 UTC ISO。
 *
 * 本服务只做「取数编排 + 渲染」，授权判定在 AdminController（audit:export）。
 */
@Injectable()
export class AuditExportService {
  constructor(private readonly auditService: AuditService) {}

  async export(query: any = {}, format?: string, maxRows?: number | string): Promise<AuditExportResult> {
    const fmt = String(format || 'xlsx').toLowerCase();
    if (fmt !== 'xlsx' && fmt !== 'csv') {
      throw new BadRequestException('format 仅支持 xlsx 或 csv');
    }
    const { total, rows, truncated, cap } = await this.auditService.queryForExport(query ?? {}, maxRows);
    const filename = `kewei-audit-export-${this.stamp()}${fmt === 'csv' ? '.csv' : '.xlsx'}`;
    const buffer = fmt === 'csv' ? this.buildCsv(rows) : await this.buildExcel(rows, { query: query ?? {}, total, truncated, cap });
    return { buffer, filename, count: rows.length, total, truncated, format: fmt };
  }

  // ---------- 渲染 ----------

  private readonly headers = [
    '时间(UTC)',
    '用户ID',
    '操作',
    '操作(原始)',
    '数据对象',
    '数据对象(原始)',
    '资源ID',
    '结果',
    'IP',
    '设备(UserAgent)',
    '附加信息(meta)',
    '记录ID',
  ];

  private fmtTime(v?: string | null): string {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 19).replace('T', ' ');
  }

  /** 12 列统一产出：xlsx 与 csv 共用，保证两种格式内容一致 */
  private toCells(r: any): (string | number)[] {
    return [
      this.fmtTime(r.createdAt),
      r.userId ?? '(免登录)',
      ACTION_LABEL[r.action] || r.action,
      r.action,
      RESOURCE_LABEL[r.resourceType] || r.resourceType,
      r.resourceType,
      r.resourceId ?? '',
      r.success === false ? '失败' : '成功',
      r.ip ?? '',
      r.userAgent ?? '',
      r.meta ? JSON.stringify(r.meta) : '',
      r.id,
    ];
  }

  private async buildExcel(
    rows: any[],
    info: { query: any; total: number; truncated: boolean; cap: number },
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = '可为健康';
    wb.created = new Date();

    // Sheet 1: 概览 —— 导出归档自证（谁、何时、什么条件、是否截断）
    const ov = wb.addWorksheet('概览');
    ov.columns = [
      { header: '项目', key: 'k', width: 20 },
      { header: '内容', key: 'v', width: 60 },
    ];
    ov.addRow({ k: '导出时间(UTC)', v: new Date().toISOString() });
    ov.addRow({ k: '筛选条件', v: JSON.stringify(info.query ?? {}) || '（无）' });
    ov.addRow({ k: '命中总条数', v: info.total });
    ov.addRow({ k: '本次导出条数', v: rows.length });
    ov.addRow({ k: '是否截断', v: info.truncated ? `是（超出单次上限 ${info.cap} 条，请缩小筛选范围后重导）` : '否' });
    ov.addRow({ k: '数据来源', v: 'AuditLog（可为健康审计模块）' });

    // Sheet 2: 审计日志明细
    const ws = wb.addWorksheet('审计日志');
    ws.columns = this.headers.map((h, i) => ({ header: h, key: `c${i}`, width: i === 9 || i === 10 ? 34 : 20 }));
    rows.forEach((r) => ws.addRow(this.toCells(r)));

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out);
  }

  private buildCsv(rows: any[]): Buffer {
    const lines = [this.headers.map((h) => this.csvCell(h)).join(',')];
    rows.forEach((r) => lines.push(this.toCells(r).map((c) => this.csvCell(c)).join(',')));
    return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
  }

  /**
   * CSV 单元格转义：整体加引号、内部引号翻倍；
   * 以 = + - @ 及制表/回车开头的值前置单引号（防 Excel 公式注入执行，见 OWASP CSV Injection）。
   */
  private csvCell(v: any): string {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }

  private stamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
  }
}
