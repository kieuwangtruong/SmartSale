<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  createCustomerCashOrder,
  createPaymentLink,
  formatCurrency,
  type CustomerCheckoutPayload,
  type Order,
} from '../services/orderApi'
import type { Product } from '../services/productApi'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'

interface CartLine {
  product: Product
  quantity: number
}

type PaymentMethod = 'cash' | 'payos'

const CART_STORAGE_KEY = 'storefront-cart'
const CUSTOMER_PHONE_KEY = 'customer-phone'

const router = useRouter()
const auth = useAuthStore()
const { t } = useLanguage()

const cart = ref<CartLine[]>([])
const loading = ref(false)
const error = ref('')
const success = ref('')
const placedOrder = ref<Order | null>(null)
const paymentMethod = ref<PaymentMethod>('cash')

const form = reactive({
  fullName: '',
  phone: '',
  email: '',
  address: '',
})

const cartCount = computed(() =>
  cart.value.reduce((sum, line) => sum + line.quantity, 0),
)

const cartTotal = computed(() =>
  cart.value.reduce(
    (sum, line) => sum + line.product.sellingPrice * line.quantity,
    0,
  ),
)

function loadCart() {
  const raw = localStorage.getItem(CART_STORAGE_KEY)
  if (!raw) {
    cart.value = []
    return
  }

  try {
    const parsed = JSON.parse(raw) as CartLine[]
    cart.value = parsed.filter((line) => line.product?.id && line.quantity > 0)
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY)
    cart.value = []
  }
}

function clearPurchasedCart() {
  cart.value = []
  localStorage.removeItem(CART_STORAGE_KEY)
}

function buildPayload(): CustomerCheckoutPayload {
  return {
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || null,
    address: form.address.trim(),
    orderItems: cart.value.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
    })),
  }
}

async function submitOrder() {
  if (loading.value || !cart.value.length) return
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const payload = buildPayload()
    if (payload.phone) localStorage.setItem(CUSTOMER_PHONE_KEY, payload.phone)

    if (paymentMethod.value === 'payos') {
      const payment = await createPaymentLink(payload)
      window.location.assign(payment.checkoutUrl)
      return
    }

    placedOrder.value = await createCustomerCashOrder(payload)
    clearPurchasedCart()
    success.value = t('Đặt hàng thành công. Đơn hàng của bạn đang chờ nhân viên xác nhận.', 'Order placed successfully. Your order is waiting for staff confirmation.')
  } catch (exception) {
    error.value = exception instanceof Error
      ? exception.message
      : t('Không thể tạo đơn hàng.', 'Unable to create order.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  auth.sync()
  loadCart()

  if (!auth.isAuthenticated || auth.role !== 'Customer') {
    router.replace({ name: 'customer-login', query: { redirect: '/checkout' } })
    return
  }

  form.fullName = auth.user?.fullName ?? ''
  form.email = auth.user?.email ?? ''
  form.address = auth.user?.address ?? ''
  form.phone = localStorage.getItem(CUSTOMER_PHONE_KEY) ?? ''
})
</script>

