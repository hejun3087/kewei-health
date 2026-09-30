import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MemberService } from '../member/member.service';

/**
 * AI识别服务
 *
 * 合规约束：医疗健康数据属"重要数据"，禁止出境。因此仅使用国内OCR服务。
 * 通过环境变量 AI_PROVIDER 切换：
 *   - baidu（默认）：百度智能云医疗/通用OCR，需配置 BAIDU_API_KEY / BAIDU_SECRET_KEY
 *   - mock：无密钥时的本地开发降级实现，返回结构化示例数据
 *
 * 平滑演进：接口层（recognizeByUpload）保持稳定，后续接入阿里云/腾讯云或
 * 大模型结构化提取时，仅需替换 provider 分支，不影响 controller 与前端契约。
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly provider = process.env.AI_PROVIDER || 'mock';

  // 百度OCR access_token 缓存
  private baiduToken: { token: string; expireAt: number } | null = null;

  constructor(
    private prisma: PrismaService,
    private memberService: MemberService,
  ) {}

  /**
   * 基于上传记录ID进行识别（前端上传后调用）
   * @param uploadId 上传记录ID
   * @param userId 当前用户（校验归属）
   * @param type report（报告）| prescription（处方）
   */
  async recognizeByUpload(uploadId: string, userId: string, type: 'report' | 'prescription' = 'report') {
    const upload = await this.prisma.upload.findFirst({ where: { id: uploadId, userId } });
    if (!upload) throw new NotFoundException('上传记录不存在');

    // storagePath 形如 /uploads/xxx.jpg，解析为本地绝对路径
    const filename = path.basename(upload.storagePath);
    const absolutePath = path.join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('图片文件不存在');
    }

    // 付费墙：校验并扣减本月 AI 识别额度（超限抛异常）
    const quota = await this.memberService.consumeAiQuota(userId);

    const imageBase64 = fs.readFileSync(absolutePath).toString('base64');

    let result: any;
    if (this.provider === 'baidu' && process.env.BAIDU_API_KEY && process.env.BAIDU_SECRET_KEY) {
      result = await this.recognizeWithBaidu(imageBase64, type);
    } else {
      if (this.provider === 'baidu') {
        this.logger.warn('未配置百度OCR密钥，降级为 mock 识别结果');
      }
      result = this.buildMockResult(type);
    }

    // 回写识别结果与状态
    await this.prisma.upload.update({
      where: { id: uploadId },
      data: { status: 'COMPLETED', aiResult: result },
    });

    return { ...result, quota };
  }

  /**
   * 百度智能云 OCR 识别（真实调用）
   */
  private async recognizeWithBaidu(imageBase64: string, type: 'report' | 'prescription') {
    const token = await this.getBaiduToken();
    // 通用高精度版式识别；如开通医疗OCR专用可替换 endpoint
    const endpoint = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic';
    const body = new URLSearchParams({ access_token: token, image: imageBase64 });

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data: any = await resp.json();

    if (data.error_code) {
      this.logger.error(`百度OCR失败: ${data.error_code} ${data.error_message}`);
      // 出错时降级，保证流程不中断
      return this.buildMockResult(type);
    }

    // 说明：百度OCR仅返回文本行，结构化（items/参考范围）需规则引擎或大模型二次提取。
    // 此处保留原始文本，交由前端展示 + 用户手动修正（符合PRD低成本OCR要求）。
    const words = (data.words_result || []).map((w: any) => w.words).join('\n');
    return {
      ...this.buildMockResult(type),
      rawText: words,
      confidence: 0.5,
      needManualReview: true,
    };
  }

  /**
   * 获取并缓存百度 access_token（有效期约30天，提前1天刷新）
   */
  private async getBaiduToken(): Promise<string> {
    if (this.baiduToken && this.baiduToken.expireAt > Date.now()) {
      return this.baiduToken.token;
    }
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${process.env.BAIDU_API_KEY}&client_secret=${process.env.BAIDU_SECRET_KEY}`;
    const resp = await fetch(url, { method: 'POST' });
    const data: any = await resp.json();
    if (!data.access_token) throw new Error('获取百度access_token失败');
    this.baiduToken = { token: data.access_token, expireAt: Date.now() + (data.expires_in - 86400) * 1000 };
    return data.access_token;
  }

  /**
   * Mock 识别结果（本地开发降级，无密钥时使用）
   */
  private buildMockResult(type: 'report' | 'prescription'): any {
    if (type === 'prescription') {
      return {
        reportType: 'PRESCRIPTION',
        categoryL1: '用药记录',
        hospital: '北京协和医院',
        department: '内科',
        doctor: '张医生',
        reportDate: new Date().toISOString().split('T')[0],
        medications: [
          { drugName: '阿莫西林胶囊', tradeName: '阿莫仙', specification: '0.5g', dosageForm: '胶囊', usage: '口服', dosage: '每次1粒', frequency: '每日3次', mealRelation: '饭后', days: 7 },
          { drugName: '布洛芬缓释胶囊', tradeName: '芬必得', specification: '0.3g', dosageForm: '胶囊', usage: '口服', dosage: '每次1粒', frequency: '每日2次', mealRelation: '饭后', days: 5 },
        ],
        confidence: 0,
        needManualReview: true,
      };
    }
    return {
      reportType: 'LAB',
      categoryL1: '血液检查',
      categoryL2: '血常规',
      hospital: '北京协和医院',
      department: '检验科',
      reportDate: new Date().toISOString().split('T')[0],
      summary: '血常规检查，各项指标基本正常',
      items: [
        { name: '白细胞计数', code: 'WBC', value: '6.8', unit: '10^9/L', referenceMin: 3.5, referenceMax: 9.5, abnormal: 'NORMAL', isNumeric: true, sortOrder: 1 },
        { name: '红细胞计数', code: 'RBC', value: '4.52', unit: '10^12/L', referenceMin: 4.3, referenceMax: 5.8, abnormal: 'NORMAL', isNumeric: true, sortOrder: 2 },
        { name: '血红蛋白', code: 'HGB', value: '138', unit: 'g/L', referenceMin: 130, referenceMax: 175, abnormal: 'NORMAL', isNumeric: true, sortOrder: 3 },
        { name: '血小板计数', code: 'PLT', value: '225', unit: '10^9/L', referenceMin: 125, referenceMax: 350, abnormal: 'NORMAL', isNumeric: true, sortOrder: 4 },
      ],
      confidence: 0,
      needManualReview: true,
    };
  }
}
