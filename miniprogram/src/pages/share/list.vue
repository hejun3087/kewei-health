<template>
  <view class="container">
    <view class="card">
      <view class="card-title">我的分享</view>
      <text class="page-tip">管理已生成的报告只读分享链接，可随时撤销（对应 PIA R-6）。</text>
      <view v-if="!loading && shares.length === 0" class="empty-text">还没有生成过分享链接，可在报告详情页点击“分享”生成</view>
      <view v-for="s in shares" :key="s.shareId" class="share-item">
        <view class="share-header">
          <text class="share-report">{{ reportDesc(s.reportId) }}</text>
          <text :class="['status-tag', s.revokedAt ? 'st-revoked' : (s.active ? 'st-active' : 'st-expired')]">{{ statusText(s) }}</text>
        </view>
        <view class="share-meta">
          <text>有效期至：{{ fmt(s.expiresAt) }}</text>
          <text>访问：{{ s.viewCount || 0 }} 次</text>
        </view>
        <view class="share-foot">
          <text class="share-created">创建于 {{ fmt(s.createdAt) }}</text>
          <button v-if="!s.revokedAt" class="revoke-btn" size="mini" @tap="onRevoke(s)">撤销</button>
          <text v-else class="revoked-hint">已撤销</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { shareApi, reportApi } from '../../utils/api';

const shares = ref<any[]>([]);
const reports = ref<any[]>([]);
const loading = ref(false);

const typeLabel: Record<string, string> = {
  LAB: '化验报告', IMAGING: '影像检查', PRESCRIPTION: '处方', MEDICAL_RECORD: '病历',
  PHYSICAL_EXAM: '体检报告', VACCINATION: '疫苗接种', SURGERY: '手术记录',
};

const load = async () => {
  loading.value = true;
  try {
    // GET /share/my 返回纯数组；reports 用于 join 展示报告信息（列表接口已归一为数组）
    const [s, r] = await Promise.all([shareApi.listMine(), reportApi.list()]);
    shares.value = s;
    reports.value = Array.isArray(r) ? r : [];
  } catch (e) {
    // 错误已由 request.ts 统一提示
  } finally {
    loading.value = false;
  }
};

onShow(load);

const fmt = (v?: string) => (v ? v.replace('T', ' ').slice(0, 16) : '-');

const reportDesc = (reportId: string) => {
  const rp = reports.value.find((x: any) => x.id === reportId);
  if (!rp) return `报告 ${(reportId || '').slice(0, 8)}…`;
  return [rp.hospital, typeLabel[rp.reportType] || rp.reportType].filter(Boolean).join(' · ') || '健康报告';
};

const statusText = (s: any) => (s.revokedAt ? '已撤销' : s.active ? '生效中' : '已过期');

const onRevoke = (s: any) => {
  uni.showModal({
    title: '撤销该分享链接？',
    content: '撤销后，持有旧链接的人将立即无法查看，此操作不可恢复。',
    confirmText: '确认撤销',
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await shareApi.revoke(s.shareId);
        uni.showToast({ title: '已撤销，链接立即失效', icon: 'none' });
        load();
      } catch (e) {
        // 错误已由 request.ts 统一提示
      }
    },
  });
};
</script>

<style scoped>
.page-tip { display: block; font-size: 24rpx; color: #999; margin-bottom: 16rpx; }
.share-item { padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.share-item:last-child { border-bottom: none; }
.share-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.share-report { font-size: 30rpx; color: #333; font-weight: 500; }
.status-tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 8rpx; }
.st-active { background: #f6ffed; color: #52c41a; }
.st-expired { background: #fff7e6; color: #fa8c16; }
.st-revoked { background: #f5f5f5; color: #999; }
.share-meta { display: flex; justify-content: space-between; font-size: 24rpx; color: #666; margin-bottom: 12rpx; }
.share-foot { display: flex; justify-content: space-between; align-items: center; }
.share-created { font-size: 22rpx; color: #bbb; }
.revoke-btn { background: #fff; color: #ff4d4f; border: 1rpx solid #ff4d4f; border-radius: 8rpx; font-size: 24rpx; margin: 0; }
.revoked-hint { font-size: 24rpx; color: #bbb; }
</style>
