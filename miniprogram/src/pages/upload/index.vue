<template>
  <view class="container">
    <view class="card">
      <view class="card-title">上传医疗报告</view>
      <text class="upload-hint">拍照或从相册选择图片，AI将自动识别报告内容</text>

      <!-- 家庭成员选择 -->
      <view class="member-picker">
        <text class="picker-label">所属成员</text>
        <picker mode="selector" :range="memberNames" :value="memberIndex" @change="onMemberChange">
          <view class="picker-value">{{ memberNames[memberIndex] || '请选择成员' }} ▾</view>
        </picker>
      </view>

      <!-- 选择图片区域 -->
      <view v-if="step === 0" class="upload-area">
        <view class="upload-btn" @tap="chooseImage">
          <text class="upload-icon">📷</text>
          <text class="upload-text">拍照 / 选择图片</text>
        </view>
        <view class="upload-tips">
          <text>支持化验报告、影像报告、处方单、病历等</text>
          <text>支持 JPG、PNG 格式</text>
        </view>
      </view>

      <!-- AI识别中 -->
      <view v-if="step === 1" class="processing">
        <view class="loading-icon">🤖</view>
        <text class="processing-text">AI正在识别报告内容...</text>
        <text class="processing-hint">请稍候，通常需要5-10秒</text>
      </view>

      <!-- 识别结果 -->
      <view v-if="step === 2 && aiResult" class="result">
        <view class="disclaimer">
          <text class="disclaimer-title">⚠ AI 识别结果仅供参考，不构成医学诊断</text>
          <text class="disclaimer-text">请逐项核对后再保存；识别可能有误，如有异常或疑问请及时咨询专业医生。</text>
        </view>
        <view class="result-header">
          <text class="tag tag-blue">{{ aiResult.categoryL1 }}</text>
          <text v-if="aiResult.categoryL2" class="tag">{{ aiResult.categoryL2 }}</text>
          <text v-if="aiResult.needManualReview" class="confidence">请核对/修正</text>
        </view>

        <view class="result-info">
          <text class="info-row">医院：{{ aiResult.hospital || '-' }}</text>
          <text class="info-row">日期：{{ (aiResult.reportDate || '').slice(0, 10) }}</text>
        </view>

        <view v-if="aiResult.items && aiResult.items.length" class="result-items">
          <view class="item-title">检查明细</view>
          <view v-for="(item, idx) in aiResult.items" :key="idx" class="result-item">
            <text class="item-name">{{ item.name }}</text>
            <view class="item-values">
              <text class="item-value">{{ item.value }} {{ item.unit || '' }}</text>
              <text :class="['item-status', item.abnormal === 'NORMAL' || !item.abnormal ? 'status-normal' : 'status-abnormal']">
                {{ item.abnormal === 'NORMAL' || !item.abnormal ? '正常' : '异常' }}
              </text>
            </view>
            <text class="item-ref">参考: {{ item.referenceText || ((item.referenceMin != null && item.referenceMax != null) ? (item.referenceMin + '-' + item.referenceMax) : '-') }}</text>
          </view>
        </view>

        <button class="btn-primary save-btn" @tap="saveResult" :disabled="saving">
          {{ saving ? '保存中...' : '确认保存' }}
        </button>
        <button class="btn-reset" @tap="reset">重新上传</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { uploadApi, reportApi, memberApi } from '../../utils/api';

const step = ref(0);
const aiResult = ref<any>(null);
const saving = ref(false);

const members = ref<any[]>([]);
const memberIndex = ref(0);
const memberNames = computed(() => members.value.map((m) => m.name));

onLoad(async () => {
  try {
    members.value = await memberApi.list();
    const defIdx = members.value.findIndex((m) => m.isDefault);
    memberIndex.value = defIdx >= 0 ? defIdx : 0;
  } catch (e) {
    members.value = [];
  }
});

const onMemberChange = (e: any) => {
  memberIndex.value = Number(e.detail.value);
};