<template>
  <main class="checkout-page">
    <section class="checkout-hero">
      <RouterLink to="/" class="back-link">
        <i class="pi pi-arrow-left" /> {{ t('Quay lại cửa hàng', 'Back to store') }}
      </RouterLink>
      <h1>Thanh toán</h1>
    </section>

    <section v-if="placedOrder" class="checkout-result checkout-card">
      <span class="result-icon"><i class="pi pi-check" /></span>
      <h2>{{ t('Đặt hàng thành công', 'Order placed successfully') }}</h2>
      <p>{{ t('Đơn hàng tiền mặt của bạn đã được tạo. Nhân viên bán hàng sẽ xác nhận trước khi xử lý.', 'Your cash order has been created. Sales staff will confirm it before processing.') }}</p>
      <div class="result-grid">
        <div>
          <span>{{ t('Mã đơn', 'Order ID') }}</span>
          <strong>#{{ placedOrder.id }}</strong>
        </div>
        <div>
          <span>{{ t('Phương thức', 'Payment method') }}</span>
          <strong>{{ t('Thanh toán tiền mặt', 'Cash payment') }}</strong>
        </div>
        <div>
          <span>{{ t('Tổng tiền', 'Total') }}</span>
          <strong>{{ formatCurrency(placedOrder.total) }}</strong>
        </div>
        <div>
          <span>{{ t('Trạng thái', 'Status') }}</span>
          <strong>{{ t('Chờ xác nhận', 'Waiting confirmation') }}</strong>
        </div>
      </div>
      <div class="result-actions">
        <RouterLink to="/customer?tab=orders">{{ t('Xem đơn hàng của tôi', 'View my orders') }}</RouterLink>
        <RouterLink to="/">{{ t('Tiếp tục mua sắm', 'Continue shopping') }}</RouterLink>
      </div>
    </section>

    <section v-else-if="!cart.length" class="empty-checkout">
      <i class="pi pi-shopping-bag" />
      <h2>{{ t('Giỏ hàng đang trống', 'Your cart is empty') }}</h2>
      <p>{{ t('Hãy chọn sản phẩm trước khi đặt hàng.', 'Please choose products before checkout.') }}</p>
      <RouterLink to="/">{{ t('Xem sản phẩm', 'Browse products') }}</RouterLink>
    </section>

    <section v-else class="checkout-grid">
      <form class="checkout-card checkout-form" @submit.prevent="submitOrder">
        <div class="section-title">
          <span>{{ t('Thông tin nhận hàng', 'Shipping Information') }}</span>
          <strong>{{ t('Người nhận', 'Recipient') }}</strong>
        </div>

        <label>
          {{ t('Họ tên người nhận', 'Recipient full name') }}
          <input v-model="form.fullName" required :placeholder="t('Nhập họ tên người nhận', 'Enter recipient name')" />
        </label>

        <label>
          {{ t('Số điện thoại', 'Phone number') }}
          <input v-model="form.phone" required type="tel" :placeholder="t('Nhập số điện thoại', 'Enter phone number')" />
        </label>

        <label>
          {{ t('Địa chỉ nhận hàng', 'Shipping address') }}
          <textarea v-model="form.address" required rows="4" :placeholder="t('Số nhà, tên đường, quận/huyện...', 'House number, street, district...')" />
        </label>

        <div class="payment-methods">
          <button
            type="button"
            :class="{ active: paymentMethod === 'cash' }"
            @click="paymentMethod = 'cash'"
          >
            <i class="pi pi-wallet" />
            <span>{{ t('Thanh toán tiền mặt', 'Cash payment') }}</span>
          </button>
          <button
            type="button"
            :class="{ active: paymentMethod === 'payos' }"
            @click="paymentMethod = 'payos'"
          >
            <i class="pi pi-credit-card" />
            <span>Chuyển khoản QR</span>
          </button>
        </div>

        <p v-if="error" class="checkout-message error">
          <i class="pi pi-exclamation-circle" /> {{ error }}
        </p>
        <p v-if="success" class="checkout-message success">
          <i class="pi pi-check-circle" /> {{ success }}
        </p>

        <button class="submit-order" type="submit" :disabled="loading">
          <i v-if="loading" class="pi pi-spin pi-spinner" />
          <span>
            {{ loading
              ? t('Đang xử lý...', 'Processing...')
              : paymentMethod === 'payos'
                ? t('Thanh toán PayOS', 'Pay with PayOS')
                : t('Đặt hàng', 'Place order')
            }}
          </span>
        </button>
      </form>

      <aside class="checkout-card order-summary">
        <div class="section-title">
          <span>{{ cartCount }} {{ t('sản phẩm', 'items') }}</span>
          <strong>{{ t('Chi tiết đơn hàng', 'Order Details') }}</strong>
        </div>

        <div class="summary-items">
          <article v-for="line in cart" :key="line.product.id" class="summary-line">
            <img v-if="line.product.imageUrl" :src="line.product.imageUrl" :alt="line.product.name" />
            <span v-else class="summary-placeholder"><i class="pi pi-box" /></span>
            <div>
              <strong>{{ line.product.name }}</strong>
              <small>{{ line.quantity }} x {{ formatCurrency(line.product.sellingPrice) }}</small>
            </div>
            <b>{{ formatCurrency(line.product.sellingPrice * line.quantity) }}</b>
          </article>
        </div>

        <div class="summary-total">
          <span>{{ t('Tổng tiền', 'Total') }}</span>
          <strong>{{ formatCurrency(cartTotal) }}</strong>
        </div>
  
      </aside>
    </section>
  </main>
