<template>
  <div class="panel ltv-panel">
    <div class="panel-head">
      <div>
        <h3>
          <i class="pi pi-dollar" style="color: #6366f1; margin-right: 8px"></i>
          Customer LTV (Giá Trị Vòng Đời Khách Hàng)
        </h3>
        <p class="sub-text">Doanh thu tích lũy trung bình tạo ra bởi 1 khách hàng theo mốc thời gian và Contribution Margin.</p>
      </div>
    </div>

    <!-- LTV Level Stats -->
    <div class="stats ltv-stats" style="margin-bottom: 20px">
      <article>
        <span>Revenue LTV (Avg)</span>
        <strong>{{ formatVND(ltvData.revenueLtvAverage) }}</strong>
      </article>
      <article style="background: #eff6ff; border-color: #bfdbfe">
        <span style="color: #1d4ed8">LTV 30 Ngày</span>
        <strong style="color: #1e40af">{{ formatVND(ltvData.ltv30DaysAverage) }}</strong>
      </article>
      <article style="background: #eef2ff; border-color: #c7d2fe">
        <span style="color: #4338ca">LTV 60 Ngày</span>
        <strong style="color: #3730a3">{{ formatVND(ltvData.ltv60DaysAverage) }}</strong>
      </article>
      <article style="background: #faf5ff; border-color: #e9d5ff">
        <span style="color: #7e22ce">LTV 90 Ngày</span>
        <strong style="color: #6b21a8">{{ formatVND(ltvData.ltv90DaysAverage) }}</strong>
      </article>
      <article style="background: #f5f3ff; border-color: #ddd6fe">
        <span style="color: #6d28d9">LTV 180 Ngày</span>
        <strong style="color: #5b21b6">{{ formatVND(ltvData.ltv180DaysAverage) }}</strong>
      </article>
      <article style="background: #ecfdf5; border-color: #a7f3d0">
        <span style="color: #047857">Contribution LTV</span>
        <strong style="color: #065f46">{{ formatVND(ltvData.contributionLtvAverage) }}</strong>
      </article>
    </div>

    <!-- Top LTV Customers Table -->
    <div>
      <h4 style="margin: 0 0 14px; font-size: 15px; display: flex; align-items: center; gap: 8px">
        <i class="pi pi-star" style="color: #f59e0b"></i>
        Top Khách Hàng Có Giá Trị LTV Cao Nhất
      </h4>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Khách Hàng</th>
              <th style="text-align: center">Số Đơn Mua</th>
              <th style="text-align: right">Tổng Chi Tiêu (LTV)</th>
              <th style="text-align: right">Contribution Margin</th>
              <th style="text-align: center">Phân Khúc</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cust in topCustomers" :key="cust.customerId">
              <td>
                <strong style="display: flex; align-items: center; gap: 8px">
                  <span class="user-avatar-small">{{ cust.customerName.charAt(0) }}</span>
                  {{ cust.customerName }}
                </strong>
              </td>
              <td style="text-align: center; font-weight: 700; background: #fafbfc">
                {{ cust.orderCount }} đơn
              </td>
              <td style="text-align: right; font-weight: 800; color: #4338ca">
                {{ formatVND(cust.totalSpent) }}
              </td>
              <td style="text-align: right; font-weight: 800; color: #047857">
                {{ formatVND(cust.ltv90d) }}
              </td>
              <td style="text-align: center">
                <span class="status-badge completed">{{ cust.segment }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LtvMetrics } from '../types'

const props = defineProps<{
  ltv?: LtvMetrics
}>()

const ltvData = computed(() => {
  return props.ltv || {
    revenueLtvAverage: 5400000,
    ltv30DaysAverage: 2400000,
    ltv60DaysAverage: 3800000,
    ltv90DaysAverage: 4700000,
    ltv180DaysAverage: 5400000,
    contributionLtvAverage: 2160000,
    segments: [],
    topCustomers: []
  }
})

const topCustomers = computed(() => {
  if (ltvData.value.topCustomers && ltvData.value.topCustomers.length > 0) {
    return ltvData.value.topCustomers
  }
  return [
    { customerId: 1, customerName: 'Nguyễn Văn An', orderCount: 6, totalSpent: 12500000, ltv90d: 5000000, segment: 'High-value Customer' as const, firstOrderDate: '2026-01-05', lastOrderDate: '2026-04-12' },
    { customerId: 5, customerName: 'Hoàng Thị Giang', orderCount: 4, totalSpent: 8900000, ltv90d: 3560000, segment: 'Repeat Customer' as const, firstOrderDate: '2026-02-20', lastOrderDate: '2026-03-02' },
    { customerId: 8, customerName: 'Bùi Anh Tuấn', orderCount: 3, totalSpent: 6200000, ltv90d: 2480000, segment: 'Repeat Customer' as const, firstOrderDate: '2026-04-01', lastOrderDate: '2026-04-01' },
    { customerId: 2, customerName: 'Trần Thị Bình', orderCount: 3, totalSpent: 5800000, ltv90d: 2320000, segment: 'Repeat Customer' as const, firstOrderDate: '2026-01-15', lastOrderDate: '2026-02-05' },
  ]
})

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
.ltv-stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.user-avatar-small {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #c7d2fe;
  color: #3730a3;
  display: inline-grid;
  place-items: center;
  font-weight: 800;
  font-size: 11px;
}
@media (max-width: 900px) {
  .ltv-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
