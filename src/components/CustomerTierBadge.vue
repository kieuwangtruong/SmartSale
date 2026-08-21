<script setup lang="ts">
import { computed } from 'vue'
import {
  getTierConfig,
  getTierLabel,
  type CustomerTier,
  type TierThreshold,
} from '../services/customerTier'
import { currentLanguage, useLanguage } from '../services/i18n'

const props = withDefaults(
  defineProps<{
    tier?: CustomerTier | string | number | null
    spent?: number | null
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    variant?: 'badge' | 'logo-only' | 'pill' | 'card' | 'avatar-tag' | 'inline'
    showLabel?: boolean
    showDiscount?: boolean
    showTagline?: boolean
    animated?: boolean
  }>(),
  {
    tier: 'Standard',
    spent: null,
    size: 'md',
    variant: 'badge',
    showLabel: true,
    showDiscount: false,
    showTagline: false,
    animated: true,
  },
)

const { t } = useLanguage()

const tierConfig = computed<TierThreshold>(() => {
  if (typeof props.spent === 'number' && props.spent > 0) {
    return getTierConfig(props.spent)
  }
  return getTierConfig(props.tier)
})

const tierName = computed(() => {
  return currentLanguage.value === 'en' ? tierConfig.value.labelEn : tierConfig.value.labelVi
})

const discountText = computed(() => {
  if (tierConfig.value.discountPercent <= 0) return ''
  return `-${tierConfig.value.discountPercent}%`
})
</script>

