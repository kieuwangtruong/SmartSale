<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { formatCurrency } from '../services/productApi'

const router = useRouter()

const user = ref<any>(null)
const searchQuery = ref('')
const selectedOrderId = ref<number | null>(null)
const loading = ref(true)

// Mock data
const mockOrders = [
  {
    id: 1,
    customerName: 'Nguyễn Văn A',
    productName: 'Laptop Dell XPS 13',
    quantity: 2,
    price: 25000000,
    total: 50000000,
    status: 'Completed',
    date: '2026-06-12',
  },
  {
    id: 2,
    customerName: 'Trần Thị B',
    productName: 'iPhone 15 Pro Max',
    quantity: 1,
    price: 35000000,
    total: 35000000,
    status: 'Processing',
    date: '2026-06-11',
  },
  {
    id: 3,
    customerName: 'Lê Minh C',
    productName: 'Samsung Galaxy S24 Ultra',
    quantity: 3,
    price: 28000000,
    total: 84000000,
    status: 'Pending',
    date: '2026-06-10',
  },
  {
    id: 4,
    customerName: 'Phạm Huy D',
    productName: 'Sony WH-1000XM5',
    quantity: 5,
    price: 8500000,
    total: 42500000,
    status: 'Completed',
    date: '2026-06-09',
  },
]

const mockProducts = [
  {
    id: 1,
    name: 'Laptop Dell XPS 13',
    price: 25000000,
    stock: 5,
    category: 'Điện tử',
  },
  {
    id: 2,
    name: 'iPhone 15 Pro Max',
    price: 35000000,
    stock: 8,
    category: 'Điện thoại',
  },
  {
    id: 3,
    name: 'Samsung Galaxy S24 Ultra',
    price: 28000000,
    stock: 3,
    category: 'Điện thoại',
  },
  {
    id: 4,
    name: 'Sony WH-1000XM5',
    price: 8500000,
    stock: 15,
    category: 'Audio',
  },
  {
    id: 5,
    name: 'iPad Air 11-inch',
    price: 18500000,
    stock: 7,
    category: 'Máy tính bảng',
  },
]

const filteredOrders = computed(() => {
  if (!searchQuery.value) {
    return mockOrders
  }
  const query = searchQuery.value.toLowerCase()
  return mockOrders.filter((order) =>
    order.customerName.toLowerCase().includes(query) ||
    order.productName.toLowerCase().includes(query) ||
    order.id.toString().includes(query),
  )
})

const selectedOrder = computed(() =>
  mockOrders.find((order) => order.id === selectedOrderId.value),
)

const stats = computed(() => [
  {
    label: 'Tổng đơn hàng',
    value: mockOrders.length.toString(),
    note: 'Tất cả đơn',
  },
  {
    label: 'Đã hoàn thành',
    value: mockOrders.filter((o) => o.status === 'Completed').length.toString(),
    note: 'Thành công',
  },
  {
    label: 'Đang xử lý',
    value: mockOrders.filter((o) => o.status === 'Processing').length.toString(),
    note: 'Chờ giao',
  },
  {
    label: 'Doanh thu',
    value: formatCurrency(mockOrders.reduce((sum, o) => sum + o.total, 0)),
    note: 'Tổng cộng',
  },
])

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'Completed': '#23b987',
    'Processing': '#4f8cff',
    'Pending': '#f5a524',
  }
  return colors[status] || '#8a96a8'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'Completed': 'Đã hoàn thành',
    'Processing': 'Đang xử lý',
    'Pending': 'Chờ xử lý',
  }
  return labels[status] || status
}

function handleLogout() {
  localStorage.removeItem('user')
  localStorage.removeItem('isAuthenticated')
  router.push('/login')
}

onMounted(() => {
  const userData = localStorage.getItem('user')
  if (userData) {
    user.value = JSON.parse(userData)
  }
  loading.value = false
})
</script>

