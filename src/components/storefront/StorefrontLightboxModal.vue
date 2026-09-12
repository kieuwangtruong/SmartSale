<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useLanguage } from '../../services/i18n'

const props = defineProps<{
  show: boolean
  imageUrl: string
  title: string
  images: string[]
  activeIdx: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'select', idx: number): void
}>()

const { t } = useLanguage()

function handleKeyDown(e: KeyboardEvent) {
  if (!props.show) return
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowLeft') {
    emit('prev')
  } else if (e.key === 'ArrowRight') {
    emit('next')
  }
}

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lightbox-fade">
      <div v-if="show" class="lightbox-overlay" @click.self="emit('close')">
        <div class="lightbox-modal" role="dialog" aria-modal="true">
          <!-- Top Bar: Title, counter & Close Button -->
          <div class="lightbox-topbar">
            <div class="lightbox-header-info">
              <span class="lightbox-caption">{{ title }}</span>
              <span v-if="images.length > 1" class="lightbox-counter">
                {{ activeIdx + 1 }} / {{ images.length }}
              </span>
            </div>
            <button
              type="button"
              class="lightbox-close-btn"
              @click="emit('close')"
              :aria-label="t('Đóng', 'Close')"
              title="Esc"
            >
              <i class="pi pi-times" />
            </button>
          </div>

          <!-- Main Stage -->
          <div class="lightbox-stage">
            <button
              v-if="images.length > 1"
              type="button"
              class="lightbox-nav-btn prev"
              @click.stop="emit('prev')"
              :aria-label="t('Ảnh trước', 'Previous image')"
            >
              <i class="pi pi-chevron-left" />
            </button>

            <div class="lightbox-main-img-wrap" @click.self="emit('close')">
              <img
                :src="images[activeIdx] || imageUrl"
                :alt="title"
                class="lightbox-image"
              />
            </div>

            <button
              v-if="images.length > 1"
              type="button"
              class="lightbox-nav-btn next"
              @click.stop="emit('next')"
              :aria-label="t('Ảnh sau', 'Next image')"
            >
              <i class="pi pi-chevron-right" />
            </button>
          </div>

          <!-- Thumbnail Strip -->
          <div v-if="images.length > 1" class="lightbox-thumbs">
            <button
              v-for="(img, idx) in images"
              :key="idx"
              type="button"
              class="lightbox-thumb-btn"
              :class="{ active: idx === activeIdx }"
              @click="emit('select', idx)"
              :aria-label="`Thumbnail ${idx + 1}`"
            >
              <img :src="img" :alt="`Thumbnail ${idx + 1}`" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(10, 15, 29, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.lightbox-modal {
  position: relative;
  width: 100%;
  max-width: 1200px;
  max-height: 96vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.lightbox-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 900px;
  padding: 0 8px;
}

.lightbox-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.lightbox-caption {
  color: #f8fafc;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 600px;
}

.lightbox-counter {
  display: inline-flex;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 700;
  font-family: monospace;
}

.lightbox-close-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lightbox-close-btn:hover {
  background: #ef4444;
  border-color: #ef4444;
  color: #ffffff;
  transform: scale(1.08);
}

.lightbox-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-height: 75vh;
}

.lightbox-main-img-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 72vh;
  max-width: 88vw;
}

.lightbox-image {
  max-height: 72vh;
  max-width: 85vw;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  user-select: none;
}

.lightbox-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  font-size: 20px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
}

.lightbox-nav-btn.prev {
  left: 8px;
}

.lightbox-nav-btn.next {
  right: 8px;
}

.lightbox-nav-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.lightbox-thumbs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  max-width: 85vw;
  overflow-x: auto;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
}

.lightbox-thumb-btn {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.lightbox-thumb-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.lightbox-thumb-btn:hover {
  border-color: rgba(56, 189, 248, 0.6);
  transform: translateY(-2px);
}

.lightbox-thumb-btn.active {
  border-color: #38bdf8;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
  transform: scale(1.06);
}

/* Transitions */
.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
  transform: scale(0.97);
}
</style>
