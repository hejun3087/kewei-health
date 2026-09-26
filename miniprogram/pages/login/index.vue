<template>
  <view class="login-page">
    <view class="login-header">
      <text class="app-name">可为健康</text>
      <text class="app-desc">个人健康档案智能管理平台</text>
    </view>
    <view class="login-form">
      <view class="input-group">
        <text class="input-label">手机号</text>
        <input class="input" type="number" v-model="phone" placeholder="请输入手机号" maxlength="11" />
      </view>
      <button class="btn-primary" @tap="login" :disabled="phone.length !== 11">登录 / 注册</button>
      <text class="login-tip">未注册的手机号将自动创建账号</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const phone = ref('');

const login = async () => {
  if (phone.value.length !== 11) return;
  uni.showLoading({ title: '登录中...' });
  
  // 模拟登录
  setTimeout(() => {
    uni.setStorageSync('token', 'mock-token');
    uni.setStorageSync('user', JSON.stringify({ nickname: '用户' + phone.value.slice(-4) }));
    uni.hideLoading();
    uni.switchTab({ url: '/pages/index/index' });
  }, 1000);
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-header { text-align: center; margin-bottom: 80rpx; }
.app-name { font-size: 56rpx; font-weight: 700; color: #fff; display: block; }
.app-desc { font-size: 28rpx; color: rgba(255,255,255,0.8); margin-top: 16rpx; display: block; }
.login-form { width: 80%; background: #fff; border-radius: 24rpx; padding: 48rpx; }
.input-group { margin-bottom: 32rpx; }
.input-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
.input { border: 1rpx solid #e8e8e8; border-radius: 12rpx; padding: 20rpx 24rpx; font-size: 30rpx; }
.login-tip { font-size: 24rpx; color: #999; text-align: center; margin-top: 24rpx; display: block; }
</style>
