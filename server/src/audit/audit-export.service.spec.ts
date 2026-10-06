import * as ExcelJS from 'exceljs';
import { BadRequestException } from '@nestjs/common';
import { AuditExportService } from './audit-export.service';

/**
 * AuditExportService 单测（RBAC P3）：
 * 只测「取数编排 + 两种格式渲染 + CSV 安全转义」，DB 取数逻辑在 audit.service.spec 覆盖。
 * 通过注入 mock AuditService 解耦，零真实 DB / 零文件 IO。
 */
describe('AuditExportService（审计日志导出渲染）', () => {
  let auditService: any;
  let svc: AuditExportService;

  const row = (o: any = {}) => ({
    id: 'evt1',
    userId: 'u1',
    action: 'ROLE_GRANT',
    resourceType: 'ADMIN',
    resourceId: 'ur1',
    ip: '10.0.0.1',
    userAgent: 'Mozilla/5.0',
    success: true,
    meta: { role: 'AUDITOR', reason: '合规复核' },
    createdAt: '2026-10-06T08:30:00.000Z',
    ...o,
  });

  const oneRow = (overrides: any = {}, extra: any = {}) =>
    auditService.queryForExport.mockResolvedValue({
      total: 1,
      rows: [row(overrides)],
      truncated: false,
      cap: 10000,
      ...extra,
    });

  beforeEach(() => {
    auditService = {
      queryForExport: jest.fn().mockResolvedValue({ total: 1, rows: [row()], truncated: false, cap: 10000 }),
    };
    svc = new AuditExportService(auditService);
  });

  it('默认 xlsx：buffer 为 zip（PK 魔数）、文件名带时间戳、透传条数/截断标记', async () => {
    const out = await svc.export({ action: 'ROLE_GRANT' });
    expect(out.format).toBe('xlsx');
    expect(out.filename).toMatch(/^kewei-audit-export-\d{8}-\d{6}\.xlsx$/);
    expect(out.buffer.subarray(0, 2).toString()).toBe('PK');
    expect(out).toMatchObject({ count: 1, total: 1, truncated: false });
    expect(auditService.queryForExport).toHaveBeenCalledWith({ action: 'ROLE_GRANT' }, undefined);
  });

  it('xlsx 含「概览」+「审计日志」两张表，概览页记录筛选条件供归档举证', async () => {
    const out = await svc.export({ resourceType: 'ADMIN' }, 'xlsx');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(out.buffer as any);
    expect(wb.getWorksheet('概览')).toBeTruthy();
    const data = wb.getWorksheet('审计日志')!;
    expect(data.getRow(1).values).toContain('时间(UTC)');
    expect(data.getRow(1).values).toContain('附加信息(meta)');
    expect(data.rowCount).toBe(2);
  });

  it('csv 带 UTF-8 BOM（否则 Excel 打开中文乱码）', async () => {
    const out = await svc.export({}, 'csv');
    expect(out.filename.endsWith('.csv')).toBe(true);
    expect([...out.buffer.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('csv 中文标签映射：ROLE_GRANT→授予角色、ADMIN→管理操作、success→成功', async () => {
    const out = await svc.export({}, 'csv');
    const text = out.buffer.toString('utf8');
    expect(text).toContain('"时间(UTC)"');
    expect(text).toContain('"授予角色","ROLE_GRANT"');
    expect(text).toContain('"管理操作","ADMIN"');
    expect(text).toContain('"成功"');
  });

  it('csv 列顺序与 xlsx 一致（同一 toCells 产出）', async () => {
    const out = await svc.export({}, 'csv');
    const line = out.buffer.toString('utf8').split('\r\n')[1];
    expect(
      line.startsWith(
        '"2026-10-06 08:30:00","u1","授予角色","ROLE_GRANT","管理操作","ADMIN","ur1","成功","10.0.0.1","Mozilla/5.0"',
      ),
    ).toBe(true);
    expect(line.endsWith('","evt1"')).toBe(true);
  });

  it('csv 引号转义：字段内 " 翻倍并整体加引号（UA 含引号不串列）', async () => {
    oneRow({ userAgent: 'a"b' });
    const out = await svc.export({}, 'csv');
    expect(out.buffer.toString('utf8')).toContain('"a""b"');
  });

  it('CSV 公式注入防护：以 = + - @ 开头的可控字段前置单引号', async () => {
    oneRow({ userAgent: '=cmd|calc' });
    const out = await svc.export({}, 'csv');
    expect(out.buffer.toString('utf8')).toContain("\"'=cmd|calc\"");
  });

  it('userId 为 null（免登录分享访问）→ 输出 (免登录) 占位', async () => {
    oneRow({ userId: null });
    const out = await svc.export({}, 'csv');
    expect(out.buffer.toString('utf8')).toContain('(免登录)');
  });

  it('success=false → 输出「失败」', async () => {
    oneRow({ success: false });
    const out = await svc.export({}, 'csv');
    expect(out.buffer.toString('utf8')).toContain('","失败","');
  });

  it('非法 format → BadRequestException（不静默按默认渲染）', async () => {
    await expect(svc.export({}, 'pdf')).rejects.toBeInstanceOf(BadRequestException);
    expect(auditService.queryForExport).not.toHaveBeenCalled();
  });

  it('截断场景：count 为实际导出条数、total 为命中总数、truncated=true', async () => {
    auditService.queryForExport.mockResolvedValue({ total: 20000, rows: [row()], truncated: true, cap: 10000 });
    const out = await svc.export({}, 'csv', 10000);
    expect(out).toMatchObject({ count: 1, total: 20000, truncated: true });
  });
});
