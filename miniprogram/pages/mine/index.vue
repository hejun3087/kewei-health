<template>
  <view class="container">
    <view class="card user-card">
      <view class="avatar">👤</view>
      <view class="user-info">
        <text class="user-name">张三</text>
        <text class="user-phone">138****8888</text>
      </view>
    </view>
    <view class="card">
      <view class="menu-item" @tap="goFamily">
        <text>家庭成员管理</text>
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
const goFamily = () => uni.showToast({ title: '开发中', icon: 'none' });
const goProfile = () => uni.showToast({ title: '开发中', icon: 'none' });
const goAbout = () => uni.showToast({ title: '开发中', icon: 'none' });
const logout = () => {
  uni.removeStorageSync('token');
  uni.reLaunch({ url: '/pages/login/index' });
};
</script>

<style scoped>
.user-card { display: flex; align-items: center; padding: 40rpx; }
.avatar { font-size: 80rpx; margin-right: 24rpx; }
.user-info { display: flex; flex-direction: column; }
.user-name { font-size: 36rpx; font-weight: 600; color: #333; }
.user-phone { font-size: 26rpx; color: #999; margin-top: 8rpx; }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #f0f0f0; font-size: 30rpx; color: #333; }
.menu-item:last-child { border-bottom: none; }
.arrow { color: #ccc; }
.logout-btn { margin-top: 40rpx; background: #fff; color: #ff4d4f; border: 1rpx solid #ff4d4f; border-radius: 12rpx; font-size: 30rpx; }
</style>
