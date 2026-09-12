<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import {
  formatCurrency,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  resumePayOSPayment,
  type Order,
} from '../../services/orderApi'
import { useLanguage } from '../../services/i18n'
import { useAuthStore } from '../../stores/authStore'
import type { OrderTab, TimelineStep } from '../../composables/useCustomerPortal'

const props = defineProps<{
  show: boolean
  customerPanelLoading: boolean
  customerOrders: Order[]
  filteredCustomerOrders: Order[]
  selectedCustomerOrder: Order | null
  selectedOrderId: number | null
  activeOrderTab: OrderTab
  ordersSearchQuery: string
  cancelOrderModalShow: boolean
  cancelOrderActive: Order | null
  cancelReasonText: string
  selectedCancelReason: string
  cancelReasonOptions: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:activeOrderTab', tab: OrderTab): void
  (e: 'update:ordersSearchQuery', q: string): void
  (e: 'update:selectedOrderId', id: number | null): void
  (e: 'update:cancelReasonText', text: string): void
  (e: 'update:selectedCancelReason', reason: string): void
  (e: 'close-cancel-modal'): void
  (e: 'open-cancel-modal', order: Order): void
  (e: 'submit-cancellation'): void
  (e: 'get-timeline', order: Order): TimelineStep[]
}>()

const { t } = useLanguage()
const auth = useAuthStore()

const resumingPaymentId = ref<number | null>(null)
const resumePaymentError = ref('')
const currentTime = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timerInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

function isPayOSPending(order: Order | null): boolean {
  if (!order) return false
  const pm = String(order.paymentMethod || '').toLowerCase()
  return pm === 'payos' && ['PendingPayment', 'Pending', 'PaymentFailed', 'PaymentCancelled', 'PaymentExpired'].includes(order.status)
}

function getPayOSExpiryRemaining(order: Order): { isExpired: boolean; text: string } {
  const created = new Date(order.lastModifiedAt || order.createdAt).getTime()
  const expiry = created + 15 * 60 * 1000 // 15 minutes window
  const diff = expiry - currentTime.value

  if (diff <= 0) {
    return {
      isExpired: true,
      text: t('Hết thời hạn phiên hiện tại (Nhấn để tạo mã thanh toán mới)', 'Session expired (Click to create new payment QR)'),
    }
  }

  const mins = Math.floor(diff / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  return {
    isExpired: false,
    text: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
  }
}

async function handlePayOSResume(order: Order) {
  resumingPaymentId.value = order.id
  resumePaymentError.value = ''
  try {
    const res = await resumePayOSPayment(order.id)
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl
    }
  } catch (err: any) {
    resumePaymentError.value = err instanceof Error ? err.message : t('Không thể mở liên kết PayOS. Vui lòng thử lại.', 'Failed to open PayOS link. Please try again.')
  } finally {
    resumingPaymentId.value = null
  }
}

function canCancel(order: Order) {
  const pm = (order.paymentMethod || 'Cash').toLowerCase()
  if (pm === 'payos') {
    return ['PendingPayment', 'Pending', 'Paid', 'Processing', 'Shipped', 'Completed'].includes(order.status)
  }
  return ['Pending', 'Processing'].includes(order.status)
}

