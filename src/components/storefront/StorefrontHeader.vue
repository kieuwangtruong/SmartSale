<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useLanguage } from '../../services/i18n'
import { useAuthStore } from '../../stores/authStore'
import CustomerTierBadge from '../CustomerTierBadge.vue'
import type { UserDto } from '../../services/userApi'

const props = defineProps<{
  category: string
  showAllProducts: boolean
  categories: string[]
  cartCount: number
  animateCart: boolean
  isDark: boolean
  showCustomerPanel: boolean
  customerProfile: UserDto | null
  customerPanelLoading: boolean
  customerPanelError: string
  totalPurchasedOrderCount: number
}>()

const emit = defineEmits<{
  (e: 'select-category', cat: string): void
  (e: 'toggle-all-products'): void
  (e: 'toggle-dark-mode'): void
  (e: 'open-cart'): void
  (e: 'toggle-customer-panel'): void
  (e: 'open-profile-modal'): void
  (e: 'open-orders-modal'): void
  (e: 'logout-customer'): void
}>()

const { t, currentLanguage, setLanguage } = useLanguage()
const auth = useAuthStore()

function toggleLang() {
  setLanguage(currentLanguage.value === 'vi' ? 'en' : 'vi')
}

const isCustomerLoggedIn = computed(() =>
  auth.isAuthenticated && auth.user?.role === 'Customer',
)

const displayedCustomerTier = computed(() => {
  const profile = props.customerProfile || auth.user
  return profile?.customerTier || 'Bronze'
})

const customerInitials = computed(() => {
  const name = (props.customerProfile?.fullName || auth.user?.fullName || 'Khách hàng').trim()
  const parts = name.split(/\s+/)
  const first = parts[0]
  const last = parts[parts.length - 1]
  if (parts.length >= 2 && first && last) {
    return ((first[0] || '') + (last[0] || '')).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

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
    <div class="announcement">
      <span><i class="pi pi-sparkles" /> {{ t('Giá bán và tồn kho được đồng bộ trực tiếp', 'Real-time stock and price synchronization active') }}</span>
      <RouterLink to="/login/staff">{{ t('Dành cho nhân viên', 'Staff Login') }} <i class="pi pi-arrow-up-right" /></RouterLink>
    </div>

    <header class="store-header">
      <RouterLink class="store-brand" to="/">
        <span class="brand-mark"><img src="/icon.png" alt="Smart Sale Store" /></span>
        <span class="brand-copy"><strong>Smart Sale Store</strong><small>{{ t('Cửa hàng thông minh', 'Smart Store') }}</small></span>
      </RouterLink>

      <nav class="main-nav">
        <a href="#" :class="{ active: !category && !showAllProducts }" @click.prevent="emit('select-category', '')">{{ t('Trang chủ', 'Home') }}</a>
        <a href="#" :class="{ active: !category && showAllProducts }" @click.prevent="emit('toggle-all-products')">{{ t('Tất cả sản phẩm', 'All Products') }}</a>
        <a 
          v-for="cat in categories" 
          :key="cat" 
          href="#" 
          :class="{ active: category === cat }" 
          @click.prevent="emit('select-category', cat)"
        >
          {{ translateCategory(cat) }}
        </a>
      </nav>

      <div class="header-right">
        <!-- Language Switcher -->
        <button
          class="lang-toggle-btn"
          type="button"
          @click="toggleLang"
          :title="t('Đang dùng Tiếng Việt — bấm để đổi sang English', 'Using English — click to switch to Vietnamese')"
        >
          <i class="pi pi-globe" />
          <span>{{ currentLanguage === 'vi' ? 'VI' : 'EN' }}</span>
        </button>

        <RouterLink v-if="!isCustomerLoggedIn" class="customer-link icon-only" to="/customer-login" :title="t('Tài khoản', 'Account')">
          <i class="pi pi-user" />
        </RouterLink>
        <div v-else class="customer-menu">
          <button class="customer-avatar" type="button" @click="emit('toggle-customer-panel')">
            {{ customerInitials }}
            <span class="avatar-tier-icon">
              <CustomerTierBadge :tier="displayedCustomerTier" size="xs" variant="logo-only" />
            </span>
          </button>
          <aside v-if="showCustomerPanel" class="customer-panel">
            <div class="customer-panel-head">
              <span class="customer-avatar large">{{ customerInitials }}</span>
              <div>
                <strong>{{ customerProfile?.fullName || auth.user?.fullName }}</strong>
                <small>{{ customerProfile?.email || auth.user?.email }}</small>
              </div>
            </div>
            <p v-if="customerPanelError" class="customer-panel-error">{{ customerPanelError }}</p>
            <p v-else-if="customerPanelLoading" class="customer-panel-muted">{{ t('Đang tải thông tin...', 'Loading profile info...') }}</p>
            <template v-else>
              <div class="customer-tier-card-wrapper">
                <CustomerTierBadge
                  :tier="displayedCustomerTier"
                  size="md"
                  variant="card"
                  :show-discount="true"
                  :show-tagline="true"
                />
                <div class="tier-orders-stat">
                  <i class="pi pi-shopping-bag" />
                  <span>{{ totalPurchasedOrderCount }} {{ t('đơn đã tích lũy', 'accumulated orders') }}</span>
                </div>
              </div>
              <div class="customer-panel-buttons">
                <button class="panel-btn" type="button" @click="emit('open-profile-modal')">
                  <i class="pi pi-id-card" />
                  <span>{{ t('Thông tin cá nhân', 'Personal Information') }}</span>
                </button>
                <button class="panel-btn" type="button" @click="emit('open-orders-modal')">
                  <i class="pi pi-shopping-bag" />
                  <span>{{ t('Đơn hàng của tôi', 'My Orders') }}</span>
                </button>
              </div>
            </template>

            <button class="logout-customer" type="button" @click="emit('logout-customer')">
              <i class="pi pi-sign-out" /> {{ t('Đăng xuất', 'Logout') }}
            </button>
          </aside>
        </div>
        <!-- Animated Sun/Moon Pill Theme Switch -->
        <button
          type="button"
          class="theme-pill-toggle"
          :class="{ 'is-dark': isDark }"
          :title="isDark ? t('Chuyển sang Giao diện Sáng', 'Switch to Light Mode') : t('Chuyển sang Giao diện Tối', 'Switch to Dark Mode')"
          @click="emit('toggle-dark-mode')"
          :aria-label="t('Đổi giao diện', 'Switch theme')"
        >
          <div class="pill-track">
            <span class="pill-icon moon-icon">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                <path d="M12.3 2a10 10 0 0 0-.19 20 10 10 0 0 0 8.7-5.12 1 1 0 0 0-1.12-1.46A7 7 0 1 1 10.6 3.3a1 1 0 0 0-.6-1.12 1 1 0 0 0-1.7-.18Z" />
              </svg>
              <span class="pill-star star-1">✦</span>
            </span>
            <span class="pill-icon sun-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            </span>
            <span class="pill-knob" />
          </div>
        </button>

        <button class="cart-button" :class="{ 'cart-pop': animateCart, 'has-items': cartCount > 0 }" type="button" @click="emit('open-cart')">
          <i class="pi pi-shopping-bag" />
          <span>{{ t('Giỏ hàng', 'Cart') }}</span>
          <b>{{ cartCount }}</b>
        </button>
      </div>
    </header>
  </div>
</template>
