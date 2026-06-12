<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatCurrency } from '../services/productApi'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
}

interface Order {
  id: string
  items: OrderItem[]
  total: number
  paymentMethod: string
  status: string
  createdAt: string
  customerName?: string
  customerEmail?: string
}

const orders = ref<Order[]>([])
const loading = ref(true)
const selectedOrderId = ref<string | null>(null)
const filterStatus = ref('all')

const statusColors: Record<string, string> = {
  'Chờ xác nhận': '#f5a524',
  'Đã thanh toán': '#23b987',
  'Đang xử lý': '#3b82f6',
  'Đã gửi': '#9333ea',
  'Hoàn thành': '#10b981',
  'Hủy': '#ef4444',
}

const statusLabels: Record<string, string> = {
  'Chờ xác nhận': 'Pending',
  'Đã thanh toán': 'Paid',
  'Đang xử lý': 'Processing',
  'Đã gửi': 'Shipped',
  'Hoàn thành': 'Completed',
  'Hủy': 'Cancelled',
}

function loadOrders() {
  loading.value = true
  try {
    const stored = localStorage.getItem('orders')
    if (stored) {
      const allOrders = JSON.parse(stored) as Order[]
      orders.value = allOrders.reverse() // Show newest first
    }
  } catch (error) {
    console.error('Error loading orders:', error)
  } finally {
    loading.value = false
  }
}

const filteredOrders = computed(() => {
  if (filterStatus.value === 'all') {
    return orders.value
  }
  return orders.value.filter(o => o.status === filterStatus.value)
})

const selectedOrder = computed(() => {
  return orders.value.find(o => o.id === selectedOrderId.value)
})

const totalOrders = computed(() => orders.value.length)
const totalRevenue = computed(() => {
  return orders.value.reduce((sum, order) => sum + order.total, 0)
})

const statusStats = computed(() => {
  const stats: Record<string, number> = {}
  orders.value.forEach(order => {
    stats[order.status] = (stats[order.status] || 0) + 1
  })
  return stats
})

function toggleOrderSelect(orderId: string) {
  selectedOrderId.value = selectedOrderId.value === orderId ? null : orderId
}

