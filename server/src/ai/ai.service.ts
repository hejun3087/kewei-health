import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * AI识别服务
 * 负责调用大模型API对医疗报告图片进行OCR识别和结构化提取
 * 
 * 当前为Mock实现，实际部署时替换为真实AI API调用：
 * - 方案1：调用 OpenAI GPT-4 Vision API（推荐，支持图片理解）
 * - 方案2：调用 百度智能云医疗OCR API
 * - 方案3：调用 阿里云医疗OCR API
 * - 方案4：自建 OCR + NLP 服务
 */
@Injectable()
export class AiService {
  private apiKey = process.env.AI_API_KEY || '';
  private apiEndpoint = process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

  /**
   * 识别医疗报告图片
   * @param imagePath 图片本地路径
   * @returns 结构化识别结果
   */
  async recognizeMedicalReport(imagePath: string): Promise<any> {
    // 读取图片并转为base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // TODO: 替换为真实的AI API调用
    // 当前返回Mock数据用于开发测试
    const result = await this.callAiApi(base64Image);
    return result;
  }

  /**
   * 调用AI API（当前为Mock实现）
   */
  private async callAiApi(base64Image: string): Promise<any> {
    // ============================================================
    // 实际部署时，使用以下代码调用 OpenAI GPT-4 Vision API：
    //
    // const response = await fetch(this.apiEndpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.apiKey}`,
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4o',
    //     messages: [{
    //       role: 'user',
    //       content: [
    //         { type: 'text', text: MEDICAL_REPORT_PROMPT },
    //         { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
    //       ],
    //     }],
    //     max_tokens: 4096,
    //   }),
    // });
    // const data = await response.json();
    // return JSON.parse(data.choices[0].message.content);
    // ============================================================

    // Mock返回 - 模拟化验报告识别结果
    return {
      reportType: 'LAB',
      categoryL1: '血液检查',
      categoryL2: '血常规',
      hospital: '北京协和医院',
      department: '检验科',
      reportDate: new Date().toISOString().split('T')[0],
      summary: '血常规检查，各项指标基本正常',
      items: [
        {
          name: '白细胞计数',
          code: 'WBC',
          value: '6.8',
          unit: '10^9/L',
          referenceMin: 3.5,
          referenceMax: 9.5,
          abnormal: 'NORMAL',
          isNumeric: true,
          sortOrder: 1,
        },
        {
          name: '红细胞计数',
          code: 'RBC',
          value: '4.52',
          unit: '10^12/L',
          referenceMin: 4.3,
          referenceMax: 5.8,
          abnormal: 'NORMAL',
          isNumeric: true,
          sortOrder: 2,
        },
        {
          name: '血红蛋白',
          code: 'HGB',
          value: '138',
          unit: 'g/L',
          referenceMin: 130,
          referenceMax: 175,
          abnormal: 'NORMAL',
          isNumeric: true,
          sortOrder: 3,
        },
        {
          name: '血小板计数',
          code: 'PLT',
          value: '225',
          unit: '10^9/L',
          referenceMin: 125,
          referenceMax: 350,
          abnormal: 'NORMAL',
          isNumeric: true,
          sortOrder: 4,
        },
        {
          name: '中性粒细胞百分比',
          code: 'NEUT%',
          value: '65.2',
          unit: '%',
          referenceMin: 40,
          referenceMax: 75,
          abnormal: 'NORMAL',
          isNumeric: true,
          sortOrder: 5,
        },
      ],
      confidence: 0.92,
    };
  }

  /**
   * 识别处方/用药单
   */
  async recognizePrescription(imagePath: string): Promise<any> {
    // Mock返回 - 模拟处方识别结果
    return {
      reportType: 'PRESCRIPTION',
      categoryL1: '用药记录',
      hospital: '北京协和医院',
      department: '内科',
      doctor: '张医生',
      reportDate: new Date().toISOString().split('T')[0],
      medications: [
        {
          drugName: '阿莫西林胶囊',
          tradeName: '阿莫仙',
          specification: '0.5g',
          dosageForm: '胶囊',
          usage: '口服',
          dosage: '每次1粒',
          frequency: '每日3次',
          mealRelation: '饭后',
          days: 7,
        },
        {
          drugName: '布洛芬缓释胶囊',
          tradeName: '芬必得',
          specification: '0.3g',
          dosageForm: '胶囊',
          usage: '口服',
          dosage: '每次1粒',
          frequency: '每日2次',
          mealRelation: '饭后',
          days: 5,
        },
      ],
      confidence: 0.88,
    };
  }
}

// AI识别的Prompt模板（用于实际API调用时）
const MEDICAL_REPORT_PROMPT = `你是一个专业的医疗报告识别助手。请仔细分析这张医疗报告图片，提取以下结构化信息：

1. 报告类型（LAB化验/IMAGING影像/PRESCRIPTION处方/MEDICAL_RECORD病历）
2. 医院名称
3. 科室
4. 报告日期
5. 检查项目明细（每项包含：项目名称、检测值、单位、参考范围、是否异常）
6. 总结/结论

请以JSON格式返回，确保数值型指标包含referenceMin和referenceMax。
异常标记：NORMAL正常、HIGH偏高、LOW偏低。
每个item需包含isNumeric字段标识是否为数值型（可用于趋势图）。`;
