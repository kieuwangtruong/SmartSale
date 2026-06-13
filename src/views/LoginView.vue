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
      <RouterLink class="store-link" to="/">← Quay lại trang bán hàng</RouterLink>
    </section>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at 18% 12%, #4f46e5 0, transparent 31%), radial-gradient(circle at 85% 85%, #0f766e 0, transparent 28%), #111827; }
.login-card { width: min(430px, 100%); padding: 30px; border: 1px solid #ffffff24; border-radius: 22px; background: #fffffffa; box-shadow: 0 30px 90px #02061770; }
.logo { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 15px; background: linear-gradient(135deg, #818cf8, #4f46e5); color: white; font-size: 24px; font-weight: 800; box-shadow: 0 10px 24px #4f46e54d; }
.eyebrow { margin: 18px 0 4px; color: #4f46e5; font-weight: 750; }
h1 { margin: 0; color: #0f172a; font-size: 24px; }
.subtitle { color: #64748b; margin-top: 4px; font-size: 13px; }
form { display: grid; gap: 14px; margin: 20px 0 14px; }
label { display: grid; gap: 7px; color: #334155; font-weight: 600; }
.error { margin: 0; padding: 10px; border-radius: 8px; background: #fee2e2; color: #b91c1c; font-size: 12px; }
.helper-text { color: #64748b; font-size: 11px; display: block; margin-top: 14px; text-align: center; }
.store-link { display: inline-block; margin-top: 14px; color: #2563eb; text-decoration: none; font-weight: 650; text-align: center; width: 100%; }

.demo-login-box {
  margin-top: 20px;
  padding: 18px;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  text-align: left;
}
.demo-login-box h3 {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}
.demo-intro {
  margin: 0 0 12px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
}
.credentials-list {
  display: grid;
  gap: 8px;
}
.credential-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.role-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  min-width: 65px;
  text-align: center;
}
.role-badge.admin {
  background: #eef2ff;
  color: #4f46e5;
}
.role-badge.sales {
  background: #f0f9ff;
  color: #0284c7;
}
.role-badge.warehouse {
  background: #f0fdfa;
  color: #0f766e;
}
.details {
  display: grid;
  gap: 2px;
  font-size: 11px;
  color: #475569;
}
.details code {
  font-family: monospace;
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 4px;
  color: #0f172a;
}

/* Login Card Dark Mode Support */
.app-dark .login-card {
  background: #151d30;
  border-color: #23304c;
  box-shadow: 0 30px 90px #000000a0;
}
.app-dark h1 {
  color: #f1f5f9;
}
.app-dark label {
  color: #cbd5e1;
}
.app-dark .subtitle {
  color: #94a3b8;
}
.app-dark .demo-login-box {
  background: #1e293b;
  border-color: #334155;
}
.app-dark .demo-login-box h3 {
  color: #f1f5f9;
}
.app-dark .demo-intro {
  color: #94a3b8;
}
.app-dark .credential-item {
  background: #151d30;
  border-color: #23304c;
}
.app-dark .details {
  color: #cbd5e1;
}
.app-dark .details code {
  background: #1e293b;
  color: #f1f5f9;
}
.app-dark .role-badge.admin {
  background: rgb(79 70 229 / 15%);
  color: #818cf8;
}
.app-dark .role-badge.sales {
  background: rgb(2 132 199 / 15%);
  color: #38bdf8;
}
.app-dark .role-badge.warehouse {
  background: rgb(15 118 110 / 15%);
  color: #2dd4bf;
}
</style>

