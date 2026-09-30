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
      <view class="input-group">
        <text class="input-label">密码</text>
        <input class="input" password v-model="password" placeholder="请输入密码（≥6位）" />
      </view>
      <button class="btn-primary" @tap="onLogin" :disabled="submitting || phone.length !== 11 || password.length < 6">
        {{ submitting ? '登录中...' : '登录 / 注册' }}
      </button>
      <text class="login-tip">未注册的手机号将自动创建账号</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';

const auth = useAuthStore();
const phone = ref('');
const password = ref('');
const submitting = ref(false);

const onLogin = async () => {
  if (phone.value.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  if (password.value.length < 6) {
    uni.showToast({ title: '密码至少6位', icon: 'none' });
    return;
  }
  submitting.value = true;
  uni.showLoading({ title: '登录中...' });
  try {
    await auth.login(phone.value, password.value);
    uni.hideLoading();
    uni.switchTab({ url: '/pages/index/index' });
  } catch (e: any) {
    uni.hideLoading();
    // 网络/业务错误已由请求层统一 toast，这里兜底提示
    uni.showToast({ title: e?.data?.message || '登录失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
}
.login-header { text-align: center; margin-bottom: 60rpx; }
.app-name { font-size: 56rpx; font-weight: 700; color: #fff; display: block; }
.app-desc { font-size: 28rpx; color: rgba(255,255,255,0.85); margin-top: 16rpx; display: block; }
.login-form { width: 84%; background: #fff; border-radius: 24rpx; padding: 48rpx; }
.input-group { margin-bottom: 32rpx; }
.input-label { font-size: 28rpx; color: #333; margin-bottom: 12rpx; display: block; }
.input { border: 1rpx solid #e8e8e8; border-radius: 12rpx; padding: 20rpx 24rpx; font-size: 30rpx; }
.btn-primary { background: #1677ff; color: #fff; border: none; border-radius: 12rpx; padding: 20rpx 0; font-size: 30rpx; text-align: center; }
.btn-primary[disabled] { background: #a0c4ff; }
.login-tip { font-size: 24rpx; color: #999; text-align: center; margin-top: 24rpx; display: block; }
</style>
