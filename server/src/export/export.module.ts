import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [MemberModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
