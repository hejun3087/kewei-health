import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';

@Module({
  // AuthModule 导出 JwtModule（提供 JwtService），MemberModule 导出 MemberService
  imports: [AuthModule, MemberModule],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}
