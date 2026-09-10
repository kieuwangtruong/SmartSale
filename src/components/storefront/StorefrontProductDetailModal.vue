<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatCurrency } from '../../services/orderApi'
import { translateProductName } from '../../services/productTranslations'
import { PRODUCT_MOCKS } from '../../services/productMocks'
import { useLanguage } from '../../services/i18n'
import type { Product } from '../../services/productApi'

const props = defineProps<{
  product: Product | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'add-to-cart', payload: { product: Product; variantId: number; colorId: number; quantity: number }): void
  (e: 'buy-now', payload: { product: Product; variantId: number; colorId: number; quantity: number }): void
  (e: 'open-lightbox', product: Product): void
}>()

const { t, currentLanguage } = useLanguage()

const selectedImageIndex = ref(0)
const productDetailQuantity = ref(1)
const selectedVariantId = ref<number | null>(null)
const selectedColorId = ref<number | null>(null)

const isDetailOverviewOpen = ref(true)
const isDetailSpecsOpen = ref(false)
const isDetailUsageOpen = ref(false)
const isDetailWarrantyOpen = ref(false)

function getEnrichedProductImages(p: Product): string[] {
  const baseImages = [p.imageUrl, ...(p.imageUrls ?? [])]
    .map((url) => url?.trim())
    .filter((url): url is string => {
      if (!url) return false
      if (url === '[]' || url === '""' || url === "''" || url.includes('placeholder')) return false
      return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:')
    })
    .filter((url, index, urls) => urls.findIndex((item) => item.toLowerCase() === url.toLowerCase()) === index)
  return baseImages.length > 0 ? baseImages : []
}

// Watch product change
watch(
  () => props.product,
  (newProduct) => {
    if (newProduct) {
      selectedImageIndex.value = 0
      productDetailQuantity.value = 1
      const firstVariant =
        newProduct.variants.find((v) => v.isActive && v.quantity > 0) ??
        newProduct.variants.find((v) => v.isActive) ??
        newProduct.variants[0]
      selectedVariantId.value = firstVariant?.id ?? null
    }
  },
  { immediate: true },
)

const selectedVariant = computed(() =>
  props.product?.variants.find((v) => v.id === selectedVariantId.value) ?? null,
)

const selectableColors = computed(() => selectedVariant.value?.colors ?? [])

const selectedColor = computed(() =>
  selectableColors.value.find((c) => c.id === selectedColorId.value) ?? null,
)

watch(selectedVariantId, () => {
  const firstColor =
    selectedVariant.value?.colors.find((c) => c.isActive && c.quantity > 0) ??
    selectedVariant.value?.colors.find((c) => c.isActive)
  selectedColorId.value = firstColor?.id ?? null
  selectedImageIndex.value = 0
  productDetailQuantity.value = 1
})

const selectedStock = computed(() => {
  if (!props.product) return 0
  if (selectedVariant.value && selectedColor.value) {
    return Math.min(props.product.quantity, Math.min(selectedVariant.value.quantity, selectedColor.value.quantity))
  }
  return props.product.quantity || 0
})

const selectedDetailImages = computed(() => {
  const images = selectedColor.value?.images.map((image) => image.imageUrl).filter(Boolean) ?? []
  return images.length ? images : props.product ? getEnrichedProductImages(props.product) : []
})

function prevImage() {
  if (selectedDetailImages.value.length === 0) return
  selectedImageIndex.value = (selectedImageIndex.value - 1 + selectedDetailImages.value.length) % selectedDetailImages.value.length
}

function nextImage() {
  if (selectedDetailImages.value.length === 0) return
  selectedImageIndex.value = (selectedImageIndex.value + 1) % selectedDetailImages.value.length
}