</template>

<style scoped>
.checkout-page {
  min-height: 100vh;
  padding: 34px min(6vw, 72px) 60px;
  background: #f5f7f4;
  color: #14213d;
}

.checkout-hero {
  max-width: 920px;
  margin-bottom: 28px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  color: #0f766e;
  font-weight: 800;
}

.checkout-hero > span,
.section-title span {
  color: #0f766e;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.checkout-hero h1 {
  max-width: 780px;
  margin: 0;
  font-family: var(--font-heading);
  font-size: clamp(34px, 6vw, 64px);
  line-height: 0.98;
  letter-spacing: -0.05em;
}

.checkout-hero p {
  max-width: 680px;
  color: #64748b;
}

.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 22px;
  align-items: start;
}

.checkout-card,
.empty-checkout {
  border: 1px solid #e6ebe6;
  border-radius: 24px;
  background: white;
  box-shadow: 0 22px 70px rgba(15, 23, 42, 0.08);
}

.checkout-card {
  padding: 26px;
}

.section-title {
  display: grid;
  gap: 4px;
  margin-bottom: 20px;
}

.section-title strong {
  font-size: 24px;
}

.checkout-form {
  display: grid;
  gap: 18px;
}

.checkout-form label {
  display: grid;
  gap: 8px;
  color: #334155;
  font-weight: 800;
}

.checkout-form input,
.checkout-form textarea {
  width: 100%;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  padding: 13px 14px;
  background: #f8fafc;
  color: #0f172a;
}

.payment-methods {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.payment-methods button,
.submit-order,
.empty-checkout a {
  border: 0;
  border-radius: 16px;
  font-weight: 850;
  cursor: pointer;
}

.payment-methods button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  background: #f1f5f9;
  color: #334155;
}

.payment-methods button.active {
  background: #ccfbf1;
  color: #0f766e;
  box-shadow: inset 0 0 0 2px #0f766e;
}

.submit-order {
  min-height: 54px;
  color: white;
  background: #0f766e;
  font-size: 15px;
}

.submit-order:disabled {
  opacity: 0.65;
  cursor: wait;
}

.summary-items {
  display: grid;
  gap: 16px;
}

.summary-line {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  gap: 12px;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #edf2f7;
}

.summary-line img,
.summary-placeholder {
  width: 70px;
  height: 76px;
  border-radius: 12px;
  object-fit: cover;
  background: #e2e8f0;
}

.summary-placeholder {
  display: grid;
  place-items: center;
  color: #64748b;
}

.summary-line strong {
  display: block;
}

.summary-line small {
  color: #64748b;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
}

.summary-total strong {
  color: #0f766e;
  font-size: 28px;
}

.order-summary > p {
  margin-top: 14px;
  padding: 12px;
  border-radius: 14px;
  background: #f0fdfa;
  color: #0f766e;
  font-size: 12px;
}

.checkout-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 12px;
  border-radius: 14px;
}

.checkout-message.error {
  background: #fef2f2;
  color: #dc2626;
}

.checkout-message.success {
  background: #f0fdf4;
  color: #16a34a;
}

.checkout-result {
  display: grid;
  gap: 18px;
  max-width: 760px;
  padding: 34px;
  text-align: center;
}

.result-icon {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  justify-self: center;
  border-radius: 999px;
  background: #dcfce7;
  color: #16a34a;
  font-size: 28px;
}

.checkout-result h2 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: 34px;
}

.checkout-result p {
  margin: 0;
  color: #64748b;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  text-align: left;
}

.result-grid div {
  padding: 14px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.result-grid span {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.result-grid strong {
  color: #0f172a;
}

.result-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.result-actions a {
  padding: 13px 18px;
  border-radius: 16px;
  background: #0f766e;
  color: white;
  font-weight: 850;
}

.result-actions a + a {
  background: #e2e8f0;
  color: #0f172a;
}

.empty-checkout {
  display: grid;
  place-items: center;
  gap: 10px;
  padding: 56px 20px;
  text-align: center;
}

.empty-checkout i {
  color: #0f766e;
  font-size: 42px;
}

.empty-checkout a {
  padding: 13px 18px;
  color: white;
  background: #0f766e;
}

@media (max-width: 900px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
}
</style>
