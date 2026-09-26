<template>
  <view class="container">
    <view class="card">
      <view class="card-title">报告详情</view>
      <view class="detail-section">
        <text class="detail-row">日期：{{ report.reportDate }}</text>
        <text class="detail-row">医院：{{ report.hospital }}</text>
        <text class="detail-row">科室：{{ report.department }}</text>
        <text class="detail-row">分类：<text class="tag tag-blue">{{ report.categoryL1 }}</text> {{ report.categoryL2 }}</text>
      </view>
      <view class="detail-section">
        <view class="section-title">检查明细</view>
        <view v-for="item in report.items" :key="item.name" class="detail-item">
          <view class="item-row">
            <text class="item-name">{{ item.name }}</text>
            <text :class="['item-status', item.abnormal === 'NORMAL' ? 'status-normal' : 'status-abnormal']">
              {{ item.abnormal === 'NORMAL' ? '正常' : '异常' }}
            </text>
          </view>
          <text class="item-detail">{{ item.value }} {{ item.unit }} (参考: {{ item.reference }})</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const report = ref({
  reportDate: '2026-09-20', categoryL1: '血液检查', categoryL2: '血常规',
  hospital: '北京协和医院', department: '检验科',
  items: [
    { name: '白细胞计数', value: '6.8', unit: '10^9/L', reference: '3.5-9.5', abnormal: 'NORMAL' },
    { name: '红细胞计数', value: '4.52', unit: '10^12/L', reference: '4.3-5.8', abnormal: 'NORMAL' },
    { name: '血红蛋白', value: '138', unit: 'g/L', reference: '130-175', abnormal: 'NORMAL' },
  ],
});
</script>

<style scoped>
.detail-section { margin-bottom: 30rpx; }
.detail-row { font-size: 28rpx; color: #333; display: block; margin-bottom: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 20rpx; }
.detail-item { padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.detail-item:last-child { border-bottom: none; }
.item-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.item-name { font-size: 28rpx; color: #333; }
.item-status { font-size: 24rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.status-normal { background: #f6ffed; color: #52c41a; }
.status-abnormal { background: #fff2f0; color: #ff4d4f; }
.item-detail { font-size: 26rpx; color: #666; }
</style>
