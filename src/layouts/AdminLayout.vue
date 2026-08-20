<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)
const searchQuery = ref('')
const { t, currentLanguage, setLanguage } = useLanguage()

interface NavItem {
  to: string
  label: string
  icon: string
  roles: string[]
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections = computed<NavSection[]>(() => [
  {
    title: '',
    items: [
      { to: '/dashboard', label: t('Tổng quan', 'Dashboard'), icon: 'pi pi-th-large', roles: ['Admin'] },
      { to: '/orders', label: t('Đơn hàng', 'Orders'), icon: 'pi pi-shopping-cart', roles: ['Admin', 'SalesStaff'] },
      { to: '/products', label: t('Sản phẩm', 'Products'), icon: 'pi pi-box', roles: ['Admin', 'WarehouseKeeper', 'SalesStaff'] },
      { to: '/customers', label: t('Khách hàng', 'Customers'), icon: 'pi pi-users', roles: ['Admin', 'SalesStaff'] },
      { to: '/admin/analytics', label: t('Báo cáo & BI', 'Reports'), icon: 'pi pi-file', roles: ['Admin'], badge: 'BI' },
    ],
  },
  {
    title: '',
    items: [
      { to: '/inventory', label: t('Kho & Tích hợp', 'Integrations'), icon: 'pi pi-link', roles: ['Admin', 'WarehouseKeeper'] },
      { to: '/suppliers', label: t('Nhà cung cấp', 'Suppliers'), icon: 'pi pi-truck', roles: ['Admin', 'WarehouseKeeper'] },
      { to: '/users', label: t('Nhân sự', 'HR Users'), icon: 'pi pi-user-edit', roles: ['Admin'] },
      { to: '/employees', label: t('Cài đặt', 'Settings'), icon: 'pi pi-cog', roles: ['Admin'] },
      { to: '/customer', label: t('Hồ sơ của tôi', 'My Profile'), icon: 'pi pi-id-card', roles: ['Customer'] },
    ],
  },
])

const filteredSections = computed(() => {
  const userRole = auth.role
  if (!userRole) return []

  return navSections.value
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(userRole)),
    }))
    .filter((section) => section.items.length > 0)
})

const allNavItems = computed(() =>
  navSections.value.flatMap((s) => s.items).filter((item) => auth.role && item.roles.includes(auth.role)),
)

const currentPage = computed(
  () => allNavItems.value.find((item) => item.to === route.path)?.label ?? t('Quản lý hệ thống', 'System Management'),
)

const roleLabel = computed(() => {
  const role = auth.role
  if (role === 'Admin') return t('Quản trị viên', 'Admin')
  if (role === 'SalesStaff') return t('Nhân viên bán lẻ', 'Retail Staff')
  if (role === 'WarehouseKeeper') return t('Thủ kho', 'Warehouse Keeper')
  if (role === 'Customer') return t('Khách hàng', 'Customer')
  return role || ''
})

async function handleLogout() {
  await auth.logout()
  await router.replace('/admin')
}

function syncAuth() {
  auth.sync()
}

const isDark = ref(false)

function toggleDarkMode() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('app-dark')
    localStorage.setItem('theme-dark', 'true')
  } else {
    document.documentElement.classList.remove('app-dark')
    localStorage.setItem('theme-dark', 'false')
  }
}

function toggleLanguage() {
  setLanguage(currentLanguage.value === 'vi' ? 'en' : 'vi')
}

function handleSearchKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    const searchInput = document.getElementById('global-search-input')
    searchInput?.focus()
  }
}

onMounted(() => {
  window.addEventListener('auth-changed', syncAuth)
  window.addEventListener('keydown', handleSearchKeydown)
  isDark.value = localStorage.getItem('theme-dark') === 'true'
  if (isDark.value) {
    document.documentElement.classList.add('app-dark')
  } else {
    document.documentElement.classList.remove('app-dark')
  }
})

onUnmounted(() => {
  window.removeEventListener('auth-changed', syncAuth)
  window.removeEventListener('keydown', handleSearchKeydown)
})
</script>

