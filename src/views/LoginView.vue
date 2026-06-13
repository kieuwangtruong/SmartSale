<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
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
          <InputText v-model="email" type="email" autocomplete="email" placeholder="name@company.com" fluid />
        </label>
        <label>
          Mật khẩu
          <Password
            v-model="password"
            autocomplete="current-password"
            placeholder="Nhập mật khẩu"
            :feedback="false"
            toggle-mask
            fluid
          />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <Button type="submit" label="Đăng nhập" icon="pi pi-sign-in" :loading="loading" fluid />
      </form>

      <small>Hệ thống tự xác định quyền: Quản trị viên, Nhân viên bán hàng hoặc Thủ kho.</small>
      <RouterLink class="store-link" to="/">← Quay lại trang bán hàng</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at 18% 12%, #4f46e5 0, transparent 31%), radial-gradient(circle at 85% 85%, #0f766e 0, transparent 28%), #111827; }
.login-card { width: min(430px, 100%); padding: 38px; border: 1px solid #ffffff24; border-radius: 22px; background: #fffffffa; box-shadow: 0 30px 90px #02061770; }
.logo { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 15px; background: linear-gradient(135deg, #818cf8, #4f46e5); color: white; font-size: 24px; font-weight: 800; box-shadow: 0 10px 24px #4f46e54d; }
.eyebrow { margin: 22px 0 4px; color: #4f46e5; font-weight: 750; }
h1 { margin: 0; color: #0f172a; }
.subtitle { color: #64748b; }
form { display: grid; gap: 16px; margin: 26px 0 18px; }
label { display: grid; gap: 7px; color: #334155; font-weight: 600; }
.error { margin: 0; padding: 10px; border-radius: 8px; background: #fee2e2; color: #b91c1c; }
small { color: #64748b; }
.store-link { display: inline-block; margin-top: 18px; color: #2563eb; text-decoration: none; font-weight: 650; }
</style>
