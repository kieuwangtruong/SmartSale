<template>
  <div class="panel monetization-panel">
    <div class="panel-head">
      <div>
        <h3>
          <i class="pi pi-chart-bar" style="color: #6366f1; margin-right: 8px"></i>
          Monetization & Profitability Analysis
        </h3>
        <p class="sub-text">Phân tích tài chính, biên lợi nhuận gộp, tập trung doanh thu Pareto 80/20 và cặp sản phẩm bán kèm.</p>
      </div>
    </div>

    <!-- Financial KPI Grid -->
    <div class="stats monetization-stats" style="margin-bottom: 20px">
      <article>
        <span>Gross Revenue</span>
        <strong>{{ formatVND(m.totalRevenue) }}</strong>
        <small>{{ m.totalOrders }} đơn tổng</small>
      </article>

      <article style="background: #ecfdf5; border-color: #a7f3d0">
        <span style="color: #047857">Net Revenue</span>
        <strong style="color: #065f46">{{ formatVND(m.netRevenue) }}</strong>
        <small style="color: #047857">{{ m.validOrders }} đơn thành công</small>
      </article>

      <article style="background: #fffbeb; border-color: #fde68a">
        <span style="color: #b45309">AOV (Giá Trị Đơn TB)</span>
        <strong style="color: #92400e">{{ formatVND(m.aov) }}</strong>
        <small style="color: #b45309">Net / Valid Orders</small>
      </article>

      <article style="background: #eff6ff; border-color: #bfdbfe">
        <span style="color: #1d4ed8">Rev per Paying KH</span>
        <strong style="color: #1e40af">{{ formatVND(m.revenuePerPayingCustomer) }}</strong>
        <small style="color: #1d4ed8">Doanh thu / Khách mua</small>
      </article>

      <article style="background: #faf5ff; border-color: #e9d5ff">
        <span style="color: #7e22ce">Gross Margin %</span>
        <strong style="color: #6b21a8">{{ m.grossMarginPercent }}%</strong>
        <small style="color: #7e22ce">Lãi gộp: {{ formatVND(m.grossProfit) }}</small>
      </article>
    </div>

    <!-- Pareto 80/20 & Product Basket Affinity Grid -->
    <div class="grid-2" style="margin-bottom: 20px">
      <!-- Pareto Card -->
      <div class="panel" style="margin: 0">
        <h4 style="margin: 0 0 14px; font-size: 14px; display: flex; align-items: center; gap: 8px">
          <i class="pi pi-pie-chart" style="color: #6366f1"></i>
          Phân Tích Tập Trung Doanh Thu (Pareto 80/20)
        </h4>

        <div style="display: grid; gap: 14px; font-size: 12px">
          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px">
              <span>Top 1% Khách hàng đóng góp</span>
              <span style="color: #4338ca">{{ m.paretoConcentration.top1PercentRevenueShare }}% Doanh thu</span>
            </div>
            <div class="funnel-progress-bg">
              <div class="funnel-progress-fill" :style="{ width: `${m.paretoConcentration.top1PercentRevenueShare}%` }"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px">
              <span>Top 5% Khách hàng đóng góp</span>
              <span style="color: #7e22ce">{{ m.paretoConcentration.top5PercentRevenueShare }}% Doanh thu</span>
            </div>
            <div class="funnel-progress-bg">
              <div class="funnel-progress-fill" :style="{ width: `${m.paretoConcentration.top5PercentRevenueShare}%`, background: '#8b5cf6' }"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px">
              <span>Top 20% Khách hàng đóng góp</span>
              <span style="color: #047857">{{ m.paretoConcentration.top20PercentRevenueShare }}% Doanh thu</span>
            </div>
            <div class="funnel-progress-bg">
              <div class="funnel-progress-fill" :style="{ width: `${m.paretoConcentration.top20PercentRevenueShare}%`, background: '#10b981' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Discounts & Payment Methods Card -->
      <div class="panel" style="margin: 0">
        <h4 style="margin: 0 0 14px; font-size: 14px; display: flex; align-items: center; gap: 8px">
          <i class="pi pi-percentage" style="color: #10b981"></i>
          Chiết Khấu & Thanh Toán
        </h4>

        <div class="grid-2">
          <div style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px">
            <span style="color: #64748b; font-size: 11px; font-weight: 700">Tổng Chiết Khấu</span>
            <strong style="display: block; font-size: 18px; color: #be123c; margin-top: 4px">{{ formatVND(m.totalDiscountAmount) }}</strong>
            <small style="color: #64748b; font-size: 11px">{{ m.discountRate }}% tỷ lệ giảm giá</small>
          </div>

          <div style="padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px">
            <span style="color: #64748b; font-size: 11px; font-weight: 700">Thanh Toán PayOS</span>
            <strong style="display: block; font-size: 18px; color: #047857; margin-top: 4px">68.5%</strong>
            <small style="color: #64748b; font-size: 11px">Chuyển khoản tự động</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Basket Affinity Table -->
    <div>
      <h4 style="margin: 0 0 14px; font-size: 15px; display: flex; align-items: center; gap: 8px">
        <i class="pi pi-tags" style="color: #7e22ce"></i>
        Cặp Sản Phẩm Thường Mua Cùng Nhau (Basket Affinity)
      </h4>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sản Phẩm A</th>
              <th>Sản Phẩm B (Mua Kèm)</th>
              <th style="text-align: center">Số Đơn Xuất Hiện Cùng</th>
              <th style="text-align: center">Độ Gắn Kết (Support)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pair, idx) in basketPairs" :key="idx">
              <td>
                <strong style="display: flex; align-items: center; gap: 6px">
                  <i class="pi pi-box" style="color: #6366f1"></i>
                  {{ pair.productAName }}
                </strong>
              </td>
              <td style="font-weight: 700; color: #7e22ce">
                + {{ pair.productBName }}
              </td>
              <td style="text-align: center; font-weight: 700; background: #fafbfc">
                {{ pair.coOccurrenceCount }} đơn
              </td>
              <td style="text-align: center">
                <span class="status-badge paid">{{ pair.affinityScore }}% Support</span>
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
import type { MonetizationMetrics } from '../types'

