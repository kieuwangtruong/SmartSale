<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

interface Order {
  id: string
  items: Array<{ id: string; name: string; quantity: number; price: number }>
  total: number
  paymentMethod: 'cash' | 'online'
  status: string
  createdAt: string
}

interface User {
  email: string
  role: string
  fullName: string
}

const router = useRouter()
const orders = ref<Order[]>([])
const selectedOrder = ref<Order | null>(null)
const currentUser = ref<User | null>(null)
const showUserMenu = ref(false)

const statusColors: Record<string, string> = {
  'Chờ xác nhận': '#f5a524',
  'Đã xác nhận': '#4f8cff',
  'Đang giao': '#667eea',
  'Đã giao': '#23b987',
  'Hủy đơn': '#e74c3c',
  'Đã thanh toán': '#23b987',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

function loadOrders() {
  const storedOrders = localStorage.getItem('orders')
  if (storedOrders) {
    orders.value = JSON.parse(storedOrders).reverse()
  }
}

function selectOrder(order: Order) {
  selectedOrder.value = selectedOrder.value?.id === order.id ? null : order
}

function getPaymentLabel(method: string): string {
  return method === 'cash' ? 'Thanh toán khi giao' : 'Thanh toán trực tuyến'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleViewHome() {
  router.push('/user/home')
}

function handleViewCart() {
  router.push('/user/cart')
}

function handleLogout() {
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('user')
  router.push('/')
}

onMounted(() => {
  const user = localStorage.getItem('user')
  if (user) {
    currentUser.value = JSON.parse(user)
  }
  loadOrders()
})
</script>

<template>
  <div class="orders-wrapper">
    <!-- Header -->
    <header class="header">
      <div class="header-top">
        <div class="logo-section">
          <h1 class="logo">🛍️ SHOP</h1>
          <span class="tagline">Cửa hàng online</span>
        </div>

        <div class="page-title">
          📦 Đơn hàng của tôi
        </div>

        <div class="header-actions">
          <button @click="handleViewCart" class="cart-btn">🛒 Giỏ hàng</button>
          <div class="user-menu-wrapper">
            <button @click="showUserMenu = !showUserMenu" class="user-btn">
              👤 {{ currentUser?.fullName || 'Người dùng' }}
            </button>
            <div v-if="showUserMenu" class="user-dropdown">
              <a href="#" @click.prevent="handleViewHome" class="dropdown-item">Trang chủ</a>
              <a href="#" @click.prevent="handleViewCart" class="dropdown-item">Giỏ hàng</a>
              <a href="#" @click.prevent="handleLogout" class="dropdown-item logout">Đăng xuất</a>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div v-if="orders.length === 0" class="empty-orders">
        <p class="empty-icon">📦</p>
        <p class="empty-text">Bạn chưa có đơn hàng nào</p>
        <router-link to="/user/home" class="btn-shop">
          Bắt đầu mua sắm
        </router-link>
      </div>

      <div v-else class="orders-list">
        <div v-for="order in orders" :key="order.id" class="order-card">
          <div class="order-header" @click="selectOrder(order)">
            <div class="order-info">
              <span class="order-id">{{ order.id }}</span>
              <span class="order-date">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div class="order-status" :style="{ color: statusColors[order.status] }">
              {{ order.status }}
            </div>
            <div class="order-total">
              {{ formatCurrency(order.total) }}
            </div>
            <span class="expand-icon">{{ selectedOrder?.id === order.id ? '▼' : '▶' }}</span>
          </div>

          <div v-if="selectedOrder?.id === order.id" class="order-details">
            <div class="details-section">
              <h4>Thông tin sản phẩm</h4>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in order.items" :key="item.id">
                    <td>{{ item.name }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ formatCurrency(item.price) }}</td>
                    <td>{{ formatCurrency(item.price * item.quantity) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="details-section">
              <h4>Thông tin đơn hàng</h4>
              <div class="info-grid">
                <div class="info-row">
                  <span class="info-label">Mã đơn hàng:</span>
                  <span class="info-value">{{ order.id }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Trạng thái:</span>
                  <span class="info-value" :style="{ color: statusColors[order.status] }">
                    {{ order.status }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phương thức thanh toán:</span>
                  <span class="info-value">{{ getPaymentLabel(order.paymentMethod) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Ngày đặt:</span>
                  <span class="info-value">{{ formatDate(order.createdAt) }}</span>
                </div>
              </div>
            </div>

            <div class="details-footer">
              <div class="total-summary">
                <span>Tổng tiền:</span>
                <strong>{{ formatCurrency(order.total) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.orders-wrapper {
  background: #f5f5f5;
  min-height: 100vh;
}

/* Header */
.header {
  background: linear-gradient(135deg, #ffd000 0%, #ffb800 100%);
  padding: 15px 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1a1a1a;
  margin: 0;
  white-space: nowrap;
}

.tagline {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
}

.page-title {
  flex: 1;
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: #1a1a1a;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.cart-btn {
  padding: 10px 16px;
  background: white;
  color: #1a1a1a;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.cart-btn:hover {
  background: #f0f0f0;
}

.user-menu-wrapper {
  position: relative;
}

.user-btn {
  padding: 10px 16px;
  background: white;
  color: #1a1a1a;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.user-btn:hover {
  background: #f0f0f0;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  min-width: 150px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  margin-top: 5px;
}

.dropdown-item {
  display: block;
  padding: 12px 16px;
  color: #333;
  text-decoration: none;
  border-bottom: 1px solid #eee;
  transition: background 0.3s;
  font-size: 14px;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item.logout:hover {
  background: #fee;
  color: #c00;
}

/* Main Content */
.main-content {
  padding: 30px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.empty-orders {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
  background: white;
  border-radius: 8px;
  padding: 40px;
}

.empty-icon {
  font-size: 64px;
}

.empty-text {
  font-size: 18px;
  color: #666;
  margin: 0;
}

.btn-shop {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s;
  display: inline-block;
}

.btn-shop:hover {
  opacity: 0.9;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.order-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  cursor: pointer;
  background: #fafafa;
  transition: all 0.2s;
}

.order-header:hover {
  background: #f0f0f0;
}

.order-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.order-id {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.order-date {
  font-size: 12px;
  color: #999;
}

.order-status {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  min-width: 100px;
  text-align: center;
}

.order-total {
  font-weight: 600;
  color: #d63031;
  min-width: 120px;
  text-align: right;
}

.expand-icon {
  color: #999;
  font-size: 12px;
  margin-left: 16px;
  transition: all 0.2s;
}

.order-details {
  padding: 24px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.details-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
  font-weight: 600;
  text-transform: uppercase;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.items-table thead {
  background: white;
}

.items-table th {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  color: #666;
  font-size: 12px;
}

.items-table td {
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  color: #333;
}

.items-table tr:last-child td {
  border-bottom: none;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  background: white;
  padding: 16px;
  border-radius: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: #333;
  font-weight: 600;
}

.details-footer {
  display: flex;
  justify-content: flex-end;
}

.total-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 6px;
  font-size: 14px;
}

.total-summary strong {
  font-size: 18px;
  color: #d63031;
}

@media (max-width: 768px) {
  .header-top {
    flex-direction: column;
  }

  .page-title {
    order: 2;
    margin-top: 10px;
  }

  .main-content {
    padding: 20px 15px;
  }

  .order-header {
    flex-direction: column;
    gap: 12px;
  }

  .order-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
