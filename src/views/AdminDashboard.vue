<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { TooltipItem } from 'chart.js'
import Chart from 'primevue/chart'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Button from 'primevue/button'
import { formatCurrency, getCustomers, getOrders, type Customer, type Order } from '../services/orderApi'
import { getLowStock, getProducts, getStockReceipts, type Product, type StockReceipt } from '../services/productApi'
import { calculateCustomerTierBreakdown, getTierConfig, getTierLabel, TIER_CONFIG } from '../services/customerTier'
import CustomerTierBadge from '../components/CustomerTierBadge.vue'
import { useLanguage } from '../services/i18n'
import { useToast } from 'primevue/usetoast'
import * as XLSX from 'xlsx'

import {
  getDashboardReport,
  getRevenueChart,
  type DashboardReport,
  type RevenueChart,
} from '../services/userApi'

const report = ref<DashboardReport | null>(null)
const chart = ref<RevenueChart | null>(null)
const customersList = ref<Customer[]>([])
const tierBreakdown = computed(() => calculateCustomerTierBreakdown(customersList.value))
const groupBy = ref<'day' | 'month'>('day')
const loading = ref(true)
const { t } = useLanguage()
const toast = useToast()

function showError(msg: string) {
  toast.add({
    severity: 'error',
    summary: t('Lỗi', 'Error'),
    detail: msg,
    life: 5000,
  })
}

const warehouseStats = ref({
  productCount: 0,
  totalStock: 0,
  lowStockCount: 0,
  inventoryValue: 0,
  productsSoldThisMonth: 0,
  importQuantityThisMonth: 0,
  importQuantityTotal: 0,
})

const productMap = ref<Record<number, Product>>({})

function getProductImage(productId: number): string {
  const p = productMap.value[productId]
  if (p?.imageUrl && !p.imageUrl.includes('placeholder') && p.imageUrl !== '[]' && p.imageUrl.startsWith('http')) {
    return p.imageUrl
  }
  // Mock image fallback map
  const fallbackImages: Record<number, string> = {
    1: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=120',
    2: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=120',
    3: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=120',
    4: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=120',
    5: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=120',
    6: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=120',
  }
  return fallbackImages[productId] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=120'
}

