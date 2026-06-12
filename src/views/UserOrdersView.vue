<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatCurrency } from '../services/productApi'

interface Order {
  id: string
  items: Array<{ id: string; name: string; quantity: number; price: number }>
  total: number
  paymentMethod: 'cash' | 'online'
  status: string
  createdAt: string
}

const orders = ref<Order[]>([])
const selectedOrder = ref<Order | null>(null)

const statusColors: Record<string, string> = {
  'Chờ xác nhận': '#f5a524',
  'Đã xác nhận': '#4f8cff',
  'Đang giao': '#667eea',
  'Đã giao': '#23b987',
  'Hủy đơn': '#e74c3c',
  'Đã thanh toán': '#23b987',
}

function loadOrders() {
  const storedOrders = localStorage.getItem('orders')
  if (storedOrders) {
    orders.value = JSON.parse(storedOrders).reverse() // Show newest first
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

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <div class="orders-view">
    <div class="orders-header">
      <h2>Đơn hàng của bạn</h2>
      <p class="orders-count">Tổng: {{ orders.length }} đơn hàng</p>
    </div>

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
  </div>
</template>

<style scoped>
.orders-view {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

.orders-header {
  margin-bottom: 24px;
}

.orders-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #333;
}

.orders-count {
  margin: 0;
  font-size: 14px;
  color: #999;
}

.empty-orders {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
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
  color: #667eea;
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
  color: #667eea;
}

@media (max-width: 768px) {
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
