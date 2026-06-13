<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatCurrency } from '../services/orderApi'
import {
  getDashboardReport,
  getRevenueChart,
  type DashboardReport,
  type RevenueChart,
} from '../services/userApi'

const report = ref<DashboardReport | null>(null)
const chart = ref<RevenueChart | null>(null)
const groupBy = ref<'day' | 'month'>('day')
const loading = ref(true)
const error = ref('')

const maxRevenue = computed(() => Math.max(...(chart.value?.revenue ?? [1]), 1))

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[report.value, chart.value] = await Promise.all([
      getDashboardReport(),
      getRevenueChart(groupBy.value),
    ])
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Không thể tải báo cáo.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>Báo cáo kinh doanh</h2>
        <p>Dữ liệu tổng hợp từ sự kiện đơn hàng.</p>
      </div>
      <select v-model="groupBy" @change="load">
        <option value="day">Theo ngày</option>
        <option value="month">Theo tháng</option>
      </select>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>
    <p v-if="loading" class="empty">Đang tải báo cáo...</p>

    <template v-else-if="report">
      <div class="stats">
        <article><span>Doanh thu hôm nay</span><strong>{{ formatCurrency(report.revenueToday) }}</strong></article>
        <article><span>Doanh thu tuần</span><strong>{{ formatCurrency(report.revenueThisWeek) }}</strong></article>
        <article><span>Doanh thu tháng</span><strong>{{ formatCurrency(report.revenueThisMonth) }}</strong></article>
        <article><span>Số đơn hàng</span><strong>{{ report.orderCount }}</strong></article>
      </div>

      <div class="grid-2">
        <article class="panel">
          <h3>Biểu đồ doanh thu</h3>
          <div class="bars">
            <div v-for="(label, index) in chart?.labels" :key="label" class="bar-row">
              <span>{{ label }}</span>
              <div><i :style="{ width: `${((chart?.revenue[index] ?? 0) / maxRevenue) * 100}%` }"></i></div>
              <strong>{{ formatCurrency(chart?.revenue[index] ?? 0) }}</strong>
            </div>
          </div>
        </article>

        <article class="panel">
          <h3>Top sản phẩm</h3>
          <table>
            <thead><tr><th>Sản phẩm</th><th>Đã bán</th><th>Doanh thu</th></tr></thead>
            <tbody>
              <tr v-for="item in report.topProducts" :key="item.productId">
                <td>{{ item.productName }}</td><td>{{ item.quantitySold }}</td><td>{{ formatCurrency(item.revenue) }}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>

      <article class="panel">
        <h3>Top khách hàng</h3>
        <table>
          <thead><tr><th>Khách hàng</th><th>Số đơn</th><th>Doanh thu</th><th>Công nợ</th></tr></thead>
          <tbody>
            <tr v-for="item in report.topCustomers" :key="`${item.customerId}-${item.customerName}`">
              <td>{{ item.customerName }}</td><td>{{ item.orderCount }}</td>
              <td>{{ formatCurrency(item.revenue) }}</td><td>{{ formatCurrency(item.debt) }}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </template>
  </section>
</template>

<style scoped>
.bars { display: grid; gap: 12px; }
.bar-row { display: grid; grid-template-columns: 90px 1fr 120px; gap: 10px; align-items: center; font-size: 12px; }
.bar-row div { height: 10px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
.bar-row i { display: block; height: 100%; background: #2563eb; border-radius: inherit; }
</style>