<template>
  <div
    class="customer-tier-badge"
    :class="[
      `tier-${tierConfig.badgeClass}`,
      `size-${size}`,
      `variant-${variant}`,
      { 'is-animated': animated }
    ]"
    :title="t(tierConfig.descriptionVi, tierConfig.descriptionEn)"
  >
    <!-- Vector Logo Rendering for each tier -->
    <div class="tier-logo-wrapper">
      <!-- 1. KIM CƯƠNG (DIAMOND / PLATINUM) VECTOR LOGO -->
      <svg
        v-if="tierConfig.tier === 'Platinum'"
        class="tier-svg-logo logo-diamond"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="diamondGradMain" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="45%" stop-color="#818cf8" />
            <stop offset="100%" stop-color="#c084fc" />
          </linearGradient>
          <linearGradient id="diamondGradLight" x1="12" y1="8" x2="36" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
            <stop offset="60%" stop-color="#e0f2fe" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#a855f7" stop-opacity="0.3" />
          </linearGradient>
          <linearGradient id="diamondFacet1" x1="24" y1="8" x2="24" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#67e8f9" />
            <stop offset="100%" stop-color="#6366f1" />
          </linearGradient>
          <filter id="diamondGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        <!-- Diamond Base Shape -->
        <polygon points="14,8 34,8 44,19 24,41 4,19" fill="url(#diamondGradMain)" filter="url(#diamondGlow)" />
        
        <!-- Upper Table and Facets -->
        <polygon points="14,8 34,8 28,19 20,19" fill="url(#diamondGradLight)" />
        <polygon points="14,8 20,19 4,19" fill="#0284c7" fill-opacity="0.6" />
        <polygon points="34,8 44,19 28,19" fill="#9333ea" fill-opacity="0.5" />
        
        <!-- Lower Pavilion Facets -->
        <polygon points="4,19 20,19 24,41" fill="url(#diamondFacet1)" fill-opacity="0.85" />
        <polygon points="20,19 28,19 24,41" fill="#ffffff" fill-opacity="0.75" />
        <polygon points="28,19 44,19 24,41" fill="#7c3aed" fill-opacity="0.9" />
        
        <!-- Sparkle Glints -->
        <path class="sparkle-star" d="M12 12L13.5 9L15 12L18 13.5L15 15L13.5 18L12 15L9 13.5Z" fill="#ffffff" />
        <circle cx="36" cy="14" r="1.5" fill="#ffffff" />
      </svg>

      <!-- 2. VÀNG (GOLD) VECTOR LOGO -->
      <svg
        v-else-if="tierConfig.tier === 'Gold'"
        class="tier-svg-logo logo-gold"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldGradMain" x1="4" y1="8" x2="44" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="30%" stop-color="#fbbf24" />
            <stop offset="70%" stop-color="#f59e0b" />
            <stop offset="100%" stop-color="#b45309" />
          </linearGradient>
          <linearGradient id="goldSheen" x1="8" y1="12" x2="40" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8" />
            <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#d97706" stop-opacity="0.7" />
          </linearGradient>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Royal Crown Base -->
        <path
          d="M6 34L10 14L19 23L24 10L29 23L38 14L42 34C42 36.2 40.2 38 38 38H10C7.8 38 6 36.2 6 34Z"
          fill="url(#goldGradMain)"
          filter="url(#goldGlow)"
        />
        
        <!-- Crown Front Bevel & Highlights -->
        <path
          d="M6 34L10 14L19 23L24 10L29 23L38 14L42 34H6Z"
          fill="url(#goldSheen)"
          fill-opacity="0.6"
        />
        
        <!-- Crown Base Band -->
        <rect x="7" y="32" width="34" height="6" rx="3" fill="#78350f" fill-opacity="0.4" />
        <rect x="8" y="33" width="32" height="4" rx="2" fill="url(#goldGradMain)" />
        
        <!-- Crown Jewel Beads -->
        <circle cx="10" cy="14" r="2.5" fill="#ffffff" />
        <circle cx="24" cy="10" r="3.2" fill="#ffffff" />
        <circle cx="38" cy="14" r="2.5" fill="#ffffff" />
        
        <!-- Center Star Gem -->
        <path d="M24 22L25.5 26L29 27L25.5 28L24 32L22.5 28L19 27L22.5 26Z" fill="#ffffff" />
      </svg>

      <!-- 3. BẠC (SILVER) VECTOR LOGO -->
      <svg
        v-else-if="tierConfig.tier === 'Silver'"
        class="tier-svg-logo logo-silver"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="silverGradMain" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="25%" stop-color="#e2e8f0" />
            <stop offset="60%" stop-color="#94a3b8" />
            <stop offset="100%" stop-color="#64748b" />
          </linearGradient>
          <linearGradient id="silverAccent" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#e0f2fe" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
        </defs>

        <!-- Outer Shield Badge -->
        <path
          d="M24 4L39 10V22C39 31.8 32.6 40.8 24 44C15.4 40.8 9 31.8 9 22V10L24 4Z"
          fill="url(#silverGradMain)"
        />
        
        <!-- Inner Silver Ring / Inset -->
        <path
          d="M24 8L36 13V22C36 29.8 30.8 37 24 39.5C17.2 37 12 29.8 12 22V13L24 8Z"
          fill="#1e293b"
          fill-opacity="0.25"
        />
        <path
          d="M24 10L34 14V22C34 28.5 29.7 34.5 24 36.8C18.3 34.5 14 28.5 14 22V14L24 10Z"
          fill="url(#silverAccent)"
          fill-opacity="0.3"
        />

        <!-- Centered Silver Star -->
        <polygon
          points="24,14 27,21 34,21 28,26 30,33 24,28 18,33 20,26 14,21 21,21"
          fill="url(#silverGradMain)"
          stroke="#ffffff"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
      </svg>

      <!-- 4. THƯỜNG (STANDARD MEMBER) VECTOR LOGO -->
      <svg
        v-else
        class="tier-svg-logo logo-standard"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="stdGrad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#94a3b8" />
            <stop offset="100%" stop-color="#475569" />
          </linearGradient>
        </defs>
        
        <!-- Round Member Seal -->
        <circle cx="24" cy="24" r="18" fill="url(#stdGrad)" />
        <circle cx="24" cy="24" r="15" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.4" stroke-dasharray="3 3" />
        
        <!-- User Silhouette Icon -->
        <circle cx="24" cy="18" r="5" fill="#ffffff" />
        <path d="M15 33C15 28.5 19 25 24 25C29 25 33 28.5 33 33" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    </div>

    <!-- Tier Text Label & Discount Pill -->
    <div v-if="showLabel && variant !== 'logo-only'" class="tier-text-content">
      <span class="tier-name">{{ tierName }}</span>
      <span v-if="showDiscount && discountText" class="tier-discount-pill">{{ discountText }}</span>
      <small v-if="showTagline" class="tier-tagline">{{ t(tierConfig.taglineVi, tierConfig.taglineEn) }}</small>
    </div>
  </div>
</template>

<style scoped>
.customer-tier-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: relative;
  font-family: inherit;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

/* Tier Logo SVG container */
.tier-logo-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.tier-svg-logo {
  display: block;
  width: 100%;
  height: 100%;
}

/* Sparkle animation for Diamond & Gold */
.is-animated .logo-diamond .sparkle-star {
  animation: diamondSparkle 2.4s ease-in-out infinite alternate;
  transform-origin: 13.5px 13.5px;
}

.is-animated .logo-gold {
  animation: goldShimmer 3s ease-in-out infinite alternate;
}

@keyframes diamondSparkle {
  0% { transform: scale(0.6) rotate(0deg); opacity: 0.4; }
  50% { transform: scale(1.2) rotate(45deg); opacity: 1; filter: drop-shadow(0 0 4px #67e8f9); }
  100% { transform: scale(0.7) rotate(90deg); opacity: 0.5; }
}

@keyframes goldShimmer {
  0% { filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0.4)); }
  50% { filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.8)); }
  100% { filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0.4)); }
}