const chooseImage = () => {
  if (members.value.length === 0) {
    uni.showToast({ title: '请先在网页端添加家庭成员', icon: 'none' });
    return;
  }
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res: any) => {
      const filePath = res.tempFilePaths[0];
      step.value = 1;
      try {
        // 1) 上传图片，拿到 uploadId
        const up = await uploadApi.image(filePath);
        // 2) AI 识别
        aiResult.value = await uploadApi.recognize(up.id, 'report');
        step.value = 2;
      } catch (e: any) {
        step.value = 0;
        uni.showToast({ title: '识别失败，请重试', icon: 'none' });
      }
    },
    fail: () => {
      step.value = 0;
    },
  });
};

const saveResult = async () => {
  const member = members.value[memberIndex.value];
  if (!member) {
    uni.showToast({ title: '请选择成员', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    const r = aiResult.value;
    const payload = {
      memberId: member.id,
      reportType: r.reportType || 'LAB',
      categoryL1: r.categoryL1 || '其他',
      categoryL2: r.categoryL2,
      hospital: r.hospital,
      department: r.department,
      reportDate: (r.reportDate || new Date().toISOString()).slice(0, 10),
      summary: r.summary,
      items: (r.items || []).map((it: any) => ({
        name: it.name,
        code: it.code,
        value: it.value,
        unit: it.unit,
        referenceMin: it.referenceMin,
        referenceMax: it.referenceMax,
        referenceText: it.referenceText,
        abnormal: it.abnormal,
        isNumeric: it.isNumeric !== false,
        sortOrder: it.sortOrder,
      })),
    };
    await reportApi.create(payload);
    uni.showToast({ title: '保存成功', icon: 'success' });
    reset();
  } catch (e: any) {
    uni.showToast({ title: '保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
};

const reset = () => {
  step.value = 0;
  aiResult.value = null;
};
</script>

<style scoped>
.upload-hint { font-size: 26rpx; color: #666; margin-bottom: 24rpx; display: block; }
.member-picker { display: flex; align-items: center; justify-content: space-between; background: #f5f5f5; border-radius: 12rpx; padding: 20rpx 24rpx; margin-bottom: 24rpx; }
.picker-label { font-size: 28rpx; color: #333; }
.picker-value { font-size: 28rpx; color: #1677ff; }
.upload-area { text-align: center; padding: 40rpx 0; }
.upload-btn { background: #f5f5f5; border-radius: 16rpx; padding: 60rpx 40rpx; display: flex; flex-direction: column; align-items: center; }
.upload-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.upload-text { font-size: 30rpx; color: #333; }
.upload-tips { margin-top: 30rpx; display: flex; flex-direction: column; gap: 8rpx; }
.upload-tips text { font-size: 24rpx; color: #999; }
.processing { text-align: center; padding: 80rpx 0; }
.loading-icon { font-size: 80rpx; margin-bottom: 30rpx; }
.processing-text { font-size: 32rpx; color: #333; display: block; margin-bottom: 16rpx; }
.processing-hint { font-size: 26rpx; color: #999; }
.result-header { display: flex; align-items: center; margin-bottom: 20rpx; }
.disclaimer { background: #fffbe6; border: 1rpx solid #ffe58f; border-radius: 12rpx; padding: 20rpx 24rpx; margin-bottom: 24rpx; display: flex; flex-direction: column; gap: 8rpx; }
.disclaimer-title { font-size: 26rpx; color: #ad6800; font-weight: 600; }
.disclaimer-text { font-size: 24rpx; color: #8c6d1f; line-height: 1.5; }
.confidence { font-size: 24rpx; color: #faad14; margin-left: auto; }
.result-info { margin-bottom: 24rpx; }
.info-row { font-size: 26rpx; color: #666; display: block; margin-bottom: 8rpx; }
.item-title { font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 16rpx; }
.result-item { padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.item-name { font-size: 28rpx; color: #333; display: block; margin-bottom: 8rpx; }
.item-values { display: flex; justify-content: space-between; align-items: center; }
.item-value { font-size: 26rpx; color: #333; }
.item-status { font-size: 24rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.status-normal { background: #f6ffed; color: #52c41a; }
.status-abnormal { background: #fff2f0; color: #ff4d4f; }
.item-ref { font-size: 24rpx; color: #999; margin-top: 8rpx; display: block; }
.save-btn { margin-top: 40rpx; }
.btn-reset { margin-top: 20rpx; background: #fff; color: #666; border: 1rpx solid #ddd; border-radius: 12rpx; font-size: 28rpx; }
</style>
