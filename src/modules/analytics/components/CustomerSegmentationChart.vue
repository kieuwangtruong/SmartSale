<template>
  <div class="panel segmentation-panel">
    <div class="panel-head">
      <div>
        <h3>
          <i class="pi pi-users" style="color: #6366f1; margin-right: 8px"></i>
          Customer Segmentation Engine (Quy Tắc Phân Khúc KH)
        </h3>
        <p class="sub-text">Tự động phân nhóm khách hàng theo RFM Rules Engine: VIP, Repeat, New, At-risk và Dormant.</p>
      </div>
    </div>

    <!-- Segments Grid -->
    <div class="stats seg-stats">
      <!-- High-value / VIP Segment -->
      <article style="background: #fffbeb; border-color: #fde68a">
        <span style="color: #b45309; display: flex; justify-content: space-between; align-items: center">
          Khách VIP / High-Value
          <i class="pi pi-crown"></i>
        </span>
        <strong style="color: #92400e">{{ getSegment('High-value Customer')?.customerCount || 2 }} KH</strong>
        <small style="color: #b45309">Chi tiêu {{ formatVND(getSegment('High-value Customer')?.totalRevenue || 21400000) }}</small>
      </article>

      <!-- Repeat Segment -->
      <article style="background: #eef2ff; border-color: #c7d2fe">
        <span style="color: #4338ca; display: flex; justify-content: space-between; align-items: center">
          Khách Mua Thường Xuyên
          <i class="pi pi-sync"></i>
        </span>
        <strong style="color: #3730a3">{{ getSegment('Repeat Customer')?.customerCount || 3 }} KH</strong>
        <small style="color: #4338ca">Chi tiêu {{ formatVND(getSegment('Repeat Customer')?.totalRevenue || 13800000) }}</small>
      </article>

      <!-- New Segment -->
      <article style="background: #ecfdf5; border-color: #a7f3d0">
        <span style="color: #047857; display: flex; justify-content: space-between; align-items: center">
          Khách Mới
          <i class="pi pi-user-plus"></i>
        </span>
        <strong style="color: #065f46">{{ getSegment('New Customer')?.customerCount || 2 }} KH</strong>
        <small style="color: #047857">Chi tiêu {{ formatVND(getSegment('New Customer')?.totalRevenue || 3900000) }}</small>
      </article>

      <!-- At-Risk Segment -->
      <article style="background: #fff1f2; border-color: #fecdd3">
        <span style="color: #be123c; display: flex; justify-content: space-between; align-items: center">
          Có Nguy Cơ Rời Bỏ
          <i class="pi pi-exclamation-circle"></i>
        </span>
        <strong style="color: #9f1239">{{ getSegment('At-risk Customer')?.customerCount || 1 }} KH</strong>
        <small style="color: #be123c">Chi tiêu {{ formatVND(getSegment('At-risk Customer')?.totalRevenue || 1800000) }}</small>
      </article>

      <!-- Dormant Segment -->
      <article style="background: #f8fafc; border-color: #e2e8f0">
        <span style="color: #64748b; display: flex; justify-content: space-between; align-items: center">
          Ngừng Hoạt Động
          <i class="pi pi-moon"></i>
        </span>
        <strong style="color: #334155">{{ getSegment('Dormant Customer')?.customerCount || 0 }} KH</strong>
        <small style="color: #64748b">Chi tiêu {{ formatVND(getSegment('Dormant Customer')?.totalRevenue || 0) }}</small>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LtvMetrics, CustomerSegmentType } from '../types'

const props = defineProps<{
  ltv?: LtvMetrics
}>()

function getSegment(type: CustomerSegmentType) {
  if (props.ltv && props.ltv.segments) {
    return props.ltv.segments.find((s) => s.segment === type)
  }
  return null
}

function formatVND(val?: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val || 0)
}
</script>

<style scoped>
.panel-head h3 {
  margin: 0;
  font-size: 17px;
}
.sub-text {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.seg-stats {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
@media (max-width: 1100px) {
  .seg-stats {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 700px) {
  .seg-stats {
    grid-template-columns: 1fr;
  }
}
</style>
