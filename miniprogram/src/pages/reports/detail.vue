<template>
  <view class="container">
    <view v-if="loading" class="empty-text">加载中...</view>
    <view v-else-if="report" class="card">
      <view class="card-title">报告详情</view>
      <view class="detail-section">
        <text class="detail-row">日期：{{ (report.reportDate || '').slice(0, 10) }}</text>
        <text class="detail-row">医院：{{ report.hospital || '-' }}</text>
        <text class="detail-row">科室：{{ report.department || '-' }}</text>
        <text class="detail-row">分类：<text class="tag tag-blue">{{ report.categoryL1 }}</text> {{ report.categoryL2 }}</text>
        <text v-if="report.summary" class="detail-row">摘要：{{ report.summary }}</text>
      </view>
      <view class="detail-section">
        <view class="section-title">检查明细</view>
        <view v-if="!report.items || report.items.length === 0" class="empty-text">暂无检查明细</view>
        <view v-for="(item, idx) in report.items" :key="item.id || idx" class="detail-item">
          <view class="item-row">
            <text class="item-name">{{ item.name }}</text>
            <text :class="['item-status', statusClass(item.abnormal)]">{{ statusText(item.abnormal) }}</text>
          </view>
          <text class="item-detail">{{ item.value }} {{ item.unit || '' }} (参考: {{ refText(item) }})</text>
        </view>
      </view>
    </view>
    <view v-else class="empty-text">报告不存在</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { reportApi } from '../../utils/api';

const report = ref<any>(null);
const loading = ref(true);

onLoad(async (query: any) => {
  if (!query?.id) { loading.value = false; return; }
  try {
    report.value = await reportApi.detail(query.id);
  } catch (e) {
    report.value = null;
  } finally {
    loading.value = false;
  }
});

const statusMap: Record<string, string> = {
  NORMAL: '正常', HIGH: '偏高↑', LOW: '偏低↓', ABNORMAL: '异常',
};
const statusText = (v: string) => statusMap[v] || '-';
const statusClass = (v: string) => (v === 'NORMAL' || !v ? 'status-normal' : 'status-abnormal');
const refText = (item: any) => {
  if (item.referenceText) return item.referenceText;
  if (item.referenceMin != null && item.referenceMax != null) return `${item.referenceMin}-${item.referenceMax}`;
  return '-';
};
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
