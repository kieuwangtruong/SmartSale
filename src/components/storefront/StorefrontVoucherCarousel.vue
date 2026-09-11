<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useLanguage } from '../../services/i18n'
import { useToast } from 'primevue/usetoast'

export interface VoucherItem {
  code: string
  titleVi: string
  titleEn: string
  discountVi: string
  discountEn: string
  conditionVi: string
  conditionEn: string
  expiryVi: string
  expiryEn: string
  tagVi: string
  tagEn: string
  gradient: string
  borderGlow: string
  icon: string
  discountType: 'percent' | 'fixed' | 'shipping'
}

const { t } = useLanguage()
const toast = useToast()

const vouchers = ref<VoucherItem[]>([
  {
    code: 'SUMMER10',
    titleVi: 'Ưu Đãi Mùa Hè 2026',
    titleEn: 'Summer Sale 2026',
    discountVi: 'GIẢM 10%',
    discountEn: '10% OFF',
    conditionVi: 'Đơn từ 500.000₫ • Tối đa 500k',
    conditionEn: 'Min order 500k • Max 500k',
    expiryVi: 'HSD: 30/09/2026',
    expiryEn: 'Exp: 30 Sep 2026',
    tagVi: 'HOT DEAL',
    tagEn: 'HOT DEAL',
    gradient: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
    borderGlow: 'rgba(37, 99, 235, 0.4)',
    icon: 'pi pi-bolt',
    discountType: 'percent',
  },
  {
    code: 'WELCOME50K',
    titleVi: 'Khách Hàng Mới',
    titleEn: 'New Customer Special',
    discountVi: 'GIẢM 50.000₫',
    discountEn: '50,000₫ OFF',
    conditionVi: 'Áp dụng cho đơn đầu tiên từ 300.000₫',
    conditionEn: 'First order from 300,000₫',
    expiryVi: 'HSD: Vô thời hạn',
    expiryEn: 'Exp: Unlimited',
    tagVi: 'QUÀ TẶNG BẠN MỚI',
    tagEn: 'WELCOME GIFT',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderGlow: 'rgba(16, 185, 129, 0.4)',
    icon: 'pi pi-gift',
    discountType: 'fixed',
  },
  {
    code: 'TECH200K',
    titleVi: 'Đồ Công Nghệ & Phụ Kiện',
    titleEn: 'Tech & Accessories',
    discountVi: 'GIẢM 200.000₫',
    discountEn: '200,000₫ OFF',
    conditionVi: 'Áp dụng đơn hàng công nghệ từ 2.000.000₫',
    conditionEn: 'Orders from 2,000,000₫',
    expiryVi: 'HSD: 15/10/2026',
    expiryEn: 'Exp: 15 Oct 2026',
    tagVi: 'SIÊU VOUCHER',
    tagEn: 'MEGA VOUCHER',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    borderGlow: 'rgba(139, 92, 246, 0.4)',
    icon: 'pi pi-desktop',
    discountType: 'fixed',
  },
  {
    code: 'SMARTSALE15',
    titleVi: 'Đại Tiệc Siêu Khuyến Mãi',
    titleEn: 'Mega Festival Sale',
    discountVi: 'GIẢM 15%',
    discountEn: '15% OFF',
    conditionVi: 'Tất cả sản phẩm • Đơn từ 1.000.000₫',
    conditionEn: 'All products • Orders from 1M',
    expiryVi: 'HSD: 31/12/2026',
    expiryEn: 'Exp: 31 Dec 2026',
    tagVi: 'VIP SPECIAL',
    tagEn: 'VIP SPECIAL',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    borderGlow: 'rgba(245, 158, 11, 0.4)',
    icon: 'pi pi-crown',
    discountType: 'percent',
  },
  {
    code: 'FREESHIP',
    titleVi: 'Miễn Phí Vận Chuyển',
    titleEn: 'Free Nationwide Shipping',
    discountVi: 'FREESHIP 0Đ',
    discountEn: 'FREE SHIP',
    conditionVi: 'Toàn quốc cho đơn hàng từ 199.000₫',
    conditionEn: 'Nationwide for orders from 199k',
    expiryVi: 'HSD: 30/11/2026',
    expiryEn: 'Exp: 30 Nov 2026',
    tagVi: 'TIẾT KIỆM',
    tagEn: 'SAVING',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    borderGlow: 'rgba(236, 72, 153, 0.4)',
    icon: 'pi pi-truck',
    discountType: 'shipping',
  },
])

const currentIndex = ref(0)
const copiedCode = ref<string | null>(null)
let autoPlayTimer: any = null

function nextSlide() {
  currentIndex.value = (currentIndex.value + 1) % vouchers.value.length
}

function prevSlide() {
  currentIndex.value = (currentIndex.value - 1 + vouchers.value.length) % vouchers.value.length
}

function setSlide(idx: number) {
  currentIndex.value = idx
}

