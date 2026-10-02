import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AppCacheModule } from './common/cache.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { FamilyMemberModule } from './family-member/family-member.module';
import { ReportModule } from './report/report.module';
import { DiagnosisModule } from './diagnosis/diagnosis.module';
import { MedicationModule } from './medication/medication.module';
import { UploadModule } from './upload/upload.module';
import { AiModule } from './ai/ai.module';
import { MemberModule } from './member/member.module';
import { ExportModule } from './export/export.module';
import { ShareModule } from './share/share.module';

@Module({
  imports: [
    // 安全加固（1.3.7）：全局限流，默认每 IP 60 次/分钟；敏感接口用 @Throttle 收紧
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 60 }] }),
    PrismaModule,
    AppCacheModule,
    HealthModule,
    AuthModule,
    UserModule,
    FamilyMemberModule,
    ReportModule,
    DiagnosisModule,
    MedicationModule,
    UploadModule,
    AiModule,
    MemberModule,
    ExportModule,
    ShareModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
