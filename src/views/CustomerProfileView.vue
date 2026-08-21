<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { formatCurrency, getMyPurchases, getOrderStatusLabel, getPaymentMethodLabel, type Order, type OrderStatus } from '../services/orderApi'
import { getMyProfile, type UserDto } from '../services/userApi'
import { useLanguage } from '../services/i18n'
import { getTierProgress, getTierConfig, getTierLabel, type TierProgress } from '../services/customerTier'

interface TimelineStep {
  key: string
  label: string
  description: string
  done: boolean
  active: boolean
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const profile = ref<UserDto | null>(auth.user)
const orders = ref<Order[]>([])
const selectedOrderId = ref<number | null>(null)
const loading = ref(true)
const error = ref('')

const { t, currentLanguage, setLanguage } = useLanguage()

const totalCustomerSpent = computed(() => {
  const userSpent = (profile.value?.totalSpent !== undefined && profile.value?.totalSpent > 0)
    ? profile.value.totalSpent
    : (auth.user?.totalSpent !== undefined && auth.user?.totalSpent > 0)
      ? auth.user.totalSpent
      : paidOrders.value.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  return userSpent
})

const tierProgress = computed(() => getTierProgress(totalCustomerSpent.value))
const currentTierConfig = computed(() => tierProgress.value.currentTierConfig)
const currentTierLabel = computed(() => getTierLabel(totalCustomerSpent.value, currentLanguage.value === 'en' ? 'en' : 'vi'))

// Collapsible option states
const isAccountOpen = ref(true)
const isAddressOpen = ref(false)
const isHistoryOpen = ref(false)

// History search & tabs states
const searchQuery = ref('')
const activeTab = ref<'pending' | 'paid'>('pending')

function toggleLang() {
  setLanguage(currentLanguage.value === 'vi' ? 'en' : 'vi')
}

async function logoutCustomer() {
  await auth.logout()
  void router.push('/')
}

const paidOrders = computed(() =>
  orders.value.filter((order) => ['Paid', 'Processing', 'Shipped', 'Completed'].includes(order.status)),
)

const pendingOrders = computed(() =>
  orders.value.filter((order) => !['Paid', 'Processing', 'Shipped', 'Completed'].includes(order.status)),
)

// Computed filtered orders based on active tab and search query
const filteredOrders = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  let list = activeTab.value === 'paid' ? paidOrders.value : pendingOrders.value

  if (query) {
    list = list.filter((order) => {
      const matchesId = String(order.id).toLowerCase().includes(query)
      const dateStr = new Date(order.createdAt).toLocaleDateString('vi-VN')
      const dateStrEn = new Date(order.createdAt).toLocaleDateString('en-US')
      const matchesDate = dateStr.includes(query) || dateStrEn.toLowerCase().includes(query)
      return matchesId || matchesDate
    })
  }

  return list
})

const selectedOrder = computed(() => {
  if (selectedOrderId.value !== null) {
    const found = orders.value.find((order) => order.id === selectedOrderId.value)
    if (found) return found
  }
  return filteredOrders.value[0] || null
})

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
    RefundRequested: 0,
    Refunded: 0,
    RefundRejected: 0,
  }
  return ranks[status] ?? 0
}