const enrichedProductDetails = computed(() => {
  if (!props.product) return null
  const p = props.product
  const mock = PRODUCT_MOCKS[p.id]
  const enName = translateProductName(p)

  const overview = p.description || mock?.overview[currentLanguage.value] || t(
    `Sản phẩm ${p.name} sở hữu thiết kế thông minh, hiện đại mang lại sự tiện ích và thoải mái cho không gian của bạn.`,
    `The ${enName} features a smart, modern design that brings convenience and comfort to your space.`,
  )

  const usage = t(
    'Đọc kỹ hướng dẫn sử dụng đi kèm trước khi dùng. Tránh va đập mạnh và tiếp xúc với nhiệt độ cao quá mức cho phép. Vệ sinh nhẹ nhàng bằng khăn mềm sạch.',
    'Read the included user manual carefully before use. Avoid strong impacts and exposure to excessive heat. Clean gently with a soft, clean cloth.',
  )

  const commitment = t(
    'Cam kết 100% hàng chính hãng, đổi trả miễn phí trong vòng 7 ngày nếu phát hiện lỗi từ nhà sản xuất. Hỗ trợ kỹ thuật 24/7.',
    '100% genuine products commitment, free exchange within 7 days in case of manufacturer defects. 24/7 technical support.',
  )

  const specs = mock?.specs ? {
    code: `SS-${p.id}`,
    categoryName: p.categoryName || t('Chưa phân loại', 'Uncategorized'),
    supplierName: p.supplierName || t('Nhà cung cấp trực tiếp', 'Direct Supplier'),
    dimensions: mock.specs.dimensions,
    material: mock.specs.material,
    weight: mock.specs.weight,
    origin: mock.specs.origin,
    warranty: mock.specs.warranty,
  } : {
    code: `SS-${p.id}`,
    categoryName: p.categoryName || t('Chưa phân loại', 'Uncategorized'),
    supplierName: p.supplierName || t('Nhà cung cấp trực tiếp', 'Direct Supplier'),
    dimensions: t('N/A', 'N/A'),
    material: t('Cao cấp', 'Premium'),
    weight: t('N/A', 'N/A'),
    origin: t('Việt Nam', 'Vietnam'),
    warranty: t('12 tháng', '12 months'),
  }

  return { overview, specs, usage, commitment }
})

function handleAddToCart() {
  if (!props.product) return
  emit('add-to-cart', {
    product: props.product,
    variantId: selectedVariantId.value || 0,
    colorId: selectedColorId.value || 0,
    quantity: productDetailQuantity.value,
  })
}

function handleBuyNow() {
  if (!props.product) return
  emit('buy-now', {
    product: props.product,
    variantId: selectedVariantId.value || 0,
    colorId: selectedColorId.value || 0,
    quantity: productDetailQuantity.value,
  })
}
</script>