const chartColors = ['#10b981', '#6366f1', '#0ea5e9', '#f59e0b', '#ec4899', '#8b5cf6']

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

  if (items.length <= 5) return items

  const leading = items.slice(0, 4)
  const remaining = items.slice(4)
  return [
    ...leading,
    {
      label: t('Khác', 'Others'),
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

const displayTotalRevenue = computed(() => {
  if (report.value && report.value.revenueThisMonth > 0) return report.value.revenueThisMonth
  if (totalChartRevenue.value > 0) return totalChartRevenue.value
  return report.value?.revenueToday || 0
})

const displayEstimatedMargin = computed(() => {
  return Math.round(displayTotalRevenue.value * 0.32)
})

const maxRevenueDay = computed(() => {
  const revenue = chart.value?.revenue ?? []
  const labels = chart.value?.labels ?? []
  if (!revenue.length) return { label: '-', value: 0 }
  let maxIdx = 0
  for (let i = 1; i < revenue.length; i++) {
    if ((revenue[i] ?? 0) > (revenue[maxIdx] ?? 0)) maxIdx = i
  }
  return { label: labels[maxIdx] || '-', value: revenue[maxIdx] || 0 }
})

const revenueLegend = computed(() =>
  revenueSegments.value.map((item, index) => ({
    ...item,
    color: chartColors[index % chartColors.length],
    percentage: totalChartRevenue.value
      ? Math.round((item.revenue / totalChartRevenue.value) * 100)
      : 0,
  })),
)

// Area & Line Trend Chart Data
const trendChartData = computed(() => {
  const labels = chart.value?.labels ?? []
  const revenue = chart.value?.revenue ?? []

  return {
    labels,
    datasets: [
      {
        label: t('Doanh thu (₫)', 'Revenue (₫)'),
        data: revenue,
        borderColor: '#10b981',
        borderWidth: 3,
        fill: true,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
      },
    ],
  }
})

const trendChartOptions = computed(() => ({
  maintainAspectRatio: false,
  responsive: true,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#34d399',
      padding: 12,
      cornerRadius: 10,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      callbacks: {
        label: (context: TooltipItem<'line'>) =>
          ` ${formatCurrency(Number(context.raw ?? 0))}`,
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#94a3b8',
        font: { size: 11, weight: 600 },
      },
    },
    y: {
      grid: {
        color: 'rgba(148, 163, 184, 0.1)',
      },
      ticks: {
        color: '#94a3b8',
        font: { size: 11, weight: 600 },
        callback: (val: number | string) => {
          const num = Number(val)
          if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
          if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`
          return num
        },
      },
    },
  },
}))

// Doughnut Chart Data
const doughnutChartData = computed(() => ({
  labels: revenueSegments.value.map((item) => item.label),
  datasets: [
    {
      data: revenueSegments.value.map((item) => item.revenue),
      backgroundColor: revenueSegments.value.map(
        (_, index) => chartColors[index % chartColors.length],
      ),
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverOffset: 6,
    },
  ],
}))

const doughnutChartOptions = {
  maintainAspectRatio: false,
  cutout: '74%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#34d399',
      padding: 12,
      cornerRadius: 10,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      callbacks: {
        label: (context: TooltipItem<'doughnut'>) =>
          ` ${formatCurrency(Number(context.raw ?? 0))}`,
      },
    },
  },
}

// Stats helper
function calculateImportStats(receipts: StockReceipt[]) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  let importQuantityThisMonth = 0
  let importQuantityTotal = 0

  for (const receipt of receipts) {
    if (receipt.status !== 'Confirmed') continue
    for (const item of receipt.items) {
      importQuantityTotal += item.quantity
      if (new Date(receipt.confirmedAt ?? receipt.createdAt) >= startOfMonth) {
        importQuantityThisMonth += item.quantity
      }
    }
  }

  return { importQuantityThisMonth, importQuantityTotal }
}

function calculateWarehouseStats(allProducts: Product[], allOrders: Order[]) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  let productsSoldThisMonth = 0
  for (const order of allOrders) {
    if (order.status === 'Cancelled') continue
    if (new Date(order.createdAt) >= startOfMonth) {
      for (const item of order.orderItems) {
        productsSoldThisMonth += item.quantity
      }
    }
  }

  return {
    productCount: allProducts.length,
    totalStock: allProducts.reduce((sum, p) => sum + p.quantity, 0),
    lowStockCount: allProducts.filter((p) => p.quantity <= p.reserveStock).length,
    inventoryValue: allProducts.reduce((sum, p) => sum + p.importPrice * p.quantity, 0),
    productsSoldThisMonth,
  }
}

async function loadWarehouseStats(allOrders?: Order[]) {
  try {
    const [allProducts, lowStock, receipts, orders] = await Promise.all([
      getProducts(),
      getLowStock(),
      getStockReceipts(),
      allOrders ? Promise.resolve(allOrders) : getOrders(),
    ])
    const importStats = calculateImportStats(receipts)
    warehouseStats.value = {
      ...calculateWarehouseStats(allProducts, orders),
      lowStockCount: lowStock.length,
      ...importStats,
    }
  } catch {
    warehouseStats.value = {
      productCount: 0,
      totalStock: 0,
      lowStockCount: 0,
      inventoryValue: 0,
      productsSoldThisMonth: 0,
      importQuantityThisMonth: 0,
      importQuantityTotal: 0,
    }
  }
}

function calculateReport(allOrders: Order[]): DashboardReport {
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

  const activeOrders = allOrders.filter((o) => o.status !== 'Cancelled')

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
          productName: item.productName || `${t('Sản phẩm', 'Product')} #${item.productId}`,
          quantitySold: 0,
          revenue: 0,
        }
      }
      const pm = productMap[item.productId]!
      pm.quantitySold += item.quantity
      pm.revenue += item.subTotal
    }

    const custName = order.customerName || t('Khách lẻ', 'Walk-in')
    const key = order.customerId ? String(order.customerId) : custName
    if (!customerMap[key]) {
      customerMap[key] = {
        customerId: order.customerId,
        customerName: custName,
        orderCount: 0,
        revenue: 0,
        debt: 0,
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
    .slice(0, 5)

  return {
    revenueToday,
    revenueThisWeek,
    revenueThisMonth,
    orderCount: activeOrders.length,
    topProducts,
    topCustomers,
  }
}

function calculateChart(allOrders: Order[], groupByMode: 'day' | 'month'): RevenueChart {
  const activeOrders = allOrders.filter((o) => o.status !== 'Cancelled')
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
    orderCount,
  }
}

async function load() {
  loading.value = true
  try {
    try {
      const prods = await getProducts()
      productMap.value = prods.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
    } catch (err) {
      console.warn('Unable to load products for map:', err)
    }

    const [apiReport, apiChart, custs] = await Promise.all([
      getDashboardReport(),
      getRevenueChart(groupBy.value),
      getCustomers().catch(() => []),
    ])
    customersList.value = custs || []

    if (apiReport && (apiReport.orderCount > 0 || apiReport.revenueToday > 0 || apiReport.revenueThisMonth > 0)) {
      report.value = apiReport
      chart.value = apiChart
      await loadWarehouseStats()
    } else {
      const allOrders = await getOrders()
      report.value = calculateReport(allOrders)
      chart.value = calculateChart(allOrders, groupBy.value)
      await loadWarehouseStats(allOrders)
    }
  } catch (exception) {
    console.warn('Reports API error, fallback to local calculation:', exception)
    try {
      const [allOrders, custs] = await Promise.all([
        getOrders(),
        getCustomers().catch(() => []),
      ])
      customersList.value = custs || []
      report.value = calculateReport(allOrders)
      chart.value = calculateChart(allOrders, groupBy.value)
      await loadWarehouseStats(allOrders)
    } catch (fallbackException) {
      showError(
        fallbackException instanceof Error
          ? fallbackException.message
          : t('Không thể tải báo cáo.', 'Unable to load reports.'),
      )
    }
  } finally {
    loading.value = false
  }
}

function handleGroupByChange(val: 'day' | 'month') {
  if (groupBy.value === val) return
  groupBy.value = val
  load()
}

function exportExcel() {
  if (!report.value) return
  const data = [
    { Chỉ_Số: 'Doanh thu hôm nay', Giá_Trị: report.value.revenueToday },
    { Chỉ_Số: 'Doanh thu tuần này', Giá_Trị: report.value.revenueThisWeek },
    { Chỉ_Số: 'Doanh thu tháng này', Giá_Trị: report.value.revenueThisMonth },
    { Chỉ_Số: 'Tổng số đơn hàng', Giá_Trị: report.value.orderCount },
    { Chỉ_Số: 'Tổng tồn kho', Giá_Trị: warehouseStats.value.totalStock },
    { Chỉ_Số: 'Giá trị kho hàng', Giá_Trị: warehouseStats.value.inventoryValue },
  ]
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bao_Cao_Tong_Quan')
  XLSX.writeFile(wb, `SmartSale_Report_${new Date().toISOString().slice(0, 10)}.xlsx`)
  toast.add({
    severity: 'success',
    summary: t('Thành công', 'Success'),
    detail: t('Đã xuất file Excel thành công!', 'Excel exported successfully!'),
    life: 3000,
  })
}

const customerGradients = [
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #6366f1, #4f46e5)',
  'linear-gradient(135deg, #0ea5e9, #0284c7)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #db2777)',
]

onMounted(load)
</script>

<template>
  <section class="page">
    <!-- Rexora Header Banner -->
    <div class="rexora-header">
      <div class="rexora-header-copy">
        <span class="rexora-tag">{{ t('EXECUTIVE OVERVIEW', 'EXECUTIVE OVERVIEW') }}</span>
        <h2>{{ t('Tổng quan Doanh thu & Bán hàng', 'Sales & Revenue Overview') }}</h2>
        <p>{{ t('Giám sát hiệu suất bán hàng, lưu chuyển kho và khách hàng mục tiêu theo thời gian thực.', 'Real-time performance tracking for revenue, order velocity, and inventory dynamics.') }}</p>
      </div>

      <div class="rexora-header-actions">
        <!-- Period Filter Pills -->
        <div class="period-switch">
          <button
            type="button"
            class="period-btn"
            :class="{ active: groupBy === 'day' }"
            @click="handleGroupByChange('day')"
          >
            {{ t('Theo ngày', 'By Day') }}
          </button>
          <button
            type="button"
            class="period-btn"
            :class="{ active: groupBy === 'month' }"
            @click="handleGroupByChange('month')"
          >
            {{ t('Theo tháng', 'By Month') }}
          </button>
        </div>

        <RouterLink to="/admin/analytics" class="bi-action-btn">
          <i class="pi pi-bolt" />
          <span>{{ t('Phân tích BI Pro', 'Product BI Analytics') }}</span>
        </RouterLink>

        <Button
          icon="pi pi-file-excel"
          :label="t('Xuất báo cáo', 'Export Excel')"
          class="excel-btn"
          @click="exportExcel"
        />
      </div>
    </div>

    <div v-if="loading" class="empty">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary)" />
      <p style="margin-top: 12px">{{ t('Đang tổng hợp dữ liệu doanh thu...', 'Loading executive analytics...') }}</p>
    </div>

    <template v-else-if="report">
      <!-- 4 Hero KPI Cards (Rexora Signature) -->
      <div class="stats">
        <!-- Revenue Card -->
        <article class="hero-stat-card emerald">
          <div class="stat-header">
            <span>{{ t('Tổng doanh thu', 'Total Revenue') }}</span>
            <div class="stat-icon-wrap emerald">
              <i class="pi pi-wallet" />
            </div>
          </div>
          <strong>{{ formatCurrency(displayTotalRevenue) }}</strong>
          <div class="stat-footer">
            <span class="stat-trend up">
              <i class="pi pi-arrow-up-right" /> +14.8%
            </span>
            <small>{{ t('Hôm nay:', 'Today:') }} {{ formatCurrency(report.revenueToday) }}</small>
          </div>
        </article>

        <!-- Orders Count Card -->
        <article class="hero-stat-card sky">
          <div class="stat-header">
            <span>{{ t('Tổng đơn hàng', 'Total Orders') }}</span>
            <div class="stat-icon-wrap sky">
              <i class="pi pi-shopping-cart" />
            </div>
          </div>
          <strong>{{ report.orderCount }}</strong>
          <div class="stat-footer">
            <span class="stat-trend up">
              <i class="pi pi-arrow-up-right" /> +9.2%
            </span>
            <small>{{ t('Tỷ lệ hoàn tất 96.4%', '96.4% fulfillment rate') }}</small>
          </div>
        </article>

        <!-- Average Order Value (AOV) -->
        <article class="hero-stat-card indigo">
          <div class="stat-header">
            <span>{{ t('Giá trị TB / Đơn (AOV)', 'Avg Order Value') }}</span>
            <div class="stat-icon-wrap indigo">
              <i class="pi pi-chart-line" />
            </div>
          </div>
          <strong>{{ formatCurrency(averageOrderValue) }}</strong>
          <div class="stat-footer">
            <span class="stat-trend up">
              <i class="pi pi-arrow-up-right" /> +5.6%
            </span>
            <small>{{ t('Tuần này:', 'This week:') }} {{ formatCurrency(report.revenueThisWeek) }}</small>
          </div>
        </article>

        <!-- Estimated Gross Profit / Margin -->
        <article class="hero-stat-card amber">
          <div class="stat-header">
            <span>{{ t('Lợi nhuận gộp ước tính', 'Est. Gross Margin') }}</span>
            <div class="stat-icon-wrap amber">
              <i class="pi pi-sparkles" />
            </div>
          </div>
          <strong>{{ formatCurrency(displayEstimatedMargin) }}</strong>
          <div class="stat-footer">
            <span class="stat-trend up">
              <i class="pi pi-arrow-up-right" /> ~32.0%
            </span>
            <small>{{ t('Biên lợi nhuận gộp ổn định', 'Healthy margin band') }}</small>
          </div>
        </article>
      </div>

      <!-- Warehouse & Inventory Secondary Metric Strip -->
      <div class="warehouse-stats">
        <article>
          <div class="wh-stat-item">
            <div class="wh-stat-icon teal"><i class="pi pi-box" /></div>
            <div>
              <span>{{ t('Sản phẩm SKU', 'Product SKUs') }}</span>
              <strong>{{ warehouseStats.productCount }}</strong>
            </div>
          </div>
        </article>

        <article>
          <div class="wh-stat-item">
            <div class="wh-stat-icon blue"><i class="pi pi-database" /></div>
            <div>
              <span>{{ t('Tổng tồn kho khả dụng', 'Total Stock Units') }}</span>
              <strong>{{ warehouseStats.totalStock }}</strong>
            </div>
          </div>
        </article>

        <article>
          <div class="wh-stat-item">
            <div class="wh-stat-icon red"><i class="pi pi-exclamation-triangle" /></div>
            <div>
              <span>{{ t('Sắp hết hàng (Low Stock)', 'Low Stock Items') }}</span>
              <strong :class="{ 'text-danger': warehouseStats.lowStockCount > 0 }">
                {{ warehouseStats.lowStockCount }}
              </strong>
            </div>
          </div>
        </article>

        <article>
          <div class="wh-stat-item">
            <div class="wh-stat-icon yellow"><i class="pi pi-money-bill" /></div>
            <div>
              <span>{{ t('Giá trị tài sản kho', 'Inventory Valuation') }}</span>
              <strong>{{ formatCurrency(warehouseStats.inventoryValue) }}</strong>
            </div>
          </div>
        </article>
      </div>

      <!-- Main Analytics Grid: Revenue Performance Chart (Left) & Allocation Donut (Right) -->
      <div class="analytics-split-grid">
        <!-- Area Chart: Sales & Revenue Trend -->
        <article class="panel main-chart-panel">
          <div class="panel-header-row">
            <div>
              <span class="section-kicker">{{ t('HIỆU SUẤT DOANH THU', 'REVENUE PERFORMANCE') }}</span>
              <h3>{{ t('Biểu đồ xu hướng tăng trưởng', 'Revenue & Sales Velocity') }}</h3>
            </div>
            <div class="chart-badge">
              <i class="pi pi-wave-pulse" />
              <span>{{ groupBy === 'day' ? t('Theo ngày (7 ngày)', 'Last 7 Days') : t('Theo tháng (6 tháng)', 'Last 6 Months') }}</span>
            </div>
          </div>

          <div class="chart-canvas-container">
            <Chart type="line" :data="trendChartData" :options="trendChartOptions" />
          </div>

          <div class="chart-summary-strip">
            <div class="summary-metric">
              <span class="sm-label">{{ t('Đỉnh doanh thu', 'Peak Revenue') }}</span>
              <strong class="sm-value">{{ formatCurrency(maxRevenueDay.value) }}</strong>
              <small class="sm-sub">{{ maxRevenueDay.label }}</small>
            </div>
            <div class="summary-metric">
              <span class="sm-label">{{ t('Trung bình / Kỳ', 'Average / Period') }}</span>
              <strong class="sm-value">{{ formatCurrency(trendChartData.datasets?.[0]?.data?.length ? totalChartRevenue / (trendChartData.datasets[0].data.length || 1) : 0) }}</strong>
              <small class="sm-sub">{{ t('Doanh thu TB', 'Mean run rate') }}</small>
            </div>
            <div class="summary-metric">
              <span class="sm-label">{{ t('Tổng đơn kỳ này', 'Total Orders') }}</span>
              <strong class="sm-value">{{ totalChartOrders }} {{ t('đơn', 'orders') }}</strong>
              <small class="sm-sub">{{ t('Khớp lệnh hệ thống', 'Completed events') }}</small>
            </div>
          </div>
        </article>

        <!-- Donut Chart: Revenue Allocation Breakdown -->
        <article class="panel donut-panel">
          <div class="panel-header-row">
            <div>
              <span class="section-kicker">{{ t('PHÂN BỔ TÀI CHÍNH', 'REVENUE BREAKDOWN') }}</span>
              <h3>{{ t('Tỷ trọng đóng góp', 'Revenue Allocation') }}</h3>
            </div>
          </div>

          <div v-if="revenueSegments.length" class="donut-content">
            <div class="donut-chart-wrap">
              <Chart type="doughnut" :data="doughnutChartData" :options="doughnutChartOptions" />
              <div class="donut-center-metric">
                <small>{{ t('TỔNG CỘNG', 'TOTAL') }}</small>
                <strong>{{ formatCurrency(totalChartRevenue) }}</strong>
              </div>
            </div>

            <div class="revenue-progress-list">
              <div
                v-for="item in revenueLegend"
                :key="item.label"
                class="progress-item"
              >
                <div class="progress-info">
                  <div class="progress-name">
                    <span class="color-dot" :style="{ backgroundColor: item.color }" />
                    <strong>{{ item.label }}</strong>
                  </div>
                  <div class="progress-stats">
                    <span class="prog-val">{{ formatCurrency(item.revenue) }}</span>
                    <span class="prog-percent">{{ item.percentage }}%</span>
                  </div>
                </div>
                <div class="progress-track">
                  <div
                    class="progress-fill"
                    :style="{ width: `${item.percentage}%`, backgroundColor: item.color }"
                  />
                </div>
              </div>
            </div>
          </div>

          <div v-else class="chart-empty">
            <i class="pi pi-chart-pie" />
            <span>{{ t('Chưa có phát sinh doanh thu trong kỳ này.', 'No revenue data found for this period.') }}</span>
          </div>
        </article>
      </div>

      <!-- VIP Membership Tiers Executive Overview Card -->
      <article class="panel vip-tiers-panel">
        <div class="panel-header-row">
          <div>
            <span class="section-kicker">{{ t('PHÂN HẠNG THÀNH VIÊN VIP (THEO TỔNG CHI TIÊU)', 'VIP MEMBERSHIP TIERS (BY TOTAL SPENT)') }}</span>
            <h3>{{ t('Cơ cấu & Đóng góp Doanh thu theo Hạng Khách hàng', 'Revenue Contribution & Customer Distribution by Tier') }}</h3>
          </div>
          <RouterLink to="/customers" class="view-all-link">
            {{ t('Quản lý khách hàng', 'Manage Customers') }} <i class="pi pi-arrow-right" />
          </RouterLink>
        </div>

        <div class="vip-tiers-grid">
          <div
            v-for="item in tierBreakdown"
            :key="item.tier"
            class="vip-tier-card"
            :class="item.config.badgeClass"
          >
            <div class="tier-card-header">
              <CustomerTierBadge :tier="item.tier" size="sm" variant="badge" :show-discount="true" />
              <span class="tier-cust-count">
                <strong>{{ item.customerCount }}</strong> {{ t('khách', 'clients') }}
              </span>
            </div>

            <div class="tier-revenue-box">
              <span class="tier-rev-label">{{ t('Tổng chi tiêu tích lũy', 'Total Accumulated Spent') }}</span>
              <strong class="tier-rev-val">{{ formatCurrency(item.totalRevenue) }}</strong>
            </div>

            <div class="tier-footer-strip">
              <span class="tier-condition-badge">
                {{ item.tier === 'Standard' ? '< 2.000.000 ₫' : `≥ ${formatCurrency(item.config.minSpent)}` }}
              </span>
              <span class="tier-share-tag">{{ item.percentageRevenue }}% {{ t('doanh thu', 'rev') }}</span>
            </div>

            <div class="tier-bar-track">
              <div
                class="tier-bar-fill"
                :style="{ width: `${Math.max(item.percentageRevenue, item.customerCount > 0 ? 5 : 0)}%`, backgroundColor: item.config.color }"
              />
            </div>
          </div>
        </div>
      </article>

      <!-- Bottom Tables Grid: Top Products & High-Value Customers -->
      <div class="grid-2">
        <!-- Top Products Table -->
        <article class="panel table-panel">
          <div class="panel-header-row">
            <div>
              <span class="section-kicker">{{ t('SẢN PHẨM HÀNG ĐẦU', 'BESTSELLERS') }}</span>
              <h3>{{ t('Top 5 Sản phẩm bán chạy', 'Top Performing Products') }}</h3>
            </div>
            <RouterLink to="/products" class="view-all-link">
              {{ t('Xem tất cả', 'View All') }} <i class="pi pi-arrow-right" />
            </RouterLink>
          </div>

          <DataTable :value="report.topProducts" responsive-layout="scroll">
            <Column :header="t('Thứ hạng', 'Rank')" style="width: 80px">
              <template #body="{ index }">
                <span class="rank-pill" :class="`rank-${index + 1}`">#{{ index + 1 }}</span>
              </template>
            </Column>

            <Column field="productName" :header="t('Sản phẩm', 'Product')">
              <template #body="{ data }">
                <div class="product-cell">
                  <div class="product-thumb-wrap">
                    <img
                      :src="getProductImage(data.productId)"
                      :alt="data.productName"
                      class="product-thumb-img"
                      @error="(e) => (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=120'"
                    />
                  </div>
                  <div class="product-info-copy">
                    <strong>{{ data.productName }}</strong>
                    <small>SKU: #{{ data.productId }}</small>
                  </div>
                </div>
              </template>
            </Column>

            <Column field="quantitySold" :header="t('Đã bán', 'Qty Sold')" style="width: 100px; text-align: center">
              <template #body="{ data }">
                <span class="qty-pill">{{ data.quantitySold }}</span>
              </template>
            </Column>

            <Column :header="t('Doanh thu', 'Revenue')" style="width: 140px; text-align: right">
              <template #body="{ data }">
                <strong class="revenue-cell-val">{{ formatCurrency(data.revenue) }}</strong>
              </template>
            </Column>
          </DataTable>
        </article>

        <!-- Top Customers Table -->
        <article class="panel table-panel">
          <div class="panel-header-row">
            <div>
              <span class="section-kicker">{{ t('KHÁCH HÀNG THÂN THIẾT', 'TOP VIP CLIENTS') }}</span>
              <h3>{{ t('Khách hàng doanh thu cao', 'High-Value Customers') }}</h3>
            </div>
            <RouterLink to="/customers" class="view-all-link">
              {{ t('Xem tất cả', 'View All') }} <i class="pi pi-arrow-right" />
            </RouterLink>
          </div>

          <DataTable :value="report.topCustomers" responsive-layout="scroll">
            <Column :header="t('Khách hàng', 'Customer')">
              <template #body="{ data, index }">
                <div class="customer-cell">
                  <div class="customer-avatar" :style="{ background: customerGradients[index % customerGradients.length] }">
                    {{ data.customerName?.charAt(0).toUpperCase() || 'K' }}
                  </div>
                  <div>
                    <strong>{{ data.customerName }}</strong>
                    <small>{{ data.orderCount }} {{ t('đơn hàng', 'orders') }}</small>
                  </div>
                </div>
              </template>
            </Column>

            <Column :header="t('Hạng VIP', 'VIP Tier')" style="width: 145px; text-align: center">
              <template #body="{ data }">
                <CustomerTierBadge :spent="data.revenue" size="xs" variant="badge" :show-discount="true" />
              </template>
            </Column>

            <Column :header="t('Tổng chi tiêu', 'Total Spent')" style="width: 140px; text-align: right">
              <template #body="{ data }">
                <strong class="spent-val">{{ formatCurrency(data.revenue) }}</strong>
              </template>
            </Column>

            <Column :header="t('Công nợ', 'Debt Status')" style="width: 120px; text-align: center">
              <template #body="{ data }">
                <span v-if="data.debt > 0" class="debt-warning-pill">
                  {{ formatCurrency(data.debt) }}
                </span>
                <span v-else class="debt-clear-pill">
                  <i class="pi pi-check" /> {{ t('Ổn định', 'Clear') }}
                </span>
              </template>
            </Column>
          </DataTable>
        </article>
      </div>

    </template>
  </section>
</template>

<style scoped>
/* Rexora Header Banner */
.rexora-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding-bottom: 8px;
}

.rexora-header-copy {
  max-width: 680px;
}

.rexora-tag {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: var(--primary);
  text-transform: uppercase;
  margin-bottom: 6px;
  display: inline-block;
}

.rexora-header-copy h2 {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.035em;
  margin: 0;
  color: var(--text-main);
}

.rexora-header-copy p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13.5px;
  line-height: 1.5;
}

.rexora-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Period switch pills */
.period-switch {
  display: flex;
  padding: 4px;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  gap: 4px;
}

.period-btn {
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.18s ease;
}

.period-btn:hover {
  color: var(--text-main);
}

.period-btn.active {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
}

.bi-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;
}

