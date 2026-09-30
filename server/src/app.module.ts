import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { FamilyMemberModule } from './family-member/family-member.module';
import { ReportModule } from './report/report.module';
import { DiagnosisModule } from './diagnosis/diagnosis.module';
import { MedicationModule } from './medication/medication.module';
import { UploadModule } from './upload/upload.module';
import { AiModule } from './ai/ai.module';
import { MemberModule } from './member/member.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    FamilyMemberModule,
    ReportModule,
    DiagnosisModule,
    MedicationModule,
    UploadModule,
    AiModule,
    MemberModule,
  ],
})
export class AppModule {}