function updateOrderStatus(orderId: string, newStatus: string) {
  const order = orders.value.find(o => o.id === orderId)
  if (order) {
    order.status = newStatus
    // Update localStorage
    localStorage.setItem('orders', JSON.stringify(orders.value))
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('vi-VN')
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="orders-view">
    <div class="view-header">
      <div>
        <h2>Quản lý đơn hàng</h2>
        <p>Xem và quản lý tất cả đơn hàng của khách hàng</p>
      </div>
    </div>

    <!-- Statistics -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ totalOrders }}</div>
        <div class="stat-label">Tổng đơn hàng</div>
        <div class="stat-note">Tất cả trạng thái</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatCurrency(totalRevenue) }}</div>
        <div class="stat-label">Tổng doanh thu</div>
        <div class="stat-note">Từ tất cả đơn hàng</div>
      </div>
      <div v-for="(count, status) in statusStats" :key="status" class="stat-card">
        <div class="stat-value">{{ count }}</div>
        <div class="stat-label">{{ status }}</div>
        <div class="stat-note">{{ statusLabels[status] }}</div>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-section">
      <label>Lọc theo trạng thái:</label>
      <select v-model="filterStatus">
        <option value="all">Tất cả</option>
        <option value="Chờ xác nhận">Chờ xác nhận</option>
        <option value="Đã thanh toán">Đã thanh toán</option>
        <option value="Đang xử lý">Đang xử lý</option>
        <option value="Đã gửi">Đã gửi</option>
        <option value="Hoàn thành">Hoàn thành</option>
        <option value="Hủy">Hủy</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading">
      Đang tải đơn hàng...
    </div>

    <!-- Orders Table -->
    <div v-else-if="filteredOrders.length > 0" class="orders-table">
      <table>
        <thead>
          <tr>
            <th>Mã đơn hàng</th>
            <th>Thời gian</th>
            <th>Sản phẩm</th>
            <th>Tổng tiền</th>
            <th>Phương thức thanh toán</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in filteredOrders" :key="order.id">
            <td>
              <strong>{{ order.id }}</strong>
            </td>
            <td>{{ formatDate(order.createdAt) }}</td>
            <td>{{ order.items.length }} sản phẩm</td>
            <td>
              <strong>{{ formatCurrency(order.total) }}</strong>
            </td>
            <td>
              <span v-if="order.paymentMethod === 'cash'">💵 COD</span>
              <span v-else>💳 Online</span>
            </td>
            <td>
              <select
                :value="order.status"
                @change="updateOrderStatus(order.id, ($event.target as HTMLSelectElement).value)"
                class="status-select"
                :style="{ borderColor: statusColors[order.status] }"
              >
                <option value="Chờ xác nhận">Chờ xác nhận</option>
                <option value="Đã thanh toán">Đã thanh toán</option>
                <option value="Đang xử lý">Đang xử lý</option>
                <option value="Đã gửi">Đã gửi</option>
                <option value="Hoàn thành">Hoàn thành</option>
                <option value="Hủy">Hủy</option>
              </select>
            </td>
            <td>
              <button
                @click="toggleOrderSelect(order.id)"
                class="btn-details"
              >
                {{ selectedOrderId === order.id ? '▼' : '▶' }}
              </button>
            </td>
          </tr>
          <!-- Order Details Row -->
          <tr v-if="selectedOrderId && selectedOrder" class="details-row">
            <td colspan="7">
              <div class="order-details">
                <div class="details-section">
                  <h4>Chi tiết sản phẩm</h4>
                  <table class="details-table">
                    <thead>
                      <tr>
                        <th>Tên sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in selectedOrder.items" :key="item.id">
                        <td>{{ item.name }}</td>
                        <td>{{ item.quantity }}</td>
                        <td>{{ formatCurrency(item.price) }}</td>
                        <td><strong>{{ formatCurrency(item.price * item.quantity) }}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="details-section">
                  <h4>Thông tin đơn hàng</h4>
                  <div class="info-grid">
                    <div>
                      <span class="label">Mã đơn:</span>
                      <span>{{ selectedOrder.id }}</span>
                    </div>
                    <div>
                      <span class="label">Thời gian:</span>
                      <span>{{ formatDate(selectedOrder.createdAt) }}</span>
                    </div>
                    <div>
                      <span class="label">Phương thức:</span>
                      <span v-if="selectedOrder.paymentMethod === 'cash'">💵 Thanh toán khi giao (COD)</span>
                      <span v-else>💳 Thanh toán trực tuyến</span>
                    </div>
                    <div>
                      <span class="label">Tổng tiền:</span>
                      <strong>{{ formatCurrency(selectedOrder.total) }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p>📭 Không có đơn hàng</p>
    </div>
  </div>
</template>

<style scoped>
.orders-view {
  padding: 30px;
  max-width: 1400px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.view-header h2 {
  font-size: 28px;
  margin: 0;
  color: #333;
}

.view-header p {
  margin: 5px 0 0 0;
  color: #666;
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.stat-note {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.filter-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-section label {
  font-weight: 600;
  color: #333;
}

.filter-section select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.orders-table {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.orders-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.orders-table thead {
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.orders-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #333;
}

.orders-table tbody tr {
  border-bottom: 1px solid #e0e0e0;
}

.orders-table tbody tr:hover {
  background: #f8f9fa;
}

.orders-table td {
  padding: 16px;
  color: #333;
}

.orders-table strong {
  color: #667eea;
}

.status-select {
  padding: 6px 8px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.status-select:hover {
  border-color: #667eea;
}

.btn-details {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
}

.details-row {
  background: #f8f9fa;
}

.details-row td {
  padding: 0;
}

.order-details {
  padding: 20px;
  background: white;
  margin: 8px;
  border-radius: 6px;
}

.details-section {
  margin-bottom: 20px;
}

.details-section h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 16px;
}

.details-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.details-table th,
.details-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.details-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-grid > div {
  display: flex;
  flex-direction: column;
}

.info-grid .label {
  font-weight: 600;
  color: #666;
  font-size: 12px;
}

.info-grid span {
  color: #333;
  margin-top: 4px;
}

.empty-state {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 60px;
  text-align: center;
  color: #999;
  font-size: 18px;
}
</style>
