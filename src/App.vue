<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/authStore'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const isPublicPage = computed(() => Boolean(route.meta.public))

const navigation = computed(() => {
  if (auth.role === 'Admin') {
    return [
      { to: '/dashboard', label: 'Tổng quan' },
      { to: '/orders', label: 'Đơn hàng' },
      { to: '/customers', label: 'Khách hàng' },
      { to: '/suppliers', label: 'Nhà cung cấp' },
      { to: '/products', label: 'Sản phẩm' },
      { to: '/inventory', label: 'Kho hàng' },
      { to: '/users', label: 'Tài khoản' },
    ]
  }
  if (auth.role === 'WarehouseKeeper') {
    return [
      { to: '/inventory', label: 'Kho hàng' },
      { to: '/products', label: 'Sản phẩm' },
    ]
  }
  return [
    { to: '/orders', label: 'Đơn hàng' },
    { to: '/customers', label: 'Khách hàng' },
    { to: '/suppliers', label: 'Nhà cung cấp' },
  ]
})

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
  <RouterView v-if="isPublicPage || !auth.isAuthenticated" />

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">S</span>
        <div>
          <strong>Sales & Inventory</strong>
          <small>{{ auth.role }}</small>
        </div>
      </div>

      <nav>
        <RouterLink v-for="item in navigation" :key="item.to" :to="item.to">
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="profile">
        <strong>{{ auth.user?.fullName }}</strong>
        <small>{{ auth.user?.email }}</small>
        <button type="button" @click="handleLogout">Đăng xuất</button>
      </div>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <div>
          <p>Hệ thống quản lý bán hàng và kho</p>
          <h1>{{ navigation.find((item) => item.to === $route.path)?.label ?? 'Quản lý' }}</h1>
        </div>
        <span class="role-badge">{{ auth.role }}</span>
      </header>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell { min-height: 100vh; display: grid; grid-template-columns: 240px 1fr; background: #f4f7fb; }
.sidebar { position: sticky; top: 0; height: 100vh; padding: 24px 16px; background: #111827; color: white; display: flex; flex-direction: column; }
.brand { display: flex; gap: 12px; align-items: center; padding: 0 8px 24px; }
.brand-mark { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; background: #2563eb; font-weight: 800; }
.brand div, .profile { display: flex; flex-direction: column; gap: 3px; }
.brand small, .profile small { color: #94a3b8; }
nav { display: grid; gap: 6px; }
nav a { padding: 11px 12px; border-radius: 8px; color: #cbd5e1; text-decoration: none; }
nav a:hover, nav a.router-link-active { color: white; background: #1f2937; }
.profile { margin-top: auto; padding: 16px 8px 0; border-top: 1px solid #374151; }
.profile button { margin-top: 12px; padding: 9px; border: 0; border-radius: 7px; color: white; background: #dc2626; cursor: pointer; }
.main-area { min-width: 0; }
.topbar { height: 92px; padding: 0 28px; background: white; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; }
.topbar p { margin: 0; color: #64748b; font-size: 13px; }
.topbar h1 { margin: 4px 0 0; font-size: 24px; color: #0f172a; }
.role-badge { padding: 7px 12px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; }
@media (max-width: 800px) {
  .app-shell { grid-template-columns: 1fr; }
  .sidebar { position: static; height: auto; }
  nav { grid-template-columns: repeat(2, 1fr); }
}
</style>