<template>
  <div class="admin-shell">
    <button
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      type="button"
      :aria-label="t('Đóng menu', 'Close Menu')"
      @click="sidebarOpen = false"
    />

    <aside class="admin-sidebar ezmart-sidebar-style" :class="{ open: sidebarOpen }">
      <!-- Brand Header with Emerald 4-square grid -->
      <RouterLink class="admin-brand brand-green" to="/dashboard">
        <div class="brand-logo-grid">
          <span class="brand-sq sq-1" />
          <span class="brand-sq sq-2" />
          <span class="brand-sq sq-3" />
          <span class="brand-sq sq-4" />
        </div>
        <div class="brand-title-wrap">
          <strong>SmartSale <span class="brand-badge">PRO</span></strong>
        </div>
      </RouterLink>

      <nav class="admin-navigation">
        <template v-for="(section, sIdx) in filteredSections" :key="sIdx">
          <div v-if="sIdx > 0" class="nav-section-divider" />
          <p v-if="section.title" class="nav-caption">{{ section.title }}</p>
          <RouterLink
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            @click="sidebarOpen = false"
          >
            <i :class="item.icon" />
            <span>{{ item.label }}</span>
            <span v-if="item.badge" class="nav-tag">{{ item.badge }}</span>
          </RouterLink>
        </template>
      </nav>

      <div class="admin-profile ezmart-profile-card">
        <div class="profile-avatar-wrap">
          <span class="profile-avatar">{{ auth.user?.fullName?.charAt(0).toUpperCase() || 'A' }}</span>
          <span class="avatar-status-dot" />
        </div>
        <div class="profile-text">
          <strong>{{ auth.user?.fullName || 'Quản trị viên' }}</strong>
          <small>{{ roleLabel }}</small>
        </div>
        <Button
          icon="pi pi-sign-out"
          severity="secondary"
          text
          rounded
          :aria-label="t('Đăng xuất', 'Logout')"
          @click="handleLogout"
        />
      </div>
    </aside>

    <div class="admin-content">
      <header class="admin-topbar">
        <div class="topbar-title">
          <Button
            class="menu-toggle"
            icon="pi pi-bars"
            severity="secondary"
            text
            rounded
            :aria-label="t('Mở menu', 'Open Menu')"
            @click="sidebarOpen = true"
          />
          <div>
            <small>{{ t('HỆ THỐNG QUẢN LÝ DOANH THU', 'SALES & REVENUE MANAGEMENT') }}</small>
            <h1>{{ currentPage }}</h1>
          </div>
        </div>

        <div class="topbar-search ezmart-search-bar">
          <input
            id="global-search-input"
            v-model="searchQuery"
            type="text"
            :placeholder="t('Tìm kiếm hàng hóa, đơn hàng... (⌘K)', 'Search stock, order, etc (⌘K)')"
          />
          <i class="pi pi-search" />
        </div>

        <div class="topbar-actions ezmart-vibe-dock">
          <span class="live-status-chip">
            <span class="pulse-dot" />
            {{ t('Hệ thống Live', 'Live Sync') }}
          </span>

          <div class="dock-divider" />

          <button
            type="button"
            class="topbar-icon-btn lang-btn"
            :title="t('Đổi ngôn ngữ', 'Switch Language')"
            @click="toggleLanguage"
          >
            <i class="pi pi-globe" />
            <span>{{ currentLanguage === 'vi' ? 'EN' : 'VI' }}</span>
          </button>

          <button
            type="button"
            class="topbar-icon-btn"
            :title="t('Đổi giao diện', 'Toggle Dark Mode')"
            @click="toggleDarkMode"
          >
            <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
          </button>

          <div class="dock-divider" />

          <RouterLink class="dock-storefront-btn" to="/">
            <i class="pi pi-shopping-bag" />
            <span>{{ t('Cửa hàng', 'Storefront') }}</span>
          </RouterLink>

          <div class="topbar-profile-pill">
            <div class="profile-avatar-sm">
              {{ auth.user?.fullName?.charAt(0).toUpperCase() || 'A' }}
            </div>
            <div class="profile-info-sm">
              <strong>{{ auth.user?.fullName || 'Quản trị viên' }}</strong>
              <small>{{ roleLabel }}</small>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-main">
        <RouterView />
      </main>
    </div>
  </div>
  <Toast />
  <ConfirmDialog />
</template>
