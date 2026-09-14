<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage } from '../services/i18n'

const props = defineProps<{
  show: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'export', dates: { startDate: string; endDate: string }): void
}>()

const { t } = useLanguage()

const startDate = ref('')
const endDate = ref('')

function handleExport() {
  emit('export', { startDate: startDate.value, endDate: endDate.value })
  emit('close')
}

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click="close" />
    <aside v-if="show" class="admin-modal" :aria-label="title || t('Xuất dữ liệu Excel', 'Export Excel Data')">
      <div class="modal-head">
        <h2>
          <i class="pi pi-file-excel" style="color: #16a34a; font-size: 1.3rem;" />
          {{ title || t('Xuất dữ liệu Excel', 'Export Excel Data') }}
        </h2>
        <button type="button" @click="close" :aria-label="t('Đóng', 'Close')">
          <i class="pi pi-times" />
        </button>
      </div>
      <div class="admin-modal-body form">
        <p style="margin: 0; color: var(--text-muted); font-size: 14px; line-height: 1.5;">
          {{ t('Chọn khoảng thời gian để lọc dữ liệu xuất. Nếu để trống, hệ thống sẽ xuất toàn bộ dữ liệu hiện có.', 'Select a date range to filter export data. If left blank, the system will export all available data.') }}
        </p>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <label>
            {{ t('Từ ngày', 'From Date') }}
            <input type="date" v-model="startDate" />
          </label>
          <label>
            {{ t('Đến ngày', 'To Date') }}
            <input type="date" v-model="endDate" />
          </label>
        </div>

        <div class="actions">
          <button type="button" class="excel-btn" @click="handleExport">
            <i class="pi pi-file-excel" style="margin-right: 6px;" /> {{ t('Xuất Excel', 'Export Excel') }}
          </button>
          <button type="button" @click="close">
            {{ t('Hủy', 'Cancel') }}
          </button>
        </div>
      </div>
    </aside>
  </Teleport>
</template>
