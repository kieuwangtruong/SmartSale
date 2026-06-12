<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const email = ref('')
const password = ref('')
const selectedRole = ref('3') // Default: User
const loading = ref(false)
const errorMessage = ref('')

const roles = [
  { value: '0', label: 'Nhân viên bán hàng' },
  { value: '1', label: 'Quản trị viên' },
  { value: '2', label: 'Thủ kho' },
  { value: '3', label: 'Người dùng' },
]

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'Vui lòng nhập email và mật khẩu'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    // Kiểm tra role dựa theo email
    // Admin có thể đăng nhập với bất kỳ role nào
    // User chỉ có thể đăng nhập với role 3 (Người dùng)
    if (email.value === 'user@gmail.com' && selectedRole.value !== '3') {
      errorMessage.value = 'Tài khoản này không thể đăng nhập với role này. Vui lòng chọn "Người dùng"'
      loading.value = false
      return
    }

    // Giả lập đăng nhập thành công
    const userData = {
      email: email.value,
      role: selectedRole.value,
      fullName: email.value.split('@')[0],
    }

    // Lưu thông tin người dùng vào localStorage
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('isAuthenticated', 'true')

    // Redirect dựa theo role
    const roleRoutes: Record<string, string> = {
      '0': '/sales-officer', // Nhân viên bán hàng
      '1': '/dashboard', // Quản trị viên
      '2': '/warehouse-manager', // Thủ kho
      '3': '/user/home', // Người dùng (Customer)
    }

    const redirectPath = roleRoutes[selectedRole.value] || '/dashboard'
    router.push(redirectPath)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Lỗi đăng nhập'
  } finally {
    loading.value = false
  }
}

function goToRegister() {
  router.push('/register')
}

function goToForgotPassword() {
  router.push('/forgot-password')
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>Đăng nhập</h1>
        <p>Quản lý bán hàng và kho</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="nhập email của bạn"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Mật khẩu</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="nhập mật khẩu"
            required
          />
        </div>

        <div class="form-group">
          <label for="role">Vai trò</label>
          <select id="role" v-model="selectedRole">
            <option v-for="role in roles" :key="role.value" :value="role.value">
              {{ role.label }}
            </option>
          </select>
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
        </button>
      </form>

      <div class="login-footer">
        <button type="button" class="link-button" @click="goToForgotPassword">
          Quên mật khẩu?
        </button>
        <span>•</span>
        <button type="button" class="link-button" @click="goToRegister">
          Tạo tài khoản
        </button>
      </div>

      <div class="demo-info">
        <p><strong>Tài khoản demo:</strong></p>
        <p>Email: admin@gmail.com</p>
        <p>Mật khẩu: 123456</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
}

.login-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 420px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.login-header p {
  font-size: 14px;
  color: #718096;
  margin: 0;
}

.login-form {
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

.form-group input,
.form-group select {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
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

.login-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
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

.demo-info {
  background: #f7fafc;
  border-left: 4px solid #667eea;
  padding: 12px 16px;
  border-radius: 4px;
  margin-top: 20px;
  font-size: 12px;
  color: #4a5568;
}

.demo-info p {
  margin: 4px 0;
}

.demo-info strong {
  color: #2d3748;
}

.alert-error {
  padding: 12px 16px;
  background-color: #fed7d7;
  color: #c53030;
  border-radius: 8px;
  font-size: 14px;
}
</style>