function statusRank(status: string) {
  const ranks: Record<string, number> = {
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

function getStatusIcon(status: string): string {
  switch (status) {
    case 'Completed': return 'pi pi-check-circle'
    case 'Paid': return 'pi pi-check-circle'
    case 'Shipped': return 'pi pi-send'
    case 'Processing': return 'pi pi-sync'
    case 'Cancelled':
    case 'PaymentCancelled':
    case 'PaymentFailed': return 'pi pi-times-circle'
    default: return 'pi pi-clock'
  }
}

function computeOrderTimeline(order: Order): TimelineStep[] {
  const cancelled = ['Cancelled', 'PaymentCancelled', 'PaymentExpired', 'PaymentFailed', 'RefundRequested', 'Refunded', 'RefundRejected'].includes(order.status)
  const isPayOs = (order.paymentMethod || '').toLowerCase() === 'payos'
  const rank = statusRank(order.status)
  const cashConfirmed = !isPayOs && rank >= 2 && !cancelled

  if (cancelled && !['PaymentCancelled', 'PaymentExpired', 'PaymentFailed'].includes(order.status)) {
    return [{
      key: 'cancelled',
      label: getOrderStatusLabel(order.status),
      description: t('Đơn hàng không tiếp tục xử lý ở trạng thái này.', 'The order will not continue processing in this status.'),
      done: true,
      active: true,
    }]
  }

  return [
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
        ? (order.status === 'Paid' ? t('Đã thanh toán PayOS', 'PayOS Confirmed') : t('Chờ thanh toán', 'Awaiting Payment'))
        : cashConfirmed
          ? t('Đã xác nhận tiền mặt', 'Cash confirmed')
          : t('Chờ xác nhận', 'Waiting confirmation'),
      description: isPayOs
        ? (order.status === 'Paid' ? t('Đã thanh toán thành công qua PayOS.', 'Paid successfully via PayOS.') : t('Đơn hàng chưa thanh toán.', 'Order is unpaid.'))
        : cashConfirmed
          ? t('Đã xác nhận đơn thanh toán tiền mặt.', 'Cash payment confirmed.')
          : t('Nhân viên bán hàng sẽ gọi xác nhận đơn.', 'Staff will confirm cash order.'),
      done: rank >= 2,
      active: (rank === 1 || rank === 2) && !cancelled,
    },
    {
      key: 'processing',
      label: t('Đang chuẩn bị', 'Preparing'),
      description: t('Cửa hàng đang đóng gói sản phẩm.', 'The store is packing your order.'),
      done: rank >= 3,
      active: rank === 3 && !cancelled,
    },
    {
      key: 'shipping',
      label: t('Đang giao', 'Shipping'),
      description: t('Đơn hàng đang trên đường giao đến bạn.', 'Order is on its way to you.'),
      done: rank >= 4,
      active: rank === 4 && !cancelled,
    },
    {
      key: 'completed',
      label: t('Hoàn tất', 'Completed'),
      description: t('Giao hàng thành công.', 'Successfully delivered.'),
      done: rank >= 5,
      active: rank === 5 && !cancelled,
    },
  ]
}

const recipientName = computed(() => {
  return props.selectedCustomerOrder?.customerName || auth.user?.fullName || t('Khách hàng', 'Customer')
})

const recipientPhone = computed(() => {
  return props.selectedCustomerOrder?.customerPhone || auth.user?.phone || '0347490811'
})

const recipientAddress = computed(() => {
  return props.selectedCustomerOrder?.customerAddress || auth.user?.address || 'Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. HCM'
})
</script>

<template>
  <div v-if="show">
    <!-- Main Orders Modal Overlay -->
    <div class="orders-modal-overlay" @click.self="emit('close')" />
    <div class="orders-modal" aria-modal="true" role="dialog">
      <button type="button" class="modal-close-btn" @click="emit('close')" :aria-label="t('Đóng', 'Close')">
        <i class="pi pi-times" />
      </button>

      <!-- Modal Header Section -->
      <div class="modal-header-section">
        <div class="modal-title-row">
          <div class="title-with-icon">
            <i class="pi pi-shopping-bag text-teal-600" />
            <h2>{{ t('Đơn hàng của tôi', 'My Orders') }}</h2>
          </div>
          <span class="orders-total-count">
            {{ filteredCustomerOrders.length }} {{ t('đơn hàng', 'orders') }}
          </span>
        </div>

        <div class="modal-search-box">
          <i class="pi pi-search" />
          <input 
            :value="ordersSearchQuery" 
            @input="emit('update:ordersSearchQuery', ($event.target as HTMLInputElement).value)"
            type="search" 
            :placeholder="t('Tìm theo mã đơn hoặc tên sản phẩm...', 'Search by order ID or product name...')" 
          />
        </div>

        <div class="modal-order-tabs">
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'pending' }" 
            @click="emit('update:activeOrderTab', 'pending')"
          >
            {{ t('Chờ xử lý / Thanh toán', 'Pending / Payment') }}
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'paid' }" 
            @click="emit('update:activeOrderTab', 'paid')"
          >
            {{ t('Đã thanh toán', 'Paid') }}
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'shipped' }" 
            @click="emit('update:activeOrderTab', 'shipped')"
          >
            {{ t('Đang giao', 'Shipping') }}
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'completed' }" 
            @click="emit('update:activeOrderTab', 'completed')"
          >
            {{ t('Hoàn thành', 'Completed') }}
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'cancelled' }" 
            @click="emit('update:activeOrderTab', 'cancelled')"
          >
            {{ t('Đã hủy', 'Cancelled') }}
          </button>
        </div>
      </div>

      <!-- Modal Body Grid: Left list, Right full e-commerce detail -->
      <div class="modal-body orders-modal-grid">
        <!-- Left: Orders List -->
        <div class="orders-list-column">
          <div v-if="customerPanelLoading" class="orders-loading">
            <i class="pi pi-spin pi-spinner" />
            <p>{{ t('Đang tải danh sách đơn hàng...', 'Loading order list...') }}</p>
          </div>
          <div v-else-if="filteredCustomerOrders.length === 0" class="orders-empty">
            <i class="pi pi-inbox" />
            <p>{{ t('Không tìm thấy đơn hàng nào.', 'No orders found.') }}</p>
          </div>
          <div v-else class="orders-list">
            <div 
              v-for="order in filteredCustomerOrders" 
              :key="order.id" 
              class="order-card-item"
              :class="{ 
                active: selectedCustomerOrder?.id === order.id,
                'is-pending-payos': isPayOSPending(order)
              }"
              @click="emit('update:selectedOrderId', order.id)"
            >
              <div class="order-card-header">
                <strong>#{{ order.id }}</strong>
                <span 
                  class="status-badge"
                  :class="isPayOSPending(order) ? 'pending-payment' : order.status.toLowerCase()"
                >
                  {{ isPayOSPending(order) ? t('Chưa thanh toán (PayOS)', 'Unpaid (PayOS)') : getOrderStatusLabel(order.status) }}
                </span>
              </div>
              <div class="order-payment-line">
                <i class="pi pi-credit-card" />
                <span>{{ getPaymentMethodLabel(order.paymentMethod) }}</span>
              </div>
              <div class="order-card-body">
                <div v-for="item in order.orderItems" :key="item.id" class="order-card-product">
                  <span>{{ item.productName }} <small class="text-muted">x{{ item.quantity }}</small></span>
                  <span>{{ formatCurrency(item.price * item.quantity) }}</span>
                </div>
              </div>
              <div class="order-card-footer">
                <span class="text-muted">{{ new Date(order.createdAt).toLocaleDateString('vi-VN') }}</span>
                <strong class="order-total-price">{{ formatCurrency(order.total) }}</strong>
              </div>
              <div v-if="isPayOSPending(order)" class="order-card-quick-pay">
                <button 
                  type="button" 
                  class="quick-payos-btn"
                  :disabled="resumingPaymentId === order.id"
                  @click.stop="handlePayOSResume(order)"
                >
                  <i v-if="resumingPaymentId === order.id" class="pi pi-spin pi-spinner" />
                  <i v-else class="pi pi-qrcode" />
                  <span>{{ t('Thanh toán ngay', 'Pay Now') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Shopee / Lazada / Tiki Style Rich Order Detail -->
        <div class="orders-timeline-column">
          <div v-if="selectedCustomerOrder" class="order-detail-rich-view">
            <!-- 1. Header Card: Order ID, Date, Status -->
            <div class="order-meta-card">
              <div class="meta-row-main">
                <div class="meta-id-date">
                  <span class="meta-label">{{ t('Mã đơn hàng', 'Order ID') }}</span>
                  <strong class="order-code-highlight">#{{ selectedCustomerOrder.id }}</strong>
                  <span class="order-timestamp">
                    <i class="pi pi-calendar" />
                    {{ new Date(selectedCustomerOrder.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) }}
                  </span>
                </div>
                <div class="meta-badges">
                  <span 
                    class="status-pill-badge"
                    :class="isPayOSPending(selectedCustomerOrder) ? 'status-pending-payment' : `status-${selectedCustomerOrder.status.toLowerCase()}`"
                  >
                    <i :class="getStatusIcon(selectedCustomerOrder.status)" />
                    {{ isPayOSPending(selectedCustomerOrder) ? t('Chờ thanh toán qua PayOS', 'Waiting for PayOS Payment') : getOrderStatusLabel(selectedCustomerOrder.status) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- PayOS Resume Callout Card (if pending) -->
            <div v-if="isPayOSPending(selectedCustomerOrder)" class="payos-pending-callout">
              <div class="payos-callout-header">
                <div class="payos-callout-icon">
                  <i class="pi pi-qrcode" />
                </div>
                <div>
                  <strong>{{ t('Đơn hàng chưa thanh toán qua PayOS', 'Order is pending PayOS payment') }}</strong>
                  <p>{{ t('Bạn đã đóng cửa sổ trước khi thanh toán? Bạn có thể quét mã QR ngay để hoàn tất đơn hàng.', 'Closed the window before paying? You can resume payment right now.') }}</p>
                </div>
              </div>
              
              <div class="payos-callout-timer">
                <i class="pi pi-clock" />
                <span>{{ t('Thời hạn phiên:', 'Time remaining:') }} <strong>{{ getPayOSExpiryRemaining(selectedCustomerOrder).text }}</strong></span>
              </div>

              <div v-if="resumePaymentError" class="payos-callout-error">
                <i class="pi pi-exclamation-circle" /> {{ resumePaymentError }}
              </div>

              <div class="payos-callout-actions">
                <button 
                  type="button" 
                  class="payos-resume-main-btn"
                  :disabled="resumingPaymentId === selectedCustomerOrder.id"
                  @click="handlePayOSResume(selectedCustomerOrder)"
                >
                  <i v-if="resumingPaymentId === selectedCustomerOrder.id" class="pi pi-spin pi-spinner" />
                  <i v-else class="pi pi-wallet" />
                  <span>{{ t('Tiếp tục thanh toán PayOS ngay', 'Resume PayOS Payment Now') }}</span>
                  <i class="pi pi-arrow-right" />
                </button>
              </div>
            </div>

            <!-- 2. Delivery Stepper (Lộ trình vận chuyển Shopee style) -->
            <div class="shopee-card shopee-journey-card">
              <div class="card-section-title">
                <i class="pi pi-truck text-teal-600" />
                <span>{{ t('Lộ trình vận chuyển', 'Delivery Timeline') }}</span>
              </div>
              <div class="journey-stepper-horizontal">
                <div 
                  v-for="(step, idx) in computeOrderTimeline(selectedCustomerOrder)" 
                  :key="step.key"
                  class="journey-step-item"
                  :class="{ done: step.done, active: step.active, cancelled: step.key === 'cancelled' }"
                >
                  <div class="step-icon-bubble">
                    <i :class="step.key === 'cancelled' ? 'pi pi-times' : step.done ? 'pi pi-check' : 'pi pi-circle-fill'" />
                  </div>
                  <div class="step-text-wrap">
                    <strong class="step-name">{{ step.label }}</strong>
                    <span class="step-desc">{{ step.description }}</span>
                  </div>
                  <div v-if="idx < computeOrderTimeline(selectedCustomerOrder).length - 1" class="step-connector" />
                </div>
              </div>
            </div>

            <!-- 3. Shipping Address Card (Địa chỉ nhận hàng) -->
            <div class="shopee-card shopee-address-card">
              <div class="card-section-title">
                <i class="pi pi-map-marker text-rose-500" />
                <span>{{ t('Địa chỉ nhận hàng', 'Shipping Address') }}</span>
              </div>
              <div class="address-content">
                <div class="recipient-info">
                  <strong class="recipient-name">{{ recipientName }}</strong>
                  <span class="recipient-phone">· {{ recipientPhone }}</span>
                </div>
                <p class="recipient-addr">{{ recipientAddress }}</p>
              </div>
            </div>

            <!-- 4. Purchased Products Card (Kiện hàng & Sản phẩm) -->
            <div class="shopee-card shopee-items-card">
              <div class="card-section-title">
                <i class="pi pi-box text-teal-600" />
                <span>{{ t('Chi tiết kiện hàng', 'Package Items') }} ({{ selectedCustomerOrder.orderItems?.length || 0 }} {{ t('sản phẩm', 'items') }})</span>
              </div>
              <div class="items-list-table">
                <div 
                  v-for="item in selectedCustomerOrder.orderItems" 
                  :key="item.id" 
                  class="order-item-row"
                >
                  <div class="item-thumb-box">
                    <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.productName" />
                    <div v-else class="item-thumb-placeholder">
                      <i class="pi pi-box" />
                    </div>
                  </div>
                  <div class="item-info-col">
                    <span class="item-name">{{ item.productName }}</span>
                    <div class="item-variant-chips">
                      <span v-if="item.variantName" class="variant-chip">{{ item.variantName }}</span>
                      <span v-if="item.colorName" class="color-chip">{{ item.colorName }}</span>
                    </div>
                    <div class="item-price-qty-mobile">
                      <span class="item-unit-price">{{ formatCurrency(item.price) }}</span>
                      <span class="item-qty-tag">x{{ item.quantity }}</span>
                    </div>
                  </div>
                  <div class="item-calc-col">
                    <span class="item-unit-calc">{{ formatCurrency(item.price) }} x {{ item.quantity }}</span>
                    <strong class="item-line-total">{{ formatCurrency(item.subTotal || item.price * item.quantity) }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- 5. Payment Financial Summary (Chi tiết thanh toán) -->
            <div class="shopee-card shopee-summary-card">
              <div class="card-section-title">
                <i class="pi pi-receipt text-indigo-600" />
                <span>{{ t('Thông tin thanh toán', 'Payment Breakdown') }}</span>
              </div>

              <div class="summary-breakdown-table">
                <div class="breakdown-row">
                  <span>{{ t('Tổng tiền hàng', 'Subtotal') }}</span>
                  <span>{{ formatCurrency(selectedCustomerOrder.subtotal) }}</span>
                </div>
                <div v-if="selectedCustomerOrder.tierDiscountAmount > 0" class="breakdown-row discount-row">
                  <span>
                    <i class="pi pi-crown text-purple-500" />
                    {{ t('Ưu đãi hội viên Kim Cương', 'Diamond VIP Member Discount') }}
                    <small v-if="selectedCustomerOrder.tierDiscountPercent">(-{{ selectedCustomerOrder.tierDiscountPercent }}%)</small>
                  </span>
                  <strong class="text-purple-600">-{{ formatCurrency(selectedCustomerOrder.tierDiscountAmount) }}</strong>
                </div>
                <div v-if="selectedCustomerOrder.couponDiscountAmount > 0" class="breakdown-row discount-row">
                  <span>
                    <i class="pi pi-ticket text-emerald-500" />
                    {{ t('Voucher giảm giá', 'Coupon Discount') }}
                    <span v-if="selectedCustomerOrder.couponCode" class="voucher-code-pill">{{ selectedCustomerOrder.couponCode }}</span>
                  </span>
                  <strong class="text-emerald-600">-{{ formatCurrency(selectedCustomerOrder.couponDiscountAmount) }}</strong>
                </div>
                <div class="breakdown-row">
                  <span>{{ t('Phí vận chuyển', 'Shipping Fee') }}</span>
                  <span class="text-emerald-600 font-semibold">{{ t('Miễn phí (0 ₫)', 'Free (0 ₫)') }}</span>
                </div>
                <div class="breakdown-divider" />
                <div class="breakdown-row final-row">
                  <div class="final-label-group">
                    <strong>{{ t('Tổng số tiền thanh toán', 'Total Payment') }}</strong>
                    <small class="payment-method-desc">
                      <i class="pi pi-credit-card" />
                      {{ getPaymentMethodLabel(selectedCustomerOrder.paymentMethod) }}
                    </small>
                  </div>
                  <strong class="grand-total-amount">{{ formatCurrency(selectedCustomerOrder.total) }}</strong>
                </div>
              </div>
            </div>

            <!-- Refund notice if any -->
            <div v-if="selectedCustomerOrder.refundReason" class="shopee-card refund-notice-card">
              <div class="card-section-title text-rose-600">
                <i class="pi pi-info-circle" />
                <span>{{ t('Thông tin hủy & hoàn tiền', 'Cancellation & Refund') }}</span>
              </div>
              <p><strong>{{ t('Lý do:', 'Reason:') }}</strong> {{ selectedCustomerOrder.refundReason }}</p>
              <p v-if="selectedCustomerOrder.refundAmount">
                <strong>{{ t('Số tiền hoàn:', 'Refund amount:') }}</strong> {{ formatCurrency(selectedCustomerOrder.refundAmount) }}
              </p>
            </div>

            <!-- 6. Action Buttons Bar -->
            <div class="order-detail-actions-bar">
              <button
                v-if="canCancel(selectedCustomerOrder)"
                type="button"
                class="btn-cancel-order"
                @click="emit('open-cancel-modal', selectedCustomerOrder)"
              >
                <i class="pi pi-times-circle" />
                <span>{{ (selectedCustomerOrder.paymentMethod || '').toLowerCase() === 'payos' && selectedCustomerOrder.status === 'Paid'
                  ? t('Yêu cầu hủy & hoàn tiền', 'Request cancellation & refund')
                  : t('Hủy đơn hàng này', 'Cancel this order') }}</span>
              </button>
            </div>
          </div>

          <div v-else class="timeline-placeholder">
            <i class="pi pi-inbox" />
            <p>{{ t('Chọn một đơn hàng ở bên trái để xem chi tiết.', 'Select an order on the left to view details.') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancellation Modal -->
    <div v-if="cancelOrderModalShow" class="cancel-order-overlay" @click="emit('close-cancel-modal')" />
    <aside v-if="cancelOrderModalShow" class="cancel-order-modal" role="dialog" aria-modal="true" :aria-label="t('Nhập lý do hủy đơn', 'Enter cancellation reason')">
      <div class="modal-head">
        <h2>
          {{ (cancelOrderActive?.paymentMethod || '').toLowerCase() === 'payos'
            ? t('Yêu cầu hủy & hoàn tiền', 'Request cancellation & refund')
            : t('Hủy đơn hàng', 'Cancel order') }}
        </h2>
        <button type="button" @click="emit('close-cancel-modal')" class="close-btn"><i class="pi pi-times" /></button>
      </div>
      <div class="modal-body">
        <p class="modal-intro">
          {{ (cancelOrderActive?.paymentMethod || '').toLowerCase() === 'payos'
            ? t('Vui lòng chọn lý do yêu cầu hủy đơn và hoàn tiền cho đơn hàng này:', 'Please select a reason for order cancellation and refund request:')
            : t('Vui lòng chọn lý do hủy đơn hàng của bạn:', 'Please select a reason for cancelling your order:') }}
        </p>
        
        <div class="reason-options">
          <label v-for="opt in cancelReasonOptions" :key="opt.value" class="reason-radio-label">
            <input 
              type="radio" 
              name="cancelReason" 
              :value="opt.value" 
              :checked="selectedCancelReason === opt.value"
              @change="emit('update:selectedCancelReason', opt.value)"
            />
            <span>{{ opt.label }}</span>
          </label>
        </div>

        <div v-if="selectedCancelReason === 'khac'" class="other-reason-wrap">
          <textarea 
            :value="cancelReasonText" 
            @input="emit('update:cancelReasonText', ($event.target as HTMLTextAreaElement).value)"
            :placeholder="t('Nhập chi tiết lý do của bạn...', 'Enter your specific reason...')"
            rows="3"
            class="cancel-textarea"
          ></textarea>
        </div>

        <div class="modal-footer-actions">
          <button type="button" class="btn-secondary" @click="emit('close-cancel-modal')">
            {{ t('Quay lại', 'Go back') }}
          </button>
          <button type="button" class="btn-danger" @click="emit('submit-cancellation')">
            {{ t('Gửi yêu cầu', 'Submit Request') }}
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* Modal Title Row */
.modal-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.title-with-icon {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-with-icon i {
  font-size: 22px;
}

.orders-total-count {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 12px;
  border-radius: 999px;
}

/* Detail Column Container */
.order-detail-rich-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

/* Shopee Style Cards */
.shopee-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
}

.card-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14.5px;
  font-weight: 750;
  color: #1e293b;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.card-section-title i {
  font-size: 16px;
}

/* 1. Header Order Meta Card */
.order-meta-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 16px 20px;
}

.meta-row-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.meta-id-date {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.order-code-highlight {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
}

.order-timestamp {
  font-size: 13px;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.status-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.status-pill-badge.status-completed,
.status-pill-badge.status-paid {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid rgba(5, 150, 105, 0.2);
}

.status-pill-badge.status-pending,
.status-pill-badge.status-pending-payment {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid rgba(217, 119, 6, 0.2);
}

.status-pill-badge.status-processing {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.status-pill-badge.status-shipped {
  background: #f0fdfa;
  color: #0d9488;
  border: 1px solid rgba(13, 148, 136, 0.2);
}

.status-pill-badge.status-cancelled {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

/* 2. Shopee Horizontal Journey Stepper */
.journey-stepper-horizontal {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  padding: 10px 4px 4px;
  overflow-x: auto;
}

.journey-step-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
  min-width: 90px;
}

.step-icon-bubble {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 2px solid #cbd5e1;
  color: #94a3b8;
  display: grid;
  place-items: center;
  font-size: 12px;
  z-index: 2;
  transition: all 0.2s ease;
}

.journey-step-item.done .step-icon-bubble {
  background: #0f766e;
  border-color: #0f766e;
  color: #ffffff;
  box-shadow: 0 0 10px rgba(15, 118, 110, 0.35);
}

.journey-step-item.active .step-icon-bubble {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #ffffff;
  transform: scale(1.15);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
}

.journey-step-item.cancelled .step-icon-bubble {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
}

.step-text-wrap {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-name {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.step-desc {
  font-size: 11px;
  color: #64748b;
  max-width: 120px;
}

.step-connector {
  position: absolute;
  top: 16px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e2e8f0;
  z-index: 1;
}

.journey-step-item.done .step-connector {
  background: #0f766e;
}

/* 3. Address Card */
.address-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recipient-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.recipient-name {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

.recipient-phone {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
}

.recipient-addr {
  font-size: 14px;
  color: #475569;
  line-height: 1.5;
  margin: 0;
}

/* 4. Purchased Items */
.items-list-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item-row {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f8fafc;
}

.order-item-row:last-child {
  border-bottom: none;
}

.item-thumb-box {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: grid;
  place-items: center;
}

.item-thumb-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-thumb-placeholder {
  color: #94a3b8;
  font-size: 20px;
}

.item-info-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.item-name {
  font-size: 14.5px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-variant-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.variant-chip,
.color-chip {
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
}

.item-price-qty-mobile {
  display: none;
}

.item-calc-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.item-unit-calc {
  font-size: 12.5px;
  color: #64748b;
}

.item-line-total {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
}

/* 5. Summary Breakdown Table */
.summary-breakdown-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #475569;
}

.breakdown-row.discount-row {
  color: #0f172a;
}

.voucher-code-pill {
  display: inline-flex;
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 6px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid rgba(4, 120, 87, 0.2);
  font-size: 12px;
  font-weight: 700;
  font-family: monospace;
}

.breakdown-divider {
  height: 1px;
  border-top: 1px dashed #cbd5e1;
  margin: 4px 0;
}

.breakdown-row.final-row {
  padding-top: 4px;
}

.final-label-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.final-label-group strong {
  font-size: 15px;
  color: #0f172a;
  font-weight: 800;
}

.payment-method-desc {
  font-size: 12.5px;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.grand-total-amount {
  font-size: 22px;
  font-weight: 900;
  color: #0f766e;
}

/* 6. Detail Actions Bar */
.order-detail-actions-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 4px;
}

.btn-cancel-order {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid #ef4444;
  background: #fef2f2;
  color: #dc2626;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel-order:hover {
  background: #dc2626;
  color: #ffffff;
}

/* Dark mode support */
.app-dark .shopee-card,
.app-dark .order-meta-card {
  background: #0f172a;
  border-color: #334155;
}

.app-dark .card-section-title {
  color: #f1f5f9;
  border-bottom-color: #1e293b;
}

.app-dark .order-code-highlight,
.app-dark .recipient-name,
.app-dark .item-name,
.app-dark .item-line-total,
.app-dark .final-label-group strong {
  color: #f8fafc;
}

.app-dark .grand-total-amount {
  color: #2dd4bf;
}

.app-dark .item-thumb-box {
  background: #1e293b;
  border-color: #334155;
}

.app-dark .step-icon-bubble {
  background: #1e293b;
  border-color: #475569;
}

.app-dark .step-connector {
  background: #334155;
}

.app-dark .step-name {
  color: #e2e8f0;
}

.app-dark .recipient-addr,
.app-dark .breakdown-row {
  color: #94a3b8;
}

@media (max-width: 768px) {
  .orders-modal-grid {
    grid-template-columns: 1fr;
  }
  .orders-timeline-column {
    border-left: none;
    padding-left: 0;
    border-top: 1px solid #e2e8f0;
    padding-top: 20px;
  }
}
</style>
