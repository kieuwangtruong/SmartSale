<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Trigger re-renders by watching route changes
const forceUpdate = ref(0)
watch(() => route.path, () => {
  forceUpdate.value++
})

// Routes yang không perlu hiển thị admin layout
const publicRoutes = ['login', 'register', 'forgot-password', 'home']
const isPublicRoute = computed(() => publicRoutes.includes(route.name as string))

// Get user info from localStorage - force reactivity via forceUpdate
const userInfo = computed(() => {
  forceUpdate.value // Access to trigger dependency
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
})

const userRole = computed(() => userInfo.value?.role)
const isUserRole = computed(() => userRole.value === '3')
const isSalesOfficer = computed(() => userRole.value === '0')
const isWarehouseManager = computed(() => userRole.value === '2')
const isAdmin = computed(() => userRole.value === '1')
const isLoggedIn = computed(() => {
  forceUpdate.value // Access to trigger dependency
  return localStorage.getItem('isAuthenticated') === 'true'
})

const showUserMenu = ref(false)

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function handleLogout() {
  localStorage.removeItem('user')
  localStorage.removeItem('isAuthenticated')
  router.push('/')
  showUserMenu.value = false
}

function handleLogin() {
  router.push('/login')
}

function handleRegister() {
  router.push('/register')
}
</script>

