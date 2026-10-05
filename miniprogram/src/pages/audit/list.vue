<template>
  <view class="container">
    <!-- 筛选栏 -->
    <view class="filter-bar">
      <picker :range="actionLabels" :value="actionIdx" @change="onActionChange">
        <view class="filter-btn">{{ actionLabels[actionIdx] || '操作类型' }}</view>
      </picker>
      <picker :range="resourceLabels" :value="resourceIdx" @change="onResourceChange">
        <view class="filter-btn">{{ resourceLabels[resourceIdx] || '数据对象' }}</view>
      </picker>
      <picker :range="successLabels" :value="successIdx" @change="onSuccessChange">
        <view class="filter-btn">{{ successLabels[successIdx] || '结果' }}</view>
      </picker>
    </view>

    <!-- 记录列表 -->
    <view v-if="!loading && rows.length === 0" class="empty-text">
      暂无数据访问记录，当有人查看、修改或分享你的健康数据时会自动记录在这里
    </view>
    <view v-for="r in rows" :key="r.id" class="card audit-item">
      <view class="audit-top">
        <text :class="['tag', r.success ? 'tag-ok' : 'tag-fail']">{{ r.success ? '成功' : '失败' }}</text>
        <text class="audit-time">{{ fmt(r.createdAt) }}</text>
      </view>
      <view class="audit-body">
        <text class="audit-action">{{ actionLabel[r.action] || r.action }}</text>
        <text class="audit-resource">{{ resourceLabel[r.resourceType] || r.resourceType }}</text>
      </view>
      <view class="audit-meta">
        <text v-if="r.ip">IP：{{ r.ip }}</text>
        <text v-if="r.userAgent" class="ua">{{ shortUA(r.userAgent) }}</text>
      </view>
    </view>

    <!-- 加载更多 -->
    <view v-if="loading" class="loading-tip">加载中…</view>
    <view v-else-if="hasMore" class="load-more-btn" @tap="loadMore">加载更多</view>
    <view v-else-if="rows.length > 0" class="no-more-tip">— 已加载全部 {{ total }} 条 —</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import { auditApi } from '../../utils/api';

// 映射与 Web AccessRecords.tsx 对齐
const actionLabel: Record<string, string> = {
  READ: '查看', CREATE: '新增', UPDATE: '修改', DELETE: '删除',
  EXPORT: '导出', LOGIN: '登录',
  SHARE_CREATE: '创建分享', SHARE_LIST: '查看分享列表', SHARE_REVOKE: '撤销分享', SHARE_VIEW: '分享访问',
};
const resourceLabel: Record<string, string> = {
  REPORT: '检查报告', DIAGNOSIS: '就诊记录', MEDICATION: '用药记录',
  FAMILY_MEMBER: '家庭成员', UPLOAD: '上传文件', USER: '个人档案',
  HEALTH_DATA: '健康数据', AUTH: '登录认证',
};

// picker 选项列表（含"不限"首项用于清除筛选）
const actionKeys = ['', ...Object.keys(actionLabel)];
const actionLabels = computed(() => actionKeys.map((k) => (k ? actionLabel[k] : '不限操作')));
const resourceKeys = ['', ...Object.keys(resourceLabel)];
const resourceLabels = computed(() => resourceKeys.map((k) => (k ? resourceLabel[k] : '不限对象')));
const successOptions = ['', 'true', 'false'];
const successLabels = ['不限结果', '成功', '失败'];

const rows = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;
const actionIdx = ref(0);
const resourceIdx = ref(0);
const successIdx = ref(0);

const hasMore = computed(() => rows.value.length < total.value);

const fmt = (v?: string) => (v ? v.replace('T', ' ').slice(0, 19) : '-');
const shortUA = (ua?: string | null) => {
  if (!ua) return '';
  return ua.length > 40 ? ua.slice(0, 40) + '…' : ua;
};

const buildParams = () => {
  const p: any = { page: page.value, pageSize };
  if (actionKeys[actionIdx.value]) p.action = actionKeys[actionIdx.value];
  if (resourceKeys[resourceIdx.value]) p.resourceType = resourceKeys[resourceIdx.value];
  if (successOptions[successIdx.value]) p.success = successOptions[successIdx.value];
  return p;
};

const fetchPage = async () => {
  loading.value = true;
  try {
    const res = await auditApi.listMine(buildParams());
    const items = res?.items || [];
    if (page.value === 1) {
      rows.value = items;
    } else {
      rows.value = [...rows.value, ...items];
    }
    total.value = res?.total || 0;
  } catch (e) {
    // 错误由 request.ts 统一提示
  } finally {
    loading.value = false;
  }
};

const reload = () => {
  page.value = 1;
  fetchPage();
};

onLoad(reload);

onPullDownRefresh(() => {
  reload();
  uni.stopPullDownRefresh();
});

onReachBottom(() => {
  if (hasMore.value && !loading.value) loadMore();
});

const loadMore = () => {
  if (!hasMore.value || loading.value) return;
  page.value++;
  fetchPage();
};

const onActionChange = (e: any) => { actionIdx.value = Number(e.detail.value); reload(); };
const onResourceChange = (e: any) => { resourceIdx.value = Number(e.detail.value); reload(); };
const onSuccessChange = (e: any) => { successIdx.value = Number(e.detail.value); reload(); };
</script>

<style scoped>
.filter-bar { display: flex; gap: 16rpx; margin-bottom: 20rpx; flex-wrap: wrap; }
.filter-btn { background: #fff; border: 1rpx solid #ddd; border-radius: 8rpx; padding: 10rpx 20rpx; font-size: 26rpx; color: #333; }
.audit-item { padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.audit-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.audit-time { font-size: 22rpx; color: #999; }
.tag { font-size: 22rpx; padding: 4rpx 12rpx; border-radius: 6rpx; }
.tag-ok { background: #f6ffed; color: #52c41a; }
.tag-fail { background: #fff2f0; color: #ff4d4f; }
.audit-body { display: flex; gap: 16rpx; margin-bottom: 8rpx; }
.audit-action { font-size: 28rpx; color: #1677ff; font-weight: 500; }
.audit-resource { font-size: 28rpx; color: #333; }
.audit-meta { display: flex; flex-direction: column; gap: 4rpx; }
.audit-meta text { font-size: 22rpx; color: #bbb; }
.ua { word-break: break-all; }
.empty-text { text-align: center; color: #999; font-size: 26rpx; padding: 80rpx 40rpx; }
.loading-tip, .no-more-tip { text-align: center; color: #999; font-size: 24rpx; padding: 24rpx; }
.load-more-btn { text-align: center; color: #1677ff; font-size: 26rpx; padding: 24rpx; }
</style>