const props = defineProps<{
  monetization?: MonetizationMetrics
}>()

const m = computed(() => {
  return props.monetization || {
    totalRevenue: 28500000,
    netRevenue: 26800000,
    totalOrders: 12,
    validOrders: 11,
    cancelledOrders: 1,
    aov: 2436363,
    revenuePerActiveUser: 3350000,
    revenuePerPayingCustomer: 3350000,
    totalDiscountAmount: 1200000,
    discountRate: 4.5,
    estimatedCOGS: 14400000,
    grossProfit: 12400000,
    grossMarginPercent: 46.2,
    paretoConcentration: { top1PercentRevenueShare: 24.5, top5PercentRevenueShare: 48.2, top10PercentRevenueShare: 65.0, top20PercentRevenueShare: 78.6 },
    topRevenueProducts: [],
    affinityPairs: []
  }
})

const basketPairs = computed(() => {
  if (m.value.affinityPairs && m.value.affinityPairs.length > 0) {
    return m.value.affinityPairs
  }
  return [
    { productAId: 1, productAName: 'Tai nghe chụp tai Bluetooth Pro ANC', productBId: 3, productBName: 'Chuột không dây Silent Ergonomics 2.4G', coOccurrenceCount: 4, affinityScore: 36.4 },
    { productAId: 2, productAName: 'Bàn phím cơ RGB Pro Custom Switch', productBId: 4, productBName: 'Loa Bluetooth Mini Bass Pro IPX7', coOccurrenceCount: 3, affinityScore: 27.3 },
    { productAId: 5, productAName: 'Đồng hồ thông minh Smart Watch S2 Pro', productBId: 10, productBName: 'Balo chống nước Laptop 15.6 inch Business', coOccurrenceCount: 2, affinityScore: 18.2 },
    { productAId: 6, productAName: 'Đèn bàn học chống cận LED Smart Touch', productBId: 7, productBName: 'Cốc giữ nhiệt Inox 304 High-Class 500ml', coOccurrenceCount: 2, affinityScore: 18.2 },
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
.monetization-stats {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
@media (max-width: 1100px) {
  .monetization-stats {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 700px) {
  .monetization-stats {
    grid-template-columns: 1fr;
  }
}
</style>