<template>
  <div v-if="product">
    <div class="product-detail-overlay" @click.self="emit('close')" />
    <div class="product-detail-modal" aria-modal="true" role="dialog">
      <!-- Close button -->
      <button type="button" class="detail-close-btn" :aria-label="t('Đóng', 'Close')" @click="emit('close')">
        <i class="pi pi-times" />
      </button>

      <!-- Two-column layout -->
      <div class="detail-container">
        <!-- Left column: Image Gallery -->
        <div class="detail-gallery">
          <div class="main-image">
            <button 
              type="button" 
              class="carousel-nav-btn prev-btn" 
              @click="prevImage"
              :aria-label="t('Ảnh trước', 'Previous image')"
            >
              <i class="pi pi-chevron-left" />
            </button>
            
            <img 
              v-if="selectedDetailImages[selectedImageIndex]" 
              :src="selectedDetailImages[selectedImageIndex]" 
              :alt="translateProductName(product)"
              class="main-image-img"
              @click="emit('open-lightbox', product)"
              style="cursor: zoom-in;"
            />
            <div v-else class="image-placeholder large">
              <i class="pi pi-box" />
              <small>ID #{{ product.id }}</small>
            </div>

            <button 
              type="button" 
              class="carousel-nav-btn next-btn" 
              @click="nextImage"
              :aria-label="t('Ảnh sau', 'Next image')"
            >
              <i class="pi pi-chevron-right" />
            </button>
          </div>
          
          <!-- Thumbnails -->
          <div class="thumbnails" v-if="selectedDetailImages.length > 1">
            <button 
              v-for="(image, idx) in selectedDetailImages" 
              :key="idx"
              type="button"
              :class="{ active: idx === selectedImageIndex }"
              @click="selectedImageIndex = idx"
              :aria-label="`Image ${idx + 1}`"
            >
              <img :src="image" :alt="`Product thumbnail ${idx + 1}`" />
            </button>
          </div>
        </div>

        <!-- Right column: Product Info & Actions -->
        <div class="detail-info">
          <div class="detail-header">
            <span class="detail-category">
              {{ product.categoryName || t('Sản phẩm', 'Product') }}
            </span>

            <div class="detail-title-row">
              <h1 class="detail-title">
                {{ translateProductName(product) }}
              </h1>
              <span v-if="selectedVariant" class="product-version-badge">
                {{ selectedVariant.name }}
              </span>
            </div>
          </div>

          <!-- Product ID and Stock Status -->
          <div class="detail-meta">
            <span class="product-id">{{ t('Mã ID:', 'Product ID:') }} <strong>#{{ product.id }}</strong></span>
            <div v-if="selectedStock > 0" class="stock-status in-stock">
              <i class="pi pi-check-circle" />
              <span>{{ selectedStock <= (selectedVariant?.reserveStock ?? 5) ? t(`Sắp hết (Còn ${selectedStock})`, `Low stock (${selectedStock} left)`) : t(`Còn hàng (${selectedStock} sản phẩm)`, `In stock (${selectedStock} products)`) }}</span>
            </div>
            <div class="stock-status out-of-stock" v-else>
              <i class="pi pi-times-circle" />
              <span>{{ t('Hết hàng', 'Out of stock') }}</span>
            </div>
          </div>

          <!-- Price -->
          <div class="detail-price">
            <span class="price-label">{{ t('Giá bán', 'Price') }}</span>
            <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
              <del style="color: var(--muted); font-size: 16px;" v-if="selectedVariant?.salePrice && selectedVariant.salePrice < selectedVariant.originalPrice">
                {{ formatCurrency(selectedVariant.originalPrice) }}
              </del>
              <strong class="price-value" :style="{ color: selectedVariant?.salePrice && selectedVariant.salePrice < selectedVariant.originalPrice ? 'var(--teal)' : 'inherit' }">
                {{ formatCurrency(selectedVariant?.sellingPrice ?? product.sellingPrice) }}
              </strong>
              <span class="detail-discount-percent-badge" v-if="selectedVariant?.salePrice && selectedVariant.salePrice < selectedVariant.originalPrice">
                {{ t('Giảm', 'Save') }} {{ Math.round((1 - selectedVariant.salePrice / selectedVariant.originalPrice) * 100) }}%
              </span>
            </div>
          </div>

          <!-- Variants & Colors -->
          <div class="variant-picker" v-if="product.variants && product.variants.length">
            <label>{{ t('Phiên bản', 'Version') }}</label>
            <div class="variant-options">
              <button 
                v-for="variant in product.variants" 
                :key="variant.id" 
                type="button"
                :class="{ active: variant.id === selectedVariantId }"
                :disabled="!variant.isActive || variant.quantity <= 0"
                @click="selectedVariantId = variant.id"
              >
                {{ variant.name }}
              </button>
            </div>
            <template v-if="selectableColors.length">
              <label>{{ t('Màu sắc', 'Color') }}</label>
              <div class="variant-options">
                <button 
                  v-for="color in selectableColors" 
                  :key="color.id" 
                  type="button"
                  :class="{ active: color.id === selectedColorId }"
                  :disabled="!color.isActive || color.quantity <= 0"
                  @click="selectedColorId = color.id"
                >
                  <span v-if="color.hexCode" class="color-dot" :style="{ backgroundColor: color.hexCode }" />
                  {{ color.name }}
                </button>
              </div>
            </template>
          </div>

          <!-- Quantity Picker -->
          <div class="quantity-picker">
            <label for="qty">{{ t('Số lượng', 'Quantity') }}</label>
            <div class="qty-controls">
              <button 
                type="button" 
                :aria-label="t('Giảm số lượng', 'Decrease quantity')"
                @click="productDetailQuantity = Math.max(1, productDetailQuantity - 1)"
              >
                <i class="pi pi-minus" />
              </button>
              <input 
                id="qty" 
                v-model.number="productDetailQuantity" 
                type="number" 
                min="1" 
                :max="selectedStock"
              />
              <button 
                type="button" 
                :aria-label="t('Tăng số lượng', 'Increase quantity')"
                @click="productDetailQuantity = Math.min(selectedStock, productDetailQuantity + 1)"
                :disabled="productDetailQuantity >= selectedStock"
              >
                <i class="pi pi-plus" />
              </button>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="detail-actions">
            <button 
              type="button" 
              class="add-to-cart-btn" 
              :disabled="selectedStock <= 0"
              @click="handleAddToCart"
            >
              <i class="pi pi-shopping-bag" />
              <span>{{ t('Thêm vào giỏ hàng', 'Add to Cart') }}</span>
            </button>
            <button 
              type="button" 
              class="buy-now-btn" 
              :disabled="selectedStock <= 0"
              @click="handleBuyNow"
            >
              <i class="pi pi-bolt" />
              <span>{{ t('Mua ngay', 'Buy Now') }}</span>
            </button>
          </div>

          <!-- Product Specification Accordion Tabs -->
          <div v-if="enrichedProductDetails" class="product-specs-accordion">
            <!-- 1. Overview -->
            <div class="accordion-item">
              <button type="button" class="accordion-header" @click="isDetailOverviewOpen = !isDetailOverviewOpen">
                <div class="accordion-title">
                  <i class="pi pi-align-left" />
                  <span>{{ t('Tổng quan sản phẩm', 'Product Overview') }}</span>
                </div>
                <i :class="['pi', isDetailOverviewOpen ? 'pi-chevron-up' : 'pi-chevron-down']" />
              </button>
              <div v-if="isDetailOverviewOpen" class="accordion-body">
                <p class="overview-text">{{ enrichedProductDetails.overview }}</p>
              </div>
            </div>

            <!-- 2. Specifications -->
            <div class="accordion-item">
              <button type="button" class="accordion-header" @click="isDetailSpecsOpen = !isDetailSpecsOpen">
                <div class="accordion-title">
                  <i class="pi pi-list" />
                  <span>{{ t('Thông số kỹ thuật', 'Specifications') }}</span>
                </div>
                <i :class="['pi', isDetailSpecsOpen ? 'pi-chevron-up' : 'pi-chevron-down']" />
              </button>
              <div v-if="isDetailSpecsOpen" class="accordion-body">
                <table class="specs-table">
                  <tbody>
                    <tr><th>{{ t('Mã sản phẩm', 'Product Code') }}</th><td>{{ enrichedProductDetails.specs.code }}</td></tr>
                    <tr><th>{{ t('Danh mục', 'Category') }}</th><td>{{ enrichedProductDetails.specs.categoryName }}</td></tr>
                    <tr><th>{{ t('Nhà cung cấp', 'Supplier') }}</th><td>{{ enrichedProductDetails.specs.supplierName }}</td></tr>
                    <tr><th>{{ t('Kích thước', 'Dimensions') }}</th><td>{{ enrichedProductDetails.specs.dimensions }}</td></tr>
                    <tr><th>{{ t('Chất liệu', 'Material') }}</th><td>{{ enrichedProductDetails.specs.material }}</td></tr>
                    <tr><th>{{ t('Trọng lượng', 'Weight') }}</th><td>{{ enrichedProductDetails.specs.weight }}</td></tr>
                    <tr><th>{{ t('Xuất xứ', 'Origin') }}</th><td>{{ enrichedProductDetails.specs.origin }}</td></tr>
                    <tr><th>{{ t('Bảo hành', 'Warranty') }}</th><td>{{ enrichedProductDetails.specs.warranty }}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 3. Usage Guide -->
            <div class="accordion-item">
              <button type="button" class="accordion-header" @click="isDetailUsageOpen = !isDetailUsageOpen">
                <div class="accordion-title">
                  <i class="pi pi-book" />
                  <span>{{ t('Hướng dẫn sử dụng', 'Usage Instructions') }}</span>
                </div>
                <i :class="['pi', isDetailUsageOpen ? 'pi-chevron-up' : 'pi-chevron-down']" />
              </button>
              <div v-if="isDetailUsageOpen" class="accordion-body">
                <p class="usage-text">{{ enrichedProductDetails.usage }}</p>
              </div>
            </div>

            <!-- 4. Warranty & Support -->
            <div class="accordion-item">
              <button type="button" class="accordion-header" @click="isDetailWarrantyOpen = !isDetailWarrantyOpen">
                <div class="accordion-title">
                  <i class="pi pi-shield" />
                  <span>{{ t('Chính sách bảo hành & Cam kết', 'Warranty & Support') }}</span>
                </div>
                <i :class="['pi', isDetailWarrantyOpen ? 'pi-chevron-up' : 'pi-chevron-down']" />
              </button>
              <div v-if="isDetailWarrantyOpen" class="accordion-body">
                <p class="warranty-text">{{ enrichedProductDetails.commitment }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
