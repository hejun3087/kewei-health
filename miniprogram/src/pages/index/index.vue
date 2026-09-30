<template>
  <view class="container">
    <!-- 健康概览 -->
    <view class="card">
      <view class="card-title">健康概览</view>
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-value">{{ stats.totalReports }}</text>
          <text class="stat-label">检查报告</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.currentMeds }}</text>
          <text class="stat-label">当前用药</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ stats.trackableItems }}</text>
          <text class="stat-label">追踪指标</text>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="card">
      <view class="card-title">快捷操作</view>
      <view class="action-row">
        <view class="action-btn" @tap="goUpload">
          <text class="action-icon">📷</text>
          <text class="action-text">拍照上传</text>
        </view>
        <view class="action-btn" @tap="goReports">
          <text class="action-icon">📋</text>
          <text class="action-text">查看报告</text>
        </view>
        <view class="action-btn" @tap="goMedications">
          <text class="action-icon">💊</text>
          <text class="action-text">用药记录</text>
        </view>
        <view class="action-btn" @tap="goDiagnoses">
          <text class="action-icon">🏥</text>
          <text class="action-text">就诊记录</text>
        </view>
      </view>
    </view>

    <!-- 最近报告 -->
    <view class="card">
      <view class="card-title">最近报告</view>
      <view v-if="recentReports.length === 0" class="empty-text">
        暂无报告，快去上传吧
      </view>
      <view v-for="report in recentReports" :key="report.id" class="report-item" @tap="goDetail(report.id)">
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
import { reportApi, medicationApi } from '../../utils/api';

const stats = ref({ totalReports: 0, currentMeds: 0, trackableItems: 0 });
const recentReports = ref<any[]>([]);

const load = async () => {
  try {
    const [dash, meds, track] = await Promise.all([
      reportApi.dashboard().catch(() => ({ totalReports: 0, recentReports: [] })),
      medicationApi.current().catch(() => []),
      reportApi.trackableItems().catch(() => []),
    ]);
    recentReports.value = dash?.recentReports || [];
    stats.value = {
      totalReports: dash?.totalReports || 0,
      currentMeds: Array.isArray(meds) ? meds.length : 0,
      trackableItems: Array.isArray(track) ? track.length : (dash?.trackableItems?.length || 0),
    };
  } catch (e) {
    // 请求层已 toast
  }
};

// 每次进入首页刷新（tabBar 页面用 onShow）
onShow(load);

const goUpload = () => uni.switchTab({ url: '/pages/upload/index' });
const goReports = () => uni.switchTab({ url: '/pages/reports/list' });
const goMedications = () => uni.navigateTo({ url: '/pages/medications/index' });
const goDiagnoses = () => uni.navigateTo({ url: '/pages/diagnoses/index' });
const goDetail = (id: string) => uni.navigateTo({ url: `/pages/reports/detail?id=${id}` });
</script>

<style scoped>
.stats-row { display: flex; justify-content: space-around; padding: 20rpx 0; }
.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-value { font-size: 48rpx; font-weight: 700; color: #1677ff; }
.stat-label { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.action-row { display: flex; justify-content: space-around; padding: 20rpx 0; }
.action-btn { display: flex; flex-direction: column; align-items: center; padding: 20rpx 14rpx; background: #f5f5f5; border-radius: 16rpx; }
.action-icon { font-size: 44rpx; margin-bottom: 12rpx; }
.action-text { font-size: 24rpx; color: #333; }
.report-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.report-item:last-child { border-bottom: none; }
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.report-date { font-size: 24rpx; color: #999; }
.report-body { display: flex; justify-content: space-between; }
.report-name { font-size: 28rpx; color: #333; font-weight: 500; }
.report-hospital { font-size: 24rpx; color: #666; }
</style>
