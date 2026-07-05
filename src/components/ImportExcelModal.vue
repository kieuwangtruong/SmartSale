<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage } from '../services/i18n'
import { exportToExcel, importFromExcel } from '../utils/excelUtils'

const props = defineProps<{
  show: boolean
  title?: string
  templateData: any[]
  templateFileName?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'import', data: any[]): void
}>()

const { t } = useLanguage()

const selectedFile = ref<File | null>(null)
const loading = ref(false)
const errorMsg = ref('')

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
    errorMsg.value = ''
  }
}

function downloadTemplate() {
  const fileName = props.templateFileName || 'Template_Import'
  exportToExcel(props.templateData, fileName)
}

async function handleImport() {
  if (!selectedFile.value) {
    errorMsg.value = t('Vui lòng chọn một file Excel.', 'Please select an Excel file.')
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const data = await importFromExcel(selectedFile.value)
    if (!data || data.length === 0) {
      errorMsg.value = t('File Excel trống hoặc không đúng định dạng.', 'Excel file is empty or invalid format.')
      return
    }
    emit('import', data)
    close()
  } catch (error: any) {
    errorMsg.value = error.message || t('Đã xảy ra lỗi khi đọc file.', 'An error occurred while reading the file.')
  } finally {
    loading.value = false
  }
}

function close() {
  selectedFile.value = null
  errorMsg.value = ''
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-backdrop" @click="close" />
  <aside v-if="show" class="admin-modal" :aria-label="title || t('Nhập dữ liệu Excel', 'Import Excel Data')">
    <div class="modal-head">
      <h2>{{ title || t('Nhập dữ liệu Excel', 'Import Excel Data') }}</h2>
      <button type="button" @click="close" :disabled="loading"><i class="pi pi-times" /></button>
    </div>
    <div class="admin-modal-body form">
      <p style="margin-bottom: 16px; color: var(--text-muted); font-size: 14px; line-height: 1.5;">
        {{ t('Vui lòng tải file mẫu về, điền dữ liệu theo đúng cấu trúc cột và tải lên lại đây.', 'Please download the template file, fill in the data following the exact column structure, and upload it back here.') }}
      </p>

      <div style="margin-bottom: 20px;">
        <button type="button" class="outline-btn" style="background: transparent; border: 1px solid var(--surface-border); color: var(--text-main);" @click="downloadTemplate" :disabled="loading">
          <i class="pi pi-download" /> {{ t('Tải file mẫu (Template)', 'Download Template') }}
        </button>
      </div>
      
      <div class="file-upload-wrapper">
        <label class="file-upload-label">
          <span v-if="!selectedFile">{{ t('Chọn file Excel (.xlsx, .xls)', 'Select Excel file (.xlsx, .xls)') }}</span>
          <span v-else class="file-name"><i class="pi pi-file-excel" style="color: #10b981; margin-right: 8px;" />{{ selectedFile.name }}</span>
          <input type="file" accept=".xlsx, .xls" @change="handleFileChange" :disabled="loading" />
        </label>
      </div>

      <div v-if="errorMsg" class="alert error" style="margin-top: 16px;">
        {{ errorMsg }}
      </div>

      <div class="actions" style="margin-top: 24px;">
        <button type="button" class="primary" @click="handleImport" :disabled="loading || !selectedFile">
          <i class="pi pi-upload" v-if="!loading" />
          <i class="pi pi-spin pi-spinner" v-else />
          {{ loading ? t('Đang đọc file...', 'Reading file...') : t('Tiến hành Nhập', 'Proceed Import') }}
        </button>
        <button type="button" @click="close" :disabled="loading">
          {{ t('Hủy', 'Cancel') }}
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.file-upload-wrapper {
  margin-top: 10px;
}
.file-upload-label {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--surface-border);
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  background: var(--surface-ground);
  transition: all 0.2s ease;
  color: var(--text-muted);
  font-weight: 600;
}
.file-upload-label:hover {
  border-color: var(--primary);
  background: rgb(99 102 241 / 5%);
  color: var(--primary);
}
.file-upload-label input[type="file"] {
  display: none;
}
.file-name {
  color: var(--text-main);
}
.app-dark .file-upload-label {
  background: rgba(0, 0, 0, 0.2);
}
.app-dark .file-upload-label:hover {
  background: rgba(99, 102, 241, 0.1);
}
</style>
