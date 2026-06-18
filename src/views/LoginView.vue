<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { homeForRole } from '../router'
import type { UserRole } from '../services/apiClient'
import { useLanguage } from '../services/i18n'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t } = useLanguage()

const activeRole = ref<UserRole>('Admin')

watch(
  () => route.meta.loginRole,
  (newRole) => {
    if (newRole) {
      activeRole.value = newRole as UserRole
    }
  },
  { immediate: true },
)

const rolesList = computed(() => [
  { 
    role: 'Admin' as UserRole, 
    label: t('Quản trị viên', 'Administrator'), 
    icon: 'pi pi-shield',
    defaultEmail: '',
    defaultPassword: ''
  },
  { 
    role: 'SalesStaff' as UserRole, 
    label: t('Nhân viên bán lẻ', 'Retail Staff'), 
    icon: 'pi pi-users',
    defaultEmail: '',
    defaultPassword: ''
  },
  { 
    role: 'WarehouseKeeper' as UserRole, 
    label: t('Thủ kho quản lý', 'Warehouse Keeper'), 
    icon: 'pi pi-box',
    defaultEmail: '',
    defaultPassword: ''
  }
])

const roleBranding = computed(() => {
  if (activeRole.value === 'Admin') {
    return {
      title: t('Quản lý Hệ thống & Báo cáo', 'System Management & Reports'),
      desc: t('Giám sát hoạt động kinh doanh toàn diện, xem doanh thu bán lẻ thời gian thực và quản lý nhân sự hiệu quả.', 'Comprehensive business activity monitoring, real-time retail revenue tracking, and efficient staff management.'),
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=800'
    }
  }
  if (activeRole.value === 'WarehouseKeeper') {
    return {
      title: t('Quản lý Kho & Nhập hàng', 'Warehouse & Inventory Management'),
      desc: t('Đồng bộ hóa tồn kho tự động, cập nhật danh mục sản phẩm và phê duyệt các phiếu nhập kho.', 'Automatic inventory synchronization, product catalog updates, and warehouse replenishment approvals.'),
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800'
    }
  }
  return {
    title: t('Xử lý Đơn hàng & Bán hàng', 'Orders & Retail Sales Processing'),
    desc: t('Thiết lập đơn hàng tức thì cho khách hàng, quản lý công nợ và thống kê lịch sử bán lẻ chi tiết.', 'Instant order creation for customers, credit/debt management, and detailed retail transaction logs.'),
    image: 'https://static.topcv.vn/cms/nhan-vien-ban-hang-la-gi-topcv-1164b8fce1e09aa.jpg'
  }
})

function changeRole(role: UserRole) {
  activeRole.value = role
  const found = rolesList.value.find((r) => r.role === role)
  if (found) {
    email.value = found.defaultEmail
    password.value = found.defaultPassword
  }
  // Redirect to sync URL and load correct layout
  if (role === 'Admin') router.push('/login/admin')
  else if (role === 'SalesStaff') router.push('/login/staff')
  else if (role === 'WarehouseKeeper') router.push('/login/warehouse')
}

