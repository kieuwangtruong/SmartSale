<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { registerCustomer } from '../services/userApi'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'
import CustomerTierBadge from '../components/CustomerTierBadge.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const error = ref('')
const { t } = useLanguage()

const form = reactive({
  userName: '',
  fullName: '',
  email: '',
  password: '',
  dateOfBirth: '2000-01-01',
  sex: 0,
  address: '',
})

async function submit() {
  loading.value = true
  error.value = ''
  try {
    if (mode.value === 'register') {
      await registerCustomer(form)
    }
    const user = await auth.login(form.email, form.password)
    if (user.role !== 'Customer') {
      await auth.logout()
      error.value = t('Tài khoản nhân viên vui lòng đăng nhập ở cổng /admin.', 'Employee accounts must log in at the /admin portal.')
      return
    }
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : t('Không thể xử lý tài khoản.', 'Failed to process account.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-wrapper">
      <!-- Image Panel for Customer Branding -->
      <section class="image-panel" :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.8)), url('https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800')` }">
        <div class="image-panel-content">
          <span class="eyebrow">Smart Sale Store</span>
          <h1>{{ t('Chào mừng Quý khách', 'Welcome Valued Customer') }}</h1>
          <p>{{ t('Đăng nhập hoặc đăng ký tài khoản thành viên để bắt đầu hành trình mua sắm thông minh và tích lũy ưu đãi hấp dẫn.', 'Sign in or register a member account to start shopping smart and accumulate attractive rewards.') }}</p>
          <div class="auth-tier-strip">
            <CustomerTierBadge tier="Platinum" size="xs" variant="badge" :show-discount="true" />
            <CustomerTierBadge tier="Gold" size="xs" variant="badge" :show-discount="true" />
            <CustomerTierBadge tier="Silver" size="xs" variant="badge" :show-discount="true" />
          </div>
          <div class="brand-footer">
            <small>© 2026 Smart Sale Store. All rights reserved.</small>
          </div>
        </div>
      </section>

      <!-- Form Panel -->
      <section class="form-panel">
        <div class="form-container">
          <div class="logo-area">
            <span class="brand-logo"><i class="pi pi-shopping-bag" /></span>
            <div>
              <strong>Smart Sale</strong>
              <span class="portal-badge">MEMBER</span>
            </div>
          </div>

          <h2>{{ mode === 'login' ? t('Đăng nhập khách hàng', 'Customer Login') : t('Đăng ký thành viên', 'Member Registration') }}</h2>
          <p class="subtitle">{{ t('Xem tích lũy điểm và theo dõi đơn hàng của bạn', 'Track points, tiers, and manage your orders') }}</p>

          <form @submit.prevent="submit">
            <div v-if="mode === 'register'" class="input-group">
              <label for="userName">{{ t('Tên đăng nhập', 'Username') }}</label>
              <input id="userName" v-model="form.userName" required :placeholder="t('Nhập tên đăng nhập', 'Enter username')" class="custom-input" />
            </div>
            
            <div v-if="mode === 'register'" class="input-group">
              <label for="fullName">{{ t('Họ tên', 'Full Name') }}</label>
              <input id="fullName" v-model="form.fullName" required :placeholder="t('Nhập họ và tên', 'Enter full name')" class="custom-input" />
            </div>

            <div class="input-group">
              <label for="email">Email</label>
              <input id="email" v-model="form.email" required type="email" autocomplete="email" placeholder="customer@email.com" class="custom-input" />
            </div>
            
            <div class="input-group">
              <label for="password">{{ t('Mật khẩu', 'Password') }}</label>
              <input id="password" v-model="form.password" required type="password" autocomplete="current-password" :placeholder="t('Nhập mật khẩu', 'Enter password')" class="custom-input" />
            </div>

            <div v-if="mode === 'register'" class="input-group">
              <label for="dateOfBirth">{{ t('Ngày sinh', 'Date of Birth') }}</label>
              <input id="dateOfBirth" v-model="form.dateOfBirth" type="date" class="custom-input" />
            </div>

            <div v-if="mode === 'register'" class="input-group">
              <label for="sex">{{ t('Giới tính', 'Gender') }}</label>
              <select id="sex" v-model.number="form.sex" class="custom-input">
                <option :value="0">{{ t('Nam', 'Male') }}</option>
                <option :value="1">{{ t('Nữ', 'Female') }}</option>
                <option :value="2">{{ t('Khác', 'Other') }}</option>
              </select>
            </div>

            <div v-if="mode === 'register'" class="input-group">
              <label for="address">{{ t('Địa chỉ', 'Address') }}</label>
              <input id="address" v-model="form.address" :placeholder="t('Nhập địa chỉ', 'Enter address')" class="custom-input" />
            </div>

            <p v-if="error" class="error-msg"><i class="pi pi-exclamation-circle" /> {{ error }}</p>
            
            <button :disabled="loading" type="submit" class="submit-btn">
              <i v-if="loading" class="pi pi-spin pi-spinner" />
              <i v-else class="pi pi-sign-in" />
              <span>{{ loading ? t('Đang xử lý...', 'Processing...') : (mode === 'login' ? t('Đăng nhập', 'Log In') : t('Đăng ký', 'Register')) }}</span>
            </button>
          </form>

          <button class="link-button" type="button" @click="mode = mode === 'login' ? 'register' : 'login'">
            {{ mode === 'login' ? t('Chưa có tài khoản? Đăng ký ngay', 'No account yet? Register here') : t('Đã có tài khoản? Đăng nhập', 'Already have an account? Log in') }}
          </button>
          
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
}

.image-panel {
  left: 0;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  padding: 48px;
}

.image-panel-content {
  color: #ffffff;
  position: relative;
  z-index: 2;
  text-align: left;
  width: 100%;
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
  left: 50%;
  background: transparent; 
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: left;
  overflow-y: auto;
}

.form-container {
  width: 100%;
  max-width: 370px;
  padding: 20px 0;
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

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.input-group label {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}

.custom-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.6) !important;
  border: 1px solid rgba(15, 23, 42, 0.15) !important;
  border-radius: 12px;
  color: #0f172a !important;
  outline: none;
  font-size: 13.5px;
  transition: all 0.2s;
}

.custom-input:focus {
  background: #ffffff !important;
  border-color: #1b5e4a !important;
  box-shadow: 0 0 0 3px rgba(27, 94, 74, 0.2) !important;
}

.custom-input::placeholder {
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
  margin-top: 8px;
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

.link-button {
  margin-top: 14px;
  background: transparent;
  border: 0;
  color: #1b5e4a;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  text-align: center;
  transition: all 0.15s ease;
}

.link-button:hover {
  color: #164e3f;
  text-decoration: underline;
}

.store-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
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

/* Dark mode overrides */
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

.app-dark .input-group label {
  color: #cbd5e1;
}

.app-dark .custom-input {
  background: rgba(15, 23, 42, 0.7) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

.app-dark .custom-input:focus {
  background: #0f172a !important;
  border-color: #10b981 !important;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25) !important;
}

.app-dark .custom-input::placeholder {
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

.app-dark .link-button,
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
    left: 0 !important;
  }
  .image-panel {
    display: none; 
  }
  .form-panel {
    padding: 45px 24px;
  }
}

.auth-tier-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 16px 0 20px;
}
</style>
