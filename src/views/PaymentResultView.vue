<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getPaymentStatus, type OrderStatus } from '../services/orderApi'
import { useLanguage } from '../services/i18n'

const route = useRoute()
const router = useRouter()
const { t } = useLanguage()

const loading = ref(true)
const status = ref<OrderStatus | null>(null)
const error = ref('')
const orderCode = computed(() => String(route.query.orderCode ?? ''))

const content = computed(() => {
  const current = status.value
  if (current === 'Paid') {
    return {
      icon: 'pi pi-check-circle',
      title: t('Thanh toán thành công', 'Payment Successful'),
      message: t('Đơn hàng đã được thanh toán và chuyển sang xử lý.', 'The order has been paid and is being processed.'),
      tone: 'success',
    }
  }
  if (current === 'PaymentCancelled' || route.name === 'payment-cancelled') {
    return {
      icon: 'pi pi-times-circle',
      title: t('Thanh toán đã hủy', 'Payment Cancelled'),
      message: t('Sản phẩm vẫn được giữ trong giỏ hàng để bạn có thể thử lại.', 'Items remain in your cart so you can try again.'),
      tone: 'warning',
    }
  }
  if (current === 'PaymentExpired' || route.name === 'payment-expired') {
    return {
      icon: 'pi pi-clock',
      title: t('LIÊN KẾT ĐÃ HẾT HẠN', 'LINK EXPIRED'),
      message: t('Liên kết thanh toán chỉ có hiệu lực trong 10 phút.', 'The payment link is only valid for 10 minutes.'),
      tone: 'warning',
    }
  }
  if (current === 'PaymentFailed' || route.name === 'payment-failed') {
    return {
      icon: 'pi pi-exclamation-triangle',
      title: t('THANH TOÁN THẤT BẠI', 'PAYMENT FAILED'),
      message: t('Không thể hoàn tất thanh toán. Sản phẩm vẫn còn trong giỏ hàng.', 'Could not complete payment. Items are still in your cart.'),
      tone: 'danger',
    }
  }
  return {
    icon: 'pi pi-spin pi-spinner',
    title: t('ĐANG XÁC NHẬN THANH TOÁN', 'CONFIRMING PAYMENT'),
    message: t('Hệ thống đang chờ xác nhận an toàn từ PayOS.', 'The system is awaiting secure confirmation from PayOS.'),
    tone: 'pending',
  }
})

async function loadStatus() {
  if (!orderCode.value) {
    error.value = t('Thiếu mã thanh toán.', 'Missing payment code.')
    loading.value = false
    return
  }

  try {
    const result = await getPaymentStatus(orderCode.value)
    status.value = result.status
    if (result.status === 'Paid') {
      localStorage.removeItem('storefront-cart')
    } else if (result.status === 'PaymentExpired' && route.name !== 'payment-expired') {
      await router.replace({ name: 'payment-expired', query: { orderCode: orderCode.value } })
    } else if (result.status === 'PaymentFailed' && route.name !== 'payment-failed') {
      await router.replace({ name: 'payment-failed', query: { orderCode: orderCode.value } })
    }
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : t('Không thể kiểm tra thanh toán.', 'Unable to verify payment status.')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await loadStatus()
    if (status.value && !['PendingPayment', 'ProcessingPayment'].includes(status.value))
      break
    await new Promise((resolve) => window.setTimeout(resolve, 1500))
  }
})
</script>

<template>
  <main class="payment-result">
    <section class="result-card" :class="content.tone">
      <span class="result-icon"><i :class="content.icon" /></span>
      <h1>{{ loading ? t('Đang kiểm tra thanh toán', 'Checking payment status') : content.title }}</h1>
      <p>{{ error || content.message }}</p>
      <small v-if="orderCode">{{ t('Mã thanh toán:', 'Payment Code:') }} {{ orderCode }}</small>
      <div class="result-actions">
        <RouterLink v-if="status !== 'Paid'" to="/?cart=open">{{ t('Quay lại giỏ hàng', 'Return to Cart') }}</RouterLink>
        <RouterLink v-else to="/">{{ t('Tiếp tục mua sắm', 'Continue Shopping') }}</RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.payment-result {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f4f7fb;
}
.result-card {
  width: min(520px, 100%);
  padding: 42px;
  border-radius: 20px;
  background: white;
  text-align: center;
  box-shadow: 0 20px 60px rgb(15 23 42 / 12%);
}
.result-icon {
  display: inline-grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 50%;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 34px;
}
.success .result-icon { background: #dcfce7; color: #16a34a; }
.warning .result-icon { background: #fef3c7; color: #d97706; }
.danger .result-icon { background: #fee2e2; color: #dc2626; }
.eyebrow { margin: 22px 0 8px; color: #64748b; font-size: 12px; font-weight: 800; letter-spacing: .12em; }
h1 { margin: 0 0 12px; color: #0f172a; }
p { color: #64748b; line-height: 1.6; }
small { display: block; margin-top: 18px; color: #94a3b8; }
.result-actions { margin-top: 26px; }
.result-actions a {
  display: inline-flex;
  padding: 12px 18px;
  border-radius: 9px;
  background: #0f766e;
  color: white;
  text-decoration: none;
  font-weight: 700;
}
</style>
