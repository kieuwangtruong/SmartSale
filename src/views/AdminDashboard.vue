<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  formatCurrency,
  getOrders,
  getProducts,
  getUsers,
  type OrderResponseDto,
  type ProductDto,
  type UserDto,
} from '../services/orderApi'
import type { UserDto as UserApiDto } from '../services/userApi'

// State
const orders = ref<OrderResponseDto[]>([])
const products = ref<ProductDto[]>([])
const users = ref<UserDto[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

// Computed statistics
const totalOrders = computed(() => orders.value.length)
const totalRevenue = computed(() =>
  orders.value.reduce((sum, order) => sum + (order.total || 0), 0),
)
const totalProducts = computed(() => products.value.length)
const totalUsers = computed(() => users.value.length)
const totalStock = computed(() => products.value.reduce((sum, p) => sum + (p.stock || 0), 0))

const pendingOrders = computed(
  () => orders.value.filter((o) => o.status === 'Pending').length,
)
const completedOrders = computed(
  () => orders.value.filter((o) => o.status === 'Completed').length,
)
const cancelledOrders = computed(
  () => orders.value.filter((o) => o.status === 'Cancelled').length,
)

const lowStockProducts = computed(
  () => products.value.filter((p) => (p.stock || 0) < 10).length,
)

const recentOrders = computed(() => {
  return [...orders.value].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return dateB - dateA
  }).slice(0, 10)
})

// Chart data for visualization
const orderStatusDistribution = computed(() => {
  return {
    'Pending': orders.value.filter((o) => o.status === 'Pending').length,
    'Processing': orders.value.filter((o) => o.status === 'Processing').length,
    'Shipped': orders.value.filter((o) => o.status === 'Shipped').length,
    'Completed': orders.value.filter((o) => o.status === 'Completed').length,
    'Cancelled': orders.value.filter((o) => o.status === 'Cancelled').length,
  }
})

const topProducts = computed(() => {
  const productSales = new Map<number | string, { name: string; quantity: number; revenue: number }>()

  orders.value.forEach((order) => {
    order.orderItems.forEach((item: any) => {
      // Use productName if available (from localStorage), otherwise use product name from API
      const productName = item.productName || products.value.find((p) => p.id === item.productId)?.name || `Product #${item.productId}`
      const key = item.productName ? `local_${item.productName}` : item.productId
      
      const existing = productSales.get(key)
      if (existing) {
        existing.quantity += item.quantity
        existing.revenue += item.subTotal
      } else {
        productSales.set(key, {
          name: productName,
          quantity: item.quantity,
          revenue: item.subTotal,
        })
      }
    })
  })

  return Array.from(productSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
})

// Lifecycle
onMounted(async () => {
  isLoading.value = true
  try {
    const [ordersData, productsData, usersData] = await Promise.all([
      getOrders(),
      getProducts(),
      getUsers(),
    ])

    orders.value = ordersData

    // Also load orders from localStorage (customer orders)
    const localOrdersStr = localStorage.getItem('orders')
    if (localOrdersStr) {
      try {
        const localOrders = JSON.parse(localOrdersStr)
        if (Array.isArray(localOrders)) {
          localOrders.forEach((order, orderIndex) => {
            const convertedOrder: OrderResponseDto = {
              id: parseInt(order.id.replace(/[^\d]/g, '')) || Math.random() * 1000,
              userId: 9999, // Local user ID
              status: order.status === 'Đã thanh toán' ? 'Completed' : order.status === 'Chờ xác nhận' ? 'Pending' : 'Processing',
              total: order.total || 0,
              createdAt: order.date || new Date().toISOString(),
              orderItems: (order.items || []).map((item: any, itemIndex: number) => {
                // Create a product ID based on order and item index to ensure consistency
                // Store product name as part of the ID string for later lookup
                const productIdKey = `local_${orderIndex}_${itemIndex}`
                return {
                  id: Math.random() * 10000,
                  productId: parseInt(productIdKey.replace(/\D/g, '')) || (orderIndex * 100 + itemIndex),
                  quantity: item.quantity || 0,
                  price: item.price || 0,
                  subTotal: (item.price || 0) * (item.quantity || 0),
                  // Store product name in a custom property for reference
                  productName: item.name,
                } as any
              }),
            }
            orders.value.push(convertedOrder)
          })
        }
      } catch (e) {
        console.log('Error loading local orders:', e)
      }
    }

    products.value = productsData
    users.value = usersData
  } catch (error) {
    errorMessage.value = 'Không thể tải dữ liệu'
    console.error(error)
  } finally {
    isLoading.value = false
  }
})

// Helper functions
const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'Pending': '#f5a524',
    'Processing': '#4f8cff',
    'Shipped': '#23b987',
    'Completed': '#23b987',
    'Cancelled': '#ef4444',
  }
  return colors[status] || '#8a96a8'
}

