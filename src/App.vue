<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AdminLayout from './layouts/AdminLayout.vue'
import { useAuthStore } from './stores/authStore'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const isPublicPage = computed(() => Boolean(route.meta.public))
const isCustomerPage = computed(() => Boolean(route.meta.customerPage))

function handleAuthChange() {
  auth.sync()
  if (!auth.isAuthenticated && !route.meta.public) {
    void router.replace({
      name: isCustomerPage.value ? 'customer-login' : 'admin-login',
      query: { redirect: route.fullPath },
    })
  }
}

onMounted(() => window.addEventListener('auth-changed', handleAuthChange))
onUnmounted(() => window.removeEventListener('auth-changed', handleAuthChange))
</script>

<template>
  <RouterView v-if="isPublicPage || isCustomerPage || !auth.isAuthenticated" />
  <AdminLayout v-else />
</template>
