<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, getMyPurchases, getOrderStatusLabel, type Order } from '../services/orderApi'
import { getMyProfile, type UserDto } from '../services/userApi'

const auth = useAuthStore()
const profile = ref<UserDto | null>(auth.user)
const orders = ref<Order[]>([])
const loading = ref(true)
const error = ref('')

const paidOrders = computed(() =>
  orders.value.filter((order) => ['Paid', 'Processing', 'Shipped', 'Completed'].includes(order.status)),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [me, history] = await Promise.all([getMyProfile(), getMyPurchases()])
    profile.value = me
    orders.value = history
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Không thể tải hồ sơ khách hàng.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="page-card">
    <div class="page-heading">
      <div>
        <span class="eyebrow">CUSTOMER</span>
        <h2>Hồ sơ và hạng thành viên</h2>
      </div>
      <button type="button" @click="load">Làm mới</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading">Đang tải dữ liệu...</p>

    <div v-else class="profile-grid">
      <article class="metric-card">
        <small>Khách hàng</small>
        <strong>{{ profile?.fullName }}</strong>
        <span>{{ profile?.email }}</span>
      </article>
      <article class="metric-card">
        <small>Hạng thành viên</small>
        <strong>{{ profile?.customerTierLabel || 'Thành viên thường' }}</strong>
        <span>{{ profile?.paidOrderCount ?? paidOrders.length }} don da thanh toan</span>
      </article>
      <article class="metric-card">
        <small>Tổng lịch sử mua</small>
        <strong>{{ orders.length }}</strong>
        <span>Chi tinh hang dua tren don da thanh toan</span>
      </article>
    </div>

    <div class="table-card">
      <h3>Lịch sử đơn hàng</h3>
      <table>
        <thead>
          <tr>
            <th>Ma don</th>
            <th>Ngay tao</th>
            <th>Trang thai</th>
            <th>Sản phẩm</th>
            <th>Tổng tiền</th>
            <th>Giam gia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>#{{ order.id }}</td>
            <td>{{ new Date(order.createdAt).toLocaleDateString('vi-VN') }}</td>
            <td>{{ getOrderStatusLabel(order.status) }}</td>
            <td>{{ order.orderItems.map((item) => `${item.productName} x${item.quantity}`).join(', ') }}</td>
            <td>{{ formatCurrency(order.total) }}</td>
            <td>{{ formatCurrency(order.discountAmount) }}</td>
          </tr>
          <tr v-if="!orders.length">
            <td colspan="6">Chưa có đơn hàng.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.page-card, .table-card { background: white; border-radius: 18px; padding: 24px; box-shadow: 0 18px 50px rgb(15 23 42 / 8%); }
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.eyebrow { color: #0f766e; font-size: 12px; font-weight: 800; letter-spacing: .12em; }
h2, h3 { margin: 0; color: #0f172a; }
button { border: 0; border-radius: 10px; padding: 11px 16px; background: #0f766e; color: white; font-weight: 700; cursor: pointer; }
.profile-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 22px; }
.metric-card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px; display: grid; gap: 6px; }
.metric-card small { color: #64748b; font-weight: 800; text-transform: uppercase; }
.metric-card strong { font-size: 24px; color: #0f172a; }
.metric-card span, .error { color: #64748b; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
th { color: #475569; font-size: 12px; text-transform: uppercase; }
@media (max-width: 900px) { .profile-grid { grid-template-columns: 1fr; } }
</style>