const getProgressBar = (value: number, max: number): string => {
  return `${(value / max) * 100}%`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="dashboard-shell">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <p>Đang tải dữ liệu...</p>
    </div>

    <!-- Error State -->
    <div v-if="errorMessage" class="alert alert-error">
      {{ errorMessage }}
    </div>

    <!-- Main Dashboard -->
    <template v-if="!isLoading">
      <!-- Hero Section with Main Metrics -->
      <div class="hero-card">
        <div class="hero-copy">
          <div>
            <p class="hero-kicker">Tổng quan hôm nay</p>
            <h1 class="hero-title">Bảng điều khiển quản lý</h1>
          </div>
        </div>
      </div>

      <!-- KPI Grid - Row 1: Main Metrics -->
      <div class="hero-metrics">
        <div class="stat-card">
          <span>Tổng đơn hàng</span>
          <strong>{{ totalOrders }}</strong>
          <small>Trong tất cả các trạng thái</small>
        </div>
        <div class="stat-card">
          <span>Doanh thu</span>
          <strong>{{ formatCurrency(totalRevenue) }}</strong>
          <small>Từ đơn hàng hoàn thành</small>
        </div>
        <div class="stat-card">
          <span>Sản phẩm</span>
          <strong>{{ totalProducts }}</strong>
          <small>Trong kho</small>
        </div>
        <div class="stat-card">
          <span>Tổng người dùng</span>
          <strong>{{ totalUsers }}</strong>
          <small>Tài khoản hoạt động</small>
        </div>
      </div>

      <!-- KPI Grid - Row 2: Status Overview -->
      <div class="hero-metrics">
        <div class="stat-card">
          <span>Đơn hàng chờ xử lý</span>
          <strong>{{ pendingOrders }}</strong>
          <small>Cần xác nhận</small>
        </div>
        <div class="stat-card">
          <span>Đơn hàng hoàn thành</span>
          <strong>{{ completedOrders }}</strong>
          <small>Thành công</small>
        </div>
        <div class="stat-card">
          <span>Đơn hàng hủy</span>
          <strong>{{ cancelledOrders }}</strong>
          <small>Không hoàn thành</small>
        </div>
        <div class="stat-card">
          <span>Sản phẩm sắp hết hàng</span>
          <strong>{{ lowStockProducts }}</strong>
          <small>Dưới 10 cái</small>
        </div>
      </div>

      <!-- Two Column Layout: Charts and Details -->
      <div class="dashboard-grid-2col">
        <!-- Left: Order Status Distribution Chart -->
        <div class="panel order-status-chart">
          <div class="panel-header">
            <h3>Phân bố trạng thái đơn hàng</h3>
          </div>
          <div class="chart-container">
            <div v-for="(count, status) in orderStatusDistribution" :key="status" class="chart-bar-item">
              <div class="chart-bar-label">
                <span class="chart-bar-name">{{ status }}</span>
                <span class="chart-bar-value">{{ count }}</span>
              </div>
              <div class="chart-bar-track">
                <div
                  class="chart-bar-fill"
                  :style="{
                    width: getProgressBar(count, Math.max(...Object.values(orderStatusDistribution))),
                    backgroundColor: getStatusColor(status),
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Top Products -->
        <div class="panel top-products">
          <div class="panel-header">
            <h3>Sản phẩm bán chạy nhất</h3>
          </div>
          <div class="products-list">
            <div v-if="topProducts.length === 0" class="empty-state">
              Chưa có dữ liệu bán hàng
            </div>
            <div v-for="(product, idx) in topProducts" :key="idx" class="product-item">
              <div class="product-rank">{{ idx + 1 }}</div>
              <div class="product-info">
                <p class="product-name">{{ product.name }}</p>
                <p class="product-meta">{{ product.quantity }} đơn vị</p>
              </div>
              <div class="product-revenue">
                {{ formatCurrency(product.revenue) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Inventory Overview -->
      <div class="panel stock-overview">
        <div class="panel-header">
          <h3>Tổng quan kho hàng</h3>
        </div>
        <div class="stock-stats">
          <div class="stock-stat-item">
            <p class="stock-stat-label">Tổng số tồn kho</p>
            <p class="stock-stat-value">{{ totalStock }} sản phẩm</p>
          </div>
          <div class="stock-stat-item">
            <p class="stock-stat-label">Sắp hết hàng</p>
            <p class="stock-stat-value" style="color: #f5a524">{{ lowStockProducts }} cảnh báo</p>
          </div>
        </div>
      </div>

      <!-- Recent Orders Table -->
      <div class="panel recent-orders">
        <div class="panel-header">
          <h3>Đơn hàng gần đây</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Khách hàng</th>
                <th>Trạng thái</th>
                <th>Số lượng</th>
                <th>Tổng tiền</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in recentOrders" :key="order.id">
                <td>
                  <strong>#{{ order.id }}</strong>
                </td>
                <td>
                  <span v-if="users.find((u) => u.id === order.userId)">
                    {{ users.find((u) => u.id === order.userId)?.fullName }}
                  </span>
                  <span v-else class="text-muted">Người dùng #{{ order.userId }}</span>
                </td>
                <td>
                  <span
                    class="status-badge"
                    :style="{ backgroundColor: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }"
                  >
                    {{ order.status }}
                  </span>
                </td>
                <td>{{ order.orderItems.length }} mục</td>
                <td><strong>{{ formatCurrency(order.total) }}</strong></td>
                <td>
                  <small>{{ formatDate(order.createdAt) }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Low Stock Products Alert -->
      <div v-if="lowStockProducts > 0" class="alert alert-warning">
        <strong>⚠️ Cảnh báo kho:</strong> Có {{ lowStockProducts }} sản phẩm sắp hết hàng (dưới 10 cái)
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard-shell {
  display: grid;
  gap: 1rem;
  width: 100%;
}

.loading-container {
  display: grid;
  place-items: center;
  min-height: 400px;
  color: var(--color-muted);
}

.alert-warning {
  border-color: #fbbf24;
  background: #fffbeb;
  color: #92400e;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.8rem;
}

.dashboard-grid-2col {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  box-shadow: var(--shadow-sm);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
}

/* Chart Styles */
.order-status-chart .chart-container {
  display: grid;
  gap: 0.75rem;
}

.chart-bar-item {
  display: grid;
  gap: 0.35rem;
}

.chart-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--color-text);
}

.chart-bar-name {
  font-weight: 800;
}

.chart-bar-value {
  color: var(--color-heading);
  font-weight: 700;
}

.chart-bar-track {
  height: 24px;
  background: var(--color-surface-soft);
  border-radius: 4px;
  overflow: hidden;
}

.chart-bar-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Top Products */
.products-list {
  display: grid;
  gap: 0.65rem;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-muted);
}

.product-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-soft);
  border-radius: 6px;
  transition: background 0.2s ease;
}

