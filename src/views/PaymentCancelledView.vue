<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getPaymentStatus, getOrderStatusLabel } from '../services/orderApi'
import { getErrorMessage } from '../services/apiClient'
import { useLanguage } from '../services/i18n'

const route = useRoute()
const { t } = useLanguage()

const loading = ref(true)
const error = ref('')
const orderId = ref<number | null>(null)
const orderCode = computed(() => String(route.query.orderCode ?? ''))

async function loadCancellation() {
  if (!orderCode.value) {
    error.value = t('Không tìm thấy mã thanh toán của đơn hàng.', 'Order payment code not found.')
    loading.value = false
    return
  }

  try {
    const payment = await getPaymentStatus(orderCode.value)
    orderId.value = payment.orderId
    if (payment.status === 'Paid') {
      error.value = t('Đơn hàng này đã được thanh toán và không thể hủy.', 'This order has already been paid and cannot be cancelled.')
    } else if (payment.status !== 'PaymentCancelled') {
      error.value = t(`Trạng thái hiện tại của đơn hàng: ${getOrderStatusLabel(payment.status)}.`, `Current status of order: ${getOrderStatusLabel(payment.status)}.`)
    }
  } catch (exception) {
    error.value = getErrorMessage(exception, t('Không thể kiểm tra trạng thái hủy đơn hàng.', 'Unable to check order cancellation status.'))
  } finally {
    loading.value = false
  }
}

onMounted(loadCancellation)
</script>

<template>
  <main class="cancel-page">
    <section class="cancel-form">
      <span class="cancel-icon"><i class="pi pi-times-circle" /></span>
      <h1>{{ t('HỦY THANH TOÁN', 'PAYMENT CANCELLED') }}</h1>
      <p class="description">
        {{ t('Đơn hàng chưa được thanh toán hãy thanh toán lại.', 'The order is unpaid. Please try paying again.') }}
      </p>

      <div class="order-information">
        <div>
          <span>{{ t('Mã đơn hàng', 'Order ID') }}</span>
          <strong>{{ loading ? t('Đang kiểm tra...', 'Checking...') : orderId ? `#${orderId}` : t('Không xác định', 'Unknown') }}</strong>
        </div>
        <div>
          <span>{{ t('Mã thanh toán', 'Payment Code') }}</span>
          <strong>{{ orderCode || t('Không xác định', 'Unknown') }}</strong>
        </div>
        <div>
          <span>{{ t('Trạng thái', 'Status') }}</span>
          <strong class="cancelled-status">{{ t('Đã hủy thanh toán', 'Cancelled') }}</strong>
        </div>
      </div>

      <p v-if="error" class="cancel-error">
        <i class="pi pi-exclamation-circle" /> {{ error }}
      </p>

      <div class="cancel-actions">
        <RouterLink class="secondary-action" to="/">{{ t('Tiếp tục mua sắm', 'Continue Shopping') }}</RouterLink>
        <RouterLink class="primary-action" to="/?cart=open">
          {{ t('Quay lại giỏ hàng', 'Return to Cart') }}
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.cancel-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f4f7fb;
}
.cancel-form {
  width: min(560px, 100%);
  padding: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: white;
  text-align: center;
  box-shadow: 0 20px 60px rgb(15 23 42 / 12%);
}
.cancel-icon {
  display: inline-grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 50%;
  background: #fef3c7;
  color: #d97706;
  font-size: 34px;
}
.eyebrow {
  margin: 22px 0 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .12em;
}
h1 {
  margin: 0 0 12px;
  color: #0f172a;
}
.description {
  margin: 0 auto 26px;
  max-width: 460px;
  color: #64748b;
  line-height: 1.6;
}
.order-information {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 12px;
  background: #f8fafc;
  text-align: left;
}
.order-information div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.order-information span {
  color: #64748b;
}
.order-information strong {
  color: #0f172a;
  overflow-wrap: anywhere;
}
.cancelled-status {
  color: #d97706 !important;
}
.cancel-error {
  display: flex;
  gap: 8px;
  margin: 18px 0 0;
  padding: 12px;
  border-radius: 9px;
  background: #fef2f2;
  color: #dc2626;
  text-align: left;
}
.cancel-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 26px;
}
.cancel-actions a {
  display: grid;
  min-height: 44px;
  place-items: center;
  padding: 10px 14px;
  border-radius: 9px;
  text-decoration: none;
  font-weight: 750;
}
.secondary-action {
  border: 1px solid #cbd5e1;
  color: #334155;
}
.primary-action {
  background: #0f766e;
  color: white;
}
@media (max-width: 520px) {
  .cancel-form { padding: 28px 20px; }
  .cancel-actions { grid-template-columns: 1fr; }
  .order-information div { flex-direction: column; gap: 4px; }
}
</style>
