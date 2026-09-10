<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useLanguage } from '../../services/i18n'
import { formatCurrency } from '../../services/orderApi'
import { translateProductName } from '../../services/productTranslations'
import type { Product } from '../../services/productApi'

const props = defineProps<{
  category: string
  showAllProducts: boolean
  products: Product[]
  promoProducts: Product[]
  searchSuggestions: Product[]
  availableProducts: number
}>()

const emit = defineEmits<{
  (e: 'update:search', val: string): void
  (e: 'update:category', val: string): void
  (e: 'update:showAllProducts', val: boolean): void
  (e: 'open-product-detail', product: Product): void
  (e: 'select-search-result', product: Product): void
}>()

const { t } = useLanguage()

const searchInput = ref('')
const showSearchDropdown = ref(false)
const heroSearchRef = ref<HTMLElement | null>(null)

function handleHeroSearchClickOutside(event: MouseEvent) {
  if (heroSearchRef.value && !heroSearchRef.value.contains(event.target as Node)) {
    showSearchDropdown.value = false
  }
}

function triggerSearch() {
  emit('update:search', searchInput.value)
  showSearchDropdown.value = false
}

function handleSelectSearchResult(product: Product) {
  searchInput.value = ''
  showSearchDropdown.value = false
  emit('select-search-result', product)
}

// Carousel slides
const activeSlide = ref(0)
let slideTimer: ReturnType<typeof setInterval> | null = null

const slides = computed(() => [
  {
    image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200',
    title: t('Thiết Bị Gia Dụng Thông Minh', 'Smart Home Living Devices'),
    subtitle: t('Tối ưu hóa không gian sống, mang lại sự tiện nghi và hiện đại.', 'Optimize your living space with smart comfort.'),
    category: t('Gia dụng', 'Home Appliances'),
    categoryKey: 'Gia dụng',
  },
  {
    image: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=1200',
    title: t('Phụ Kiện Cao Cấp & Thanh Lịch', 'Premium Elegant Accessories'),
    subtitle: t('Khẳng định phong cách riêng với các mẫu phụ kiện tinh tế.', 'Express your style with sophisticated accessories.'),
    category: t('Phụ kiện', 'Accessories'),
    categoryKey: 'Phụ kiện',
  },
  {
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200',
    title: t('Văn Phòng Phẩm Đột Phá', 'Breakthrough Office Supplies'),
    subtitle: t('Nâng cao năng suất làm việc và nguồn cảm hứng bất tận.', 'Boost productivity with boundless creative inspiration.'),
    category: t('Văn phòng', 'Office Supplies'),
    categoryKey: 'Văn phòng',
  },
])

// Flash promo countdown & timer
const activePromoSlide = ref(0)
let promoSlideTimer: ReturnType<typeof setInterval> | null = null
const storewideCountdownText = ref('02 : 14 : 35')
let storewideTimerId: ReturnType<typeof setInterval> | null = null

