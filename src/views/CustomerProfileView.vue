<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, getMyPurchases, getOrderStatusLabel, type Order } from '../services/orderApi'
import { getMyProfile, type UserDto } from '../services/userApi'
import { useLanguage } from '../services/i18n'

const auth = useAuthStore()
const profile = ref<UserDto | null>(auth.user)
const orders = ref<Order[]>([])
const loading = ref(true)
const error = ref('')
const { t } = useLanguage()

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
    error.value = exception instanceof Error ? exception.message : t('Không thể tải hồ sơ khách hàng.', 'Unable to load customer profile.')
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
        <span class="eyebrow">{{ t('KHÁCH HÀNG', 'CUSTOMER') }}</span>
        <h2>{{ t('Hồ sơ và hạng thành viên', 'Profile & Membership Tier') }}</h2>
      </div>
      <button type="button" @click="load">{{ t('Làm mới', 'Refresh') }}</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="loading">{{ t('Đang tải dữ liệu...', 'Loading data...') }}</p>

    <div v-else class="profile-grid">
      <article class="metric-card">
        <small>{{ t('Khách hàng', 'Customer') }}</small>
        <strong>{{ profile?.fullName }}</strong>
        <span>{{ profile?.email }}</span>
      </article>
      <article class="metric-card">
        <small>{{ t('Hạng thành viên', 'Membership Tier') }}</small>
        <strong>{{ profile?.customerTierLabel || t('Thành viên thường', 'Standard Member') }}</strong>
        <span>{{ profile?.paidOrderCount ?? paidOrders.length }} {{ t('đơn đã thanh toán', 'paid orders') }}</span>
      </article>
      <article class="metric-card">
        <small>{{ t('Tổng lịch sử mua', 'Total Purchase History') }}</small>
        <strong>{{ orders.length }}</strong>
        <span>{{ t('Chỉ tính hạng dựa trên đơn đã thanh toán', 'Only counting rank based on paid orders') }}</span>
      </article>
    </div>

    <div class="table-card">
      <h3>{{ t('Lịch sử đơn hàng', 'Order History') }}</h3>
      <table>
        <thead>
          <tr>
            <th>{{ t('Mã đơn', 'Order ID') }}</th>
            <th>{{ t('Ngày tạo', 'Created Date') }}</th>
            <th>{{ t('Trạng thái', 'Status') }}</th>
            <th>{{ t('Sản phẩm', 'Products') }}</th>
            <th>{{ t('Tổng tiền', 'Total Amount') }}</th>
            <th>{{ t('Giảm giá', 'Discount') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>#{{ order.id }}</td>
            <td>{{ new Date(order.createdAt).toLocaleDateString('vi-VN') }}</td>
            <td><span :class="['status-badge', order.status.toLowerCase()]">{{ getOrderStatusLabel(order.status) }}</span></td>
            <td>{{ order.orderItems.map((item) => `${item.productName} x${item.quantity}`).join(', ') }}</td>
            <td>{{ formatCurrency(order.total) }}</td>
            <td>{{ formatCurrency(order.discountAmount) }}</td>
          </tr>
          <tr v-if="!orders.length">
            <td colspan="6">{{ t('Chưa có đơn hàng.', 'No orders yet.') }}</td>
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