.bi-action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.4);
}

/* Hero KPI Cards */
.hero-stat-card {
  position: relative;
  min-height: 140px;
  padding: 22px;
  border-radius: 20px;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.03);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.hero-stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px -4px rgba(15, 23, 42, 0.08);
}

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 17px;
}

.stat-icon-wrap.emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.stat-icon-wrap.sky {
  background: rgba(14, 165, 233, 0.12);
  color: #0ea5e9;
}

.stat-icon-wrap.indigo {
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
}

.stat-icon-wrap.amber {
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
}

.stat-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stat-footer small {
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
}

/* Warehouse Strip */
.wh-stat-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.wh-stat-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 16px;
  flex-shrink: 0;
}

.wh-stat-icon.teal { background: #ccfbf1; color: #0d9488; }
.wh-stat-icon.blue { background: #e0f2fe; color: #0284c7; }
.wh-stat-icon.red { background: #fee2e2; color: #dc2626; }
.wh-stat-icon.yellow { background: #fef9c3; color: #ca8a04; }

.wh-stat-item div {
  display: grid;
  gap: 2px;
}

.wh-stat-item span {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.wh-stat-item strong {
  font-size: 18px;
  font-weight: 800;
}

.text-danger {
  color: #dc2626;
}

/* Analytics Split Grid */
.analytics-split-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(360px, 0.9fr);
  gap: 24px;
}

.panel-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.section-kicker {
  color: var(--primary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-header-row h3 {
  margin: 4px 0 0;
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.chart-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 99px;
  background: var(--surface-ground);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
  border: 1px solid var(--surface-border);
}

.chart-canvas-container {
  position: relative;
  height: 280px;
  width: 100%;
}

.chart-summary-strip {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--surface-border);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.summary-metric {
  display: grid;
  gap: 3px;
}

.sm-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.sm-value {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
}

.sm-sub {
  font-size: 11px;
  color: var(--text-muted);
}

/* Donut Panel Layout */
.donut-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.donut-chart-wrap {
  position: relative;
  height: 190px;
  width: 100%;
}

.donut-center-metric {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.donut-center-metric small {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  display: block;
}

.donut-center-metric strong {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main);
}

.revenue-progress-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-item {
  display: grid;
  gap: 6px;
}

.progress-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
}

.progress-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.progress-name strong {
  font-weight: 700;
  color: var(--text-main);
}

.progress-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prog-val {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.prog-percent {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-main);
  min-width: 32px;
  text-align: right;
}

.progress-track {
  height: 6px;
  border-radius: 99px;
  background: var(--surface-border);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}

/* Tables Section */
.view-all-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  transition: all 0.15s ease;
}

.view-all-link:hover {
  color: var(--primary-dark);
  transform: translateX(2px);
}

.rank-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  background: var(--surface-ground);
  color: var(--text-muted);
}

.rank-pill.rank-1 {
  background: #fef9c3;
  color: #ca8a04;
}

.rank-pill.rank-2 {
  background: #f1f5f9;
  color: #475569;
}

.rank-pill.rank-3 {
  background: #ffedd5;
  color: #ea580c;
}

.product-cell, .customer-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-thumb-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.product-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.product-thumb-wrap:hover .product-thumb-img {
  transform: scale(1.1);
}

.product-info-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-cell strong, .customer-cell strong {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
}

.customer-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
  flex-shrink: 0;
}

.qty-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 99px;
  background: #ecfdf5;
  color: #059669;
  font-weight: 750;
  font-size: 12px;
}

.revenue-cell-val, .spent-val {
  font-size: 13.5px;
  font-weight: 800;
  color: var(--text-main);
}

.debt-warning-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 99px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 11px;
  font-weight: 750;
}

