<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TooltipItem } from 'chart.js'
import Chart from 'primevue/chart'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Select from 'primevue/select'
import { formatCurrency, getOrders, type Order } from '../services/orderApi'
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
const chartColors = ['#4f46e5', '#0f766e', '#0284c7', '#d97706', '#db2777', '#64748b']
const revenueSegments = computed(() => {
  const labels = chart.value?.labels ?? []
  const revenue = chart.value?.revenue ?? []
  const orderCount = chart.value?.orderCount ?? []
  const items = labels
    .map((label, index) => ({
      label,
      revenue: revenue[index] ?? 0,
      orders: orderCount[index] ?? 0,
    }))
    .filter((item) => item.revenue > 0)
    .sort((first, second) => second.revenue - first.revenue)

  if (items.length <= 6) return items

  const leading = items.slice(0, 5)
  const remaining = items.slice(5)
  return [
    ...leading,
    {
      label: 'Khác',
      revenue: remaining.reduce((sum, item) => sum + item.revenue, 0),
      orders: remaining.reduce((sum, item) => sum + item.orders, 0),
    },
  ]
})
const totalChartRevenue = computed(() =>
  revenueSegments.value.reduce((sum, item) => sum + item.revenue, 0),
)
const totalChartOrders = computed(() =>
  revenueSegments.value.reduce((sum, item) => sum + item.orders, 0),
)
const averageOrderValue = computed(() =>
  totalChartOrders.value ? totalChartRevenue.value / totalChartOrders.value : 0,
)
const revenueLegend = computed(() =>
  revenueSegments.value.map((item, index) => ({
    ...item,
    color: chartColors[index % chartColors.length],
    percentage: totalChartRevenue.value
      ? Math.round((item.revenue / totalChartRevenue.value) * 100)
      : 0,
  })),
)
const chartData = computed(() => ({
  labels: revenueSegments.value.map((item) => item.label),
  datasets: [
    {
      label: 'Doanh thu',
      data: revenueSegments.value.map((item) => item.revenue),
      backgroundColor: revenueSegments.value.map(
        (_, index) => chartColors[index % chartColors.length],
      ),
      borderColor: '#ffffff',
      borderWidth: 4,
      hoverBorderColor: '#ffffff',
      hoverBorderWidth: 4,
      hoverOffset: 8,
    },
  ],
}))
const chartOptions = {
  maintainAspectRatio: false,
  cutout: '72%',
  layout: { padding: 12 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: (context: TooltipItem<'doughnut'>) =>
          ` ${formatCurrency(Number(context.raw ?? 0))}`,
      },
    },
  },
}

function calculateReport(allOrders: Order[]): DashboardReport {
  const now = new Date()
  
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  
  const day = startOfToday.getDay()
  const diffToMonday = startOfToday.getDate() - (day === 0 ? 6 : day - 1)
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(diffToMonday)
  startOfWeek.setHours(0, 0, 0, 0)
  
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1)
  
  let revenueToday = 0
  let revenueThisWeek = 0
  let revenueThisMonth = 0
  
  const productMap: Record<number, { productId: number; productName: string; quantitySold: number; revenue: number }> = {}
  const customerMap: Record<string, { customerId?: number | null; customerName: string; orderCount: number; revenue: number; debt: number }> = {}
  
  const activeOrders = allOrders.filter(o => o.status !== 'Cancelled')
  
  for (const order of activeOrders) {
    const orderDate = new Date(order.createdAt)
    
    if (orderDate >= startOfToday) {
      revenueToday += order.total
    }
    if (orderDate >= startOfWeek) {
      revenueThisWeek += order.total
    }
    if (orderDate >= startOfMonth) {
      revenueThisMonth += order.total
    }
    
    for (const item of order.orderItems) {
      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          productId: item.productId,
          productName: item.productName || `Sản phẩm #${item.productId}`,
          quantitySold: 0,
          revenue: 0
        }
      }
      const pm = productMap[item.productId]!
      pm.quantitySold += item.quantity
      pm.revenue += item.subTotal
    }
    
    const custName = order.customerName || 'Khách lẻ'
    const key = order.customerId ? String(order.customerId) : custName
    if (!customerMap[key]) {
      customerMap[key] = {
        customerId: order.customerId,
        customerName: custName,
        orderCount: 0,
        revenue: 0,
        debt: 0
      }
    }
    customerMap[key].orderCount += 1
    customerMap[key].revenue += order.total
    customerMap[key].debt += order.debtAmount
  }
  
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    
  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    
  return {
    revenueToday,
    revenueThisWeek,
    revenueThisMonth,
    orderCount: activeOrders.length,
    topProducts,
    topCustomers
  }
}

