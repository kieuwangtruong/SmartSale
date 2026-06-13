<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AdminLayout from './layouts/AdminLayout.vue'

const route = useRoute()
const isPublicPage = computed(() => Boolean(route.meta.public))
</script>

<template>
  <RouterView v-if="isPublicPage" />
  <AdminLayout v-else />
</template>
