<template>
  <view class="container">
    <!-- 就诊时间线列表 -->
    <view class="card">
      <view class="list-header">
        <text class="card-title">就诊记录</text>
        <text class="add-link" @tap="toggleForm">{{ showForm ? '收起' : '+ 添加' }}</text>
      </view>
      <view v-if="!loading && diagnoses.length === 0 && !showForm" class="empty-text">暂无就诊记录</view>
      <view
        v-for="d in diagnoses"
        :key="d.id"
        class="diag-item"
        @tap="toggleExpand(d.id)"
      >
        <view class="diag-header">
          <text class="diag-date">{{ (d.visitDate || '').slice(0, 10) }}</text>
          <text class="diag-hospital">{{ d.hospital || '未填写医院' }}</text>
          <text class="arrow">{{ expanded === d.id ? '∧' : '∨' }}</text>
        </view>
        <text class="diag-text">{{ d.diagnosisText }}</text>
        <view v-if="expanded === d.id" class="diag-detail" @tap.stop>
          <view v-if="d.department" class="detail-row">
            <text class="detail-label">科室</text>
            <text class="detail-val">{{ d.department }}</text>
          </view>
          <view v-if="d.doctor" class="detail-row">
            <text class="detail-label">医生</text>
            <text class="detail-val">{{ d.doctor }}</text>
          </view>
          <view v-if="d.complaint" class="detail-row">
            <text class="detail-label">主诉</text>
            <text class="detail-val">{{ d.complaint }}</text>
          </view>
          <view v-if="d.advice" class="detail-row">
            <text class="detail-label">医嘱</text>
            <text class="detail-val">{{ d.advice }}</text>
          </view>
          <view v-if="d.nextVisitDate" class="detail-row">
            <text class="detail-label">下次复诊</text>
            <text class="detail-val">{{ d.nextVisitDate.slice(0, 10) }}</text>
          </view>
          <text class="del-btn" @tap="onDelete(d)">删除记录</text>
        </view>
      </view>
    </view>

    <!-- 添加表单 -->
    <view v-if="showForm" class="card">
      <view class="card-title">新增就诊记录</view>
      <view class="form-row">
        <text class="form-label">家庭成员 *</text>
        <picker :range="memberNames" :value="memberIndex" @change="onMemberChange">
          <view class="picker-val">{{ memberNames[memberIndex] || '请选择成员' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">就诊日期 *</text>
        <picker mode="date" :value="form.visitDate" @change="(e: any) => form.visitDate = e.detail.value">
          <view class="picker-val">{{ form.visitDate || '请选择日期' }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">诊断结果 *</text>
        <input class="form-input" v-model="form.diagnosisText" placeholder="请输入诊断结果" />
      </view>
      <view class="form-row">
        <text class="form-label">医院</text>
        <input class="form-input" v-model="form.hospital" placeholder="医院名称（选填）" />
      </view>
      <view class="form-row">
        <text class="form-label">科室</text>
        <input class="form-input" v-model="form.department" placeholder="科室（选填）" />
      </view>
      <view class="form-row">
        <text class="form-label">医生</text>
        <input class="form-input" v-model="form.doctor" placeholder="接诊医生（选填）" />
      </view>
      <view class="form-row">
        <text class="form-label">主诉</text>
        <input class="form-input" v-model="form.complaint" placeholder="主要症状描述（选填）" />
      </view>
      <view class="form-row">
        <text class="form-label">医嘱</text>
        <textarea class="form-textarea" v-model="form.advice" placeholder="医嘱/处置意见（选填）" />
      </view>
      <view class="form-row">
        <text class="form-label">下次复诊</text>
        <picker mode="date" :value="form.nextVisitDate" @change="(e: any) => form.nextVisitDate = e.detail.value">
          <view class="picker-val">{{ form.nextVisitDate || '请选择日期（选填）' }}</view>
        </picker>
      </view>
      <button class="btn-primary" :disabled="saving" @tap="onSave">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { diagnosisApi, memberApi } from '../../utils/api';

const diagnoses = ref<any[]>([]);
const members = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const expanded = ref<string | null>(null);
const showForm = ref(false);
const memberIndex = ref(0);

const memberNames = computed(() => members.value.map((m: any) => m.name || m.relation || '未命名'));

const today = new Date().toISOString().slice(0, 10);
const form = reactive({
  visitDate: today,
  diagnosisText: '',
  hospital: '',
  department: '',
  doctor: '',
  complaint: '',
  advice: '',
  nextVisitDate: '',
});

const load = async () => {
  loading.value = true;
  try {
    const [list, ms] = await Promise.all([
      diagnosisApi.list(),
      memberApi.list(),
    ]);
    diagnoses.value = list;
    members.value = ms;
  } catch (e) {
    // 请求层已 toast
  } finally {
    loading.value = false;
  }
};

onShow(load);

const toggleForm = () => (showForm.value = !showForm.value);
const toggleExpand = (id: string) => (expanded.value = expanded.value === id ? null : id);
const onMemberChange = (e: any) => (memberIndex.value = Number(e.detail.value));

const onSave = async () => {
  const member = members.value[memberIndex.value];
  if (!member) {
    uni.showToast({ title: '请选择家庭成员', icon: 'none' });
    return;
  }
  if (!form.visitDate || !form.diagnosisText) {
    uni.showToast({ title: '就诊日期和诊断结果必填', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    await diagnosisApi.create({
      memberId: member.id,
      visitDate: form.visitDate,
      diagnosisText: form.diagnosisText,
      hospital: form.hospital || undefined,
      department: form.department || undefined,
      doctor: form.doctor || undefined,
      complaint: form.complaint || undefined,
      advice: form.advice || undefined,
      nextVisitDate: form.nextVisitDate || undefined,
    });
    uni.showToast({ title: '已保存', icon: 'success' });
    showForm.value = false;
    load();
  } catch (e) {
    // ignore
  } finally {
    saving.value = false;
  }
};

const onDelete = (d: any) => {
  uni.showModal({
    title: '确认删除',
    content: `删除「${(d.diagnosisText || '').slice(0, 20)}」这条就诊记录？`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await diagnosisApi.remove(d.id);
        uni.showToast({ title: '已删除', icon: 'success' });
        load();
      } catch (e) {
        // ignore
      }
    },
  });
};
</script>

<style scoped>
.list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.list-header .card-title { margin-bottom: 0; }
.add-link { font-size: 28rpx; color: #1677ff; }
.diag-item { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.diag-item:last-child { border-bottom: none; }
.diag-header { display: flex; align-items: center; margin-bottom: 8rpx; }
.diag-date { font-size: 26rpx; color: #1677ff; font-weight: 500; margin-right: 16rpx; }
.diag-hospital { font-size: 24rpx; color: #999; flex: 1; }
.arrow { color: #ccc; font-size: 24rpx; }
.diag-text { font-size: 30rpx; color: #333; }
.diag-detail { margin-top: 16rpx; background: #fafafa; border-radius: 12rpx; padding: 20rpx; }
.detail-row { display: flex; margin-bottom: 12rpx; }
.detail-label { width: 140rpx; font-size: 24rpx; color: #999; flex-shrink: 0; }
.detail-val { font-size: 26rpx; color: #333; flex: 1; }
.del-btn { display: block; margin-top: 8rpx; font-size: 26rpx; color: #ff4d4f; text-align: center; }
.form-row { margin-bottom: 24rpx; }
.form-label { font-size: 26rpx; color: #666; margin-bottom: 8rpx; display: block; }
.form-input { border: 1rpx solid #e8e8e8; border-radius: 12rpx; padding: 18rpx 24rpx; font-size: 28rpx; }
.form-textarea { border: 1rpx solid #e8e8e8; border-radius: 12rpx; padding: 18rpx 24rpx; font-size: 28rpx; width: auto; height: 140rpx; }
.picker-val { border: 1rpx solid #e8e8e8; border-radius: 12rpx; padding: 18rpx 24rpx; font-size: 28rpx; color: #333; }
</style>
