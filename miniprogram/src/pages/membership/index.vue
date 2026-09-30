<template>
  <view class="container">
    <!-- 当前套餐 -->
    <view v-if="sub" class="card">
      <view class="card-title">当前：{{ sub.planName }}</view>
      <view class="quota-row">
        <view class="quota-item">
          <text class="quota-val">{{ sub.quotas.aiPerMonth === -1 ? '不限' : sub.quotas.aiRemaining }}</text>
          <text class="quota-label">本月AI剩余</text>
        </view>
        <view class="quota-item">
          <text class="quota-val">{{ sub.quotas.maxMembers }}</text>
          <text class="quota-label">成员上限</text>
        </view>
        <view class="quota-item">
          <text class="quota-val">{{ Math.round(sub.quotas.storageLimit / 1073741824) }}</text>
          <text class="quota-label">存储GB</text>
        </view>
      </view>
    </view>

    <!-- 套餐列表 -->
    <view v-for="p in plans" :key="p.plan" class="card plan-card" :class="{ current: p.plan === sub?.plan }">
      <view class="plan-top">
        <text class="plan-name">{{ p.name }}</text>
        <text class="plan-price">￥{{ p.priceYearly }}/年</text>
      </view>
      <view class="plan-features">
        <text v-for="f in p.features" :key="f" class="feature">· {{ f }}</text>
      </view>
      <button
        v-if="p.plan !== sub?.plan && p.plan !== 'FREE'"
        class="btn-primary upgrade-btn"
        :disabled="upgrading === p.plan"
        @tap="onUpgrade(p)"
      >
        {{ upgrading === p.plan ? '处理中...' : '升级' }}
      </button>
      <button v-else-if="p.plan === sub?.plan" class="btn-current" disabled>当前套餐</button>
    </view>

    <text class="dev-tip">开发环境：支付网关未接入，点击升级将模拟支付成功并激活</text>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { memberSubscriptionApi } from '../../utils/api';

const sub = ref<any>(null);
const plans = ref<any[]>([]);
const upgrading = ref<string | null>(null);

const load = async () => {
  const [s, p] = await Promise.all([
    memberSubscriptionApi.subscription().catch(() => null),
    memberSubscriptionApi.plans().catch(() => []),
  ]);
  sub.value = s;
  plans.value = Array.isArray(p) ? p : [];
};

onLoad(load);

const onUpgrade = (plan: any) => {
  uni.showModal({
    title: `升级到${plan.name}`,
    content: `年费￥${plan.priceYearly}，确认升级？`,
    success: async (res) => {
      if (!res.confirm) return;
      upgrading.value = plan.plan;
      try {
        const r = await memberSubscriptionApi.upgrade(plan.plan);
        sub.value = r.subscription || sub.value;
        uni.showToast({ title: '升级成功', icon: 'success' });
      } catch (e) {
        uni.showToast({ title: '升级失败', icon: 'none' });
      } finally {
        upgrading.value = null;
      }
    },
  });
};
</script>

<style scoped>
.quota-row { display: flex; justify-content: space-around; padding: 20rpx 0; }
.quota-item { display: flex; flex-direction: column; align-items: center; }
.quota-val { font-size: 40rpx; font-weight: 700; color: #1677ff; }
.quota-label { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.plan-card { border: 2rpx solid transparent; }
.plan-card.current { border-color: #1677ff; }
.plan-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.plan-name { font-size: 34rpx; font-weight: 600; color: #333; }
.plan-price { font-size: 32rpx; font-weight: 700; color: #1677ff; }
.plan-features { margin-bottom: 20rpx; }
.feature { font-size: 26rpx; color: #666; display: block; margin-bottom: 8rpx; }
.upgrade-btn { margin-top: 10rpx; }
.btn-current { margin-top: 10rpx; background: #f0f0f0; color: #999; border-radius: 12rpx; font-size: 28rpx; }
.dev-tip { font-size: 22rpx; color: #bbb; text-align: center; display: block; margin-top: 20rpx; }
</style>
