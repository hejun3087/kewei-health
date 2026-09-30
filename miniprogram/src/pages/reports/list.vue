<template>
  <view class="container">
    <view class="card">
      <view class="card-title">检查报告</view>
      <view v-if="!loading && reports.length === 0" class="empty-text">暂无报告</view>
      <view v-for="report in reports" :key="report.id" class="report-item" @tap="goDetail(report.id)">
        <view class="report-header">
          <text class="tag tag-blue">{{ report.categoryL1 }}</text>
          <text class="report-date">{{ (report.reportDate || '').slice(0, 10) }}</text>
        </view>
        <view class="report-body">
          <text class="report-name">{{ report.categoryL2 }}</text>
          <text class="report-hospital">{{ report.hospital }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { reportApi } from '../../utils/api';

const reports = ref<any[]>([]);
const loading = ref(false);

const load = async () => {
  loading.value = true;
  try {
    reports.value = await reportApi.list();
  } catch (e) {
    // ignore
  } finally {
    loading.value = false;
  }
};

onShow(load);

const goDetail = (id: string) => uni.navigateTo({ url: `/pages/reports/detail?id=${id}` });
</script>

<style scoped>
.report-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.report-item:last-child { border-bottom: none; }
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.report-date { font-size: 24rpx; color: #999; }
.report-body { display: flex; justify-content: space-between; }
.report-name { font-size: 28rpx; color: #333; font-weight: 500; }
.report-hospital { font-size: 24rpx; color: #666; }
</style>
