<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '../../services/orderApi'
import { translateProductName } from '../../services/productTranslations'
import { useLanguage } from '../../services/i18n'
import type { Product } from '../../services/productApi'

const props = defineProps<{
  product: Product
  vipDiscountPercent?: number
}>()

const emit = defineEmits<{
  (e: 'click', product: Product): void
  (e: 'quick-add', product: Product): void
}>()

const { t } = useLanguage()

const hasDiscount = computed(() =>
  Boolean(props.product.salePrice && props.product.originalPrice && props.product.salePrice < props.product.originalPrice),
)

const discountPercent = computed(() => {
  if (!hasDiscount.value || !props.product.originalPrice || !props.product.salePrice) return 0
  return Math.round((1 - props.product.salePrice / props.product.originalPrice) * 100)
})

const isLowStock = computed(() =>
  props.product.quantity > 0 && props.product.quantity <= (props.product.reserveStock || 5),
)
</script>

<template>
  <article class="product-card" @click="emit('click', product)">
    <div class="product-image">
      <div v-if="hasDiscount" class="discount-badge-square">
        -{{ discountPercent }}%
      </div>
      <div v-if="isLowStock" class="ribbon-wrapper">
        <div class="ribbon low-stock">{{ t('Sắp hết', 'Low Stock') }}</div>
      </div>
      <span v-if="product.quantity <= 0" class="stock-badge sold-out">{{ t('Hết hàng', 'Out of stock') }}</span>
      <img v-if="product.imageUrl" :src="product.imageUrl" :alt="translateProductName(product)" loading="lazy" />
      <div v-else class="image-placeholder">
        <i class="pi pi-box" />
        <small>ID #{{ product.id }}</small>
      </div>
    </div>
    <div class="product-content">
      <div class="product-labels">
        <span>{{ product.categoryName || t('Sản phẩm', 'Product') }}</span>
        <small>ID #{{ product.id }}</small>
      </div>
      <h3>{{ translateProductName(product) }}</h3>
      <div class="product-footer">
        <div>
          <del v-if="hasDiscount">{{ formatCurrency(product.originalPrice) }}</del>
          <strong :class="{ sale: hasDiscount }">{{ formatCurrency(product.sellingPrice) }}</strong>
          <small v-if="product.quantity > 0" :class="isLowStock ? 'low-stock-text' : 'in-stock-text'">
            <i class="pi pi-check-circle" />
            {{ isLowStock ? t(`Sắp hết (Còn ${product.quantity})`, `Low stock (${product.quantity} left)`) : t(`Còn hàng (${product.quantity})`, `In stock (${product.quantity})`) }}
          </small>
          <small v-else class="unavailable">{{ t('Tạm hết hàng', 'Out of stock') }}</small>
        </div>
        <button type="button" :disabled="product.quantity <= 0" @click.stop="emit('quick-add', product)" :title="t('Thêm nhanh vào giỏ', 'Quick add to cart')">
          <i class="pi pi-shopping-bag" />
          <span>{{ t('Thêm', 'Add') }}</span>
        </button>
      </div>
    </div>
  </article>
</template>
