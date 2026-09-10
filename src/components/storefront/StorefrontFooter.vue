<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useLanguage } from '../../services/i18n'

const { t } = useLanguage()
</script>

<template>
  <footer id="footer">
    <div class="footer-content">
      <div class="footer-brand-section">
        <RouterLink class="store-brand footer-brand" to="/">
          <span class="brand-mark"><i class="pi pi-shopping-bag" /></span>
          <span class="brand-copy">
            <strong>Smart Sale Store</strong>
            <small>{{ t('Hệ thống bán hàng thông minh', 'Smart Sales & Inventory System') }}</small>
          </span>
        </RouterLink>
        <div class="social-links">
          <a href="#" :aria-label="t('Facebook', 'Facebook')"><i class="pi pi-facebook" /></a>
          <a href="#" :aria-label="t('Youtube', 'Youtube')"><i class="pi pi-youtube" /></a>
          <a href="#" :aria-label="t('Twitter', 'Twitter')"><i class="pi pi-twitter" /></a>
        </div>
      </div>
      
      <div class="footer-links">
        <strong>{{ t('Danh mục mua sắm', 'Shop Categories') }}</strong>
        <a href="#products">{{ t('Tất cả sản phẩm', 'All Products') }}</a>
        <a href="#service">{{ t('Dịch vụ khách hàng', 'Customer Service') }}</a>
        <a href="#footer">{{ t('Liên hệ hỗ trợ', 'Contact Support') }}</a>
      </div>
      
      <div class="footer-links">
        <strong>{{ t('Thông tin liên hệ', 'Contact Information') }}</strong>
        <span><i class="pi pi-phone" /> {{ t('Hotline: 1900 6789', 'Hotline: 1900 6789') }}</span>
        <span><i class="pi pi-envelope" /> support@smartsales.com</span>
        <span><i class="pi pi-map-marker" /> {{ t('Hà Nội, Việt Nam', 'Hanoi, Vietnam') }}</span>
      </div>

      <div class="footer-links">
        <strong>{{ t('Hệ thống nội bộ', 'Internal System') }}</strong>
        <RouterLink class="staff-login-btn" to="/login/staff">
          <i class="pi pi-lock" /> {{ t('Đăng nhập nhân viên', 'Staff Login') }}
        </RouterLink>
        <span class="status-indicator"><i class="pi pi-server" /> {{ t('Kết nối API Service', 'API Service Connected') }}</span>
      </div>
    </div>
    <div class="footer-bottom">
      <span>{{ t('© 2026 Smart Sale Store. Bảo lưu mọi quyền.', '© 2026 Smart Sale Store. All rights reserved.') }}</span>
      <span class="system-status"><i class="pi pi-circle-fill" /> {{ t('Hệ thống trực tuyến', 'System Online') }}</span>
    </div>
  </footer>
</template>
