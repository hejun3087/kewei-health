<template>
  <view class="container">
    <view class="card">
      <view class="card-title">家庭成员</view>
      <view v-if="members.length === 0" class="empty-text">暂无成员</view>
      <view v-for="m in members" :key="m.id" class="member-item">
        <view class="member-left">
          <text class="member-name">{{ m.name }}</text>
          <text v-if="m.isDefault" class="tag tag-blue">本人</text>
        </view>
        <text class="member-rel">{{ relLabel(m.relation) }}{{ m.gender ? ' · ' + (m.gender === 'MALE' ? '男' : '女') : '' }}</text>
      </view>
    </view>

    <view class="card">
      <view class="card-title">添加成员</view>
      <view class="form-row">
        <text class="form-label">姓名</text>
        <input class="form-input" v-model="form.name" placeholder="请输入姓名" />
      </view>
      <view class="form-row">
        <text class="form-label">关系</text>
        <picker mode="selector" :range="relLabels" :value="relIndex" @change="(e) => relIndex = Number(e.detail.value)">
          <view class="form-picker">{{ relLabels[relIndex] }} ▾</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">性别</text>
        <picker mode="selector" :range="['男','女']" :value="genderIndex" @change="(e) => genderIndex = Number(e.detail.value)">
          <view class="form-picker">{{ ['男','女'][genderIndex] }} ▾</view>
        </picker>
      </view>
      <view class="consent-tip">您正在录入他人（家庭成员）的个人健康信息，请确保已征得该成员本人同意；若其为未满十四周岁未成年人或无民事行为能力人，需征得其监护人同意。</view>
      <view class="consent-row" @tap="consented = !consented">
        <text :class="['consent-box', consented ? 'consent-checked' : '']">{{ consented ? '✓' : '' }}</text>
        <text class="consent-label">我确认已获得该成员本人（或其监护人）的授权，代其录入并管理健康信息。</text>
      </view>
      <button class="btn-primary add-btn" @tap="addMember" :disabled="submitting || !form.name">
        {{ submitting ? '提交中...' : '添加成员' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { memberApi } from '../../utils/api';

const REL_OPTIONS = [
  { value: 'SPOUSE', label: '配偶' },
  { value: 'FATHER', label: '父亲' },
  { value: 'MOTHER', label: '母亲' },
  { value: 'CHILD', label: '子女' },
  { value: 'SIBLING', label: '兄弟姐妹' },
  { value: 'OTHER', label: '其他' },
];
const relLabels = REL_OPTIONS.map((o) => o.label);
const relLabel = (v: string) => REL_OPTIONS.find((o) => o.value === v)?.label || (v === 'SELF' ? '本人' : v);

const members = ref<any[]>([]);
const relIndex = ref(0);
const genderIndex = ref(0);
const submitting = ref(false);
const consented = ref(false); // PIA R-5：录入他人健康信息需授权二次确认
const form = reactive({ name: '' });

const load = async () => {
  try {
    members.value = await memberApi.list();
  } catch (e) { /* ignore */ }
};
onShow(load);

const addMember = async () => {
  if (!form.name) return;
  if (!consented.value) {
    uni.showToast({ title: '请先确认已获本人/监护人授权', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    await memberApi.create({
      name: form.name,
      relation: REL_OPTIONS[relIndex.value].value,
      gender: genderIndex.value === 0 ? 'MALE' : 'FEMALE',
    });
    uni.showToast({ title: '已添加', icon: 'success' });
    form.name = '';
    consented.value = false;
    await load();
  } catch (e) {
    // 请求层已 toast（含套餐成员上限拦截）
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.member-item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.member-item:last-child { border-bottom: none; }
.member-left { display: flex; align-items: center; gap: 12rpx; }
.member-name { font-size: 30rpx; color: #333; font-weight: 500; }
.member-rel { font-size: 26rpx; color: #999; }
.form-row { display: flex; align-items: center; margin-bottom: 24rpx; }
.form-label { width: 140rpx; font-size: 28rpx; color: #333; }
.form-input { flex: 1; border: 1rpx solid #e8e8e8; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; }
.form-picker { flex: 1; border: 1rpx solid #e8e8e8; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: #1677ff; }
.add-btn { margin-top: 10rpx; }
.consent-tip { background: #e6f4ff; border: 1rpx solid #91caff; border-radius: 12rpx; padding: 18rpx 22rpx; font-size: 24rpx; color: #0958d9; line-height: 1.5; margin-bottom: 20rpx; }
.consent-row { display: flex; align-items: flex-start; gap: 14rpx; margin-bottom: 24rpx; }
.consent-box { flex-shrink: 0; width: 36rpx; height: 36rpx; line-height: 36rpx; text-align: center; border: 2rpx solid #d9d9d9; border-radius: 8rpx; font-size: 26rpx; color: #fff; margin-top: 2rpx; }
.consent-checked { background: #1677ff; border-color: #1677ff; }
.consent-label { flex: 1; font-size: 26rpx; color: #333; line-height: 1.5; }
</style>