function calculateChart(allOrders: Order[], groupByMode: 'day' | 'month'): RevenueChart {
  const activeOrders = allOrders.filter(o => o.status !== 'Cancelled')
  
  activeOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  
  const groups: Record<string, { revenue: number; orderCount: number }> = {}
  
  for (const order of activeOrders) {
    const date = new Date(order.createdAt)
    let key = ''
    if (groupByMode === 'day') {
      const dayStr = String(date.getDate()).padStart(2, '0')
      const monthStr = String(date.getMonth() + 1).padStart(2, '0')
      key = `${dayStr}/${monthStr}`
    } else {
      const monthStr = String(date.getMonth() + 1).padStart(2, '0')
      const yearStr = date.getFullYear()
      key = `${monthStr}/${yearStr}`
    }
    
    if (!groups[key]) {
      groups[key] = { revenue: 0, orderCount: 0 }
    }
    groups[key]!.revenue += order.total
    groups[key]!.orderCount += 1
  }
  
  const keys = Object.keys(groups)
  const limit = groupByMode === 'day' ? 7 : 6
  const slicedKeys = keys.slice(-limit)
  
  const labels: string[] = []
  const revenue: number[] = []
  const orderCount: number[] = []
  
  for (const k of slicedKeys) {
    labels.push(k)
    revenue.push(groups[k]?.revenue ?? 0)
    orderCount.push(groups[k]?.orderCount ?? 0)
  }
  
  return {
    groupBy: groupByMode,
    from: '',
    to: '',
    labels,
    revenue,
    orderCount
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [apiReport, apiChart] = await Promise.all([
      getDashboardReport(),
      getRevenueChart(groupBy.value),
    ])
    
    if (apiReport && (apiReport.orderCount > 0 || apiReport.revenueToday > 0 || apiReport.revenueThisMonth > 0)) {
      report.value = apiReport
      chart.value = apiChart
    } else {
      const allOrders = await getOrders()
      report.value = calculateReport(allOrders)
      chart.value = calculateChart(allOrders, groupBy.value)
    }
  } catch (exception) {
    console.warn("Reports API error, falling back to local orders calculation:", exception)
    try {
      const allOrders = await getOrders()
      report.value = calculateReport(allOrders)
      chart.value = calculateChart(allOrders, groupBy.value)
    } catch (fallbackException) {
      error.value = fallbackException instanceof Error ? fallbackException.message : 'Không thể tải báo cáo.'
    }
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
          <div class="panel-heading">
            <div><span>PHÂN BỔ DOANH THU</span><h3>Biểu đồ doanh thu</h3></div>
            <small>{{ groupBy === 'day' ? 'Theo ngày' : 'Theo tháng' }}</small>
          </div>

          <div v-if="revenueSegments.length" class="revenue-chart-layout">
            <div class="chart-left-block">
              <div class="donut-wrap">
                <Chart type="doughnut" :data="chartData" :options="chartOptions" />
              </div>
              <div class="donut-below-summary">
                <small>TỔNG DOANH THU</small>
                <strong>{{ formatCurrency(totalChartRevenue) }}</strong>
                <span>{{ totalChartOrders }} đơn hàng</span>
              </div>
            </div>

            <div class="revenue-legend">
              <article v-for="item in revenueLegend" :key="item.label">
                <i :style="{ backgroundColor: item.color }"></i>
                <div><strong>{{ item.label }}</strong><small>{{ item.orders }} đơn</small></div>
                <span class="legend-percentage">{{ item.percentage }}%</span>
              </article>
            </div>
          </div>

          <div v-else class="chart-empty">
            <i class="pi pi-chart-pie"></i>
            <span>Chưa có doanh thu trong khoảng thời gian này.</span>
          </div>

          <div class="chart-summary">
            <div><span>Tổng số đơn</span><strong>{{ totalChartOrders }}</strong></div>
            <div><span>Giá trị trung bình/đơn</span><strong>{{ formatCurrency(averageOrderValue) }}</strong></div>
          </div>
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
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.panel-heading span { color: #6366f1; font-size: 9px; font-weight: 800; letter-spacing: .14em; }
.panel-heading h3 { margin: 5px 0 0; font-size: 18px; }
.panel-heading > small { padding: 6px 9px; border-radius: 99px; color: #475569; background: #f1f5f9; font-size: 10px; font-weight: 700; }
.revenue-chart-layout { min-height: 290px; display: grid; grid-template-columns: minmax(210px, 1.1fr) minmax(150px, 0.9fr); align-items: flex-start; gap: 12px; }

.chart-left-block { display: flex; flex-direction: column; gap: 0px; align-items: center; justify-content: center; padding-top: 0px; }
.donut-wrap { position: relative; width: min(270px, 100%); height: 215px; margin: 0 auto; }

/* Khối text tổng doanh thu nằm ngay dưới biểu đồ */
.donut-below-summary { display: grid; gap: 2px; text-align: center; margin-top: -26px; position: relative; z-index: 10; }
.donut-below-summary small { color: #6366f1; font-size: 10px; font-weight: 800; letter-spacing: .1em; }

/* LIGHT MODE: Số tiền mặc định hiển thị màu đen xám của hệ thống */
.donut-below-summary strong { color: #111827; font-size: 22px; font-weight: 700; letter-spacing: -.02em; }
.donut-below-summary span { color: #64748b; font-size: 12px; }

.revenue-legend { display: grid; gap: 4px; width: 100%; }
.revenue-legend article { padding: 9px 6px; border-radius: 8px; display: grid; grid-template-columns: 8px 1fr auto; align-items: center; gap: 8px; }
.revenue-legend article:hover { background: #f8fafc; }
.revenue-legend article > i { width: 8px; height: 8px; border-radius: 50%; }
.revenue-legend article div { min-width: 0; display: grid; gap: 2px; }
.revenue-legend article strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.revenue-legend article small { color: #94a3b8; font-size: 9px; }
.legend-percentage { color: #475569; font-size: 10px; font-weight: 800; min-width: 32px; text-align: right; }

.chart-summary { padding-top: 16px; border-top: 1px solid #edf0f4; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 12px; }
.chart-summary div { display: grid; gap: 4px; }
.chart-summary span { color: #94a3b8; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; }
.chart-summary strong { font-size: 14px; }
.chart-empty { min-height: 290px; color: #94a3b8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; font-size: 12px; }
.chart-empty i { font-size: 32px; }
.stat-icon { position: absolute; right: 18px; top: 18px; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; }
.stat-icon.purple { color: #4f46e5; background: #eef2ff; }
.stat-icon.blue { color: #0284c7; background: #e0f2fe; }
.stat-icon.green { color: #059669; background: #d1fae5; }
.stat-icon.orange { color: #ea580c; background: #ffedd5; }

@media (max-width: 620px) {
  .revenue-chart-layout { grid-template-columns: 1fr; }
  .revenue-legend { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .chart-summary { grid-template-columns: 1fr; }
}

/* --- DARK MODE: Tách biệt cấu trúc màu chữ sáng rực rỡ --- */
:global(.app-dark) .donut-below-summary strong {
  color: #ffffff !important; /* Bắt buộc đổi sang màu trắng tinh khi bật darkmode */
}
:global(.app-dark) .donut-below-summary span {
  color: #cbd5e1 !important; /* Đổi màu số đơn hàng sang màu xám sáng */
}
:global(.app-dark) .legend-percentage {
  color: #cbd5e1 !important;
}
:global(.app-dark) .revenue-legend article:hover {
  background: #1d263b !important;
}
:global(.app-dark) .chart-summary {
  border-top-color: #23304c !important;
}
:global(.app-dark) .panel-heading > small {
  color: #94a3b8 !important;
  background: #1e293b !important;
}
</style>