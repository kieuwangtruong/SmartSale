<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerCustomer } from '../services/userApi'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const auth = useAuthStore()
const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const error = ref('')
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
      error.value = 'Tài khoản nhân viên vui lòng đăng nhập ở cổng /admin.'
      return
    }
    await router.replace('/')
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Không thể xử lý tài khoản.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-wrapper">
      <!-- Image Panel for Customer Branding -->
      <section class="image-panel" :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.75)), url('https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800')` }">
        <div class="image-panel-content">
          <span class="eyebrow">Smart Sale Store</span>
          <h1>Chào mừng Quý khách</h1>
          <p>Đăng nhập hoặc đăng ký tài khoản thành viên để bắt đầu hành trình mua sắm thông minh và tích lũy ưu đãi hấp dẫn.</p>
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
            <strong>Smart Sale</strong>
          </div>

          <h2>{{ mode === 'login' ? 'Đăng nhập khách hàng' : 'Đăng ký thành viên' }}</h2>
          <p class="subtitle">Xem tích lũy điểm và theo dõi đơn hàng của bạn</p>

          <form @submit.prevent="submit">
            <div v-if="mode === 'register'" class="input-group">
              <label for="userName">Tên đăng nhập</label>
              <input id="userName" v-model="form.userName" required placeholder="Nhập tên đăng nhập" class="custom-input" />
            </div>
            
            <div v-if="mode === 'register'" class="input-group">
              <label for="fullName">Họ tên</label>
              <input id="fullName" v-model="form.fullName" required placeholder="Nhập họ và tên" class="custom-input" />
            </div>

            <div class="input-group">
              <label for="email">Email</label>
              <input id="email" v-model="form.email" required type="email" autocomplete="email" placeholder="customer@email.com" class="custom-input" />
            </div>
            
            <div class="input-group">
              <label for="password">Mật khẩu</label>
              <input id="password" v-model="form.password" required type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" class="custom-input" />
            </div>

            <div v-if="mode === 'register'" class="input-group">
              <label for="dateOfBirth">Ngày sinh</label>
              <input id="dateOfBirth" v-model="form.dateOfBirth" type="date" class="custom-input" />
            </div>

            <div v-if="mode === 'register'" class="input-group">
              <label for="sex">Giới tính</label>
              <select id="sex" v-model.number="form.sex" class="custom-input">
                <option :value="0">Nam</option>
                <option :value="1">Nữ</option>
                <option :value="2">Khác</option>
              </select>
            </div>

            <div v-if="mode === 'register'" class="input-group">
              <label for="address">Địa chỉ</label>
              <input id="address" v-model="form.address" placeholder="Nhập địa chỉ" class="custom-input" />
            </div>

            <p v-if="error" class="error-msg"><i class="pi pi-exclamation-circle" /> {{ error }}</p>
            
            <button :disabled="loading" type="submit" class="submit-btn">
              {{ loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Đăng ký') }}
            </button>
          </form>

          <button class="link-button" type="button" @click="mode = mode === 'login' ? 'register' : 'login'">
            {{ mode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập' }}
          </button>
          
          <RouterLink class="store-link" to="/">← Quay lại trang bán hàng</RouterLink>
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
}

.image-panel {
  left: 0;
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
  width: 100%;
}

.eyebrow {
  color: #93c5fd;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.image-panel-content h1 {
  font-family: sans-serif;
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
  max-width: 360px;
  padding: 20px 0;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
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
  font-family: sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.form-container h2 {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 4px;
  color: #0f172a;
}

.subtitle {
  color: #334155;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 20px;
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

.custom-input {
  width: 100%;
  padding: 11px 14px;
  background: rgba(255, 255, 255, 0.12) !important;
  border: 1px solid rgba(15, 23, 42, 0.18) !important;
  border-radius: 12px;
  color: #0f172a !important;
  outline: none;
  font-size: 14px;
  transition: all 0.2s;
}

.custom-input:focus {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: #1d4ed8 !important;
}

.custom-input::placeholder {
  color: rgba(15, 23, 42, 0.5) !important;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: #1d4ed8;
  color: white;
  border: 0;
  border-radius: 12px;
  font-weight: 800;
  font-size: 14px;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.2s;
}

.submit-btn:hover {
  background: #1e40af;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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

.link-button {
  margin-top: 14px;
  background: transparent;
  border: 0;
  color: #1d4ed8;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  width: 100%;
  text-align: center;
  transition: color 0.2s;
}

.link-button:hover {
  text-decoration: underline;
}

.store-link {
  display: inline-block;
  margin-top: 14px;
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

/* Dark mode overrides */
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

.app-dark .input-group label {
  color: #cbd5e1;
}

.app-dark .custom-input {
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  color: #ffffff !important;
}

.app-dark .custom-input:focus {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: #3b82f6 !important;
}

.app-dark .custom-input::placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

.app-dark .error-msg {
  background: rgba(127, 29, 29, 0.4);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.2);
}

.app-dark .link-button,
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