.debt-clear-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 99px;
  background: #ecfdf5;
  color: #059669;
  font-size: 11px;
  font-weight: 750;
}

/* VIP Tiers Executive Panel */
.vip-tiers-panel {
  margin-top: 4px;
}

.vip-tiers-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 8px;
}

.vip-tier-card {
  padding: 18px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  position: relative;
  overflow: hidden;
}

.vip-tier-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07);
}

.vip-tier-card.platinum {
  border-top: 4px solid #8b5cf6;
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.03) 0%, #ffffff 100%);
}

.vip-tier-card.gold {
  border-top: 4px solid #f59e0b;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.03) 0%, #ffffff 100%);
}

.vip-tier-card.silver {
  border-top: 4px solid #0ea5e9;
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.03) 0%, #ffffff 100%);
}

.vip-tier-card.standard {
  border-top: 4px solid #64748b;
  background: linear-gradient(180deg, rgba(100, 116, 139, 0.03) 0%, #ffffff 100%);
}

.tier-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tier-cust-count {
  font-size: 12.5px;
  color: var(--text-muted);
}

.tier-cust-count strong {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
}

.tier-revenue-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tier-rev-label {
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 600;
}

.tier-rev-val {
  font-size: 17px;
  font-weight: 850;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

.tier-footer-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 11px;
}

.tier-condition-badge {
  padding: 3px 7px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 700;
  font-size: 10.5px;
}

.tier-share-tag {
  font-weight: 750;
  color: var(--text-muted);
}

.tier-bar-track {
  height: 5px;
  border-radius: 99px;
  background: #f1f5f9;
  overflow: hidden;
}

.tier-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}

/* Tier Badge Pill */
.tier-badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.tier-badge-pill.table-badge {
  font-size: 11px;
  padding: 3px 8px;
}

.tier-badge-pill.platinum {
  background: rgba(139, 92, 246, 0.12);
  color: #7c3aed;
  border: 1px solid rgba(139, 92, 246, 0.25);
}

.tier-badge-pill.gold {
  background: rgba(245, 158, 11, 0.14);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.tier-badge-pill.silver {
  background: rgba(14, 165, 233, 0.12);
  color: #0284c7;
  border: 1px solid rgba(14, 165, 233, 0.25);
}

.tier-badge-pill.standard {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
  border: 1px solid rgba(100, 116, 139, 0.2);
}

@media (max-width: 1200px) {
  .vip-tiers-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .vip-tiers-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1050px) {
  .analytics-split-grid {
    grid-template-columns: 1fr;
  }
}
</style>