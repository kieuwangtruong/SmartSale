<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface OrderItem {
  name: string
  price: number
  quantity: number
}

interface Order {
  id: string
  customerEmail: string
  customerName: string
  items: OrderItem[]
  total: number
  status: 'Chờ xác nhận' | 'Đang xử lý' | 'Đã giao' | 'Đã hủy'
  date: string
  paymentMethod: 'COD' | 'Online'
}

const orders = ref<Order[]>([])
const filterStatus = ref('Tất cả')
const searchQuery = ref('')
const expandedOrderId = ref<string | null>(null)

const statusOptions = ['Tất cả', 'Chờ xác nhận', 'Đang xử lý', 'Đã giao', 'Đã hủy']

const statusColors: Record<string, string> = {
  'Chờ xác nhận': '#f59e0b',
  'Đang xử lý': '#3b82f6',
  'Đã giao': '#10b981',
  'Đã hủy': '#ef4444',
}

onMounted(() => {
  loadOrders()
})

function loadOrders() {
  const ordersData = localStorage.getItem('orders')
  if (ordersData) {
    const parsed = JSON.parse(ordersData)
    orders.value = parsed.map((order: any) => ({
      id: order.id,
      customerEmail: 'user@gmail.com',
      customerName: 'Khách hàng',
      items: order.items,
      total: order.total,
      status: order.status || 'Chờ xác nhận',
      date: new Date(order.date).toLocaleString('vi-VN'),
      paymentMethod: order.paymentMethod || 'COD',
    }))
  }
}

