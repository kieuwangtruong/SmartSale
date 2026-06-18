<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, getMyPurchases, getOrderStatusLabel, type Order, type OrderStatus } from '../services/orderApi'
import { getMyProfile, type UserDto } from '../services/userApi'
import { useLanguage } from '../services/i18n'

interface TimelineStep {
  key: string
  label: string
  description: string
  done: boolean
  active: boolean
}

const auth = useAuthStore()
const route = useRoute()
const profile = ref<UserDto | null>(auth.user)
const orders = ref<Order[]>([])
const selectedOrderId = ref<number | null>(null)
const loading = ref(true)
const error = ref('')
const { t } = useLanguage()

const paidOrders = computed(() =>
  orders.value.filter((order) => ['Paid', 'Processing', 'Shipped', 'Completed'].includes(order.status)),
)

const selectedOrder = computed(() =>
  orders.value.find((order) => order.id === selectedOrderId.value) ?? orders.value[0] ?? null,
)

function statusRank(status: OrderStatus) {
  const ranks: Record<OrderStatus, number> = {
    Pending: 1,
    PendingPayment: 1,
    ProcessingPayment: 1,
    PaymentFailed: 1,
    PaymentCancelled: 1,
    PaymentExpired: 1,
    Paid: 2,
    Processing: 3,
    Shipped: 4,
    Completed: 5,
    Cancelled: 0,
  }
  return ranks[status] ?? 0
}