function getOrderTimeline(order: Order): TimelineStep[] {
  const cancelled = ['Cancelled', 'PaymentCancelled', 'PaymentExpired', 'PaymentFailed', 'RefundRequested', 'Refunded', 'RefundRejected'].includes(order.status)
  const isPayOs = (order.paymentMethod || '').toLowerCase() === 'payos'
  const rank = statusRank(order.status)
  const cashConfirmed = !isPayOs && rank >= 2 && !cancelled

  if (cancelled) {
    return [{
      key: 'cancelled',
      label: getOrderStatusLabel(order.status),
      description: t('Đơn hàng không tiếp tục xử lý ở trạng thái này.', 'The order will not continue processing in this status.'),
      done: true,
      active: true,
    }]
  }

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
      label: isPayOs
        ? t('Đã thanh toán', 'Paid')
        : cashConfirmed
          ? t('Đã xác nhận tiền mặt', 'Cash confirmed')
          : t('Chờ nhân viên xác nhận', 'Waiting for staff confirmation'),
      description: isPayOs
        ? t('Đơn chuyển khoản đã thanh toán, không cần xác nhận tiền mặt.', 'Online payment is completed; no cash confirmation is needed.')
        : cashConfirmed
          ? t('Nhân viên bán hàng đã xác nhận khách thanh toán tiền mặt.', 'Sales staff confirmed the cash payment.')
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
  <div class="profile-layout-wrapper">
    <!-- Header / Navbar -->
    <header class="profile-navbar">
      <RouterLink class="brand-link" to="/">
        <span class="brand-mark"><img src="/icon.png" alt="Smart Sale Store"></span>
        <span class="brand-copy"><strong>Smart Sale Store</strong><small>Smart store</small></span>
      </RouterLink>
      
      <div class="navbar-actions">
        <RouterLink to="/" class="back-link">
          <i class="pi pi-arrow-left" />
          <span>{{ t('Quay lại cửa hàng', 'Back to store') }}</span>
        </RouterLink>
        
        <button class="lang-toggle-btn" type="button" @click="toggleLang" :title="t('Đổi ngôn ngữ', 'Switch Language')">
          <i class="pi pi-globe" />
          <span>{{ currentLanguage === 'vi' ? 'EN' : 'VI' }}</span>
        </button>
        
        <button class="logout-btn" type="button" @click="logoutCustomer" :title="t('Đăng xuất', 'Logout')">
          <i class="pi pi-sign-out" />
          <span>{{ t('Đăng xuất', 'Logout') }}</span>
        </button>
      </div>
    </header>

    <main class="profile-container">
      <!-- Profile Hero Banner -->
      <section class="profile-hero-banner">
        <div class="banner-gradient-overlay"></div>
        <div class="banner-content">
          <span class="eyebrow">{{ t('KHÁCH HÀNG THÂN THIẾT', 'LOYAL CUSTOMER') }}</span>
          <h1>{{ t('Chào mừng trở lại, ', 'Welcome back, ') }} {{ profile?.fullName || auth.user?.fullName }}!</h1>
          <p>{{ t('Quản lý thông tin tài khoản, địa chỉ mặc định và tra cứu chi tiết lịch sử mua sắm của bạn.', 'Manage your account information, default address, and search through your shopping history.') }}</p>
        </div>
        <div class="banner-metrics">
          <div class="metric-glass-card tier-card" :class="currentTierConfig.badgeClass">
            <i :class="currentTierConfig.icon" />
            <div>
              <small>{{ t('HẠNG THÀNH VIÊN', 'MEMBERSHIP TIER') }}</small>
              <strong>{{ currentTierLabel }}</strong>
            </div>
          </div>
          <div class="metric-glass-card">
            <i class="pi pi-wallet" />
            <div>
              <small>{{ t('TỔNG CHI TIÊU', 'TOTAL SPENT') }}</small>
              <strong>{{ formatCurrency(totalCustomerSpent) }}</strong>
            </div>
          </div>
          <div class="metric-glass-card">
            <i class="pi pi-shopping-bag" />
            <div>
              <small>{{ t('TỔNG ĐƠN HÀNG', 'TOTAL ORDERS') }}</small>
              <strong>{{ orders.length }}</strong>
            </div>
          </div>
        </div>

        <!-- VIP Tier Progress Tracker Strip -->
        <div class="tier-progress-card">
          <div class="progress-info-row">
            <div class="current-tier-tag">
              <i :class="currentTierConfig.icon" />
              <span>{{ t(currentTierConfig.labelVi, currentTierConfig.labelEn) }}</span>
            </div>
            <div class="progress-status-copy">
              <span v-if="tierProgress.nextTier">
                {{ t('Đã chi tiêu', 'Spent') }} <strong>{{ formatCurrency(totalCustomerSpent) }}</strong>.
                {{ t('Cần thêm', 'Need') }} <strong>{{ formatCurrency(tierProgress.amountNeeded) }}</strong>
                {{ t('để thăng hạng', 'to reach') }} <strong>{{ t(tierProgress.nextTierConfig?.labelVi || '', tierProgress.nextTierConfig?.labelEn || '') }}</strong>
              </span>
              <span v-else>
                💎 {{ t('Chúc mừng bạn đã đạt Hạng Thành Viên Kim Cương cao nhất!', 'Congratulations on achieving the highest Diamond Member tier!') }}
              </span>
            </div>
            <div v-if="tierProgress.nextTier" class="next-tier-tag">
              <span>{{ t(tierProgress.nextTierConfig?.labelVi || '', tierProgress.nextTierConfig?.labelEn || '') }}</span>
              <i :class="tierProgress.nextTierConfig?.icon" />
            </div>
          </div>

          <div class="progress-track-bar">
            <div
              class="progress-fill-bar"
              :style="{ width: `${tierProgress.progressPercent}%`, backgroundColor: currentTierConfig.color }"
            />
          </div>
        </div>
      </section>

      <!-- Loading and Error messages -->
      <div v-if="error" class="error-state-card">
        <i class="pi pi-exclamation-triangle" />
        <p>{{ error }}</p>
        <button type="button" @click="load">{{ t('Thử lại', 'Retry') }}</button>
      </div>
      
      <div v-else-if="loading" class="loading-state-card">
        <i class="pi pi-spin pi-spinner" />
        <p>{{ t('Đang tải dữ liệu hồ sơ...', 'Loading profile data...') }}</p>
      </div>

      <!-- Main Profile Sections (Collapsible Option Accordion Stack) -->
      <div v-else class="accordion-stack">
        
        <!-- Option 1: Account details -->
        <article class="accordion-item" :class="{ open: isAccountOpen }">
          <header class="accordion-header" @click="isAccountOpen = !isAccountOpen">
            <div class="accordion-title">
              <i class="pi pi-user" />
              <strong>{{ t('Thông tin tài khoản', 'Account Information') }}</strong>
            </div>
            <i class="pi chevron-icon" :class="isAccountOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
          </header>
          
          <Transition name="accordion-slide">
            <div v-if="isAccountOpen" class="accordion-body">
              <div class="info-grid">
                <div class="info-card">
                  <span class="info-label">{{ t('Họ và tên', 'Full Name') }}</span>
                  <strong class="info-value">{{ profile?.fullName || '—' }}</strong>
                </div>
                <div class="info-card">
                  <span class="info-label">{{ t('Tên tài khoản', 'Username') }}</span>
                  <strong class="info-value">{{ profile?.userName || '—' }}</strong>
                </div>
                <div class="info-card">
                  <span class="info-label">{{ t('Địa chỉ Email', 'Email Address') }}</span>
                  <strong class="info-value">{{ profile?.email || '—' }}</strong>
                </div>
                <div class="info-card">
                  <span class="info-label">{{ t('Ngày sinh', 'Date of Birth') }}</span>
                  <strong class="info-value">
                    {{ profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString(currentLanguage === 'vi' ? 'vi-VN' : 'en-US') : '—' }}
                  </strong>
                </div>
                <div class="info-card">
                  <span class="info-label">{{ t('Giới tính', 'Gender') }}</span>
                  <strong class="info-value">
                    {{ profile?.sex === 0 ? t('Nam', 'Male') : profile?.sex === 1 ? t('Nữ', 'Female') : t('Khác', 'Other') }}
                  </strong>
                </div>
              </div>
            </div>
          </Transition>
        </article>

        <!-- Option 2: Shipping Address -->
        <article class="accordion-item" :class="{ open: isAddressOpen }">
          <header class="accordion-header" @click="isAddressOpen = !isAddressOpen">
            <div class="accordion-title">
              <i class="pi pi-map-marker" />
              <strong>{{ t('Địa chỉ giao hàng', 'Shipping Address') }}</strong>
            </div>
            <i class="pi chevron-icon" :class="isAddressOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
          </header>
          
          <Transition name="accordion-slide">
            <div v-if="isAddressOpen" class="accordion-body">
              <div class="address-content-card">
                <div class="address-icon-wrapper">
                  <i class="pi pi-map-marker" />
                </div>
                <div class="address-info-details">
                  <span class="address-label">{{ t('Địa chỉ nhận hàng mặc định', 'Default Shipping Address') }}</span>
                  <p class="address-text">{{ profile?.address || t('Chưa cập nhật địa chỉ.', 'Address not updated yet.') }}</p>
                  <small class="address-hint">
                    <i class="pi pi-info-circle" />
                    {{ t('Bạn có thể cập nhật hoặc thay đổi địa chỉ giao hàng này trong lần thanh toán tiếp theo.', 'You can update or change this shipping address during your next checkout.') }}
                  </small>
                </div>
              </div>
            </div>
          </Transition>
        </article>

        <!-- Option 3: Purchase History -->
        <article class="accordion-item" :class="{ open: isHistoryOpen }">
          <header class="accordion-header" @click="isHistoryOpen = !isHistoryOpen">
            <div class="accordion-title">
              <i class="pi pi-shopping-bag" />
              <strong>{{ t('Lịch sử mua hàng', 'Purchase History') }}</strong>
            </div>
            <i class="pi chevron-icon" :class="isHistoryOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
          </header>
          
          <Transition name="accordion-slide">
            <div v-if="isHistoryOpen" class="accordion-body">
              <!-- Search & State Tabs -->
              <div class="history-filter-panel">
                <div class="search-bar-wrapper">
                  <i class="pi pi-search search-icon" />
                  <input
                    v-model="searchQuery"
                    type="text"
                    :placeholder="t('Tìm kiếm đơn hàng theo mã đơn hoặc ngày (ngày/tháng/năm)...', 'Search orders by ID or date (mm/dd/yyyy)...')"
                    class="search-input-field"
                  />
                  <button v-if="searchQuery" type="button" class="clear-search-btn" @click="searchQuery = ''" :title="t('Xóa tìm kiếm', 'Clear search')">
                    <i class="pi pi-times" />
                  </button>
                </div>

                <div class="history-state-tabs">
                  <button
                    type="button"
                    class="tab-trigger"
                    :class="{ active: activeTab === 'pending' }"
                    @click="activeTab = 'pending'"
                  >
                    <span>{{ t('Chờ xử lý', 'Pending') }}</span>
                    <span class="count-badge pending-badge">{{ pendingOrders.length }}</span>
                  </button>
                  <button
                    type="button"
                    class="tab-trigger"
                    :class="{ active: activeTab === 'paid' }"
                    @click="activeTab = 'paid'"
                  >
                    <span>{{ t('Đã thanh toán', 'Paid') }}</span>
                    <span class="count-badge paid-badge">{{ paidOrders.length }}</span>
                  </button>
                </div>
              </div>

              <!-- Main Orders Table & Timeline Layout -->
              <div class="orders-display-layout">
                <div class="orders-table-wrapper">
                  <table class="orders-detail-table">
                    <thead>
                      <tr>
                        <th>{{ t('Mã đơn', 'Order ID') }}</th>
                        <th>{{ t('Ngày tạo', 'Created Date') }}</th>
                        <th>{{ t('Trạng thái', 'Status') }}</th>
                        <th>{{ t('Thanh toán', 'Payment') }}</th>
                        <th>{{ t('Sản phẩm', 'Products') }}</th>
                        <th>{{ t('Tổng tiền', 'Total Amount') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="order in filteredOrders"
                        :key="order.id"
                        :class="{ active: selectedOrder?.id === order.id }"
                        @click="selectedOrderId = order.id"
                      >
                        <td class="order-id-cell">#{{ order.id }}</td>
                        <td>{{ new Date(order.createdAt).toLocaleDateString(currentLanguage === 'vi' ? 'vi-VN' : 'en-US') }}</td>
                        <td>
                          <span :class="['status-badge', order.status.toLowerCase()]">
                            {{ getOrderStatusLabel(order.status) }}
                          </span>
                        </td>
                        <td><span class="payment-method-badge">{{ getPaymentMethodLabel(order.paymentMethod) }}</span></td>
                        <td class="product-names-cell">
                          {{ order.orderItems.map((item) => `${item.productName} x${item.quantity}`).join(', ') }}
                        </td>
                        <td class="total-cell">{{ formatCurrency(order.total) }}</td>
                      </tr>
                      <tr v-if="!filteredOrders.length">
                        <td colspan="6" class="empty-orders-fallback">
                          <i class="pi pi-shopping-bag" />
                          <p>{{ t('Không tìm thấy đơn hàng phù hợp.', 'No matching orders found.') }}</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Selected Order Journey Timeline -->
                <aside v-if="selectedOrder" class="order-timeline-card">
                  <div class="timeline-header-block">
                    <span class="timeline-eyebrow">{{ t('Lộ trình đơn hàng', 'Order Journey') }}</span>
                    <strong class="timeline-order-id">#{{ selectedOrder.id }}</strong>
                    <div class="timeline-status">
                      <span :class="['status-badge', selectedOrder.status.toLowerCase()]">
                        {{ getOrderStatusLabel(selectedOrder.status) }}
                      </span>
                    </div>
                    <div class="timeline-payment-method">
                      <i class="pi pi-credit-card" />
                      <span>{{ getPaymentMethodLabel(selectedOrder.paymentMethod) }}</span>
                    </div>
                  </div>
                  <div class="timeline-stepper">
                    <article
                      v-for="step in getOrderTimeline(selectedOrder)"
                      :key="step.key"
                      :class="{ done: step.done, active: step.active, cancelled: step.key === 'cancelled' }"
                      class="timeline-step"
                    >
                      <div class="step-indicator">
                        <i :class="step.key === 'cancelled' ? 'pi pi-times' : step.done ? 'pi pi-check' : 'pi pi-circle'" />
                      </div>
                      <div class="step-body">
                        <strong>{{ step.label }}</strong>
                        <p>{{ step.description }}</p>
                      </div>
                    </article>
                  </div>
                </aside>
              </div>

            </div>
          </Transition>
        </article>

      </div>
    </main>
  </div>
</template>

<style scoped>
/* Main wrapper and layout styling */
.profile-layout-wrapper {
  background: #f8fafc;
  min-height: 100vh;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1e293b;
}

/* Header navbar styling */
.profile-navbar {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px min(6vw, 72px);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}

.brand-mark img {
  height: 36px;
  object-fit: contain;
}

.brand-copy {
  display: flex;
  flex-direction: column;
}

.brand-copy strong {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.brand-copy small {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f766e;
  font-weight: 600;
  text-decoration: none;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s, color 0.2s;
}

.back-link:hover {
  background: #f0fdfa;
}

.lang-toggle-btn {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #475569;
  padding: 8px 14px;
  transition: all 0.2s;
}

.lang-toggle-btn:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.logout-btn {
  background: transparent;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #be123c;
  padding: 8px 14px;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fef2f2;
}

/* Main container and content styling */
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

/* Hero banner styling */
.profile-hero-banner {
  background: linear-gradient(135deg, #0f766e, #111827);
  border-radius: 20px;
  padding: 40px min(5vw, 60px);
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(15, 118, 110, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  color: white;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 40px;
}

.banner-gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at top right, rgba(20, 184, 166, 0.15), transparent 60%);
  pointer-events: none;
}

.banner-content {
  position: relative;
  z-index: 1;
}

.banner-content .eyebrow {
  color: #2dd4bf;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
  display: inline-block;
  margin-bottom: 12px;
}

.banner-content h1 {
  font-size: clamp(24px, 4vw, 36px);
  font-weight: 800;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.banner-content p {
  font-size: clamp(14px, 1.8vw, 15px);
  color: #cbd5e1;
  max-width: 600px;
  margin: 0;
  line-height: 1.5;
}

.banner-metrics {
  display: flex;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.metric-glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 160px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.metric-glass-card.tier-card.platinum i {
  color: #c084fc;
  background: rgba(192, 132, 252, 0.2);
}

.metric-glass-card.tier-card.gold i {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.2);
}

.metric-glass-card.tier-card.silver i {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.2);
}

.metric-glass-card.tier-card.standard i {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.2);
}

.metric-glass-card i {
  font-size: 24px;
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.15);
  padding: 10px;
  border-radius: 12px;
}

.metric-glass-card div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.metric-glass-card small {
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.metric-glass-card strong {
  font-size: 18px;
  font-weight: 800;
  color: white;
}

/* Tier Progress Tracker Card */
.tier-progress-card {
  grid-column: 1 / -1;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.progress-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.current-tier-tag, .next-tier-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 750;
  color: #f1f5f9;
}

.progress-status-copy {
  font-size: 13px;
  color: #e2e8f0;
  flex: 1;
  text-align: center;
}

.progress-status-copy strong {
  color: #2dd4bf;
  font-weight: 750;
}

.progress-track-bar {
  height: 6px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.15);
  overflow: hidden;
}

.progress-fill-bar {
  height: 100%;
  border-radius: 99px;
  transition: width 0.5s ease;
}


/* Loading & error cards */
.loading-state-card,
.error-state-card {
  background: white;
  border-radius: 18px;
  padding: 60px 24px;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.loading-state-card i {
  font-size: 32px;
  color: #0f766e;
  margin-bottom: 16px;
}

.loading-state-card p {
  color: #64748b;
  font-size: 15px;
  margin: 0;
}

.error-state-card i {
  font-size: 36px;
  color: #ef4444;
  margin-bottom: 16px;
}

.error-state-card p {
  color: #ef4444;
  font-weight: 600;
  font-size: 16px;
  margin: 0 0 20px 0;
}

.error-state-card button {
  background: #0f766e;
  border: 0;
  border-radius: 8px;
  color: white;
  font-weight: 700;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.error-state-card button:hover {
  background: #0d5c56;
}

/* Accordion Stack styling */
.accordion-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.accordion-item {
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.accordion-item.open {
  box-shadow: 0 10px 20px -5px rgba(15, 23, 42, 0.06), 0 3px 6px rgba(0, 0, 0, 0.02);
  border-color: #cbd5e1;
}

.accordion-header {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  background: white;
  user-select: none;
  transition: background 0.2s;
}

.accordion-header:hover {
  background: #f8fafc;
}

.accordion-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.accordion-title i {
  font-size: 20px;
  color: #0f766e;
  background: #f0fdfa;
  padding: 10px;
  border-radius: 10px;
}

.accordion-title strong {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.chevron-icon {
  font-size: 14px;
  color: #64748b;
  transition: transform 0.2s;
}

.accordion-body {
  padding: 0 24px 28px 24px;
  border-top: 1px solid #f1f5f9;
  background: white;
}

/* Option 1: Info Grid Styling */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  padding-top: 24px;
}

.info-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label {
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

/* Option 2: Address card styling */
.address-content-card {
  display: flex;
  gap: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  margin-top: 24px;
}

.address-icon-wrapper {
  color: #0f766e;
  background: #f0fdfa;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.address-icon-wrapper i {
  font-size: 20px;
}

.address-info-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.address-label {
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.address-text {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.5;
}

.address-hint {
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  line-height: 1.4;
}

.address-hint i {
  color: #0f766e;
}

/* Option 3: Purchase History Section */
.history-filter-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 24px 0 20px 0;
  border-bottom: 1px solid #e2e8f0;
  flex-wrap: wrap;
}

.search-bar-wrapper {
  position: relative;
  flex: 1;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 14px;
}

.search-input-field {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 40px 10px 38px;
  font-size: 14px;
  color: #0f172a;
  transition: all 0.2s;
}

.search-input-field:focus {
  outline: none;
  background: white;
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
}

.clear-search-btn {
  background: transparent;
  border: 0;
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.clear-search-btn:hover {
  color: #475569;
}

.history-state-tabs {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
  gap: 2px;
}

.tab-trigger {
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.tab-trigger.active {
  background: white;
  color: #0f766e;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.count-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
}

.pending-badge {
  background: #fef3c7;
  color: #d97706;
}

.paid-badge {
  background: #d1fae5;
  color: #059669;
}

/* Orders layout grid */
.orders-display-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 24px;
  margin-top: 24px;
  align-items: start;
}

.orders-table-wrapper {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
}

.orders-detail-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.orders-detail-table th,
.orders-detail-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}

.orders-detail-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.05em;
}

.orders-detail-table tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}

.orders-detail-table tbody tr:hover {
  background: #f8fafc;
}

.orders-detail-table tbody tr.active {
  background: #f0fdfa;
}

.order-id-cell {
  color: #0f766e;
  font-weight: 700;
}

.product-names-cell {
  color: #475569;
  max-width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.total-cell {
  font-weight: 700;
  color: #0f172a;
}

.status-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: capitalize;
}

.payment-method-badge,
.timeline-payment-method {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 12px;
  font-weight: 700;
}

.payment-method-badge {
  padding: 5px 10px;
  white-space: nowrap;
}

.timeline-payment-method {
  margin-top: 8px;
  padding: 6px 10px;
}

/* Badge styles mapped to order status classes */
.status-badge.pending,
.status-badge.pendingpayment,
.status-badge.processingpayment {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.paid,
.status-badge.processing {
  background: #e0f2fe;
  color: #0369a1;
}

.status-badge.shipped {
  background: #e0e7ff;
  color: #4338ca;
}

.status-badge.completed {
  background: #d1fae5;
  color: #059669;
}

.status-badge.cancelled,
.status-badge.paymentcancelled,
.status-badge.paymentfailed,
.status-badge.paymentexpired {
  background: #fee2e2;
  color: #b91c1c;
}

.empty-orders-fallback {
  text-align: center;
  padding: 40px 20px !important;
  color: #64748b;
}

.empty-orders-fallback i {
  font-size: 32px;
  margin-bottom: 12px;
  color: #cbd5e1;
}

.empty-orders-fallback p {
  margin: 0;
  font-size: 14px;
}

/* Timeline panel card */
.order-timeline-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
}

.timeline-header-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.timeline-eyebrow {
  color: #0f766e;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.timeline-order-id {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
}

.timeline-status {
  margin-top: 4px;
}

.timeline-stepper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.timeline-step {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-step::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 34px;
  bottom: -24px;
  width: 2px;
  background: #cbd5e1;
}

.timeline-step:last-child::before {
  display: none;
}

.step-indicator {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.timeline-step.done .step-indicator {
  background: #ccfbf1;
  color: #0f766e;
}

.timeline-step.active .step-indicator {
  background: #0f766e;
  color: white;
  box-shadow: 0 0 0 5px #ccfbf1;
}

.timeline-step.cancelled .step-indicator {
  background: #fee2e2;
  color: #dc2626;
}

.timeline-step.cancelled.active .step-indicator {
  background: #dc2626;
  color: white;
  box-shadow: 0 0 0 5px #fee2e2;
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
}

.step-body strong {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.step-body p {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

/* Accordion Transition Animation */
.accordion-slide-enter-active,
.accordion-slide-leave-active {
  transition: all 0.25s ease-out;
  max-height: 2000px;
  opacity: 1;
}

.accordion-slide-enter-from,
.accordion-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-bottom: 0;
  overflow: hidden;
}

/* Responsive breakdowns */
@media (max-width: 1024px) {
  .profile-hero-banner {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .orders-display-layout {
    grid-template-columns: 1fr;
  }
  
  .order-timeline-card {
    margin-top: 10px;
  }
}

@media (max-width: 768px) {
  .profile-navbar {
    padding: 16px 20px;
  }

  .navbar-actions {
    gap: 10px;
  }

  .back-link span,
  .logout-btn span {
    display: none;
  }

  .back-link,
  .logout-btn {
    padding: 8px;
  }

  .profile-container {
    padding: 20px 10px 40px;
    gap: 20px;
  }

  .profile-hero-banner {
    padding: 30px 20px;
    border-radius: 16px;
  }

  .banner-metrics {
    flex-direction: column;
    width: 100%;
  }

  .metric-glass-card {
    width: 100%;
  }

  .accordion-header {
    padding: 16px;
  }

  .accordion-body {
    padding: 0 16px 20px 16px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .history-filter-panel {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .search-bar-wrapper {
    width: 100%;
  }

  .history-state-tabs {
    justify-content: stretch;
  }

  .tab-trigger {
    flex: 1;
    justify-content: center;
  }
}
</style>