const filteredOrders = computed(() => {
  return orders.value
    .filter((order) => {
      const matchesStatus = filterStatus.value === 'Tất cả' || order.status === filterStatus.value
      const matchesSearch =
        order.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchQuery.value.toLowerCase())
      return matchesStatus && matchesSearch
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const stats = computed(() => {
  return {
    total: orders.value.length,
    pending: orders.value.filter((o) => o.status === 'Chờ xác nhận').length,
    processing: orders.value.filter((o) => o.status === 'Đang xử lý').length,
    completed: orders.value.filter((o) => o.status === 'Đã giao').length,
    revenue: orders.value
      .filter((o) => o.status !== 'Đã hủy')
      .reduce((sum, o) => sum + o.total, 0),
  }
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

function toggleExpand(orderId: string) {
  expandedOrderId.value = expandedOrderId.value === orderId ? null : orderId
}

function updateOrderStatus(orderId: string, newStatus: string) {
  const orderIndex = orders.value.findIndex((o) => o.id === orderId)
  if (orderIndex !== -1) {
    orders.value[orderIndex].status = newStatus as Order['status']
    saveOrdersToLocalStorage()
  }
}

function saveOrdersToLocalStorage() {
  const ordersData = orders.value.map((order) => ({
    id: order.id,
    items: order.items,
    total: order.total,
    status: order.status,
    date: order.date,
    paymentMethod: order.paymentMethod,
  }))
  localStorage.setItem('orders', JSON.stringify(ordersData))
}

function cancelOrder(orderId: string) {
  if (confirm('Bạn chắc chắn muốn hủy đơn hàng này?')) {
    updateOrderStatus(orderId, 'Đã hủy')
  }
}
</script>

<template>
  <div class="sales-container">
    <div class="header">
      <h1>🛍️ Quản lý đơn hàng</h1>
      <p>Quản lý và xử lý đơn hàng từ khách hàng</p>
    </div>

    <!-- Statistics -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Tổng đơn hàng</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Chờ xác nhận</div>
        <div class="stat-value" style="color: #f59e0b">{{ stats.pending }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Đang xử lý</div>
        <div class="stat-value" style="color: #3b82f6">{{ stats.processing }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Đã giao</div>
        <div class="stat-value" style="color: #10b981">{{ stats.completed }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Doanh thu</div>
        <div class="stat-value small">{{ formatCurrency(stats.revenue) }}</div>
      </div>
    </div>

    <!-- Filter Controls -->
    <div class="controls">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="🔍 Tìm kiếm đơn hàng hoặc khách hàng..."
        />
      </div>
      <select v-model="filterStatus" class="status-filter">
        <option v-for="status in statusOptions" :key="status" :value="status">
          {{ status }}
        </option>
      </select>
    </div>

    <!-- Orders List -->
    <div v-if="filteredOrders.length === 0" class="no-data">
      📭 Không có đơn hàng nào phù hợp với điều kiện tìm kiếm
    </div>

    <div v-else class="orders-list">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        :class="{ expanded: expandedOrderId === order.id }"
      >
        <div class="order-header" @click="toggleExpand(order.id)">
          <div class="order-info">
            <h3>{{ order.id }}</h3>
            <p>{{ order.date }}</p>
          </div>
          <div class="order-summary">
            <span class="status-badge" :style="{ background: statusColors[order.status] }">
              {{ order.status }}
            </span>
            <span class="total">{{ formatCurrency(order.total) }}</span>
            <span class="toggle">{{ expandedOrderId === order.id ? '▼' : '▶' }}</span>
          </div>
        </div>

        <div v-if="expandedOrderId === order.id" class="order-details">
          <div class="detail-section">
            <h4>Thông tin khách hàng</h4>
            <p><strong>Tên:</strong> {{ order.customerName }}</p>
            <p><strong>Email:</strong> {{ order.customerEmail }}</p>
            <p><strong>Phương thức thanh toán:</strong> {{ order.paymentMethod }}</p>
          </div>

          <div class="detail-section">
            <h4>Danh sách sản phẩm</h4>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th>Số lượng</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in order.items" :key="index">
                  <td>{{ item.name }}</td>
                  <td>{{ formatCurrency(item.price) }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ formatCurrency(item.price * item.quantity) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="detail-section">
            <h4>Cập nhật trạng thái</h4>
            <div class="status-controls">
              <select
                :value="order.status"
                @change="(e) => updateOrderStatus(order.id, (e.target as HTMLSelectElement).value)"
                class="status-select"
              >
                <option v-for="status in statusOptions.slice(1)" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
              <button
                @click="cancelOrder(order.id)"
                :disabled="order.status === 'Đã hủy' || order.status === 'Đã giao'"
                class="btn-cancel"
              >
                ❌ Hủy đơn
              </button>
            </div>
          </div>

          <div class="order-total">
            <span>Tổng tiền:</span>
            <strong>{{ formatCurrency(order.total) }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sales-container {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.header {
  margin-bottom: 30px;
  color: white;
}

.header h1 {
  font-size: 2rem;
  margin: 0 0 5px 0;
}

.header p {
  margin: 0;
  opacity: 0.9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.stat-label {
  color: #999;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.stat-value.small {
  font-size: 1.2rem;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.search-box input {
  flex: 1;
  min-width: 250px;
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
}

.status-filter {
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
}

.no-data {
  background: white;
  padding: 40px;
  text-align: center;
  border-radius: 10px;
  font-size: 1.1rem;
  color: #999;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.order-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: 0.3s;
}

.order-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.order-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: #f9f9f9;
  border-bottom: 1px solid #eee;
}

.order-info h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.order-info p {
  margin: 5px 0 0 0;
  color: #999;
  font-size: 0.9rem;
}

.order-summary {
  display: flex;
  align-items: center;
  gap: 15px;
}

.status-badge {
  padding: 8px 15px;
  border-radius: 20px;
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
}

.total {
  font-weight: bold;
  color: #667eea;
  min-width: 120px;
  text-align: right;
}

.toggle {
  color: #999;
  font-size: 0.8rem;
  min-width: 20px;
}

.order-details {
  padding: 20px;
  background: white;
  border-top: 1px solid #eee;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 1rem;
}

.detail-section p {
  margin: 5px 0;
  color: #666;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
}

.items-table thead {
  background: #f5f5f5;
}

.items-table th,
.items-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.items-table th {
  font-weight: bold;
  color: #333;
}

.status-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.status-select {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
}

.status-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
}

.btn-cancel {
  padding: 10px 15px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: 0.3s;
}

.btn-cancel:hover:not(:disabled) {
  background: #dc2626;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.order-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 5px;
  margin-top: 15px;
  border-top: 2px solid #eee;
}

.order-total strong {
  font-size: 1.3rem;
  color: #667eea;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
  }

  .search-box input,
  .status-filter {
    width: 100%;
  }

  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .order-summary {
    width: 100%;
    justify-content: space-between;
  }

  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }

  .status-controls {
    flex-direction: column;
  }
}
</style>
