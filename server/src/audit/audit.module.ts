import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

/**
 * 数据访问审计模块（合规 6.1.7）。
 * 注册全局拦截器，对标注 @Audit 的健康数据接口读写留痕。
 * PrismaService（@Global）与 Reflector（Nest 内置）均可直接注入。
 */
@Module({
  providers: [
    AuditService,
    AuditInterceptor,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
