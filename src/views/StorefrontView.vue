<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'
import type { Product } from '../services/productApi'
import { translateProductName } from '../services/productTranslations'

// Composables
import { useStorefrontCart } from '../composables/useStorefrontCart'
import { useStorefrontProducts } from '../composables/useStorefrontProducts'
import { useCustomerPortal } from '../composables/useCustomerPortal'

// Modular Storefront Components
import StorefrontHeader from '../components/storefront/StorefrontHeader.vue'
import StorefrontHeroBanner from '../components/storefront/StorefrontHeroBanner.vue'
import StorefrontCategoryFilter from '../components/storefront/StorefrontCategoryFilter.vue'
import StorefrontProductCard from '../components/storefront/StorefrontProductCard.vue'
import StorefrontProductDetailModal from '../components/storefront/StorefrontProductDetailModal.vue'
import StorefrontLightboxModal from '../components/storefront/StorefrontLightboxModal.vue'
import StorefrontCartDrawer from '../components/storefront/StorefrontCartDrawer.vue'
import StorefrontOrdersModal from '../components/storefront/StorefrontOrdersModal.vue'
import StorefrontProfileModal from '../components/storefront/StorefrontProfileModal.vue'
import StorefrontChatbotWidget from '../components/storefront/StorefrontChatbotWidget.vue'
import StorefrontVoucherCarousel from '../components/storefront/StorefrontVoucherCarousel.vue'
import StorefrontFooter from '../components/storefront/StorefrontFooter.vue'

// Import consolidated storefront stylesheet
import '../assets/storefront.css'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { t } = useLanguage()

// Theme mode
const isDark = ref(false)
function toggleDarkMode() {
  isDark.value = !isDark.value
  localStorage.setItem('theme-dark', String(isDark.value))
  if (isDark.value) {
    document.documentElement.classList.add('app-dark')
  } else {
    document.documentElement.classList.remove('app-dark')
  }
}

// Products Composable
const {
  products,
  loading,
  error,
  search,
  category,
  sort,
  categories,
  searchSuggestions,
  filteredProducts,
  loadProducts,
} = useStorefrontProducts()

// Cart Composable
const {
  cart,
  showCart,
  animateCart,
  cartTotalQuantity,
  cartSubtotal,
  tierConfig,
  tierLabel,
  vipTierDiscountAmount,
  cartFinalTotal,
  addToCart,
  quickAddToCart,
  updateQuantity,
  removeFromCart,
} = useStorefrontCart()

// Customer Portal Composable
const {
  customerProfile,
  customerOrders,
  customerPanelLoading,
  customerPanelError,
  customerPanelLoaded,
  showCustomerPanel,
  showProfileModal,
  showOrdersModal,
  selectedOrderId,
  activeOrderTab,
  ordersSearchQuery,
  cancelOrderModalShow,
  cancelOrderActive,
  cancelReasonText,
  selectedCancelReason,
  cancelReasonOptions,
  editingAddress,
  savingAddress,
  saveAddressError,
  saveAddressSuccess,
  filteredCustomerOrders,
  selectedCustomerOrder,
  loadCustomerPanel,
  openCancellationModal,
  submitCancellation,
  handleSaveAddress,
} = useCustomerPortal()

// UI display states
const showAllProducts = ref(false)
const showOnlySales = ref(false)
const selectedProduct = ref<Product | null>(null)

// Lightbox state
const lightboxImage = reactive({
  show: false,
  imageUrl: '',
  title: '',
  images: [] as string[],
  activeIdx: 0,
})

function openLightbox(product: Product) {
  const baseImages = [product.imageUrl, ...(product.imageUrls ?? [])]
    .map((url) => url?.trim())
    .filter((url): url is string => {
      if (!url) return false
      if (url === '[]' || url === '""' || url === "''" || url.includes('placeholder')) return false
      return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:')
    })
  const mainImg = product.imageUrl || baseImages[0] || ''
  lightboxImage.imageUrl = mainImg
  lightboxImage.title = translateProductName(product)
  lightboxImage.images = baseImages.length > 0 ? baseImages : (mainImg ? [mainImg] : [])
  lightboxImage.activeIdx = 0
  lightboxImage.show = true
}

function closeLightbox() {
  lightboxImage.show = false
}

function prevLightboxImage() {
  if (!lightboxImage.images.length) return
  lightboxImage.activeIdx = (lightboxImage.activeIdx - 1 + lightboxImage.images.length) % lightboxImage.images.length
}

