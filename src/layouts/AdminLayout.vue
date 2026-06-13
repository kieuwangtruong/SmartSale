<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import { getRoleLabel } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)

const allNavigation = [
  { to: '/dashboard', label: 'Tổng quan', icon: 'pi pi-chart-bar', roles: ['Admin'] },
  { to: '/orders', label: 'Đơn hàng', icon: 'pi pi-shopping-cart', roles: ['Admin', 'SalesStaff'] },
  { to: '/customers', label: 'Khách hàng', icon: 'pi pi-users', roles: ['Admin', 'SalesStaff'] },
  { to: '/suppliers', label: 'Nhà cung cấp', icon: 'pi pi-truck', roles: ['Admin', 'SalesStaff'] },
  { to: '/products', label: 'Sản phẩm', icon: 'pi pi-box', roles: ['Admin', 'WarehouseKeeper'] },
  { to: '/inventory', label: 'Kho hàng', icon: 'pi pi-warehouse', roles: ['Admin', 'WarehouseKeeper'] },
  { to: '/users', label: 'Tài khoản', icon: 'pi pi-user-edit', roles: ['Admin'] },
]

const navigation = computed(() =>
  allNavigation.filter((item) => auth.role && item.roles.includes(auth.role)),
)
const currentPage = computed(
  () => navigation.value.find((item) => item.to === route.path)?.label ?? 'Quản lý',
)
const roleLabel = computed(() => getRoleLabel(auth.role))

async function handleLogout() {
  await auth.logout()
  await router.replace('/admin')
}

function syncAuth() {
  auth.sync()
}

onMounted(() => window.addEventListener('auth-changed', syncAuth))
onUnmounted(() => window.removeEventListener('auth-changed', syncAuth))
</script>

<template>
  <div class="admin-shell">
    <button
      v-if="sidebarOpen"
      class="sidebar-backdrop"
      type="button"
      aria-label="Đóng menu"
      @click="sidebarOpen = false"
    />

    <aside class="admin-sidebar" :class="{ open: sidebarOpen }">
      <RouterLink class="admin-brand" to="/">
        <span class="admin-brand-mark"><i class="pi pi-shopping-bag" /></span>
        <span><strong>SalesFlow</strong><small>Inventory System</small></span>
      </RouterLink>

      <p class="nav-caption">MENU QUẢN LÝ</p>
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
          severity="secondary"
          text
          rounded
          aria-label="Đăng xuất"
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
            aria-label="Mở menu"
            @click="sidebarOpen = true"
          />
          <div><small>HỆ THỐNG QUẢN LÝ</small><h1>{{ currentPage }}</h1></div>
        </div>
        <div class="topbar-actions">
          <RouterLink class="store-shortcut" to="/"><i class="pi pi-external-link" /> Cửa hàng</RouterLink>
          <span class="role-chip"><i class="pi pi-shield" /> {{ roleLabel }}</span>
        </div>
      </header>

      <main class="admin-main"><RouterView /></main>
    </div>
  </div>
  <Toast />
  <ConfirmDialog />
</template>
