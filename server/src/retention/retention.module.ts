import { Module } from '@nestjs/common';
import { DataRetentionService } from './data-retention.service';

/**
 * 数据保留期到期清理模块（PIA R-9）。
 * 提供 @Cron 定时任务：注销超过保留期的账号 → 物理删除健康数据 + 匿名化账号（保留账务外键与审计日志）。
 * PrismaService（@Global）可直接注入；调度由 AppModule 中的 ScheduleModule.forRoot() 驱动。
 */
@Module({
  providers: [DataRetentionService],
  exports: [DataRetentionService],
})
export class RetentionModule {}