function nextLightboxImage() {
  if (!lightboxImage.images.length) return
  lightboxImage.activeIdx = (lightboxImage.activeIdx + 1) % lightboxImage.images.length
}

// Featured & Promotional products
const featuredProducts = computed(() =>
  products.value.slice(0, 8),
)

const promoProducts = computed(() =>
  products.value.filter((p) => p.salePrice && p.originalPrice && p.salePrice < p.originalPrice),
)

const visibleProducts = computed(() => {
  let list = filteredProducts.value
  if (showOnlySales.value) {
    list = list.filter((p) => p.salePrice && p.originalPrice && p.salePrice < p.originalPrice)
  }
  return list
})

const totalPurchasedOrderCount = computed(() =>
  customerOrders.value.filter((o) => o.status === 'Completed' || o.status === 'Paid').length,
)

const availableProductsCount = computed(() =>
  products.value.filter((p) => p.quantity > 0).length,
)

// Detail modal handlers
function openProductDetail(product: Product) {
  selectedProduct.value = product
}

function closeProductDetail() {
  selectedProduct.value = null
  closeLightbox()
}

function handleAddToCartFromDetail(payload: { product: Product; variantId: number; colorId: number; quantity: number }) {
  const variant = payload.product.variants.find((v) => v.id === payload.variantId) ?? payload.product.variants[0]
  const color = variant?.colors.find((c) => c.id === payload.colorId) ?? variant?.colors[0] ?? {
    id: 0,
    variantId: variant?.id || 0,
    name: 'Mặc định',
    colorCode: '#0f172a',
    quantity: variant?.quantity || payload.product.quantity,
    isActive: true,
    images: [],
  }
  if (variant && color) {
    addToCart(payload.product, variant, color, payload.quantity)
    closeProductDetail()
    showCart.value = true
  }
}

function handleBuyNowFromDetail(payload: { product: Product; variantId: number; colorId: number; quantity: number }) {
  handleAddToCartFromDetail(payload)
  proceedToCheckout()
}

// Checkout Redirection
function proceedToCheckout() {
  showCart.value = false
  if (!cart.value.length) return
  if (!auth.isAuthenticated || auth.user?.role !== 'Customer') {
    router.push({ name: 'customer-login', query: { redirect: '/checkout' } })
    return
  }
  router.push({ name: 'checkout' })
}

// Customer Panel Toggle & Modals
function toggleCustomerPanel() {
  showCustomerPanel.value = !showCustomerPanel.value
  if (showCustomerPanel.value && !customerPanelLoaded.value) {
    loadCustomerPanel()
  }
}

function openProfileModal() {
  editingAddress.value = customerProfile.value?.address || auth.user?.address || ''
  saveAddressError.value = ''
  saveAddressSuccess.value = false
  showProfileModal.value = true
  showCustomerPanel.value = false
}

function openOrdersModal() {
  ordersSearchQuery.value = ''
  selectedOrderId.value = null
  activeOrderTab.value = 'pending'
  showOrdersModal.value = true
  showCustomerPanel.value = false
  if (!customerPanelLoaded.value) {
    loadCustomerPanel()
  }
}

async function logoutCustomer() {
  await auth.logout()
  showCustomerPanel.value = false
  router.push({ name: 'customer-login', query: { redirect: '/' } })
}

// Search result click
function handleSearchResultSelect(product: Product) {
  openProductDetail(product)
}

// Chatbot interactions
function handleOpenProductFromChat(productId: number) {
  const p = products.value.find((item) => item.id === productId)
  if (p) openProductDetail(p)
}

function handleAddToCartFromChat(productId: number) {
  const p = products.value.find((item) => item.id === productId)
  if (p) {
    quickAddToCart(p)
    showCart.value = true
  }
}

function clearFilters() {
  category.value = ''
  search.value = ''
  showOnlySales.value = false
  showAllProducts.value = true
}

onMounted(() => {
  isDark.value = localStorage.getItem('theme-dark') === 'true'
  if (isDark.value) {
    document.documentElement.classList.add('app-dark')
  } else {
    document.documentElement.classList.remove('app-dark')
  }

  showCart.value = route.query.cart === 'open'
  loadProducts()
  if (auth.isAuthenticated && auth.user?.role === 'Customer') {
    loadCustomerPanel()
  }
})
</script>

