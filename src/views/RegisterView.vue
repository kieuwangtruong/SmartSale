<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const formData = ref({
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  address: '',
})

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function handleRegister() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!formData.value.fullName || !formData.value.email || !formData.value.password) {
    errorMessage.value = 'Vui lòng nhập các trường bắt buộc'
    return
  }

  if (formData.value.password !== formData.value.confirmPassword) {
    errorMessage.value = 'Mật khẩu không khớp'
    return
  }

  if (formData.value.password.length < 6) {
    errorMessage.value = 'Mật khẩu phải ít nhất 6 ký tự'
    return
  }

  loading.value = true

  try {
    // Giả lập đăng ký thành công
    await new Promise((resolve) => setTimeout(resolve, 1000))

    successMessage.value = 'Đăng ký thành công! Chuyển hướng tới đăng nhập...'

    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Lỗi đăng ký'
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1>Tạo tài khoản</h1>
        <p>Đăng ký tài khoản người dùng</p>
      </div>

      <form class="register-form" @submit.prevent="handleRegister">
        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>

        <div class="form-group">
          <label for="fullName">Họ và tên <span class="required">*</span></label>
          <input
            id="fullName"
            v-model="formData.fullName"
            type="text"
            placeholder="Nhập họ và tên"
            required
          />
        </div>

        <div class="form-group">
          <label for="email">Email <span class="required">*</span></label>
          <input
            id="email"
            v-model="formData.email"
            type="email"
            placeholder="Nhập email"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Mật khẩu <span class="required">*</span></label>
          <input
            id="password"
            v-model="formData.password"
            type="password"
            placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
            required
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">Xác nhận mật khẩu <span class="required">*</span></label>
          <input
            id="confirmPassword"
            v-model="formData.confirmPassword"
            type="password"
            placeholder="Nhập lại mật khẩu"
            required
          />
        </div>

        <div class="form-group">
          <label for="address">Địa chỉ</label>
          <input
            id="address"
            v-model="formData.address"
            type="text"
            placeholder="Nhập địa chỉ"
          />
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản' }}
        </button>
      </form>

      <div class="register-footer">
        <p>Đã có tài khoản? <button type="button" class="link-button" @click="goToLogin">Đăng nhập</button></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
}

.register-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 420px;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.register-header p {
  font-size: 14px;
  color: #718096;
  margin: 0;
}

.register-form {
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

.required {
  color: #e53e3e;
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

.btn-primary {
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 8px;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #718096;
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
