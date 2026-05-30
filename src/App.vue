<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="app-kicker">Sales Admin</p>
        <h1>Quản lý Đơn Hàng và Nhân Sự</h1>
      </div>

      <nav class="app-nav" aria-label="Điều hướng chính">
        <RouterLink to="/">Đơn hàng</RouterLink>
        <RouterLink to="/users">Nhân Sự</RouterLink>
        <RouterLink to="/about">Giới thiệu</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