.product-item:hover {
  background: #f0f4fa;
}

.product-rank {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  background: var(--color-primary);
  color: #ffffff;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.85rem;
}

.product-info {
  min-width: 0;
}

.product-name {
  margin: 0 0 0.15rem;
  font-weight: 800;
  color: var(--color-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-meta {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.product-revenue {
  font-weight: 700;
  color: var(--color-accent);
  white-space: nowrap;
}

/* Stock Overview */
.stock-overview .stock-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.stock-stat-item {
  padding: 1rem;
  background: var(--color-surface-soft);
  border-radius: 6px;
  border-left: 3px solid var(--color-primary);
}

.stock-stat-label {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: var(--color-muted);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stock-stat-value {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-heading);
}

/* Table Styles */
.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--color-surface-soft);
}

th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 700;
  color: var(--color-heading);
  font-size: 0.85rem;
  border-bottom: 2px solid var(--color-border);
}

td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
  color: var(--color-text);
}

tbody tr:hover {
  background: var(--color-surface-soft);
}

.status-badge {
  display: inline-block;
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  font-weight: 800;
  font-size: 0.8rem;
}

.text-muted {
  color: var(--color-muted);
}

/* Responsive */
@media (max-width: 768px) {
  .hero-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid-2col {
    grid-template-columns: 1fr;
  }

  .stock-stats {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  table {
    font-size: 0.85rem;
  }

  td,
  th {
    padding: 0.5rem;
  }
}
</style>
