<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency, getOrderStatusLabel, getPaymentMethodLabel, type Order } from '../../services/orderApi'
import { useLanguage } from '../../services/i18n'
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

function canCancel(order: Order) {
  const pm = (order.paymentMethod || 'Cash').toLowerCase()
  if (pm === 'payos') {
    return ['Paid', 'Processing', 'Shipped', 'Completed'].includes(order.status)
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

function computeOrderTimeline(order: Order): TimelineStep[] {
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
}
</script>

<template>
  <div v-if="show">
    <!-- Main Orders Modal Overlay -->
    <div class="orders-modal-overlay" @click.self="emit('close')" />
    <div class="orders-modal" aria-modal="true" role="dialog">
      <button type="button" class="modal-close-btn" @click="emit('close')" :aria-label="t('Đóng', 'Close')">
        <i class="pi pi-times" />
      </button>

      <div class="modal-header-section">
        <h2>{{ t('Đơn hàng của tôi', 'My Orders') }}</h2>
        <div class="modal-search-box">
          <i class="pi pi-search" />
          <input 
            :value="ordersSearchQuery" 
            @input="emit('update:ordersSearchQuery', ($event.target as HTMLInputElement).value)"
            type="search" 
            :placeholder="t('Tìm theo mã đơn hoặc sản phẩm...', 'Search by order ID or product name...')" 
          />
        </div>
        <div class="modal-order-tabs">
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'pending' }" 
            @click="emit('update:activeOrderTab', 'pending')"
          >
            {{ t('Chờ xử lý', 'Pending') }}
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
            {{ t('Đã giao', 'Shipped') }}
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
              :class="{ active: selectedCustomerOrder?.id === order.id }"
              @click="emit('update:selectedOrderId', order.id)"
            >
              <div class="order-card-header">
                <strong>#{{ order.id }}</strong>
                <span :class="['status-badge', order.status.toLowerCase()]">
                  {{ getOrderStatusLabel(order.status) }}
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
            </div>
          </div>
        </div>

        <!-- Right: Order detailed journey timeline -->
        <div class="orders-timeline-column">
          <div v-if="selectedCustomerOrder" class="order-timeline-card">
            <div class="timeline-header-block">
              <span class="timeline-eyebrow">{{ t('Lộ trình đơn hàng', 'Order Journey') }}</span>
              <strong class="timeline-order-id">#{{ selectedCustomerOrder.id }}</strong>
              <div class="timeline-status">
                <span :class="['status-badge', selectedCustomerOrder.status.toLowerCase()]">
                  {{ getOrderStatusLabel(selectedCustomerOrder.status) }}
                </span>
              </div>
              <div class="order-payment-line timeline-payment-line">
                <i class="pi pi-credit-card" />
                <span>{{ getPaymentMethodLabel(selectedCustomerOrder.paymentMethod) }}</span>
              </div>
              <div v-if="selectedCustomerOrder.refundReason" class="refund-note">
                <strong>{{ t('Lý do hủy/hoàn tiền', 'Cancellation/refund reason') }}</strong>
                <span>{{ selectedCustomerOrder.refundReason }}</span>
              </div>
              <div v-if="selectedCustomerOrder.refundAmount" class="refund-note">
                <strong>{{ t('Số tiền hoàn', 'Refund amount') }}</strong>
                <span>{{ formatCurrency(selectedCustomerOrder.refundAmount) }}</span>
              </div>
              <button
                v-if="canCancel(selectedCustomerOrder)"
                type="button"
                class="order-cancel-request-btn"
                @click="emit('open-cancel-modal', selectedCustomerOrder)"
              >
                {{ (selectedCustomerOrder.paymentMethod || '').toLowerCase() === 'payos' ? t('Yêu cầu hủy & hoàn tiền', 'Request cancellation & refund') : t('Hủy đơn hàng', 'Cancel order') }}
              </button>
            </div>
            <div class="timeline-stepper">
              <article
                v-for="step in computeOrderTimeline(selectedCustomerOrder)"
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
          </div>
          <div v-else class="timeline-placeholder">
            <i class="pi pi-info-circle" />
            <p>{{ t('Chọn một đơn hàng để xem lộ trình chi tiết.', 'Select an order to view detailed journey.') }}</p>
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
