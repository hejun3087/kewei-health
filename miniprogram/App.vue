<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('App Launch');
  // 检查登录状态
  const token = uni.getStorageSync('token');
  if (!token) {
    uni.navigateTo({ url: '/pages/login/index' });
  }
});

onShow(() => {
  console.log('App Show');
});

onHide(() => {
  console.log('App Hide');
});
</script>

<style>
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.container {
  padding: 24rpx;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.tag {
  display: inline-block;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  margin-right: 12rpx;
}

.tag-blue {
  background: #e6f7ff;
  color: #1677ff;
}

.tag-green {
  background: #f6ffed;
  color: #52c41a;
}

.tag-red {
  background: #fff2f0;
  color: #ff4d4f;
}

.btn-primary {
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 20rpx 0;
  font-size: 30rpx;
  text-align: center;
}

.empty-text {
  text-align: center;
  color: #999;
  padding: 60rpx 0;
  font-size: 28rpx;
}
</style>
