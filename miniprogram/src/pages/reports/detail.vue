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

      <!-- 分享（4.3.2，家庭版权益；非家庭版后端返回 402 自动弹升级） -->
      <view class="share-bar">
        <button class="share-btn" :loading="sharing" @tap="onShare">{{ sharing ? '生成中...' : '🔗 分享报告' }}</button>
        <text class="share-tip">生成 30 天有效的只读查看链接，对方无需登录</text>
      </view>
    </view>
    <view v-else class="empty-text">报告不存在</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { reportApi, shareApi } from '../../utils/api';
import { WEB_BASE_URL } from '../../utils/config';

const report = ref<any>(null);
const loading = ref(true);
const sharing = ref(false);
const reportId = ref('');

onLoad(async (query: any) => {
  if (!query?.id) { loading.value = false; return; }
  reportId.value = query.id;
  try {
    report.value = await reportApi.detail(query.id);
  } catch (e) {
    report.value = null;
  } finally {
    loading.value = false;
  }
});

// 生成只读分享链接并复制到剪贴板
const onShare = async () => {
  if (!reportId.value || sharing.value) return;
  sharing.value = true;
  try {
    const res: any = await shareApi.createReport(reportId.value);
    const link = `${WEB_BASE_URL}${res.path}`;
    uni.setClipboardData({
      data: link,
      success: () => uni.showToast({ title: '分享链接已复制', icon: 'none' }),
      fail: () => uni.showModal({ title: '分享链接', content: link, showCancel: false }),
    });
  } catch (e) {
    // 402 付费墙 / 其他错误已由 request.ts 统一处理
  } finally {
    sharing.value = false;
  }
};

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
.share-bar { margin-top: 24rpx; padding-top: 24rpx; border-top: 1rpx solid #f0f0f0; }
.share-btn { background: #1677ff; color: #fff; font-size: 30rpx; border-radius: 12rpx; }
.share-tip { display: block; font-size: 22rpx; color: #999; margin-top: 12rpx; text-align: center; }
</style>