<template>
  <div class="sales-ui">
    <!-- Header -->
    <header class="sales-header">
      <div class="header-left">
        <h1>📊 Giao diện bán hàng</h1>
        <p v-if="user">Xin chào, {{ user.fullName }}</p>
      </div>
      <div class="header-right">
        <button class="logout-button" @click="handleLogout">Đăng xuất</button>
      </div>
    </header>

    <!-- Stats -->
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-note">{{ stat.note }}</div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-container">
      <!-- Left: Orders -->
      <section class="orders-section">
        <div class="section-header">
          <h2>Đơn hàng gần đây</h2>
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Tìm kiếm đơn hàng..."
          />
        </div>

        <div class="orders-list">
          <div
            v-if="filteredOrders.length === 0"
            class="empty-state"
          >
            Không có đơn hàng nào
          </div>

          <div
            v-for="order in filteredOrders"
            :key="order.id"
            class="order-item"
            :class="{ active: selectedOrderId === order.id }"
            @click="selectedOrderId = order.id"
          >
            <div class="order-id">#{{ order.id }}</div>
            <div class="order-info">
              <div class="customer">{{ order.customerName }}</div>
              <div class="product">{{ order.productName }}</div>
              <div class="date">{{ order.date }}</div>
            </div>
            <div class="order-total">{{ formatCurrency(order.total) }}</div>
            <div
              class="order-status"
              :style="{ backgroundColor: getStatusColor(order.status) }"
            >
              {{ getStatusLabel(order.status) }}
            </div>
          </div>
        </div>
      </section>

      <!-- Right: Details & Products -->
      <section class="details-section">
        <!-- Order Details -->
        <div class="details-card">
          <h3>Chi tiết đơn hàng</h3>
          <div v-if="selectedOrder" class="order-details">
            <div class="detail-row">
              <span>Mã đơn:</span>
              <strong>#{{ selectedOrder.id }}</strong>
            </div>
            <div class="detail-row">
              <span>Khách hàng:</span>
              <strong>{{ selectedOrder.customerName }}</strong>
            </div>
            <div class="detail-row">
              <span>Sản phẩm:</span>
              <strong>{{ selectedOrder.productName }}</strong>
            </div>
            <div class="detail-row">
              <span>Số lượng:</span>
              <strong>{{ selectedOrder.quantity }} cái</strong>
            </div>
            <div class="detail-row">
              <span>Giá:</span>
              <strong>{{ formatCurrency(selectedOrder.price) }}/cái</strong>
            </div>
            <div class="detail-row total">
              <span>Tổng tiền:</span>
              <strong>{{ formatCurrency(selectedOrder.total) }}</strong>
            </div>
            <div class="detail-row">
              <span>Trạng thái:</span>
              <span
                class="status-badge"
                :style="{ backgroundColor: getStatusColor(selectedOrder.status) }"
              >
                {{ getStatusLabel(selectedOrder.status) }}
              </span>
            </div>
            <div class="detail-row">
              <span>Ngày:</span>
              <strong>{{ selectedOrder.date }}</strong>
            </div>
          </div>
          <div v-else class="empty-state">
            Chọn một đơn hàng để xem chi tiết
          </div>
        </div>

        <!-- Products -->
        <div class="products-card">
          <h3>Sản phẩm có sẵn</h3>
          <div class="products-grid">
            <div v-for="product in mockProducts" :key="product.id" class="product-card">
              <div class="product-name">{{ product.name }}</div>
              <div class="product-category">{{ product.category }}</div>
              <div class="product-price">{{ formatCurrency(product.price) }}</div>
              <div class="product-stock" :style="{ color: product.stock < 5 ? '#e53e3e' : '#22543d' }">
                Tồn: {{ product.stock }}
              </div>
              <button class="add-button">Thêm vào đơn</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sales-ui {
  background: #f7fafc;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
}

.sales-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left h1 {
  margin: 0;
  font-size: 24px;
  color: #1a202c;
}

.header-left p {
  margin: 4px 0 0 0;
  color: #718096;
  font-size: 14px;
}

.logout-button {
  padding: 10px 20px;
  background: #e53e3e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.logout-button:hover {
  background: #c53030;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 20px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-size: 12px;
  color: #718096;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 4px;
}

.stat-note {
  font-size: 12px;
  color: #a0aec0;
}

.main-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  color: #1a202c;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  width: 250px;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.orders-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-height: 500px;
  overflow-y: auto;
}

.order-item {
  display: grid;
  grid-template-columns: 60px 1fr 140px 110px;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  cursor: pointer;
  transition: background 0.2s;
}

.order-item:hover {
  background: #f7fafc;
}

.order-item.active {
  background: #edf2f7;
}

.order-id {
  font-weight: 600;
  color: #667eea;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer {
  font-weight: 600;
  color: #1a202c;
  font-size: 14px;
}

.product {
  color: #718096;
  font-size: 13px;
}

.date {
  color: #a0aec0;
  font-size: 12px;
}

.order-total {
  font-weight: 600;
  color: #1a202c;
}

.order-status {
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #a0aec0;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.details-card,
.products-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.details-card h3,
.products-card h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1a202c;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.detail-row.total {
  background: #f7fafc;
  padding: 12px 8px;
  border-bottom: none;
  border-radius: 4px;
  font-size: 16px;
}

.detail-row span:first-child {
  color: #718096;
  font-size: 14px;
}

.detail-row strong {
  color: #1a202c;
}

.status-badge {
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.product-card {
  background: #f7fafc;
  padding: 12px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.product-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.product-name {
  font-weight: 600;
  color: #1a202c;
  font-size: 13px;
}

.product-category {
  font-size: 12px;
  color: #718096;
}

.product-price {
  font-weight: 700;
  color: #667eea;
  font-size: 14px;
}

.product-stock {
  font-size: 12px;
  font-weight: 600;
}

.add-button {
  padding: 6px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.add-button:hover {
  background: #764ba2;
}

@media (max-width: 1024px) {
  .main-container {
    grid-template-columns: 1fr;
  }
}
</style>
