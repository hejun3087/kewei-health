<template>
  <view class="container">
    <view class="card user-card">
      <view class="avatar">👤</view>
      <view class="user-info">
        <text class="user-name">{{ user?.nickname || '未设置昵称' }}</text>
        <text class="user-phone">{{ maskedPhone }}</text>
      </view>
    </view>

    <!-- 会员套餐与配额 -->
    <view class="card">
      <view class="plan-header">
        <text class="card-title">{{ sub?.planName || '免费版' }}</text>
        <text class="plan-tag">{{ sub?.status === 'ACTIVE' ? '生效中' : '' }}</text>
      </view>
      <view v-if="sub" class="quota-row">
        <view class="quota-item">
          <text class="quota-val">{{ sub.quotas.aiPerMonth === -1 ? '不限' : sub.quotas.aiRemaining }}</text>
          <text class="quota-label">本月AI剩余</text>
        </view>
        <view class="quota-item">
          <text class="quota-val">{{ sub.quotas.maxMembers }}</text>
          <text class="quota-label">成员上限</text>
        </view>
        <view class="quota-item">
          <text class="quota-val">{{ storageGB }}GB</text>
          <text class="quota-label">存储空间</text>
        </view>
      </view>
      <view class="menu-item" @tap="goMembership">
        <text>升级套餐 / 会员中心</text>
        <text class="arrow">></text>
      </view>
    </view>

    <view class="card">
      <view class="menu-item" @tap="goDiagnoses">
        <text>就诊记录</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @tap="goFamily">
        <text>家庭成员管理</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @tap="goShares">
        <text>我的分享</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @tap="goAudit">
        <text>访问记录</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @tap="goProfile">
        <text>个人信息</text>
        <text class="arrow">></text>
      </view>
      <view class="menu-item" @tap="goAbout">
        <text>关于可为健康</text>
        <text class="arrow">></text>
      </view>
    </view>
    <button class="logout-btn" @tap="logout">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '../../stores/auth';
import { memberSubscriptionApi } from '../../utils/api';

const auth = useAuthStore();
const sub = ref<any>(null);

const user = computed(() => auth.user);
const maskedPhone = computed(() => {
  const p = user.value?.phone || '';
  return p.length === 11 ? `${p.slice(0, 3)}****${p.slice(7)}` : p;
});
const storageGB = computed(() => {
  const limit = sub.value?.quotas?.storageLimit;
  return limit ? Math.round(limit / (1024 * 1024 * 1024)) : 0;
});

const load = async () => {
  try {
    await auth.refreshUser();
  } catch (e) { /* ignore */ }
  try {
    sub.value = await memberSubscriptionApi.subscription();
  } catch (e) { /* ignore */ }
};

onShow(load);

const goMembership = () => uni.navigateTo({ url: '/pages/membership/index' });
const goDiagnoses = () => uni.navigateTo({ url: '/pages/diagnoses/index' });
const goFamily = () => uni.navigateTo({ url: '/pages/family/index' });
const goShares = () => uni.navigateTo({ url: '/pages/share/list' });
const goAudit = () => uni.navigateTo({ url: '/pages/audit/list' });
const goProfile = () => uni.showToast({ title: '请在网页端编辑个人信息', icon: 'none' });
const goAbout = () => uni.showModal({ title: '可为健康', content: '个人健康档案智能管理平台 v1.0.0', showCancel: false });
const logout = () => auth.logout();
</script>

<style scoped>
.user-card { display: flex; align-items: center; padding: 40rpx; }
.avatar { font-size: 80rpx; margin-right: 24rpx; }
.user-info { display: flex; flex-direction: column; }
.user-name { font-size: 36rpx; font-weight: 600; color: #333; }
.user-phone { font-size: 26rpx; color: #999; margin-top: 8rpx; }
.plan-header { display: flex; justify-content: space-between; align-items: center; }
.plan-tag { font-size: 24rpx; color: #52c41a; }
.quota-row { display: flex; justify-content: space-around; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.quota-item { display: flex; flex-direction: column; align-items: center; }
.quota-val { font-size: 40rpx; font-weight: 700; color: #1677ff; }
.quota-label { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #f0f0f0; font-size: 30rpx; color: #333; }
.menu-item:last-child { border-bottom: none; }
.arrow { color: #ccc; }
.logout-btn { margin-top: 40rpx; background: #fff; color: #ff4d4f; border: 1rpx solid #ff4d4f; border-radius: 12rpx; font-size: 30rpx; }
</style>
