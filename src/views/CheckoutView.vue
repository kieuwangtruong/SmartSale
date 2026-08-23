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
import type { Product, ProductVariant, ProductVariantColor } from '../services/productApi'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'
import { getTierByTotalSpent } from '../services/customerTier'
import CustomerTierBadge from '../components/CustomerTierBadge.vue'

interface CartLine {
  product: Product
  variant: ProductVariant
  color: ProductVariantColor
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

const customerTier = computed(() => {
  return getTierByTotalSpent(auth.user?.totalSpent || 0)
})

const cartCount = computed(() =>
  cart.value.reduce((sum, line) => sum + line.quantity, 0),
)

const cartTotal = computed(() =>
  cart.value.reduce(
    (sum, line) => sum + line.variant.sellingPrice * line.quantity,
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
    cart.value = parsed.filter((line) => line.product?.id && line.variant?.id && line.color?.id && line.quantity > 0)
  } catch {
    localStorage.removeItem(CART_STORAGE_KEY)
    cart.value = []
  }
}

function clearPurchasedCart() {
  cart.value = []
  localStorage.removeItem(CART_STORAGE_KEY)
}

import { TIER_CONFIG } from '../services/customerTier'
import { validateCoupon, type CouponValidationResult } from '../services/promotionApi'

const couponInput = ref('')
const appliedCoupon = ref<CouponValidationResult['coupon'] | null>(null)
const couponError = ref('')
const couponLoading = ref(false)

const tierDiscountPercent = computed(() => {
  return TIER_CONFIG[customerTier.value]?.discountPercent || 0
})

const tierDiscountAmount = computed(() => {
  if (tierDiscountPercent.value <= 0) return 0
  return Math.round(cartTotal.value * (tierDiscountPercent.value / 100))
})

const couponDiscountAmount = computed(() => {
  return appliedCoupon.value ? appliedCoupon.value.discountAmount : 0
})

const totalDiscountAmount = computed(() => {
  return Math.min(cartTotal.value, tierDiscountAmount.value + couponDiscountAmount.value)
})

const finalTotal = computed(() => {
  return Math.max(0, cartTotal.value - totalDiscountAmount.value)
})

async function applyCoupon() {
  if (!couponInput.value.trim()) return
  couponLoading.value = true
  couponError.value = ''
  try {
    const result = await validateCoupon({
      code: couponInput.value.trim(),
      items: cart.value.map((line) => ({
        productId: line.product.id,
        quantity: line.quantity,
      })),
      userId: auth.user?.id || null,
    })
    appliedCoupon.value = result.coupon
  } catch (err: any) {
    couponError.value = err.message || 'Mã giảm giá không hợp lệ.'
    appliedCoupon.value = null
  } finally {
    couponLoading.value = false
  }
}

function removeAppliedCoupon() {
  appliedCoupon.value = null
  couponInput.value = ''
  couponError.value = ''
}

function buildPayload(): CustomerCheckoutPayload {
  return {
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || null,
    address: form.address.trim(),
    couponCode: appliedCoupon.value ? appliedCoupon.value.code : null,
    orderItems: cart.value.map((line) => ({
      productId: line.product.id,
      productVariantId: line.variant.id,
      productVariantColorId: line.color.id,
      quantity: line.quantity,
    })),
  }
}

import { eventTracker } from '../modules/analytics/services/eventTracker'

async function submitOrder() {
  if (loading.value || !cart.value.length) return
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const payload = buildPayload()
    if (payload.phone) localStorage.setItem(CUSTOMER_PHONE_KEY, payload.phone)

    if (paymentMethod.value === 'payos') {
      try {
        eventTracker.track('payment_started', { amount: finalTotal.value, paymentMethod: 'payos' })
      } catch {}
      const payment = await createPaymentLink(payload)
      window.location.assign(payment.checkoutUrl)
      return
    }

    placedOrder.value = await createCustomerCashOrder(payload)
    if (placedOrder.value?.id) {
      try {
        eventTracker.trackOrderCreated(placedOrder.value.id, placedOrder.value.total, 'cash')
      } catch {}
    }
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

  try {
    eventTracker.trackCheckoutStarted(cartTotal.value, cartCount.value)
  } catch {}
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
          <span>{{ t('Tạm tính', 'Subtotal') }}</span>
          <span>{{ formatCurrency(placedOrder.subtotal) }}</span>
        </div>
        <div v-if="placedOrder.discountAmount > 0">
          <span>{{ t('Tổng giảm giá', 'Discount') }}</span>
          <strong class="text-green-600">-{{ formatCurrency(placedOrder.discountAmount) }}</strong>
        </div>
        <div>
          <span>{{ t('Tổng thanh toán', 'Final Total') }}</span>
          <strong>{{ formatCurrency(placedOrder.total) }}</strong>
        </div>
        <div>
          <span>{{ t('Trạng thái', 'Status') }}</span>
          <strong>{{ t('Chờ xác nhận', 'Waiting confirmation') }}</strong>
        </div>
      </div>
      <div class="result-actions">
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
      <form class="checkout-form checkout-card" @submit.prevent="submitOrder">
        <div class="section-title">
          <span>{{ t('Thông tin nhận hàng', 'Shipping Information') }}</span>
          <div class="checkout-title-row">
            <strong>{{ t('Người nhận', 'Recipient') }}</strong>
            <CustomerTierBadge v-if="auth.isAuthenticated" :tier="customerTier" size="sm" variant="badge" :show-discount="true" />
          </div>
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

        <!-- VIP Member Tier Highlight Card -->
        <div v-if="tierDiscountPercent > 0" class="vip-benefit-banner">
          <div class="vip-benefit-icon">
            <i class="pi pi-crown" />
          </div>
          <div class="vip-benefit-text">
            <strong>{{ t('Đặc quyền thành viên', 'VIP Member Privilege') }} {{ customerTier }}</strong>
            <p>{{ t('Bạn được tự động chiết khấu', 'You receive an automatic discount of') }} <b>{{ tierDiscountPercent }}%</b> (-{{ formatCurrency(tierDiscountAmount) }}) {{ t('trực tiếp vào số tiền thanh toán trước khi tạo mã QR.', 'directly on your checkout total before QR code creation.') }}</p>
          </div>
        </div>

        <button class="submit-order" type="submit" :disabled="loading">
          <i v-if="loading" class="pi pi-spin pi-spinner" />
          <span v-else>
            {{ paymentMethod === 'payos'
                ? `${t('Thanh toán QR PayOS', 'Pay with PayOS QR')} (${formatCurrency(finalTotal)})`
                : `${t('Đặt hàng tiền mặt', 'Place Cash Order')} (${formatCurrency(finalTotal)})`
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
          <article v-for="line in cart" :key="`${line.product.id}-${line.variant.id}-${line.color.id}`" class="summary-line">
            <img v-if="line.product.imageUrl" :src="line.product.imageUrl" :alt="line.product.name" />
            <span v-else class="summary-placeholder"><i class="pi pi-box" /></span>
            <div>
              <strong>{{ line.product.name }}</strong>
              <small>{{ line.variant.name }} · {{ line.color.name }} · {{ line.quantity }} x {{ formatCurrency(line.variant.sellingPrice) }}</small>
            </div>
            <b>{{ formatCurrency(line.variant.sellingPrice * line.quantity) }}</b>
          </article>
        </div>

        <!-- Coupon Voucher Input Box -->
        <div class="coupon-section">
          <label class="coupon-label">{{ t('Mã giảm giá (Coupon)', 'Discount Coupon') }}</label>
          <div v-if="!appliedCoupon" class="coupon-input-group">
            <input
              v-model="couponInput"
              type="text"
              class="coupon-input"
              placeholder="VD: SUMMER10, WELCOME50K..."
              @keyup.enter.prevent="applyCoupon"
            />
            <button type="button" class="coupon-btn" :disabled="couponLoading" @click="applyCoupon">
              <i v-if="couponLoading" class="pi pi-spin pi-spinner" />
              <span v-else>{{ t('Áp dụng', 'Apply') }}</span>
            </button>
          </div>

          <div v-else class="applied-coupon-pill">
            <div class="applied-coupon-info">
              <i class="pi pi-tag text-purple-600" />
              <div>
                <strong class="coupon-code-badge">{{ appliedCoupon.code }}</strong>
                <span class="coupon-name-text">{{ appliedCoupon.name }}</span>
              </div>
            </div>
            <button type="button" class="remove-coupon-btn" title="Hủy mã" @click="removeAppliedCoupon">
              <i class="pi pi-times" />
            </button>
          </div>

          <p v-if="couponError" class="coupon-error-msg">
            <i class="pi pi-exclamation-triangle" /> {{ couponError }}
          </p>
        </div>

        <!-- Pricing Breakdown -->
        <div class="pricing-breakdown">
          <div class="breakdown-row">
            <span>{{ t('Tạm tính', 'Subtotal') }}</span>
            <span>{{ formatCurrency(cartTotal) }}</span>
          </div>

          <!-- Loyalty Tier Discount -->
          <div v-if="tierDiscountAmount > 0" class="breakdown-row discount-row tier-discount">
            <span>
              <i class="pi pi-crown text-amber-500 mr-1" />
              {{ t('Ưu đãi hạng', 'Loyalty Tier') }} ({{ customerTier }} -{{ tierDiscountPercent }}%)
            </span>
            <span class="discount-value">-{{ formatCurrency(tierDiscountAmount) }}</span>
          </div>

          <!-- Coupon Discount -->
          <div v-if="couponDiscountAmount > 0" class="breakdown-row discount-row coupon-discount">
            <span>
              <i class="pi pi-ticket text-purple-500 mr-1" />
              {{ t('Mã giảm giá', 'Coupon') }} ({{ appliedCoupon?.code }})
            </span>
            <span class="discount-value">-{{ formatCurrency(couponDiscountAmount) }}</span>
          </div>

          <div class="summary-total">
            <span>{{ t('Tổng thanh toán', 'Total') }}</span>
            <strong>{{ formatCurrency(finalTotal) }}</strong>
          </div>
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

.checkout-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
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

.coupon-section {
  margin-top: 1.25rem;
  padding: 1rem;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

.coupon-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 0.5rem;
}

.coupon-input-group {
  display: flex;
  gap: 0.5rem;
}

.coupon-input {
  flex: 1;
  padding: 0.65rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-family: monospace;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.9rem;
}

.coupon-input:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

.coupon-btn {
  padding: 0.65rem 1rem;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.coupon-btn:hover {
  background: #7c3aed;
}

.applied-coupon-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  background: #f3e8ff;
  border: 1px solid #d8b4fe;
  border-radius: 8px;
}

.applied-coupon-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.coupon-code-badge {
  font-family: monospace;
  font-weight: 800;
  color: #7e22ce;
  margin-right: 0.4rem;
}

.coupon-name-text {
  font-size: 0.8rem;
  color: #6b21a8;
}

.remove-coupon-btn {
  background: none;
  border: none;
  color: #9333ea;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 4px;
}

.remove-coupon-btn:hover {
  color: #dc2626;
}

.coupon-error-msg {
  margin: 0.5rem 0 0 0;
  font-size: 0.8rem;
  color: #dc2626;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.pricing-breakdown {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: #475569;
}

.discount-row {
  font-weight: 600;
}

.tier-discount .discount-value {
  color: #d97706;
}

.coupon-discount .discount-value {
  color: #9333ea;
}

.vip-benefit-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid #fde68a;
  border-radius: 14px;
  color: #92400e;
  margin-top: 4px;
}

.vip-benefit-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f59e0b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.vip-benefit-text strong {
  display: block;
  font-size: 0.9rem;
  color: #78350f;
}

.vip-benefit-text p {
  margin: 2px 0 0 0;
  font-size: 0.8rem;
  color: #92400e;
  line-height: 1.35;
}

@media (max-width: 900px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
}
</style>