<template>
  <div v-if="isPublicRoute" class="public-layout">
    <RouterView />
  </div>

  <!-- User Customer Layout -->
  <div v-else-if="isUserRole && isLoggedIn" class="user-shell">
    <aside class="user-sidebar" aria-label="Điều hướng khách hàng">
      <div class="brand-block">
        <span class="brand-mark">🛍️</span>
        <div>
          <strong>Shop</strong>
          <small>Online Store</small>
        </div>
      </div>

      <nav class="sidebar-nav">
        <RouterLink to="/user/home">
          <span class="nav-icon">🏠</span>
          <span>Trang chủ</span>
        </RouterLink>
        <RouterLink to="/user/cart">
          <span class="nav-icon">🛒</span>
          <span>Giỏ hàng</span>
        </RouterLink>
        <RouterLink to="/user/orders">
          <span class="nav-icon">📦</span>
          <span>Đơn đã đặt</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="user-main">
      <header class="user-topbar">
        <div class="topbar-logo">
          <h1>🛍️ Cửa hàng online</h1>
        </div>

        <div class="topbar-actions">
          <div class="user-profile" @click="toggleUserMenu">
            <div class="avatar-circle">{{ userInfo?.fullName?.charAt(0).toUpperCase() || 'U' }}</div>
            <div v-if="showUserMenu" class="user-dropdown">
              <div class="dropdown-item">
                <strong>{{ userInfo?.fullName }}</strong>
                <small>{{ userInfo?.email }}</small>
              </div>
              <hr />
              <button type="button" class="dropdown-logout" @click="handleLogout">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <RouterView />
    </div>
  </div>

  <!-- Before Login - Guest Layout -->
  <div v-else-if="!isLoggedIn && !isPublicRoute" class="guest-shell">
    <div class="guest-topbar">
      <div class="topbar-logo">
        <h1>🛍️ Cửa hàng online</h1>
      </div>
      <div class="topbar-actions">
        <button type="button" class="btn-guest" @click="handleRegister">Đăng kí</button>
        <button type="button" class="btn-guest btn-primary" @click="handleLogin">Đăng nhập</button>
      </div>
    </div>
    <RouterView />
  </div>

  <!-- Sales Officer Layout -->
  <div v-else-if="isSalesOfficer && isLoggedIn" class="admin-shell">
    <aside class="admin-sidebar" aria-label="Điều hướng">
      <div class="brand-block">
        <span class="brand-mark">📊</span>
        <div>
          <strong>Bán Hàng</strong>
          <small>Sales Staff</small>
        </div>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-section">Công việc</p>
        <RouterLink to="/sales-officer">
          <span class="nav-icon">📦</span>
          <span>Quản lý đơn hàng</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div>
          <p class="app-kicker">Nhân viên bán hàng</p>
          <h1>Quản lý đơn hàng</h1>
        </div>

        <div class="topbar-actions" aria-label="Công cụ nhanh">
          <div class="admin-avatar" aria-label="Sales Officer" @click="toggleUserMenu">
            {{ userInfo?.fullName?.charAt(0).toUpperCase() || 'SO' }}
            <div v-if="showUserMenu" class="user-dropdown">
              <div class="dropdown-item">
                <strong>{{ userInfo?.fullName }}</strong>
                <small>{{ userInfo?.email }}</small>
              </div>
              <hr />
              <button type="button" class="dropdown-logout" @click="handleLogout">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <RouterView />
    </div>
  </div>

  <!-- Warehouse Manager Layout -->
  <div v-else-if="isWarehouseManager && isLoggedIn" class="admin-shell">
    <aside class="admin-sidebar" aria-label="Điều hướng">
      <div class="brand-block">
        <span class="brand-mark">📦</span>
        <div>
          <strong>Kho Hàng</strong>
          <small>Warehouse Staff</small>
        </div>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-section">Công việc</p>
        <RouterLink to="/warehouse-manager">
          <span class="nav-icon">🏷️</span>
          <span>Quản lý sản phẩm</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div>
          <p class="app-kicker">Thủ kho</p>
          <h1>Quản lý kho hàng</h1>
        </div>

        <div class="topbar-actions" aria-label="Công cụ nhanh">
          <div class="admin-avatar" aria-label="Warehouse Manager" @click="toggleUserMenu">
            {{ userInfo?.fullName?.charAt(0).toUpperCase() || 'WM' }}
            <div v-if="showUserMenu" class="user-dropdown">
              <div class="dropdown-item">
                <strong>{{ userInfo?.fullName }}</strong>
                <small>{{ userInfo?.email }}</small>
              </div>
              <hr />
              <button type="button" class="dropdown-logout" @click="handleLogout">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <RouterView />
    </div>
  </div>

  <!-- Admin Layout -->
  <div v-else-if="isAdmin && isLoggedIn" class="admin-shell">
    <aside class="admin-sidebar" aria-label="Điều hướng chính">
      <div class="brand-block">
        <span class="brand-mark">S</span>
        <div>
          <strong>Sales Admin</strong>
          <small>Inventory Panel</small>
        </div>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-section">Main</p>
        <RouterLink to="/dashboard">
          <span class="nav-icon">📊</span>
          <span>Bảng điều khiển</span>
        </RouterLink>
        <RouterLink to="/orders-admin">
          <span class="nav-icon">📦</span>
          <span>Đơn hàng</span>
        </RouterLink>
        <RouterLink to="/users">
          <span class="nav-icon">👥</span>
          <span>Người dùng</span>
        </RouterLink>
        <RouterLink to="/products">
          <span class="nav-icon">🏷️</span>
          <span>Sản phẩm</span>
        </RouterLink>

        <p class="nav-section">System</p>
        <RouterLink to="/about">
          <span class="nav-icon">ⓘ</span>
          <span>Giới thiệu</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div>
          <p class="app-kicker">Trang quản trị</p>
          <h1>Quản lý bán hàng và kho</h1>
        </div>

        <div class="topbar-actions" aria-label="Công cụ nhanh">
          <label class="global-search">
            <span>⌕</span>
            <input type="search" placeholder="Tìm kiếm nhanh..." />
          </label>
          <button class="icon-button" type="button" aria-label="Thông báo">🔔</button>
          <div class="admin-avatar" aria-label="Admin" @click="toggleUserMenu">
            {{ userInfo?.fullName?.charAt(0).toUpperCase() || 'AD' }}
            <div v-if="showUserMenu" class="user-dropdown">
              <div class="dropdown-item">
                <strong>{{ userInfo?.fullName }}</strong>
                <small>{{ userInfo?.email }}</small>
              </div>
              <hr />
              <button type="button" class="dropdown-logout" @click="handleLogout">
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      <RouterView />
    </div>
  </div>
