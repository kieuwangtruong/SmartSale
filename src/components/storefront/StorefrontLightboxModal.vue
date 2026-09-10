<script setup lang="ts">
import { useLanguage } from '../../services/i18n'

defineProps<{
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
</script>

<template>
  <div v-if="show" class="lightbox-overlay" @click.self="emit('close')">
    <div class="lightbox-modal" role="dialog" aria-modal="true">
      <button type="button" class="lightbox-close-btn" @click="emit('close')" :aria-label="t('Đóng', 'Close')">
        <i class="pi pi-times" />
      </button>

      <div class="lightbox-stage">
        <button v-if="images.length > 1" type="button" class="lightbox-nav-btn prev" @click="emit('prev')">
          <i class="pi pi-chevron-left" />
        </button>

        <div class="lightbox-main-img-wrap">
          <img :src="images[activeIdx] || imageUrl" :alt="title" class="lightbox-image" />
          <span class="lightbox-caption">{{ title }}</span>
        </div>

        <button v-if="images.length > 1" type="button" class="lightbox-nav-btn next" @click="emit('next')">
          <i class="pi pi-chevron-right" />
        </button>
      </div>

      <div v-if="images.length > 1" class="lightbox-thumbs">
        <button
          v-for="(img, idx) in images"
          :key="idx"
          type="button"
          class="lightbox-thumb-btn"
          :class="{ active: idx === activeIdx }"
          @click="emit('select', idx)"
        >
          <img :src="img" :alt="`Thumbnail ${idx + 1}`" />
        </button>
      </div>
    </div>
  </div>
</template>