async function copyVoucherCode(code: string) {
  try {
    await navigator.clipboard.writeText(code)
    copiedCode.value = code
    toast.add({
      severity: 'success',
      summary: t('Đã sao chép mã!', 'Code copied!'),
      detail: t(`Mã "${code}" đã được lưu vào bộ nhớ tạm. Hãy dán khi thanh toán!`, `Coupon "${code}" copied to clipboard. Apply at checkout!`),
      life: 3000,
    })
    setTimeout(() => {
      if (copiedCode.value === code) {
        copiedCode.value = null
      }
    }, 3000)
  } catch {
    copiedCode.value = code
    setTimeout(() => { copiedCode.value = null }, 2000)
  }
}

function startAutoplay() {
  stopAutoplay()
  autoPlayTimer = setInterval(() => {
    nextSlide()
  }, 4500)
}

function stopAutoplay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

onMounted(() => {
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})
</script>

<template>
  <div 
    class="voucher-sliding-section" 
    @mouseenter="stopAutoplay" 
    @mouseleave="startAutoplay"
  >
    <div class="voucher-section-header">
      <div class="header-left-title">
        <span class="pulse-sparkle-icon"><i class="pi pi-sparkles" /></span>
        <div>
          <h3>{{ t('Mã Ưu Đãi & Khuyến Mãi Mới', 'New Promotional Voucher Codes') }}</h3>
          <p>{{ t('Thu thập các voucher giảm giá cực hời để áp dụng khi mua hàng!', 'Collect high-value discount coupons to save big on your order!') }}</p>
        </div>
      </div>
      <div class="carousel-nav-arrows">
        <button type="button" class="arrow-btn prev" @click="prevSlide" :aria-label="t('Mã trước', 'Previous voucher')">
          <i class="pi pi-chevron-left" />
        </button>
        <button type="button" class="arrow-btn next" @click="nextSlide" :aria-label="t('Mã tiếp theo', 'Next voucher')">
          <i class="pi pi-chevron-right" />
        </button>
      </div>
    </div>

    <!-- Voucher Slider Track -->
    <div class="voucher-carousel-wrapper">
      <div 
        class="voucher-track"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div 
          v-for="v in vouchers" 
          :key="v.code"
          class="voucher-slide"
        >
          <div class="voucher-ticket-card" :style="{ '--voucher-glow': v.borderGlow }">
            <!-- Left Ticket Stub: Discount Value & Brand -->
            <div class="ticket-left-stub" :style="{ background: v.gradient }">
              <span class="stub-tag">{{ t(v.tagVi, v.tagEn) }}</span>
              <div class="stub-discount">
                <i :class="v.icon" class="stub-icon" />
                <strong>{{ t(v.discountVi, v.discountEn) }}</strong>
              </div>
              <small class="stub-brand">SmartSale PRO</small>
              <!-- Ticket Notch Top & Bottom -->
              <div class="notch top" />
              <div class="notch bottom" />
            </div>

            <!-- Ticket Perforation Line -->
            <div class="ticket-perforation" />

            <!-- Right Ticket Body: Details & Actions -->
            <div class="ticket-body">
              <div class="ticket-info">
                <div class="ticket-title-row">
                  <h4>{{ t(v.titleVi, v.titleEn) }}</h4>
                  <span class="ticket-expiry"><i class="pi pi-clock" /> {{ t(v.expiryVi, v.expiryEn) }}</span>
                </div>
                <p class="ticket-condition">{{ t(v.conditionVi, v.conditionEn) }}</p>
              </div>

              <div class="ticket-action-row">
                <div class="code-pill-badge" @click="copyVoucherCode(v.code)" :title="t('Nhấn để sao chép', 'Click to copy')">
                  <span class="code-text">{{ v.code }}</span>
                  <i class="pi pi-copy" />
                </div>
                <button
                  type="button"
                  class="apply-voucher-btn"
                  :class="{ 'is-copied': copiedCode === v.code }"
                  @click="copyVoucherCode(v.code)"
                >
                  <i :class="copiedCode === v.code ? 'pi pi-check' : 'pi pi-bolt'" />
                  <span>{{ copiedCode === v.code ? t('Đã lưu mã!', 'Saved!') : t('Lấy mã ngay', 'Collect Code') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Carousel Dots Indicator -->
    <div class="voucher-dots-bar">
      <button 
        v-for="(_, idx) in vouchers" 
        :key="idx" 
        type="button"
        class="dot-btn"
        :class="{ active: currentIndex === idx }"
        @click="setSlide(idx)"
        :aria-label="`Slide ${idx + 1}`"
      />
    </div>
  </div>
</template>

<style scoped>
.voucher-sliding-section {
  position: relative;
  margin: 32px 0 38px;
  padding: 22px 26px;
  border-radius: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
}

.voucher-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

.header-left-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pulse-sparkle-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 17px;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
  flex-shrink: 0;
}

.header-left-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.header-left-title p {
  margin: 2px 0 0;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.carousel-nav-arrows {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrow-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.5px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  display: grid;
  place-items: center;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.arrow-btn:hover {
  background: #0f766e;
  border-color: #0f766e;
  color: #ffffff;
  transform: scale(1.06);
}

/* Track & Slide Layout */
.voucher-carousel-wrapper {
  overflow: hidden;
  border-radius: 14px;
}

.voucher-track {
  display: flex;
  transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
  width: 100%;
}

.voucher-slide {
  flex: 0 0 100%;
  width: 100%;
  box-sizing: border-box;
}

/* Ticket Card Styling */
.voucher-ticket-card {
  display: flex;
  min-height: 120px;
  border-radius: 14px;
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.voucher-ticket-card:hover {
  box-shadow: 0 10px 24px var(--voucher-glow, rgba(15, 118, 110, 0.18));
}

/* Left Stub */
.ticket-left-stub {
  width: 190px;
  flex-shrink: 0;
  padding: 14px 16px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}

.stub-tag {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 3px 8px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.22);
  width: fit-content;
  text-transform: uppercase;
}

.stub-discount {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.stub-icon {
  font-size: 20px;
}

.stub-discount strong {
  font-size: 19px;
  font-weight: 850;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.stub-brand {
  font-size: 10px;
  opacity: 0.85;
  font-weight: 600;
  letter-spacing: 0.05em;
}

/* Ticket Notches (Cutout) */
.notch {
  position: absolute;
  right: -9px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  z-index: 5;
}

.notch.top {
  top: -9px;
}

.notch.bottom {
  bottom: -9px;
}

/* Perforation line */
.ticket-perforation {
  width: 0;
  border-left: 2px dashed #cbd5e1;
  position: relative;
  z-index: 2;
}

/* Ticket Body */
.ticket-body {
  flex: 1;
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: #ffffff;
}

.ticket-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.ticket-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ticket-title-row h4 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 800;
  color: #0f172a;
}

.ticket-expiry {
  font-size: 11.5px;
  color: #d97706;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ticket-condition {
  margin: 0;
  font-size: 12.5px;
  color: #64748b;
  font-weight: 500;
}

/* Ticket Action Row */
.ticket-action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.code-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1.5px dashed #0f766e;
  cursor: pointer;
  transition: all 0.2s ease;
}

.code-pill-badge:hover {
  background: #f0fdfa;
  border-color: #14b8a6;
}

.code-text {
  font-family: monospace;
  font-size: 14px;
  font-weight: 850;
  color: #0f766e;
  letter-spacing: 0.05em;
}

.code-pill-badge i {
  font-size: 12px;
  color: #0f766e;
}

.apply-voucher-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 10px;
  border: none;
  background: #0f766e;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.apply-voucher-btn:hover {
  background: #115e59;
  transform: translateY(-1px);
}

.apply-voucher-btn.is-copied {
  background: #16a34a;
}

/* Dots indicator */
.voucher-dots-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
}

.dot-btn {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  border: none;
  background: #cbd5e1;
  cursor: pointer;
  transition: all 0.25s ease;
}

.dot-btn.active {
  width: 22px;
  background: #0f766e;
}

/* Dark Mode Overrides */
.app-dark .voucher-sliding-section {
  background: linear-gradient(135deg, #151d30 0%, #0b0f19 100%);
  border-color: #23304c;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.app-dark .header-left-title h3 {
  color: #f8fafc;
}

.app-dark .header-left-title p {
  color: #94a3b8;
}

.app-dark .arrow-btn {
  background: #1e293b;
  border-color: #334155;
  color: #f8fafc;
}

.app-dark .arrow-btn:hover {
  background: #0f766e;
  border-color: #0f766e;
}

.app-dark .voucher-ticket-card {
  background: #151d30;
  border-color: #23304c;
}

.app-dark .ticket-body {
  background: #151d30;
}

.app-dark .notch {
  background: #151d30;
}

.app-dark .ticket-perforation {
  border-left-color: #334155;
}

.app-dark .ticket-title-row h4 {
  color: #f8fafc;
}

.app-dark .ticket-condition {
  color: #94a3b8;
}

.app-dark .code-pill-badge {
  background: #1e293b;
  border-color: #2dd4bf;
}

.app-dark .code-text,
.app-dark .code-pill-badge i {
  color: #2dd4bf;
}

@media (max-width: 768px) {
  .voucher-ticket-card {
    flex-direction: column;
  }
  .ticket-left-stub {
    width: 100%;
    border-radius: 14px 14px 0 0;
  }
  .notch {
    display: none;
  }
  .ticket-perforation {
    display: none;
  }
  .ticket-body {
    flex-direction: column;
    align-items: flex-start;
  }
  .ticket-action-row {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