function updateStorewideCountdown() {
  const now = new Date()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const diff = Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000))
  const hours = String(Math.floor(diff / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
  const seconds = String(diff % 60).padStart(2, '0')
  storewideCountdownText.value = `${hours} : ${minutes} : ${seconds}`
}

onMounted(() => {
  document.addEventListener('click', handleHeroSearchClickOutside)
  updateStorewideCountdown()
  storewideTimerId = setInterval(updateStorewideCountdown, 1000)

  slideTimer = setInterval(() => {
    activeSlide.value = (activeSlide.value + 1) % slides.value.length
  }, 6000)

  promoSlideTimer = setInterval(() => {
    const total = props.promoProducts.length || 1
    activePromoSlide.value = (activePromoSlide.value + 1) % total
  }, 5000)
})

onUnmounted(() => {
  document.removeEventListener('click', handleHeroSearchClickOutside)
  if (storewideTimerId) clearInterval(storewideTimerId)
  if (slideTimer) clearInterval(slideTimer)
  if (promoSlideTimer) clearInterval(promoSlideTimer)
})

const categoryBanner = computed(() => {
  const cat = props.category
  if (cat === 'Gia dụng') {
    return {
      title: t('Thiết Bị Gia Dụng Thông Minh', 'Smart Home Appliances'),
      desc: t('Giải pháp kiến tạo không gian sống tiện nghi, ấm cúng và hiện đại cho ngôi nhà của bạn.', 'Solutions for modern, comfortable living spaces.'),
      image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200',
    }
  }
  if (cat === 'Phụ kiện') {
    return {
      title: t('Phụ Kiện Cao Cấp', 'Premium Accessories'),
      desc: t('Nâng tầm phong cách cá nhân với các sản phẩm phụ kiện thời trang và tiện ích.', 'Elevate your personal style with sophisticated accessories.'),
      image: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=1200',
    }
  }
  if (cat === 'Văn phòng') {
    return {
      title: t('Văn Phòng Phẩm & Thiết Bị', 'Office Stationery & Equipment'),
      desc: t('Khơi nguồn cảm hứng làm việc chuyên nghiệp mỗi ngày.', 'Inspiring professional work every day.'),
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200',
    }
  }
  return {
    title: cat || t('Cửa hàng bán lẻ', 'Retail Store'),
    desc: t('Bộ sưu tập sản phẩm ', 'Collection of ') + (cat || t('chất lượng cao', 'high quality')) + '.',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=1200',
  }
})

function promoBadgeLabel(p: Product | null): string {
  if (!p) return t('SIÊU KHUYẾN MÃI', 'MEGA SALE')
  if (p.salePrice && p.originalPrice && p.salePrice < p.originalPrice) {
    const pct = Math.round((1 - p.salePrice / p.originalPrice) * 100)
    return `GIẢM ĐẾN -${pct}%`
  }
  return t('ƯU ĐÃI NỔI BẬT', 'HOT DEAL')
}

function promoTitleLabel(p: Product | null): string {
  if (!p) return t('Tuần Lễ Vàng Siêu Giảm Giá', 'Golden Week Mega Discount')
  return translateProductName(p)
}

function promoDescriptionLabel(p: Product | null): string {
  if (!p) return t('Cơ hội sở hữu các sản phẩm hàng đầu với mức giá ưu đãi cùng chiết khấu VIP.', 'Best chance to own top products with VIP discounts.')
  return p.description || t('Sản phẩm chính hãng với mức chiết khấu cực kỳ hấp dẫn.', 'Genuine product with attractive promotion.')
}
</script>

<template>
  <div>
    <section v-if="!category && !showAllProducts" class="hero">
      <div class="hero-copy">
        <span class="eyebrow">{{ t('BỘ SƯU TẬP ĐƯỢC TUYỂN CHỌN', 'CURATED COLLECTION') }}</span>
        <h1>{{ t('Mua sắm tinh gọn.', 'Minimalist Shopping.') }}<br /><em class="fs-6">{{ t('Chọn lựa thông minh.', 'Smart Choices.') }}</em></h1>
        
        <div class="hero-search-wrap" ref="heroSearchRef">
          <div class="hero-search-box">
            <i class="pi pi-search" @click="triggerSearch" style="cursor: pointer;" />
            <input 
              v-model="searchInput" 
              type="text" 
              :placeholder="t('Tìm tên sản phẩm, thương hiệu hoặc danh mục...', 'Search products, brands or categories...')" 
              @focus="showSearchDropdown = true"
              @keydown.enter="triggerSearch"
            />
            <button 
              v-if="searchInput" 
              class="hero-search-clear" 
              type="button" 
              @click="searchInput = ''; emit('update:search', '');"
              :aria-label="t('Xóa tìm kiếm', 'Clear search')"
            >
              <i class="pi pi-times" />
            </button>
          </div>
          
          <!-- Suggestions Dropdown -->
          <div v-if="showSearchDropdown && searchInput.trim()" class="hero-search-dropdown">
            <template v-if="searchSuggestions.length">
              <button
                v-for="product in searchSuggestions"
                :key="product.id"
                class="hero-search-result"
                type="button"
                @click="handleSelectSearchResult(product)"
              >
                <div class="search-result-thumb">
                  <img v-if="product.imageUrl" :src="product.imageUrl" :alt="translateProductName(product)" />
                  <i v-else class="pi pi-box" />
                </div>
                <div class="search-result-info">
                  <strong>{{ translateProductName(product) }}</strong>
                  <small>{{ formatCurrency(product.sellingPrice) }}</small>
                </div>
                <i class="pi pi-chevron-right search-result-arrow" />
              </button>
            </template>
            <div v-else class="hero-search-empty">
              <i class="pi pi-search" />
              <span>{{ t('Không tìm thấy kết quả phù hợp', 'No matching results found') }}</span>
            </div>
          </div>
        </div>

        <div class="hero-actions">
          <a class="primary-cta" href="#products" @click.prevent="emit('update:showAllProducts', true); emit('update:category', '');">
            {{ t('Xem sản phẩm', 'Explore Products') }} <i class="pi pi-arrow-right" />
          </a>
          <span><i class="pi pi-check-circle" /> {{ availableProducts }} {{ t('sản phẩm sẵn hàng', 'products in stock') }}</span>
        </div>
      </div>

      <div class="hero-visual">
        <div class="visual-grid"></div>
        <div class="hero-orbit orbit-one"></div>
        <div class="hero-orbit orbit-two"></div>
        <div class="hero-product">
          <span class="hero-icon"><i class="pi pi-box" /></span>
          <small>{{ t('DANH MỤC HIỆN CÓ', 'CATEGORIES IN STORE') }}</small>
          <strong>{{ products.length }}</strong>
          <p>{{ t('Sản phẩm được quản lý tập trung', 'Centrally managed products') }}</p>
        </div>
        <div class="floating-card top-card">
          <i class="pi pi-sync" />
          <span><strong>{{ t('Thời gian thực', 'Real-time') }}</strong><small>{{ t('Đồng bộ tồn kho', 'Stock synchronized') }}</small></span>
        </div>
        <div class="floating-card bottom-card">
          <i class="pi pi-shield" />
          <span><strong>{{ t('Minh bạch', 'Transparent') }}</strong><small>{{ t('Giá và mã sản phẩm', 'Price and product ID') }}</small></span>
        </div>
      </div>
    </section>

    <!-- Carousel Slides -->
    <section v-if="!category && !showAllProducts" class="home-carousel">
      <div class="carousel-track">
        <div 
          v-for="(slide, index) in slides" 
          :key="index"
          class="carousel-slide" 
          :class="{ active: activeSlide === index }"
          :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.45)), url(${slide.image})` }"
        >
          <div class="slide-content">
            <span class="slide-badge">{{ slide.category }}</span>
            <h2>{{ slide.title }}</h2>
            <p>{{ slide.subtitle }}</p>
            <button class="slide-btn" type="button" @click="emit('update:category', slide.categoryKey); emit('update:showAllProducts', false);">
              {{ t('Khám phá ngay', 'Explore now') }} <i class="pi pi-arrow-right" />
            </button>
          </div>
        </div>
      </div>
      <div class="carousel-dots">
        <span 
          v-for="(slide, index) in slides" 
          :key="index"
          class="dot" 
          :class="{ active: activeSlide === index }"
          @click="activeSlide = index"
        />
      </div>
    </section>

    <!-- Category Strip -->
    <section v-if="!category && !showAllProducts" class="category-strip">
      <article 
        class="category-banner-card"
        @click="emit('update:category', 'Gia dụng'); emit('update:showAllProducts', false);"
        :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=600)` }"
      >
        <div class="card-inner">
          <h3>{{ t('Thiết bị Gia dụng', 'Home Appliances') }}</h3>
          <p>{{ t('Kiến tạo không gian sống tiện nghi, tối giản.', 'Creating comfortable, minimalist living spaces.') }}</p>
        </div>
      </article>
      <article 
        class="category-banner-card"
        @click="emit('update:category', 'Phụ kiện'); emit('update:showAllProducts', false);"
        :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=600)` }"
      >
        <div class="card-inner">
          <h3>{{ t('Phụ kiện thông minh', 'Smart Accessories') }}</h3>
          <p>{{ t('Đồng hồ, túi xách, kính mắt và trang sức đẳng cấp.', 'Elegant watches, bags, glasses and premium accessories.') }}</p>
        </div>
      </article>
      <article 
        class="category-banner-card"
        @click="emit('update:category', 'Văn phòng'); emit('update:showAllProducts', false);"
        :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600)` }"
      >
        <div class="card-inner">
          <h3>{{ t('Văn phòng phẩm', 'Office Stationery') }}</h3>
          <p>{{ t('Nguồn cảm hứng cho ngày làm việc chuyên nghiệp.', 'Inspiration for a professional workday.') }}</p>
        </div>
      </article>
    </section>

    <!-- Category Hero Header Banner -->
    <section v-if="category || showAllProducts" class="category-hero-banner" :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.6)), url(${categoryBanner.image})` }">
      <div class="category-banner-content">
        <h1>{{ categoryBanner.title }}</h1>
        <p>{{ categoryBanner.desc }}</p>
      </div>
    </section>

    <!-- Flash Sale Banner Slider with Live Countdown -->
    <section class="promo-flash-banner-slider">
      <div class="promo-track">
        <div 
          v-for="(product, index) in (promoProducts.length ? promoProducts : [null])" 
          :key="product ? product.id : 'default'"
          class="promo-slide"
          :class="{ active: activePromoSlide === index }"
          :style="product && product.imageUrl ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.75)), url(${product.imageUrl})` } : {}"
          @click="product ? emit('open-product-detail', product) : (emit('update:showAllProducts', true), emit('update:category', ''))"
        >
          <div class="promo-flash-content">
            <div class="promo-flash-text">
              <span class="promo-badge">
                <i class="pi pi-bolt" />
                {{ promoBadgeLabel(product) }}
              </span>
              <h2>{{ promoTitleLabel(product) }}</h2>
              <p>{{ promoDescriptionLabel(product) }}</p>
            </div>
            <div class="promo-flash-timer-wrapper" @click.stop>
              <span>{{ t('Thời gian còn lại', 'Time remaining') }}</span>
              <div class="countdown-clock">
                <strong>{{ storewideCountdownText }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="promoProducts.length > 1" class="promo-dots">
        <span 
          v-for="(product, index) in promoProducts" 
          :key="index"
          class="promo-dot" 
          :class="{ active: activePromoSlide === index }"
          @click.stop="activePromoSlide = index"
        />
      </div>
    </section>
  </div>
</template>
