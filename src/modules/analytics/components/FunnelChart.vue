<template>
  <div class="panel funnel-panel">
    <!-- Header -->
    <div class="panel-head">
      <div>
        <h3>
          <i class="pi pi-filter" style="color: #6366f1; margin-right: 8px"></i>
          Conversion Funnel (Phễu Chuyển Đổi)
        </h3>
        <p class="sub-text">Tỷ lệ chuyển đổi và rơi rớt (drop-off) qua các bước mua hàng.</p>
      </div>

      <div class="mode-switcher">
        <button
          @click="$emit('change-mode', 'transaction')"
          :class="['mode-btn', { active: funnelData.funnelType === 'transaction' }]"
        >
          Transaction Funnel
        </button>
        <button
          @click="$emit('change-mode', 'behavioral')"
          :class="['mode-btn', { active: funnelData.funnelType === 'behavioral' }]"
        >
          Behavioral Funnel (Web Event)
        </button>
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="funnel-kpi-summary">
      <div class="summary-card">
        <span class="lbl">Users ở Bước Đầu</span>
        <strong class="val">{{ funnelData.totalUsers }}</strong>
        <small>Khách hàng bắt đầu</small>
      </div>
      <div class="summary-card accent">
        <span class="lbl">Chuyển Đổi Tổng (Overall)</span>
        <strong class="val" style="color: #059669">{{ funnelData.overallConversionRate }}%</strong>
        <small>Hoàn tất mua thành công</small>
      </div>
      <div class="summary-card">
        <span class="lbl">Số Bước Hành Trình</span>
        <strong class="val" style="color: #d97706">{{ funnelData.steps.length }} Bước</strong>
        <small>Hành trình trải nghiệm</small>
      </div>
    </div>

    <!-- Funnel Steps Visualizer -->
    <div class="funnel-steps-list">
      <div
        v-for="(step, index) in funnelData.steps"
        :key="step.stepKey"
        class="funnel-step-item"
      >
        <div class="step-header">
          <div class="step-title">
            <span class="step-num">#{{ index + 1 }}</span>
            <div>
              <strong>{{ step.stepName }}</strong>
              <code class="step-code">{{ step.stepKey }}</code>
            </div>
          </div>
          <div class="step-stats">
            <strong class="user-cnt">{{ step.uniqueUsers }} users</strong>
            <span class="conv-rate">{{ step.conversionFromPrevious }}% từ bước trước</span>
          </div>
        </div>

        <div class="funnel-progress-bg">
          <div
            class="funnel-progress-fill"
            :style="{ width: `${funnelData.totalUsers > 0 ? ((step.uniqueUsers / funnelData.totalUsers) * 100).toFixed(1) : 0}%` }"
          ></div>
        </div>

        <div class="step-footer">
          <span>Giữ chân từ đầu: <strong>{{ funnelData.totalUsers > 0 ? ((step.uniqueUsers / funnelData.totalUsers) * 100).toFixed(1) : 0 }}%</strong></span>
          <span v-if="step.dropoffCount > 0" class="dropoff-text">
            Drop-off: -{{ step.dropoffCount }} users (-{{ step.dropoffRate }}%)
          </span>
          <span v-else class="start-text">Bắt đầu phễu</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FunnelData } from '../types'

const props = defineProps<{
  funnel?: FunnelData
}>()

defineEmits<{
  (e: 'change-mode', mode: 'transaction' | 'behavioral'): void
}>()

const funnelData = computed(() => {
  if (props.funnel && props.funnel.steps && props.funnel.steps.length > 0) {
    return props.funnel
  }
  return {
    funnelType: 'transaction' as const,
    totalUsers: 150,
    overallConversionRate: 45.3,
    steps: [
      { stepIndex: 1, stepKey: 'checkout_started', stepName: 'Bắt đầu Checkout', count: 150, uniqueUsers: 150, uniqueOrders: 150, conversionFromPrevious: 100, dropoffCount: 0, dropoffRate: 0, medianDurationSeconds: 0 },
      { stepIndex: 2, stepKey: 'payment_started', stepName: 'Nhập TT Thanh toán', count: 110, uniqueUsers: 110, uniqueOrders: 110, conversionFromPrevious: 73.3, dropoffCount: 40, dropoffRate: 26.7, medianDurationSeconds: 15 },
      { stepIndex: 3, stepKey: 'order_created', stepName: 'Tạo đơn hàng', count: 88, uniqueUsers: 88, uniqueOrders: 88, conversionFromPrevious: 80.0, dropoffCount: 22, dropoffRate: 20.0, medianDurationSeconds: 25 },
      { stepIndex: 4, stepKey: 'payment_completed', stepName: 'Thanh toán hoàn tất', count: 68, uniqueUsers: 68, uniqueOrders: 68, conversionFromPrevious: 77.3, dropoffCount: 20, dropoffRate: 22.7, medianDurationSeconds: 40 },
    ]
  }
})
</script>

<style scoped>
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 20px;
}
.panel-head h3 {
  margin: 0;
  font-size: 17px;
}
.sub-text {
  margin: 3px 0 0;
  font-size: 12px;
  color: #64748b;
}

.mode-switcher {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}
.mode-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}
.mode-btn.active {
  background: #fff;
  color: #4f46e5;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

.funnel-kpi-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.summary-card {
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}
.summary-card.accent {
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.summary-card .lbl {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}
.summary-card .val {
  font-size: 24px;
  font-weight: 900;
  margin: 4px 0;
}
.summary-card small {
  font-size: 11px;
  color: #64748b;
}

.funnel-step-item {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 12px;
}
.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.step-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step-num {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #6366f1;
  color: #fff;
  font-weight: 900;
  font-size: 12px;
  display: grid;
  place-items: center;
}
.step-code {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background: #e2e8f0;
  border-radius: 4px;
  font-size: 11px;
  color: #475569;
}
.user-cnt {
  font-size: 15px;
  margin-right: 8px;
}
.conv-rate {
  font-size: 12px;
  font-weight: 700;
  color: #6366f1;
}

.step-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
}
.dropoff-text {
  color: #e11d48;
  font-weight: 700;
}
.start-text {
  color: #059669;
  font-weight: 700;
}
</style>
