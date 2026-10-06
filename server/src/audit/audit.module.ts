import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditExportService } from './audit-export.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditController } from './audit.controller';

/**
 * 数据访问审计模块（合规 6.1.7）。
 * 注册全局拦截器，对标注 @Audit 的健康数据接口读写留痕。
 * PrismaService（@Global）与 Reflector（Nest 内置）均可直接注入。
 * RBAC P3：注册并导出 AuditExportService（管理端审计日志导出 xlsx/csv）。
 */
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    AuditExportService,
    AuditInterceptor,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService, AuditExportService],
})
export class AuditModule {}
