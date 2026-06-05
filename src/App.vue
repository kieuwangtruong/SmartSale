<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar" aria-label="Điều hướng chính">
      <div class="brand-block">
        <span class="brand-mark">S</span>
        <div>
          <strong>Sales Admin</strong>
          <small>Inventory Panel</small>
        </div>
      </div>

      <nav class="sidebar-nav">
        <p class="nav-section">Main</p>
        <RouterLink to="/dashboard">
          <span class="nav-icon">📊</span>
          <span>Bảng điều khiển</span>
        </RouterLink>
        <RouterLink to="/">
          <span class="nav-icon">📦</span>
          <span>Đơn hàng</span>
        </RouterLink>
        <RouterLink to="/users">
          <span class="nav-icon">👥</span>
          <span>Người dùng</span>
        </RouterLink>

        <p class="nav-section">System</p>
        <RouterLink to="/about">
          <span class="nav-icon">ⓘ</span>
          <span>Giới thiệu</span>
        </RouterLink>
      </nav>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div>
          <p class="app-kicker">Trang quản trị</p>
          <h1>Quản lý bán hàng và kho</h1>
        </div>

        <div class="topbar-actions" aria-label="Công cụ nhanh">
          <label class="global-search">
            <span>⌕</span>
            <input type="search" placeholder="Tìm kiếm nhanh..." />
          </label>
          <button class="icon-button" type="button" aria-label="Thông báo">🔔</button>
          <div class="admin-avatar" aria-label="Admin">AD</div>
        </div>
      </header>

      <RouterView />
    </div>
  </div>
</template>
