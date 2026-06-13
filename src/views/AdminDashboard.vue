<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Chart from 'primevue/chart'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Select from 'primevue/select'
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

const groupOptions = [
  { label: 'Theo ngày', value: 'day' },
  { label: 'Theo tháng', value: 'month' },
]
const chartData = computed(() => ({
  labels: chart.value?.labels ?? [],
  datasets: [
    {
      label: 'Doanh thu',
      data: chart.value?.revenue ?? [],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, .12)',
      fill: true,
      tension: 0.38,
      pointBackgroundColor: '#6366f1',
      pointRadius: 3,
      yAxisID: 'y',
    },
    {
      label: 'Số đơn',
      data: chart.value?.orderCount ?? [],
      borderColor: '#14b8a6',
      backgroundColor: '#14b8a6',
      tension: 0.3,
      pointRadius: 3,
      yAxisID: 'orders',
    },
  ],
}))
const chartOptions = {
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { labels: { usePointStyle: true, boxWidth: 8, color: '#667085' } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#8a94a6' } },
    y: {
      beginAtZero: true,
      grid: { color: '#eef0f4' },
      ticks: { color: '#8a94a6', callback: (value: string | number) => `${Number(value) / 1_000_000}tr` },
    },
    orders: {
      position: 'right' as const,
      beginAtZero: true,
      grid: { display: false },
      ticks: { color: '#8a94a6', precision: 0 },
    },
  },
}

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
      <Select
        v-model="groupBy"
        :options="groupOptions"
        option-label="label"
        option-value="value"
        @change="load"
      />
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>
    <p v-if="loading" class="empty">Đang tải báo cáo...</p>

    <template v-else-if="report">
      <div class="stats">
        <article><i class="pi pi-wallet stat-icon purple"></i><span>Doanh thu hôm nay</span><strong>{{ formatCurrency(report.revenueToday) }}</strong></article>
        <article><i class="pi pi-calendar stat-icon blue"></i><span>Doanh thu tuần</span><strong>{{ formatCurrency(report.revenueThisWeek) }}</strong></article>
        <article><i class="pi pi-chart-line stat-icon green"></i><span>Doanh thu tháng</span><strong>{{ formatCurrency(report.revenueThisMonth) }}</strong></article>
        <article><i class="pi pi-shopping-cart stat-icon orange"></i><span>Số đơn hàng</span><strong>{{ report.orderCount }}</strong></article>
      </div>

      <div class="grid-2">
        <article class="panel">
          <h3>Biểu đồ doanh thu</h3>
          <div class="chart-box"><Chart type="line" :data="chartData" :options="chartOptions" /></div>
        </article>

        <article class="panel">
          <h3>Top sản phẩm</h3>
          <DataTable :value="report.topProducts" striped-rows>
            <Column field="productName" header="Sản phẩm" />
            <Column field="quantitySold" header="Đã bán" />
            <Column header="Doanh thu"><template #body="{ data }">{{ formatCurrency(data.revenue) }}</template></Column>
          </DataTable>
        </article>
      </div>

      <article class="panel">
        <h3>Top khách hàng</h3>
        <DataTable :value="report.topCustomers" paginator :rows="5" striped-rows>
          <Column field="customerName" header="Khách hàng" />
          <Column field="orderCount" header="Số đơn" />
          <Column header="Doanh thu"><template #body="{ data }">{{ formatCurrency(data.revenue) }}</template></Column>
          <Column header="Công nợ"><template #body="{ data }"><span :class="{ warning: data.debt > 0 }">{{ formatCurrency(data.debt) }}</span></template></Column>
        </DataTable>
      </article>
    </template>
  </section>
</template>

<style scoped>
.chart-box { height: 330px; }
.stat-icon { position: absolute; right: 18px; top: 18px; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; }
.stat-icon.purple { color: #4f46e5; background: #eef2ff; }
.stat-icon.blue { color: #0284c7; background: #e0f2fe; }
.stat-icon.green { color: #059669; background: #d1fae5; }
.stat-icon.orange { color: #ea580c; background: #ffedd5; }
</style>
