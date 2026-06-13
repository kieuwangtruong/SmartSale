import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  clearSession,
  getSession,
  saveSession,
  type AuthSession,
  type UserRole,
} from '../services/apiClient'
import { loginUser, logoutUser } from '../services/userApi'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<AuthSession | null>(getSession())
  const user = computed(() => session.value?.user ?? null)
  const role = computed<UserRole | null>(() => user.value?.role ?? null)
  const isAuthenticated = computed(() => Boolean(session.value?.accessToken))

  async function login(email: string, password: string) {
    const result = await loginUser({ email, password })
    saveSession(result)
    session.value = result
    return result.user
  }

  async function logout() {
    const current = session.value
    try {
      if (current) await logoutUser({ refreshToken: current.refreshToken })
    } finally {
      clearSession()
      session.value = null
    }
  }

  function sync() {
    session.value = getSession()
  }

  return { session, user, role, isAuthenticated, login, logout, sync }
})
