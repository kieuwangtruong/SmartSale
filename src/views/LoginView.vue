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
    const msg = exception instanceof Error ? exception.message : String(exception)
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      error.value = t('Server Render đang trong quá trình khởi động (Cold-start 15-30s). Hệ thống đang thử kết nối lại...', 'Render backend is cold-starting (15-30s). Retrying connection...')
      // Auto retry once after 3 seconds
      setTimeout(async () => {
        try {
          const user = await auth.login(email.value.trim(), password.value)
          const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
          await router.replace(redirect || homeForRole(user.role))
        } catch (retryErr) {
          error.value = t('Vui lòng nhấn Đăng nhập lại một lần nữa sau 10 giây để kết nối Render backend.', 'Please click Login again in 10 seconds.')
        }
      }, 3000)
    } else {
      error.value = msg || t('Không thể đăng nhập.', 'Login failed.')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-wrapper" :class="{ 'is-admin-layout': activeRole === 'Admin' }">
      
      <section class="image-panel" :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.75)), url(${roleBranding.image})` }">
        <div class="image-panel-content" :key="activeRole">
          <span class="eyebrow">Smart Sale Store</span>
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
            <div>
              <strong>Smart Sale</strong>
              <span class="portal-badge">PORTAL</span>
            </div>
          </div>

          <h2>{{ t('Đăng nhập hệ thống', 'System Login') }}</h2>
          <p class="subtitle">{{ t('Chọn cổng truy cập tương ứng với vai trò của bạn', 'Select access portal matching your organizational role') }}</p>

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
              <InputText id="email" v-model="email" type="email" autocomplete="email" placeholder="staff@smartsale.vn" fluid />
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
            
            <button type="submit" class="submit-btn" :disabled="loading">
              <i v-if="loading" class="pi pi-spin pi-spinner" />
              <i v-else class="pi pi-sign-in" />
              <span>{{ loading ? t('Đang đăng nhập...', 'Logging in...') : t('Đăng nhập', 'Log In') }}</span>
            </button>
          </form>

          <RouterLink class="store-link" to="/">
            <i class="pi pi-arrow-left" />
            {{ t('Quay lại trang bán hàng', 'Back to Storefront') }}
          </RouterLink>
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
  background: 
    radial-gradient(circle at 15% 15%, rgba(27, 94, 74, 0.4), transparent 45%),
    radial-gradient(circle at 85% 85%, rgba(15, 23, 42, 0.6), transparent 45%),
    linear-gradient(rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.75)), 
    url('back-ground-login.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.login-wrapper {
  position: relative;
  width: 1020px;
  max-width: 100%;
  height: 640px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-radius: 28px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
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

.login-wrapper.is-admin-layout .form-panel {
  transform: translateX(100%);
}
.login-wrapper.is-admin-layout .image-panel {
  transform: translateX(-100%);
}

.image-panel {
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 48px;
}

.image-panel-content {
  position: relative;
  z-index: 2;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.eyebrow {
  color: #34d399;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.image-panel-content h1 {
  font-size: 30px;
  font-weight: 700;
  margin: 10px 0 14px;
  color: #ffffff;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.image-panel-content p {
  color: rgba(255, 255, 255, 0.88);
  font-size: 13.5px;
  line-height: 1.6;
  margin: 0;
}

.brand-footer {
  margin-top: 40px;
  color: rgba(255, 255, 255, 0.55);
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
  max-width: 370px;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.brand-logo {
  width: 38px;
  height: 38px;
  background: linear-gradient(135deg, #1b5e4a, #10b981);
  color: white;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(27, 94, 74, 0.35);
}

.logo-area strong {
  font-size: 19px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin-right: 6px;
}

.portal-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(27, 94, 74, 0.12);
  color: #1b5e4a;
  border: 1px solid rgba(27, 94, 74, 0.2);
  letter-spacing: 0.06em;
}

.form-container h2 {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 6px;
  color: #0f172a;
  letter-spacing: -0.03em;
}

.subtitle {
  color: #475569;
  font-size: 13px;
  line-height: 1.45;
  margin: 0 0 20px;
}

.role-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.role-btn {
  padding: 12px 6px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.role-btn:hover {
  background: rgba(255, 255, 255, 0.85);
  transform: translateY(-1px);
}

.role-btn.active {
  background: #1b5e4a;
  border-color: #1b5e4a;
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(27, 94, 74, 0.38);
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
  background: rgba(255, 255, 255, 0.6) !important;
  border: 1px solid rgba(15, 23, 42, 0.15) !important;
  color: #0f172a !important;
  border-radius: 12px !important;
  min-height: 42px !important;
  font-size: 13.5px !important;
}

:deep(.p-inputtext:focus) {
  background: #ffffff !important;
  border-color: #1b5e4a !important;
  box-shadow: 0 0 0 3px rgba(27, 94, 74, 0.2) !important;
}

:deep(.p-inputtext::placeholder) {
  color: rgba(15, 23, 42, 0.45) !important;
}

button.submit-btn {
  width: 100%;
  min-height: 46px;
  border-radius: 12px;
  background: #1b5e4a !important;
  color: #ffffff !important;
  border: 1px solid #1b5e4a !important;
  font-size: 14px;
  font-weight: 750;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(27, 94, 74, 0.35);
  transition: all 0.2s ease;
  margin-top: 6px;
  cursor: pointer;
}

button.submit-btn:hover:not(:disabled) {
  background: #164e3f !important;
  border-color: #164e3f !important;
  box-shadow: 0 6px 18px rgba(27, 94, 74, 0.45);
  transform: translateY(-1px);
}

button.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-msg {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(254, 242, 242, 0.9);
  color: #991b1b;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.store-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 20px;
  color: #1b5e4a;
  text-decoration: none;
  font-weight: 700;
  font-size: 13px;
  width: 100%;
  transition: all 0.15s ease;
}

.store-link:hover {
  color: #164e3f;
  text-decoration: underline;
}

/* Dark Mode Overrides for Login */
.app-dark .login-wrapper {
  background: rgba(15, 23, 42, 0.75); 
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}

.app-dark .logo-area strong,
.app-dark .form-container h2 {
  color: #f8fafc;
}

.app-dark .subtitle {
  color: #cbd5e1;
}

.app-dark .role-btn {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.app-dark .role-btn:hover {
  background: rgba(30, 41, 59, 0.7);
}

.app-dark .role-btn.active {
  background: #10b981;
  border-color: #10b981;
  color: #064e3b;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
}

.app-dark .input-group label {
  color: #cbd5e1;
}

:deep(.app-dark .p-inputtext) {
  background: rgba(15, 23, 42, 0.7) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

:deep(.app-dark .p-inputtext:focus) {
  background: #0f172a !important;
  border-color: #10b981 !important;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25) !important;
}

:deep(.app-dark .p-inputtext::placeholder) {
  color: rgba(255, 255, 255, 0.45) !important;
}

.app-dark .submit-btn {
  background: #10b981;
  color: #064e3b;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
}

.app-dark .submit-btn:hover:not(:disabled) {
  background: #34d399;
}

.app-dark .error-msg {
  background: rgba(127, 29, 29, 0.4);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.2);
}

.app-dark .store-link {
  color: #34d399;
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
