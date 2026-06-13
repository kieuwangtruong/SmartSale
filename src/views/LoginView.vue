<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { homeForRole } from '../router'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function submit() {
  if (!email.value.trim() || !password.value) {
    error.value = 'Vui lòng nhập email và mật khẩu.'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const user = await auth.login(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.replace(redirect || homeForRole(user.role))
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Không thể đăng nhập.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="logo">S</div>
      <p class="eyebrow">Sales & Inventory</p>
      <h1>Đăng nhập hệ thống</h1>
      <p class="subtitle">Dùng tài khoản nhân viên được Admin cấp.</p>

      <form @submit.prevent="submit">
        <label>
          Email
          <input v-model="email" type="email" autocomplete="email" placeholder="name@company.com" />
        </label>
        <label>
          Mật khẩu
          <input v-model="password" type="password" autocomplete="current-password" placeholder="Nhập mật khẩu" />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
        </button>
      </form>

      <small>Vai trò được xác định từ backend: Admin, SalesStaff hoặc WarehouseKeeper.</small>
      <RouterLink class="store-link" to="/">← Quay lại trang bán hàng</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: linear-gradient(135deg, #0f172a, #1d4ed8); }
.login-card { width: min(420px, 100%); padding: 36px; border-radius: 18px; background: white; box-shadow: 0 24px 70px #02061755; }
.logo { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; background: #2563eb; color: white; font-size: 24px; font-weight: 800; }
.eyebrow { margin: 22px 0 4px; color: #2563eb; font-weight: 700; }
h1 { margin: 0; color: #0f172a; }
.subtitle { color: #64748b; }
form { display: grid; gap: 16px; margin: 26px 0 18px; }
label { display: grid; gap: 7px; color: #334155; font-weight: 600; }
input { padding: 12px 13px; border: 1px solid #cbd5e1; border-radius: 9px; font: inherit; }
input:focus { outline: 3px solid #bfdbfe; border-color: #2563eb; }
button { padding: 12px; border: 0; border-radius: 9px; background: #2563eb; color: white; font-weight: 700; cursor: pointer; }
button:disabled { opacity: .65; cursor: wait; }
.error { margin: 0; padding: 10px; border-radius: 8px; background: #fee2e2; color: #b91c1c; }
small { color: #64748b; }
.store-link { display: inline-block; margin-top: 18px; color: #2563eb; text-decoration: none; font-weight: 650; }
</style>