/* Text Container */
.tier-text-content {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.15;
}

.tier-name {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.tier-discount-pill {
  font-size: 0.75em;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  margin-left: 4px;
}

.tier-tagline {
  font-size: 0.75em;
  opacity: 0.85;
  font-weight: 500;
  margin-top: 2px;
}

/* ==========================================================================
   VARIANTS
   ========================================================================== */

/* 1. Variant: BADGE (Standard Pill Badge) */
.variant-badge {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
}

.variant-badge.tier-platinum {
  background: linear-gradient(135deg, rgba(224, 242, 254, 0.85) 0%, rgba(243, 232, 255, 0.95) 100%);
  color: #7e22ce;
  border-color: rgba(168, 85, 247, 0.4);
  box-shadow: 0 2px 8px rgba(168, 85, 247, 0.18);
}

.variant-badge.tier-gold {
  background: linear-gradient(135deg, rgba(254, 249, 195, 0.9) 0%, rgba(254, 243, 199, 0.95) 100%);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
}

.variant-badge.tier-silver {
  background: linear-gradient(135deg, rgba(241, 245, 249, 0.9) 0%, rgba(224, 242, 254, 0.95) 100%);
  color: #0369a1;
  border-color: rgba(14, 165, 233, 0.35);
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.15);
}

.variant-badge.tier-standard {
  background: #f1f5f9;
  color: #475569;
  border-color: #cbd5e1;
}

/* 2. Variant: PILL (Slim Compact Pill) */
.variant-pill {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.85em;
  font-weight: 750;
  text-transform: uppercase;
}

.variant-pill.tier-platinum {
  background: #f3e8ff;
  color: #7e22ce;
}
.variant-pill.tier-gold {
  background: #fef3c7;
  color: #b45309;
}
.variant-pill.tier-silver {
  background: #e0f2fe;
  color: #0369a1;
}
.variant-pill.tier-standard {
  background: #f1f5f9;
  color: #475569;
}

/* 3. Variant: CARD (Prominent VIP Card) */
.variant-card {
  padding: 14px 18px;
  border-radius: 16px;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
}

.variant-card::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    60deg,
    rgba(255, 255, 255, 0) 30%,
    rgba(255, 255, 255, 0.18) 50%,
    rgba(255, 255, 255, 0) 70%
  );
  transform: rotate(25deg);
  pointer-events: none;
}

.variant-card.tier-platinum {
  background: linear-gradient(135deg, #0284c7 0%, #6366f1 50%, #9333ea 100%);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 12px 28px rgba(147, 51, 234, 0.35);
}

.variant-card.tier-gold {
  background: linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #b45309 100%);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 12px 28px rgba(217, 119, 6, 0.35);
}

.variant-card.tier-silver {
  background: linear-gradient(135deg, #0369a1 0%, #38bdf8 50%, #475569 100%);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 12px 28px rgba(3, 105, 161, 0.3);
}

.variant-card.tier-standard {
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* 4. Variant: AVATAR-TAG (Floating on top/corner of avatar) */
.variant-avatar-tag {
  padding: 2px 6px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  font-size: 11px;
}

/* 5. Variant: LOGO-ONLY */
.variant-logo-only {
  padding: 0;
  background: transparent;
}

/* 6. Variant: INLINE */
.variant-inline {
  display: inline-flex;
  vertical-align: middle;
}

/* ==========================================================================
   SIZES
   ========================================================================== */

.size-xs .tier-logo-wrapper { width: 14px; height: 14px; }
.size-xs { font-size: 11px; }

.size-sm .tier-logo-wrapper { width: 18px; height: 18px; }
.size-sm { font-size: 12px; }

.size-md .tier-logo-wrapper { width: 22px; height: 22px; }
.size-md { font-size: 13.5px; }

.size-lg .tier-logo-wrapper { width: 32px; height: 32px; }
.size-lg { font-size: 16px; }

.size-xl .tier-logo-wrapper { width: 46px; height: 46px; }
.size-xl { font-size: 20px; }

/* Dark mode compatibility */
.app-dark .variant-badge.tier-platinum {
  background: rgba(147, 51, 234, 0.22);
  color: #d8b4fe;
  border-color: rgba(168, 85, 247, 0.5);
}

.app-dark .variant-badge.tier-gold {
  background: rgba(245, 158, 11, 0.22);
  color: #fde047;
  border-color: rgba(245, 158, 11, 0.5);
}

.app-dark .variant-badge.tier-silver {
  background: rgba(14, 165, 233, 0.22);
  color: #7dd3fc;
  border-color: rgba(14, 165, 233, 0.5);
}

.app-dark .variant-badge.tier-standard {
  background: rgba(100, 116, 139, 0.25);
  color: #cbd5e1;
  border-color: rgba(100, 116, 139, 0.4);
}
</style>
