<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getPaymentStatus, type OrderStatus } from '../services/orderApi'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const status = ref<OrderStatus | null>(null)
const error = ref('')
const orderCode = computed(() => String(route.query.orderCode ?? ''))

const content = computed(() => {
  const current = status.value
  if (current === 'Paid') {
    return {
      icon: 'pi pi-check-circle',
      title: 'Thanh toán thành công',
      message: 'Đơn hàng đã được thanh toán và chuyển sang xử lý.',
      tone: 'success',
    }
  }
  if (current === 'PaymentCancelled' || route.name === 'payment-cancelled') {
    return {
      icon: 'pi pi-times-circle',
      title: 'Thanh toán đã hủy',
      message: 'Sản phẩm vẫn được giữ trong giỏ hàng để bạn có thể thử lại.',
      tone: 'warning',
    }
  }
  if (current === 'PaymentExpired' || route.name === 'payment-expired') {
    return {
      icon: 'pi pi-clock',
      title: 'Liên kết đã hết hạn',
      message: 'Liên kết thanh toán chỉ có hiệu lực trong 10 phút.',
      tone: 'warning',
    }
  }
  if (current === 'PaymentFailed' || route.name === 'payment-failed') {
    return {
      icon: 'pi pi-exclamation-triangle',
      title: 'Thanh toán thất bại',
      message: 'Không thể hoàn tất thanh toán. Sản phẩm vẫn còn trong giỏ hàng.',
      tone: 'danger',
    }
  }
  return {
    icon: 'pi pi-spin pi-spinner',
    title: 'Đang xác nhận thanh toán',
    message: 'Hệ thống đang chờ xác nhận an toàn từ PayOS.',
    tone: 'pending',
  }
})

async function loadStatus() {
  if (!orderCode.value) {
    error.value = 'Thiếu mã thanh toán.'
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
    error.value = exception instanceof Error ? exception.message : 'Không thể kiểm tra thanh toán.'
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
      <p class="eyebrow">PAYOS CHECKOUT</p>
      <h1>{{ loading ? 'Đang kiểm tra thanh toán' : content.title }}</h1>
      <p>{{ error || content.message }}</p>
      <small v-if="orderCode">Mã thanh toán: {{ orderCode }}</small>
      <div class="result-actions">
        <RouterLink v-if="status !== 'Paid'" to="/?cart=open">Quay lại giỏ hàng</RouterLink>
        <RouterLink v-else to="/">Tiếp tục mua sắm</RouterLink>
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
