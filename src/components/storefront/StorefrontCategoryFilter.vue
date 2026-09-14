<script setup lang="ts">
import { useLanguage } from '../../services/i18n'
import type { SortOption } from '../../composables/useStorefrontProducts'

defineProps<{
  category: string
  categories: string[]
  search: string
  sort: SortOption
  showOnlySales: boolean
  showAllProducts: boolean
  totalCount: number
}>()

const emit = defineEmits<{
  (e: 'update:category', val: string): void
  (e: 'update:search', val: string): void
  (e: 'update:sort', val: SortOption): void
  (e: 'update:showOnlySales', val: boolean): void
  (e: 'update:showAllProducts', val: boolean): void
  (e: 'clear-filters'): void
}>()

const { t } = useLanguage()

function translateCategory(cat: string): string {
  if (!cat) return ''
  if (cat === 'Gia dụng' || cat.toLowerCase().includes('gia dụng')) {
    return t('Gia dụng', 'Home')
  }
  if (cat === 'Phụ kiện' || cat.toLowerCase().includes('phụ kiện')) {
    return t('Phụ kiện', 'Accessories')
  }
  if (cat === 'Văn phòng' || cat.toLowerCase().includes('văn phòng')) {
    return t('Văn phòng', 'Office')
  }
  if (cat === 'Điện tử' || cat.toLowerCase().includes('điện tử')) {
    return t('Điện tử', 'Electronics')
  }
  return cat
}

function getCategoryIcon(cat: string): string {
  const c = (cat || '').toLowerCase()
  if (c.includes('điện tử') || c.includes('electronic')) return 'pi pi-desktop'
  if (c.includes('gia dụng') || c.includes('home')) return 'pi pi-home'
  if (c.includes('phụ kiện') || c.includes('access')) return 'pi pi-tags'
  if (c.includes('văn phòng') || c.includes('office')) return 'pi pi-briefcase'
  if (c.includes('mỹ phẩm') || c.includes('chăm sóc') || c.includes('cosmetic')) return 'pi pi-heart'
  return 'pi pi-box'
}
</script>

<template>
  <div class="category-filter-root">
    <div class="category-tabs-bar">
      <button 
        type="button" 
        class="category-tab-btn" 
        :class="{ active: !category && showAllProducts }"
        @click="emit('update:category', ''); emit('update:showAllProducts', true);"
      >
        <i class="pi pi-th-large" />
        <span>{{ t('Tất cả', 'All') }}</span>
        <span class="category-badge-count">{{ totalCount }}</span>
      </button>

      <button 
        v-for="cat in categories" 
        :key="cat"
        type="button" 
        class="category-tab-btn" 
        :class="{ active: category === cat }"
        @click="emit('update:category', cat); emit('update:showAllProducts', false);"
      >
        <i :class="getCategoryIcon(cat)" />
        <span>{{ translateCategory(cat) }}</span>
      </button>

      <button 
        type="button" 
        class="category-tab-btn sales-filter-btn" 
        :class="{ active: showOnlySales }"
        @click="emit('update:showOnlySales', !showOnlySales)"
      >
        <i class="pi pi-bolt text-amber-500" />
        <span>{{ t('⚡ Đang giảm giá', '⚡ On Sale') }}</span>
      </button>
    </div>

    <div class="catalog-toolbar">
      <div class="active-filters">
        <span v-if="category" class="filter-tag">
          {{ t('Danh mục:', 'Category:') }} {{ translateCategory(category) }}
          <i class="pi pi-times" style="cursor: pointer; margin-left: 4px;" @click="emit('update:category', '')" />
        </span>
        <span v-if="search" class="filter-tag">
          {{ t('Tìm kiếm:', 'Search:') }} "{{ search }}"
          <i class="pi pi-times" style="cursor: pointer; margin-left: 4px;" @click="emit('update:search', '')" />
        </span>
        <span v-if="showOnlySales" class="filter-tag sales-tag" style="background: #fef2f2; color: #be123c; border-color: #fca5a5;">
          {{ t('Ưu đãi giảm giá', 'Sale items') }}
          <i class="pi pi-times" style="cursor: pointer; margin-left: 4px;" @click="emit('update:showOnlySales', false)" />
        </span>
      </div>

      <label class="sort-control">
        <span>{{ t('Sắp xếp', 'Sort by') }}</span>
        <select :value="sort" @change="emit('update:sort', ($event.target as HTMLSelectElement).value as SortOption)">
          <option value="featured">{{ t('Nổi bật', 'Featured') }}</option>
          <option value="price-asc">{{ t('Giá thấp đến cao', 'Price: Low to High') }}</option>
          <option value="price-desc">{{ t('Giá cao đến thấp', 'Price: High to Low') }}</option>
          <option value="name">{{ t('Tên A-Z', 'Name A-Z') }}</option>
        </select>
      </label>
    </div>
  </div>
</template>