<template>
  <div class="store">
    <!-- 1. Header Navigation -->
    <StorefrontHeader
      :category="category"
      :show-all-products="showAllProducts"
      :categories="categories"
      :cart-count="cartTotalQuantity"
      :animate-cart="animateCart"
      :is-dark="isDark"
      :show-customer-panel="showCustomerPanel"
      :customer-profile="customerProfile"
      :customer-panel-loading="customerPanelLoading"
      :customer-panel-error="customerPanelError"
      :total-purchased-order-count="totalPurchasedOrderCount"
      @select-category="category = $event; showAllProducts = false;"
      @toggle-all-products="category = ''; showAllProducts = true;"
      @toggle-dark-mode="toggleDarkMode"
      @open-cart="showCart = true"
      @toggle-customer-panel="toggleCustomerPanel"
      @open-profile-modal="openProfileModal"
      @open-orders-modal="openOrdersModal"
      @logout-customer="logoutCustomer"
    />

    <!-- 2. Main Store Content -->
    <main>
      <!-- Hero Banner with Carousels & Search -->
      <StorefrontHeroBanner
        :category="category"
        :show-all-products="showAllProducts"
        :products="products"
        :promo-products="promoProducts"
        :search-suggestions="searchSuggestions"
        :available-products="availableProductsCount"
        @update:search="search = $event; showAllProducts = true;"
        @update:category="category = $event"
        @update:show-all-products="showAllProducts = $event"
        @open-product-detail="openProductDetail"
        @select-search-result="handleSearchResultSelect"
      />

      <!-- New Promotional Voucher Codes Sliding Banner -->
      <StorefrontVoucherCarousel />

      <!-- Products Catalog Section -->
      <section id="products" class="catalog">
        <!-- Featured Products on Home Tab -->
        <div v-if="!category && !showAllProducts">
          <div class="section-heading">
            <div>
              <span class="eyebrow">{{ t('SẢN PHẨM KHUYÊN DÙNG', 'RECOMMENDED FOR YOU') }}</span>
              <h2>{{ t('Sản phẩm nổi bật', 'Featured Products') }}</h2>
              <p>{{ t('Những sản phẩm được khách hàng lựa chọn nhiều nhất.', 'The most selected items by our customers.') }}</p>
            </div>
          </div>
          
          <div v-if="loading" class="product-grid" style="margin-top: 30px;">
            <article v-for="item in 8" :key="item" class="product-card skeleton-card">
              <div class="skeleton image-skeleton"></div>
              <div class="skeleton line short"></div>
              <div class="skeleton line"></div>
              <div class="skeleton line medium"></div>
            </article>
          </div>
          <div v-else class="product-grid" style="margin-top: 30px;">
            <StorefrontProductCard
              v-for="product in featuredProducts"
              :key="product.id"
              :product="product"
              :vip-discount-percent="tierConfig.discountPercent"
              @click="openProductDetail"
              @quick-add="quickAddToCart"
            />
          </div>
        </div>

        <!-- Filtered Catalog on Category / All Products Tab -->
        <div v-else>
          <div class="section-heading">
            <div>
              <span class="eyebrow">{{ t('DANH MỤC SẢN PHẨM', 'PRODUCT CATALOG') }}</span>
              <h2>{{ category || t('Tất cả sản phẩm', 'All Products') }}</h2>
              <p>{{ visibleProducts.length }} {{ t('sản phẩm phù hợp', 'matching products') }}</p>
            </div>
          </div>

          <!-- Category filter & Sorting Toolbar -->
          <StorefrontCategoryFilter
            :category="category"
            :categories="categories"
            :search="search"
            :sort="sort"
            :show-only-sales="showOnlySales"
            :show-all-products="showAllProducts"
            :total-count="products.length"
            @update:category="category = $event; showAllProducts = false;"
            @update:search="search = $event"
            @update:sort="sort = $event"
            @update:show-only-sales="showOnlySales = $event"
            @update:show-all-products="showAllProducts = $event"
            @clear-filters="clearFilters"
          />

          <!-- State: Error -->
          <div v-if="error" class="state-card error-state">
            <span><i class="pi pi-wifi" /></span>
            <div>
              <strong>{{ t('Chưa thể kết nối Product service', 'Could not connect to Product service') }}</strong>
              <p>{{ error }}</p>
            </div>
            <button type="button" @click="loadProducts">{{ t('Thử lại', 'Retry') }}</button>
          </div>

          <!-- State: Loading -->
          <div v-else-if="loading" class="product-grid">
            <article v-for="item in 8" :key="item" class="product-card skeleton-card">
              <div class="skeleton image-skeleton"></div>
              <div class="skeleton line short"></div>
              <div class="skeleton line"></div>
              <div class="skeleton line medium"></div>
            </article>
          </div>

          <!-- State: Empty -->
          <div v-else-if="!visibleProducts.length" class="state-card empty-state">
            <span><i class="pi pi-search" /></span>
            <div>
              <strong>{{ t('Không tìm thấy sản phẩm', 'No products found') }}</strong>
              <p>{{ t('Hãy thử từ khóa hoặc danh mục khác.', 'Please try different keywords or categories.') }}</p>
            </div>
            <button type="button" @click="clearFilters">{{ t('Xóa bộ lọc', 'Clear filters') }}</button>
          </div>

          <!-- Product Grid -->
          <div v-else class="product-grid">
            <StorefrontProductCard
              v-for="product in visibleProducts"
              :key="product.id"
              :product="product"
              :vip-discount-percent="tierConfig.discountPercent"
              @click="openProductDetail"
              @quick-add="quickAddToCart"
            />
          </div>
        </div>
      </section>
    </main>

    <!-- 3. Product Detail Modal -->
    <StorefrontProductDetailModal
      :product="selectedProduct"
      @close="closeProductDetail"
      @add-to-cart="handleAddToCartFromDetail"
      @buy-now="handleBuyNowFromDetail"
      @open-lightbox="openLightbox"
    />

    <!-- 4. Lightbox Zoom Modal -->
    <StorefrontLightboxModal
      :show="lightboxImage.show"
      :image-url="lightboxImage.imageUrl"
      :title="lightboxImage.title"
      :images="lightboxImage.images"
      :active-idx="lightboxImage.activeIdx"
      @close="closeLightbox"
      @prev="prevLightboxImage"
      @next="nextLightboxImage"
      @select="lightboxImage.activeIdx = $event"
    />

    <!-- 5. Cart Drawer -->
    <StorefrontCartDrawer
      :show="showCart"
      :cart="cart"
      :cart-count="cartTotalQuantity"
      :cart-subtotal="cartSubtotal"
      :vip-tier-discount-amount="vipTierDiscountAmount"
      :cart-final-total="cartFinalTotal"
      :tier-config="tierConfig"
      :tier-label="tierLabel"
      @close="showCart = false"
      @update-quantity="updateQuantity($event.index, $event.quantity)"
      @remove-line="removeFromCart"
      @proceed-checkout="proceedToCheckout"
    />

    <!-- 6. Customer Orders Modal -->
    <StorefrontOrdersModal
      :show="showOrdersModal"
      :customer-panel-loading="customerPanelLoading"
      :customer-orders="customerOrders"
      :filtered-customer-orders="filteredCustomerOrders"
      :selected-customer-order="selectedCustomerOrder"
      :selected-order-id="selectedOrderId"
      :active-order-tab="activeOrderTab"
      :orders-search-query="ordersSearchQuery"
      :cancel-order-modal-show="cancelOrderModalShow"
      :cancel-order-active="cancelOrderActive"
      :cancel-reason-text="cancelReasonText"
      :selected-cancel-reason="selectedCancelReason"
      :cancel-reason-options="cancelReasonOptions"
      @close="showOrdersModal = false"
      @update:active-order-tab="activeOrderTab = $event"
      @update:orders-search-query="ordersSearchQuery = $event"
      @update:selected-order-id="selectedOrderId = $event"
      @update:cancel-reason-text="cancelReasonText = $event"
      @update:selected-cancel-reason="selectedCancelReason = $event"
      @close-cancel-modal="cancelOrderModalShow = false"
      @open-cancel-modal="openCancellationModal"
      @submit-cancellation="submitCancellation"
    />

    <!-- 7. Customer Profile Modal -->
    <StorefrontProfileModal
      :show="showProfileModal"
      :customer-profile="customerProfile"
      :editing-address="editingAddress"
      :saving-address="savingAddress"
      :save-address-error="saveAddressError"
      :save-address-success="saveAddressSuccess"
      @close="showProfileModal = false"
      @update:editing-address="editingAddress = $event"
      @save-address="handleSaveAddress"
    />

    <!-- 8. Floating Storefront AI Assistant Chatbot -->
    <StorefrontChatbotWidget
      :products="products"
      @open-product="handleOpenProductFromChat"
      @add-to-cart="handleAddToCartFromChat"
    />

    <!-- 9. Storefront Footer -->
    <StorefrontFooter />
  </div>
</template>
