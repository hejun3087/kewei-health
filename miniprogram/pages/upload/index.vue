<template>
  <view class="container">
    <view class="card">
      <view class="card-title">上传医疗报告</view>
      <text class="upload-hint">拍照或从相册选择图片，AI将自动识别报告内容</text>

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
      <view v-if="step === 2" class="result">
        <view class="result-header">
          <text class="tag tag-blue">{{ aiResult.categoryL1 }}</text>
          <text class="tag">{{ aiResult.categoryL2 }}</text>
          <text class="confidence">置信度: {{ (aiResult.confidence * 100).toFixed(0) }}%</text>
        </view>

        <view class="result-info">
          <text class="info-row">医院：{{ aiResult.hospital }}</text>
          <text class="info-row">日期：{{ aiResult.reportDate }}</text>
        </view>

        <view class="result-items">
          <view class="item-title">检查明细</view>
          <view v-for="item in aiResult.items" :key="item.name" class="result-item">
            <text class="item-name">{{ item.name }}</text>
            <view class="item-values">
              <text class="item-value">{{ item.value }} {{ item.unit }}</text>
              <text :class="['item-status', item.abnormal === 'NORMAL' ? 'status-normal' : 'status-abnormal']">
                {{ item.abnormal === 'NORMAL' ? '正常' : '异常' }}
              </text>
            </view>
            <text class="item-ref">参考: {{ item.reference }}</text>
          </view>
        </view>

        <button class="btn-primary save-btn" @tap="saveResult">确认保存</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const step = ref(0);
const aiResult = ref<any>(null);

const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      // 开始AI识别
      step.value = 1;
      
      // 模拟AI识别（实际调用后端API）
      setTimeout(() => {
        aiResult.value = {
          reportType: 'LAB',
          categoryL1: '血液检查',
          categoryL2: '血常规',
          hospital: '北京协和医院',
          reportDate: '2026-09-20',
          confidence: 0.92,
          items: [
            { name: '白细胞计数', value: '6.8', unit: '10^9/L', reference: '3.5-9.5', abnormal: 'NORMAL' },
            { name: '红细胞计数', value: '4.52', unit: '10^12/L', reference: '4.3-5.8', abnormal: 'NORMAL' },
            { name: '血红蛋白', value: '138', unit: 'g/L', reference: '130-175', abnormal: 'NORMAL' },
            { name: '血小板计数', value: '225', unit: '10^9/L', reference: '125-350', abnormal: 'NORMAL' },
          ],
        };
        step.value = 2;
      }, 2000);
    },
  });
};

const saveResult = () => {
  uni.showToast({ title: '保存成功', icon: 'success' });
  step.value = 0;
  aiResult.value = null;
};
</script>

<style scoped>
.upload-hint {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 30rpx;
  display: block;
}

.upload-area {
  text-align: center;
  padding: 40rpx 0;
}

.upload-btn {
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.upload-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.upload-text {
  font-size: 30rpx;
  color: #333;
}

.upload-tips {
  margin-top: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.upload-tips text {
  font-size: 24rpx;
  color: #999;
}

.processing {
  text-align: center;
  padding: 80rpx 0;
}

.loading-icon {
  font-size: 80rpx;
  margin-bottom: 30rpx;
}

.processing-text {
  font-size: 32rpx;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.processing-hint {
  font-size: 26rpx;
  color: #999;
}

.result-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.confidence {
  font-size: 24rpx;
  color: #52c41a;
  margin-left: auto;
}

.result-info {
  margin-bottom: 24rpx;
}

.info-row {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.item-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.result-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.item-name {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.item-values {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-value {
  font-size: 26rpx;
  color: #333;
}

.item-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.status-normal {
  background: #f6ffed;
  color: #52c41a;
}

.status-abnormal {
  background: #fff2f0;
  color: #ff4d4f;
}

.item-ref {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}

.save-btn {
  margin-top: 40rpx;
}
</style>