async function submit() {
  if (!email.value.trim() || !password.value) {
    error.value = t('Vui lòng nhập email và mật khẩu.', 'Please enter your email and password.')
    return
  }

  loading.value = true
  error.value = ''
  try {
    const user = await auth.login(email.value.trim(), password.value)
    if (user.role === 'Customer') {
      await auth.logout()
      error.value = t('Tài khoản khách hàng vui lòng đăng nhập ở trang bán hàng.', 'Customer accounts must log in on the storefront page.')
      return
    }

    if (user.role !== activeRole.value) {
      await auth.logout()
      const currentRoleObj = rolesList.value.find((r) => r.role === activeRole.value)
      const roleLabel = currentRoleObj ? currentRoleObj.label : activeRole.value
      error.value = t(`Tài khoản này không có quyền đăng nhập với vai trò ${roleLabel}.`, `This account does not have permission to log in as ${roleLabel}.`)
      return
    }

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.replace(redirect || homeForRole(user.role))
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : t('Không thể đăng nhập.', 'Login failed.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-wrapper" :class="{ 'is-admin-layout': activeRole === 'Admin' }">
      
      <section class="image-panel" :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.7)), url(${roleBranding.image})` }">
        <div class="image-panel-content" :key="activeRole">
          <span class="eyebrow">Smart Sale System</span>
          <h1>{{ roleBranding.title }}</h1>
          <p>{{ roleBranding.desc }}</p>
          <div class="brand-footer">
            <small>© 2026 Smart Sale Store. All rights reserved.</small>
          </div>
        </div>
      </section>

      <section class="form-panel">
        <div class="form-container">
          <div class="logo-area">
            <span class="brand-logo"><i class="pi pi-shopping-bag" /></span>
            <strong>Smart Sale</strong>
          </div>

          <h2>{{ t('Đăng nhập hệ thống', 'System Login') }}</h2>

          <div class="role-selector">
            <button 
              v-for="r in rolesList" 
              :key="r.role"
              type="button" 
              class="role-btn" 
              :class="{ active: activeRole === r.role }"
              @click="changeRole(r.role)"
            >
              <i :class="r.icon" />
              <span>{{ r.label }}</span>
            </button>
          </div>

          <form @submit.prevent="submit">
            <div class="input-group">
              <label for="email">{{ t('Email', 'Email Address') }}</label>
              <InputText id="email" v-model="email" type="email" autocomplete="email" placeholder="admin@company.com" fluid />
            </div>
            
            <div class="input-group">
              <label for="password">{{ t('Mật khẩu', 'Password') }}</label>
              <Password
                id="password"
                v-model="password"
                autocomplete="current-password"
                :placeholder="t('Nhập mật khẩu', 'Enter password')"
                :feedback="false"
                toggle-mask
                fluid
              />
            </div>
            
            <p v-if="error" class="error-msg"><i class="pi pi-exclamation-circle" /> {{ error }}</p>
            
            <Button type="submit" :label="t('Đăng nhập', 'Log In')" icon="pi pi-sign-in" :loading="loading" fluid />
          </form>

          <RouterLink class="store-link" to="/">{{ t('← Quay lại trang bán hàng', '← Back to Storefront') }}</RouterLink>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  
  background: linear-gradient(rgba(15, 23, 42, 0.4), rgba(30, 41, 59, 0.6)), 
              url('back-ground-login.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}


.login-wrapper {
  position: relative;
  width: 1000px;
  max-width: 100%;
  height: 620px;
  
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-radius: 28px;
  overflow: hidden;
  
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.25);
}


.image-panel,
.form-panel {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  transition: transform 0.75s cubic-bezier(0.66, 0, 0.00, 1), left 0.75s cubic-bezier(0.66, 0, 0.00, 1);
}


.form-panel {
  left: 0;
}
.image-panel {
  left: 50%;
}


.is-admin-layout .form-panel {
  transform: translateX(100%);
}
.is-admin-layout .image-panel {
  transform: translateX(-100%);
}


.image-panel {
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 50px;
}

.image-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.55) 100%);
  z-index: 1;
}

.image-panel-content {
  color: #ffffff;
  position: relative;
  z-index: 2;
  text-align: left;
  animation: slideFadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  width: 100%;
}

@keyframes slideFadeIn {
  from { opacity: 0; transform: translateY(20px); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

.eyebrow {
  color: #93c5fd;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.image-panel-content h1 {
  font-family: var(--font-heading);
  font-size: 32px;
  font-weight: 500;
  margin: 10px 0 16px;
  color: white;
  line-height: 1.25;
}

.image-panel-content p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.brand-footer {
  margin-top: 50px;
  color: rgba(255, 255, 255, 0.5);
}


.form-panel {
  background: transparent; 
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: left;
}

.form-container {
  width: 100%;
  max-width: 360px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.brand-logo {
  width: 34px;
  height: 34px;
  background: #1d4ed8;
  color: white;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 14px;
}

.logo-area strong {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.form-container h2 {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 8px;
  color: #0f172a;
}

.subtitle {
  color: #334155;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 24px;
}


.role-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.role-btn {
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #1e293b;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.role-btn:hover {
  background: rgba(255, 255, 255, 0.6);
}

.role-btn.active {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
}

.role-btn i {
  font-size: 16px;
}


.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.input-group label {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}


:deep(.p-inputtext) {
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(15, 23, 42, 0.18) !important;
  color: #0f172a !important;
}
:deep(.p-inputtext:focus) {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: #1d4ed8 !important;
}
:deep(.p-inputtext::placeholder) {
  color: rgba(15, 23, 42, 0.5) !important;
}

.error-msg {
  margin: 0 0 16px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(254, 242, 242, 0.8);
  color: #991b1b;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.store-link {
  display: inline-block;
  margin-top: 20px;
  color: #1d4ed8;
  text-decoration: none;
  font-weight: 700;
  font-size: 13px;
  width: 100%;
  text-align: center;
}

.store-link:hover {
  text-decoration: underline;
}


.app-dark .login-wrapper {
  background: rgba(15, 23, 42, 0.55); 
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5);
}

.app-dark .logo-area strong,
.app-dark .form-container h2 {
  color: #f8fafc;
}

.app-dark .subtitle {
  color: #cbd5e1;
}

.app-dark .role-btn {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
}

.app-dark .role-btn:hover {
  background: rgba(30, 41, 59, 0.6);
}

.app-dark .role-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.app-dark .input-group label {
  color: #cbd5e1;
}

:deep(.app-dark .p-inputtext) {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}
:deep(.app-dark .p-inputtext:focus) {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: #3b82f6 !important;
}
:deep(.app-dark .p-inputtext::placeholder) {
  color: rgba(255, 255, 255, 0.5) !important;
}

.app-dark .error-msg {
  background: rgba(127, 29, 29, 0.4);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.2);
}

.app-dark .store-link {
  color: #60a5fa;
}


@media (max-width: 850px) {
  .login-wrapper {
    height: auto;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
  }
  .image-panel, .form-panel {
    position: relative;
    width: 100%;
    transform: none !important;
    left: 0 !important;
  }
  .image-panel {
    display: none; 
  }
  .form-panel {
    padding: 45px 24px;
  }
}
</style>


