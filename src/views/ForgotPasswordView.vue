<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const step = ref<'email' | 'code' | 'password'>('email')
const verificationCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

async function handleSendCode() {
  if (!email.value) {
    errorMessage.value = 'Vui lòng nhập email'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    // Giả lập gửi mã
    await new Promise((resolve) => setTimeout(resolve, 1000))
    successMessage.value = 'Mã xác nhận đã được gửi tới email của bạn'
    step.value = 'code'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Lỗi gửi mã'
  } finally {
    loading.value = false
  }
}

async function handleVerifyCode() {
  if (!verificationCode.value) {
    errorMessage.value = 'Vui lòng nhập mã xác nhận'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    // Giả lập xác minh mã
    await new Promise((resolve) => setTimeout(resolve, 1000))
    if (verificationCode.value === '123456') {
      successMessage.value = 'Mã xác nhận đúng, vui lòng tạo mật khẩu mới'
      step.value = 'password'
    } else {
      errorMessage.value = 'Mã xác nhận không đúng (dùng 123456 để test)'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Lỗi xác minh'
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  errorMessage.value = ''

  if (!newPassword.value || !confirmPassword.value) {
    errorMessage.value = 'Vui lòng nhập mật khẩu'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Mật khẩu không khớp'
    return
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = 'Mật khẩu phải ít nhất 6 ký tự'
    return
  }

  loading.value = true

  try {
    // Giả lập reset mật khẩu
    await new Promise((resolve) => setTimeout(resolve, 1000))
    successMessage.value = 'Mật khẩu đã được đặt lại thành công! Chuyển hướng tới đăng nhập...'

    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Lỗi đặt lại mật khẩu'
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  router.push('/login')
}

function backToEmail() {
  step.value = 'email'
  verificationCode.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}
</script>

<template>
  <div class="forgot-password-container">
    <div class="forgot-password-card">
      <div class="forgot-password-header">
        <h1>Quên mật khẩu</h1>
        <p>Đặt lại mật khẩu của bạn</p>
      </div>

      <form class="forgot-password-form" @submit.prevent="handleSendCode">
        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <!-- Step 1: Email -->
        <template v-if="step === 'email'">
          <div class="form-group">
            <label for="email">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="Nhập email của bạn"
              required
            />
            <small>Chúng tôi sẽ gửi mã xác nhận tới email này</small>
          </div>

          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? 'Đang gửi...' : 'Gửi mã xác nhận' }}
          </button>
        </template>

        <!-- Step 2: Verification Code -->
        <template v-else-if="step === 'code'">
          <div class="form-group">
            <label for="code">Mã xác nhận</label>
            <input
              id="code"
              v-model="verificationCode"
              type="text"
              placeholder="Nhập mã xác nhận (dùng 123456)"
              required
            />
            <small>Mã xác nhận đã được gửi tới {{ email }}</small>
          </div>

          <button
            type="button"
            class="btn-primary"
            :disabled="loading"
            @click="handleVerifyCode"
          >
            {{ loading ? 'Đang xác minh...' : 'Xác minh mã' }}
          </button>

          <button type="button" class="btn-secondary" @click="backToEmail">
            Quay lại
          </button>
        </template>

        <!-- Step 3: New Password -->
        <template v-else-if="step === 'password'">
          <div class="form-group">
            <label for="newPassword">Mật khẩu mới</label>
            <input
              id="newPassword"
              v-model="newPassword"
              type="password"
              placeholder="Nhập mật khẩu mới"
              required
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Xác nhận mật khẩu mới</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              required
            />
          </div>

          <button
            type="button"
            class="btn-primary"
            :disabled="loading"
            @click="handleResetPassword"
          >
            {{ loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu' }}
          </button>
        </template>
      </form>

      <div class="forgot-password-footer">
        <button type="button" class="link-button" @click="goToLogin">
          ← Quay lại đăng nhập
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forgot-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
}

.forgot-password-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 420px;
}

.forgot-password-header {
  text-align: center;
  margin-bottom: 30px;
}

.forgot-password-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.forgot-password-header p {
  font-size: 14px;
  color: #718096;
  margin: 0;
}

.forgot-password-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
}

.form-group input {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group small {
  font-size: 12px;
  color: #718096;
}

.btn-primary,
.btn-secondary {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e2e8f0;
  color: #2d3748;
  margin-top: 8px;
}

.btn-secondary:hover {
  background: #cbd5e0;
}

.forgot-password-footer {
  text-align: center;
  margin-top: 20px;
}

.link-button {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
  transition: color 0.2s;
}

.link-button:hover {
  color: #764ba2;
  text-decoration: underline;
}

.alert-error {
  padding: 12px 16px;
  background-color: #fed7d7;
  color: #c53030;
  border-radius: 8px;
  font-size: 14px;
}

.alert-success {
  padding: 12px 16px;
  background-color: #c6f6d5;
  color: #22543d;
  border-radius: 8px;
  font-size: 14px;
}
</style>
