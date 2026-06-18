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
const { t, currentLanguage, setLanguage } = useLanguage()

const allNavigation = computed(() => [
  { to: '/dashboard', label: t('Tổng quan', 'Dashboard'), icon: 'pi pi-chart-bar', roles: ['Admin'] },
  { to: '/orders', label: t('Đơn hàng', 'Orders'), icon: 'pi pi-shopping-cart', roles: ['Admin', 'SalesStaff'] },
  { to: '/customers', label: t('Khách hàng', 'Customers'), icon: 'pi pi-users', roles: ['Admin', 'SalesStaff'] },
  { to: '/suppliers', label: t('Nhà cung cấp', 'Suppliers'), icon: 'pi pi-truck', roles: ['Admin', 'WarehouseKeeper'] },
  { to: '/products', label: t('Sản phẩm', 'Products'), icon: 'pi pi-box', roles: ['Admin', 'WarehouseKeeper', 'SalesStaff'] },
  { to: '/inventory', label: t('Kho hàng', 'Inventory'), icon: 'pi pi-warehouse', roles: ['Admin', 'WarehouseKeeper'] },
  { to: '/users', label: t('Nhân sự', 'HR Users'), icon: 'pi pi-user-edit', roles: ['Admin'] },
  { to: '/employees', label: t('Chấm công', 'Attendance'), icon: 'pi pi-calendar-clock', roles: ['Admin'] },
  { to: '/customer', label: t('Hồ sơ của tôi', 'My Profile'), icon: 'pi pi-id-card', roles: ['Customer'] },
])
const navigation = computed(() =>
  allNavigation.value.filter((item) => auth.role && item.roles.includes(auth.role)),
)
const currentPage = computed(
  () => navigation.value.find((item) => item.to === route.path)?.label ?? t('Quản lý', 'Management'),
)
const roleLabel = computed(() => {
  const role = auth.role
  if (role === 'Admin') return t('Quản trị viên', 'Admin')
  if (role === 'SalesStaff') return t('Nhân viên bán lẻ', 'Retail Staff')
  if (role === 'WarehouseKeeper') return t('Thủ kho quản lý', 'Warehouse Keeper')
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

onMounted(() => {
  window.addEventListener('auth-changed', syncAuth)
  isDark.value = localStorage.getItem('theme-dark') === 'true'
  if (isDark.value) {
    document.documentElement.classList.add('app-dark')
  } else {
    document.documentElement.classList.remove('app-dark')
  }
})
onUnmounted(() => window.removeEventListener('auth-changed', syncAuth))
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

    <aside class="admin-sidebar" :class="{ open: sidebarOpen }">
      <RouterLink class="admin-brand" to="/">
        <span class="admin-brand-mark"><i class="pi pi-shopping-bag" /></span>
        <span><strong>SalesFlow</strong><small>{{ t('Hệ thống bán hàng', 'Sales & Inventory') }}</small></span>
      </RouterLink>

      <p class="nav-caption">{{ t('MENU QUẢN LÝ', 'MANAGEMENT MENU') }}</p>
      <nav class="admin-navigation">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          @click="sidebarOpen = false"
        >
          <i :class="item.icon" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="admin-profile">
        <span class="profile-avatar">{{ auth.user?.fullName?.charAt(0).toUpperCase() }}</span>
        <div><strong>{{ auth.user?.fullName }}</strong><small>{{ roleLabel }}</small></div>
        <Button
          icon="pi pi-sign-out"
          severity="danger"
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
          <div><small>{{ t('HỆ THỐNG QUẢN LÝ', 'MANAGEMENT SYSTEM') }}</small><h1>{{ currentPage }}</h1></div>
        </div>
        <div class="topbar-actions">
          <Button
            :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
            severity="secondary"
            text
            rounded
            :aria-label="t('Đổi giao diện', 'Toggle Dark Mode')"
            @click="toggleDarkMode"
          />
          <Button
            icon="pi pi-globe"
            :label="currentLanguage === 'vi' ? 'EN' : 'VI'"
            severity="secondary"
            text
            rounded
            :aria-label="t('Đổi ngôn ngữ', 'Switch Language')"
            @click="toggleLanguage"
          />
          <RouterLink class="store-shortcut" to="/"><i class="pi pi-external-link" /> {{ t('Cửa hàng', 'Storefront') }}</RouterLink>
          <span class="role-chip"><i class="pi pi-shield" /> {{ roleLabel }}</span>
        </div>
      </header>

      <main class="admin-main"><RouterView /></main>
    </div>
  </div>
  <Toast />
  <ConfirmDialog />
</template>
