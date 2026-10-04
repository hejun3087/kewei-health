import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createEncryptionMiddleware } from '../common/crypto/prisma-encryption';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
    // 敏感自由文本字段（Report.summary / Diagnosis 文本 / Medication.notes）静态加解密
    // （PIA R-2 / 6.1.6）：集中式透明钩子，一次覆盖列表/详情/搜索/概览/导出/分享等全部读写面。
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.$use(createEncryptionMiddleware() as any);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
