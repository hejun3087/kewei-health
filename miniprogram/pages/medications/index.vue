<template>
  <view class="container">
    <view class="card">
      <view class="card-title">用药记录</view>
      <view v-for="med in medications" :key="med.id" class="med-item">
        <view class="med-header">
          <text class="med-name">{{ med.drugName }}</text>
          <text :class="['tag', med.status === 'USING' ? 'tag-green' : 'tag-red']">
            {{ med.status === 'USING' ? '使用中' : '已停用' }}
          </text>
        </view>
        <text class="med-detail">{{ med.specification }} · {{ med.usage }} · {{ med.dosage }} · {{ med.frequency }}</text>
        <text class="med-date">{{ med.startDate }} ~ {{ med.endDate || '至今' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const medications = ref([
  { id: '1', drugName: '阿莫西林胶囊', specification: '0.5g', usage: '口服', dosage: '每次1粒', frequency: '每日3次', startDate: '2026-09-20', endDate: '', status: 'USING' },
  { id: '2', drugName: '布洛芬缓释胶囊', specification: '0.3g', usage: '口服', dosage: '每次1粒', frequency: '每日2次', startDate: '2026-09-20', endDate: '', status: 'USING' },
]);
</script>

<style scoped>
.med-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.med-item:last-child { border-bottom: none; }
.med-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.med-name { font-size: 30rpx; font-weight: 500; color: #333; }
.med-detail { font-size: 26rpx; color: #666; display: block; margin-bottom: 8rpx; }
.med-date { font-size: 24rpx; color: #999; }
</style>
