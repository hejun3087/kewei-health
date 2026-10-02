/**
 * 会员套餐配置（PRD 2.8.2 功能限制明细）
 *
 * 设计原则：套餐为固定四档，配额以代码常量配置，便于快速迭代；
 * 业务做大后可迁移至数据库配置表，接口层保持不变（平滑演进）。
 */
export const UNLIMITED = -1; // 表示不限量

export interface PlanConfig {
  name: string;
  priceYearly: number; // 年费（元）
  aiPerMonth: number; // 每月AI识别次数，-1为不限
  maxMembers: number; // 家庭成员上限（含本人）
  storageLimit: number; // 存储空间上限（bytes）
  canExport: boolean; // 是否可导出健康档案（标准版及以上）
  features: string[]; // 权益清单
}

export const GB = 1024 * 1024 * 1024;

export const PLAN_CONFIG: Record<string, PlanConfig> = {
  FREE: {
    name: '免费版',
    priceYearly: 0,
    aiPerMonth: 50,
    maxMembers: 1,
    storageLimit: 1 * GB,
    canExport: false,
    features: ['基础档案存储', '趋势分析（单成员）', '每月50次AI识别'],
  },
  STANDARD: {
    name: '标准版',
    priceYearly: 108,
    aiPerMonth: 200,
    maxMembers: 5,
    storageLimit: 3 * GB,
    canExport: true,
    features: ['每月200次AI识别', '5名家庭成员', '多成员趋势图', '数据导出'],
  },
  PROFESSIONAL: {
    name: '专业版',
    priceYearly: 228,
    aiPerMonth: UNLIMITED,
    maxMembers: 10,
    storageLimit: 10 * GB,
    canExport: true,
    features: ['AI识别不限次', '10名家庭成员', 'AI深度解读', '10GB存储', '在线客服'],
  },
  FAMILY: {
    name: '家庭版',
    priceYearly: 348,
    aiPerMonth: UNLIMITED,
    maxMembers: 10,
    storageLimit: 10 * GB,
    canExport: true,
    features: ['专业版全部权益', '全家共享', '复诊提醒', '异常预警', '10GB存储'],
  },
};
