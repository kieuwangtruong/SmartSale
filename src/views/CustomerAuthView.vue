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
    await auth.login(form.email, form.password)
    await router.replace('/customer')
  } catch (exception) {
    error.value = exception instanceof Error ? exception.message : 'Không thể xử lý tài khoản.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="customer-auth">
    <section class="auth-card">
      <span class="eyebrow">CUSTOMER</span>
      <h1>{{ mode === 'login' ? 'Đăng nhập khách hàng' : 'Đăng ký khách hàng' }}</h1>
      <p>Đăng nhập để xem hạng thành viên và lịch sử mua hàng.</p>
      <form @submit.prevent="submit">
        <input v-if="mode === 'register'" v-model="form.userName" required placeholder="Ten dang nhap" />
        <input v-if="mode === 'register'" v-model="form.fullName" required placeholder="Ho ten" />
        <input v-model="form.email" required type="email" placeholder="Email" />
        <input v-model="form.password" required type="password" placeholder="Mật khẩu" />
        <input v-if="mode === 'register'" v-model="form.dateOfBirth" type="date" />
        <select v-if="mode === 'register'" v-model.number="form.sex">
          <option :value="0">Nam</option>
          <option :value="1">Nu</option>
          <option :value="2">Khac</option>
        </select>
        <input v-if="mode === 'register'" v-model="form.address" placeholder="Địa chỉ" />
        <p v-if="error" class="error">{{ error }}</p>
        <button :disabled="loading" type="submit">{{ loading ? 'Đang xử lý...' : 'Tiếp tục' }}</button>
      </form>
      <button class="link-button" type="button" @click="mode = mode === 'login' ? 'register' : 'login'">
        {{ mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.customer-auth { min-height: 100vh; display: grid; place-items: center; background: #f4f7fb; padding: 24px; }
.auth-card { width: min(460px, 100%); background: white; border-radius: 22px; padding: 34px; box-shadow: 0 24px 70px rgb(15 23 42 / 12%); }
.eyebrow { color: #0f766e; font-weight: 900; font-size: 12px; letter-spacing: .15em; }
h1 { margin: 10px 0; color: #0f172a; }
p { color: #64748b; }
form { display: grid; gap: 12px; margin-top: 22px; }
input, select { border: 1px solid #dbe3ef; border-radius: 12px; padding: 13px 14px; }
button { border: 0; border-radius: 12px; padding: 13px 16px; background: #0f766e; color: white; font-weight: 800; cursor: pointer; }
button:disabled { opacity: .7; cursor: wait; }
.link-button { margin-top: 14px; background: transparent; color: #0f766e; padding-inline: 0; }
.error { color: #dc2626; margin: 0; }
</style>
