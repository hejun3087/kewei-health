import { Module } from '@nestjs/common';
import { FamilyMemberService } from './family-member.service';
import { FamilyMemberController } from './family-member.controller';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [MemberModule],
  controllers: [FamilyMemberController],
  providers: [FamilyMemberService],
  exports: [FamilyMemberService],
})
export class FamilyMemberModule {}
