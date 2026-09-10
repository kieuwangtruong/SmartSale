<script setup lang="ts">
import { formatCurrency } from '../../services/orderApi'
import { translateProductName } from '../../services/productTranslations'
import { useLanguage } from '../../services/i18n'
import type { CartLine } from '../../composables/useStorefrontCart'
import CustomerTierBadge from '../CustomerTierBadge.vue'

defineProps<{
  show: boolean
  cart: CartLine[]
  cartCount: number
  cartSubtotal: number
  vipTierDiscountAmount: number
  cartFinalTotal: number
  tierConfig: { tier: string; discountPercent: number; minSpent: number }
  tierLabel: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update-quantity', payload: { index: number; quantity: number }): void
  (e: 'remove-line', index: number): void
  (e: 'proceed-checkout'): void
}>()

const { t } = useLanguage()

function translateCategory(cat: string): string {
  if (!cat) return ''
  if (cat === 'Gia dụng' || cat.toLowerCase().includes('gia dụng')) {
    return t('Gia dụng', 'Home')
  }
  if (cat === 'Phụ kiện' || cat.toLowerCase().includes('phụ kiện')) {
    return t('Phụ kiện', 'Accessories')
  }
  if (cat === 'Văn phòng' || cat.toLowerCase().includes('văn phòng')) {
    return t('Văn phòng', 'Office')
  }
  if (cat === 'Điện tử' || cat.toLowerCase().includes('điện tử')) {
    return t('Điện tử', 'Electronics')
  }
  return cat
}
</script>

<template>
  <div>
    <div v-if="show" class="cart-backdrop" @click="emit('close')" />
    <aside class="cart-panel" :class="{ open: show }" :aria-label="t('Giỏ hàng', 'Cart')">
      <div class="cart-head">
        <div>
          <span>{{ t('GIỎ HÀNG CỦA BẠN', 'YOUR CART') }}</span>
          <h2>{{ cartCount }} {{ t('sản phẩm', 'products') }}</h2>
        </div>
        <button type="button" :aria-label="t('Đóng', 'Close')" @click="emit('close')">
          <i class="pi pi-times" />
        </button>
      </div>

      <div v-if="!cart.length" class="empty-cart">
        <span><i class="pi pi-shopping-bag" /></span>
        <h3>{{ t('Giỏ hàng đang trống', 'Your cart is empty') }}</h3>
        <p>{{ t('Khám phá danh mục và thêm sản phẩm bạn quan tâm.', 'Explore our catalog and add items that interest you.') }}</p>
        <button type="button" @click="emit('close')">{{ t('Xem sản phẩm', 'Browse Products') }}</button>
      </div>

      <div v-else class="cart-body">
        <div 
          v-for="(line, index) in cart" 
          :key="`${line.product.id}-${line.variant.id}-${line.color.id}`" 
          class="cart-line"
        >
          <div class="cart-image">
            <img v-if="line.product.imageUrl" :src="line.product.imageUrl" :alt="translateProductName(line.product)" />
            <i v-else class="pi pi-box" />
          </div>
          <div class="cart-info">
            <small>{{ translateCategory(line.product.categoryName || '') }}</small>
            <strong>{{ translateProductName(line.product) }}</strong>
            <span class="variant-tag" v-if="line.variant.name !== 'Tiêu chuẩn' || line.color.name !== 'Mặc định'">
              {{ line.variant.name }} - {{ line.color.name }}
            </span>
            <span>{{ formatCurrency(line.product.salePrice ?? line.product.sellingPrice) }}</span>
            <div class="quantity-control">
              <button 
                type="button" 
                :aria-label="t('Giảm số lượng', 'Decrease quantity')" 
                @click="emit('update-quantity', { index, quantity: line.quantity - 1 })"
              >
                <i class="pi pi-minus" />
              </button>
              <input
                :value="line.quantity"
                type="number"
                min="1"
                :max="Math.min(line.variant.quantity || line.product.quantity, line.color.quantity || line.product.quantity)"
                @input="emit('update-quantity', { index, quantity: Number(($event.target as HTMLInputElement).value) })"
              />
              <button 
                type="button" 
                :aria-label="t('Tăng số lượng', 'Increase quantity')" 
                @click="emit('update-quantity', { index, quantity: line.quantity + 1 })"
              >
                <i class="pi pi-plus" />
              </button>
            </div>
          </div>
          <button class="remove-line" type="button" :aria-label="t('Xóa sản phẩm', 'Remove item')" @click="emit('remove-line', index)">
            <i class="pi pi-trash" />
          </button>
        </div>
      </div>

      <div v-if="cart.length" class="cart-footer">
        <div class="cart-subtotal-row">
          <span>{{ t('Tạm tính', 'Subtotal') }}</span>
          <strong>{{ formatCurrency(cartSubtotal) }}</strong>
        </div>

        <div v-if="vipTierDiscountAmount > 0" class="cart-vip-discount-row">
          <div class="vip-discount-label">
            <CustomerTierBadge :tier="tierConfig.tier" size="xs" variant="badge" :show-discount="true" />
            <span>{{ t('Chiết khấu VIP', 'VIP Discount') }} ({{ tierConfig.discountPercent }}%):</span>
          </div>
          <strong class="discount-value">-{{ formatCurrency(vipTierDiscountAmount) }}</strong>
        </div>

        <div class="cart-total-final-row">
          <span>{{ t('Tổng thanh toán', 'Total') }}</span>
          <strong class="total-highlight">{{ formatCurrency(cartFinalTotal) }}</strong>
        </div>

        <p><i class="pi pi-info-circle" /> {{ t('Bạn sẽ xác nhận thông tin giao hàng trước khi đặt đơn.', 'You will confirm shipping details before placing the order.') }}</p>
        <button type="button" class="cart-checkout-btn" @click="emit('proceed-checkout')">
          {{ t('Tiến hành đặt hàng', 'Proceed to Checkout') }} <i class="pi pi-arrow-right" />
        </button>
      </div>
    </aside>
  </div>
</template>