function getOrderTimeline(order: Order): TimelineStep[] {
  const cancelled = ['Cancelled', 'PaymentCancelled', 'PaymentExpired', 'PaymentFailed'].includes(order.status)
  const paidOnline = ['Paid', 'Processing', 'Shipped', 'Completed'].includes(order.status) && order.amountPaid > 0
  const rank = statusRank(order.status)

  const steps: TimelineStep[] = [
    {
      key: 'created',
      label: t('Đã đặt hàng', 'Order placed'),
      description: t('Hệ thống đã ghi nhận đơn hàng của bạn.', 'The system has received your order.'),
      done: rank >= 1,
      active: rank === 1 && !cancelled,
    },
    {
      key: 'confirmed',
      label: paidOnline ? t('Đã thanh toán', 'Paid') : t('Chờ nhân viên xác nhận', 'Waiting for staff confirmation'),
      description: paidOnline
        ? t('Đơn chuyển khoản đã thanh toán, không cần xác nhận tiền mặt.', 'Online payment is completed; no cash confirmation is needed.')
        : t('Nhân viên bán hàng sẽ gọi xác nhận đơn tiền mặt.', 'Sales staff will confirm the cash order.'),
      done: rank >= 2,
      active: rank === 2 && !cancelled,
    },
    {
      key: 'processing',
      label: t('Đang chuẩn bị hàng', 'Preparing order'),
      description: t('Cửa hàng đang đóng gói và chuẩn bị giao hàng.', 'The store is packing and preparing shipment.'),
      done: rank >= 3,
      active: rank === 3 && !cancelled,
    },
    {
      key: 'shipping',
      label: t('Đang giao hàng', 'Shipping'),
      description: t('Đơn hàng đang trên đường giao đến bạn.', 'The order is on its way to you.'),
      done: rank >= 4,
      active: rank === 4 && !cancelled,
    },
    {
      key: 'completed',
      label: t('Hoàn tất', 'Completed'),
      description: t('Đơn hàng đã hoàn tất.', 'The order is completed.'),
      done: rank >= 5,
      active: rank === 5 && !cancelled,
    },
  ]

  if (cancelled) {
    steps.push({
      key: 'cancelled',
      label: getOrderStatusLabel(order.status),
      description: t('Đơn hàng không tiếp tục xử lý ở trạng thái này.', 'The order will not continue processing in this status.'),
      done: true,
      active: true,
    })
  }

  return steps
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [me, history] = await Promise.all([getMyProfile(), getMyPurchases()])
    profile.value = me
    orders.value = history
    const queryOrder = Number(route.query.orderId)
    selectedOrderId.value = history.some((order) => order.id === queryOrder)
      ? queryOrder
      : history[0]?.id ?? null
  } catch (exception) {
    error.value = exception instanceof Error
      ? exception.message
      : t('Không thể tải hồ sơ khách hàng.', 'Unable to load customer profile.')
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

    <template v-else>
      <div class="profile-grid">
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
          <small>{{ t('Tổng đơn hàng', 'Total Orders') }}</small>
          <strong>{{ orders.length }}</strong>
          <span>{{ t('Chỉ tính hạng dựa trên đơn đã thanh toán', 'Only counting rank based on paid orders') }}</span>
        </article>
      </div>

      <div class="orders-layout">
        <div class="table-card">
          <h3>{{ t('Đơn hàng của tôi', 'My Orders') }}</h3>
          <table>
            <thead>
              <tr>
                <th>{{ t('Mã đơn', 'Order ID') }}</th>
                <th>{{ t('Ngày tạo', 'Created Date') }}</th>
                <th>{{ t('Trạng thái', 'Status') }}</th>
                <th>{{ t('Sản phẩm', 'Products') }}</th>
                <th>{{ t('Tổng tiền', 'Total Amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in orders"
                :key="order.id"
                :class="{ active: selectedOrder?.id === order.id }"
                @click="selectedOrderId = order.id"
              >
                <td>#{{ order.id }}</td>
                <td>{{ new Date(order.createdAt).toLocaleDateString('vi-VN') }}</td>
                <td><span :class="['status-badge', order.status.toLowerCase()]">{{ getOrderStatusLabel(order.status) }}</span></td>
                <td>{{ order.orderItems.map((item) => `${item.productName} x${item.quantity}`).join(', ') }}</td>
                <td>{{ formatCurrency(order.total) }}</td>
              </tr>
              <tr v-if="!orders.length">
                <td colspan="5">{{ t('Chưa có đơn hàng.', 'No orders yet.') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside v-if="selectedOrder" class="timeline-card">
          <div class="timeline-head">
            <span>{{ t('Lộ trình đơn hàng', 'Order Journey') }}</span>
            <strong>#{{ selectedOrder.id }}</strong>
            <small>{{ getOrderStatusLabel(selectedOrder.status) }}</small>
          </div>
          <div class="timeline">
            <article
              v-for="step in getOrderTimeline(selectedOrder)"
              :key="step.key"
              :class="{ done: step.done, active: step.active }"
            >
              <i :class="step.done ? 'pi pi-check' : 'pi pi-circle'" />
              <div>
                <strong>{{ step.label }}</strong>
                <p>{{ step.description }}</p>
              </div>
            </article>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.page-card,
.table-card,
.timeline-card {
  background: white;
  border-radius: 18px;
  padding: 24px;
  box-shadow: 0 18px 50px rgb(15 23 42 / 8%);
}
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.eyebrow { color: #0f766e; font-size: 12px; font-weight: 800; letter-spacing: .12em; }
h2, h3 { margin: 0; color: #0f172a; }
button { border: 0; border-radius: 10px; padding: 11px 16px; background: #0f766e; color: white; font-weight: 700; cursor: pointer; }
.profile-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 22px; }
.metric-card { border: 1px solid #e5e7eb; border-radius: 16px; padding: 18px; display: grid; gap: 6px; }
.metric-card small { color: #64748b; font-weight: 800; text-transform: uppercase; }
.metric-card strong { font-size: 24px; color: #0f172a; }
.metric-card span, .error { color: #64748b; }
.orders-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
table { width: 100%; border-collapse: collapse; margin-top: 16px; }
th, td { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
th { color: #475569; font-size: 12px; text-transform: uppercase; }
tbody tr { cursor: pointer; }
tbody tr.active { background: #f0fdfa; }
.timeline-head { display: grid; gap: 4px; margin-bottom: 18px; }
.timeline-head span { color: #0f766e; font-size: 11px; font-weight: 850; letter-spacing: .14em; text-transform: uppercase; }
.timeline-head strong { font-size: 24px; color: #0f172a; }
.timeline-head small { color: #64748b; }
.timeline { display: grid; gap: 14px; }
.timeline article { display: grid; grid-template-columns: 34px 1fr; gap: 12px; position: relative; }
.timeline article i { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: #e2e8f0; color: #64748b; }
.timeline article.done i { background: #ccfbf1; color: #0f766e; }
.timeline article.active i { background: #0f766e; color: white; box-shadow: 0 0 0 5px #ccfbf1; }
.timeline article strong { color: #0f172a; }
.timeline article p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
@media (max-width: 1000px) { .orders-layout, .profile-grid { grid-template-columns: 1fr; } }
</style>