</template>

<style scoped>
/* Guest Layout */
.guest-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f8f9fa;
}

.guest-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.guest-topbar .topbar-logo h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.guest-topbar .topbar-actions {
  display: flex;
  gap: 10px;
}

.btn-guest {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-guest:hover {
  border-color: #667eea;
  color: #667eea;
}

.btn-guest.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-guest.btn-primary:hover {
  opacity: 0.9;
}

/* User Layout */
.user-shell {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
}

.user-sidebar {
  width: 260px;
  background: white;
  border-right: 1px solid #e0e0e0;
  padding: 20px;
  overflow-y: auto;
}

.user-sidebar .brand-block {
  display: flex;
  gap: 12px;
  margin-bottom: 30px;
  align-items: center;
}

.user-sidebar .brand-mark {
  font-size: 28px;
}

.user-sidebar .brand-block div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-sidebar .brand-block strong {
  font-size: 16px;
  color: #333;
}

.user-sidebar .brand-block small {
  font-size: 12px;
  color: #999;
}

.user-sidebar .sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-sidebar .sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #666;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s;
}

.user-sidebar .sidebar-nav a:hover {
  background: #f0f0f0;
  color: #333;
}

.user-sidebar .sidebar-nav a.router-link-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.user-sidebar .nav-icon {
  font-size: 18px;
  min-width: 24px;
}

.user-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.user-topbar .topbar-logo h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.user-topbar .topbar-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-profile {
  position: relative;
  cursor: pointer;
}

.avatar-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
  min-width: 200px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.dropdown-item {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dropdown-item strong {
  font-size: 14px;
  color: #333;
}

.dropdown-item small {
  font-size: 12px;
  color: #999;
}

.user-dropdown hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 8px 0;
}

.dropdown-logout {
  width: 100%;
  padding: 8px 0;
  background: none;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  text-align: left;
}

.dropdown-logout:hover {
  color: #c0392b;
}

/* Admin Layout */
.admin-shell {
  display: flex;
  min-height: 100vh;
}

.admin-sidebar {
  width: 260px;
  background: white;
  border-right: 1px solid #e0e0e0;
  padding: 20px;
  overflow-y: auto;
}

.admin-sidebar .brand-block {
  display: flex;
  gap: 12px;
  margin-bottom: 30px;
  align-items: center;
}

.admin-sidebar .brand-mark {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 24px;
  border-radius: 6px;
}

.admin-sidebar .brand-block div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-sidebar .brand-block strong {
  font-size: 16px;
  color: #333;
}

.admin-sidebar .brand-block small {
  font-size: 12px;
  color: #999;
}

.admin-sidebar .sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.admin-sidebar .nav-section {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  margin-top: 20px;
  margin-bottom: 8px;
  margin-left: 8px;
}

.admin-sidebar .sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: #666;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s;
}

.admin-sidebar .sidebar-nav a:hover {
  background: #f0f0f0;
  color: #333;
}

.admin-sidebar .sidebar-nav a.router-link-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.admin-sidebar .nav-icon {
  font-size: 18px;
  min-width: 24px;
}

.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.admin-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.admin-topbar h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.admin-topbar p {
  margin: 0;
  font-size: 12px;
  color: #999;
  text-transform: uppercase;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.global-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f0f0f0;
  border-radius: 20px;
}

.global-search input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  width: 200px;
}

.icon-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-button:hover {
  opacity: 0.7;
}

.admin-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  font-size: 16px;
  position: relative;
  transition: all 0.2s;
}

.admin-avatar:hover {
  opacity: 0.9;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #999;
}
</style>
