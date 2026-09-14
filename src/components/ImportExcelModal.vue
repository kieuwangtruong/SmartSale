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
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click="close" />
    <aside v-if="show" class="admin-modal" :aria-label="title || t('Nhập dữ liệu Excel', 'Import Excel Data')">
      <div class="modal-head">
        <h2>
          <i class="pi pi-file-excel" style="color: #10b981; font-size: 1.3rem;" />
          {{ title || t('Nhập dữ liệu Excel', 'Import Excel Data') }}
        </h2>
        <button type="button" @click="close" :disabled="loading" :aria-label="t('Đóng', 'Close')">
          <i class="pi pi-times" />
        </button>
      </div>
      <div class="admin-modal-body form">
        <p style="margin: 0; color: var(--text-muted); font-size: 14px; line-height: 1.5;">
          {{ t('Vui lòng tải file mẫu về, điền dữ liệu theo đúng cấu trúc cột và tải lên lại đây.', 'Please download the template file, fill in the data following the exact column structure, and upload it back here.') }}
        </p>

        <div>
          <button
            type="button"
            class="outline-btn"
            style="background: var(--surface-ground); border: 1.5px solid var(--surface-border); color: var(--text-main); font-weight: 700; padding: 9px 18px; border-radius: 10px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s ease;"
            @click="downloadTemplate"
            :disabled="loading"
          >
            <i class="pi pi-download" style="color: var(--primary);" /> {{ t('Tải file mẫu (Template)', 'Download Template') }}
          </button>
        </div>
        
        <div class="file-upload-wrapper">
          <label class="file-upload-label">
            <span v-if="!selectedFile" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <i class="pi pi-cloud-upload" style="font-size: 2rem; color: var(--primary);" />
              <span>{{ t('Nhấn để chọn file hoặc kéo thả file Excel (.xlsx, .xls)', 'Click to select or drop Excel file (.xlsx, .xls)') }}</span>
            </span>
            <span v-else class="file-name" style="display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 700;">
              <i class="pi pi-file-excel" style="color: #10b981; font-size: 1.5rem;" />
              {{ selectedFile.name }}
            </span>
            <input type="file" accept=".xlsx, .xls" @change="handleFileChange" :disabled="loading" />
          </label>
        </div>

        <div v-if="errorMsg" class="alert error" style="padding: 10px 14px; border-radius: 10px; background: #fee2e2; color: #dc2626; font-size: 13.5px; display: flex; align-items: center; gap: 8px; font-weight: 600;">
          <i class="pi pi-exclamation-circle" /> {{ errorMsg }}
        </div>

        <div class="actions">
          <button type="button" class="primary" @click="handleImport" :disabled="loading || !selectedFile">
            <i class="pi pi-upload" v-if="!loading" style="margin-right: 6px;" />
            <i class="pi pi-spin pi-spinner" v-else style="margin-right: 6px;" />
            {{ loading ? t('Đang đọc file...', 'Reading file...') : t('Tiến hành Nhập', 'Proceed Import') }}
          </button>
          <button type="button" @click="close" :disabled="loading">
            {{ t('Hủy', 'Cancel') }}
          </button>
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<style scoped>
.file-upload-wrapper {
  margin-top: 4px;
}
.file-upload-label {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--surface-border);
  border-radius: 14px;
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  background: var(--surface-ground);
  transition: all 0.2s ease;
  color: var(--text-muted);
  font-weight: 600;
}
.file-upload-label:hover {
  border-color: var(--primary);
  background: rgba(27, 94, 74, 0.05);
  color: var(--primary);
}
.file-upload-label input[type="file"] {
  display: none;
}
.file-name {
  color: var(--text-main);
}
.app-dark .file-upload-label {
  background: rgba(0, 0, 0, 0.25);
  border-color: #23304c;
}
.app-dark .file-upload-label:hover {
  background: rgba(27, 94, 74, 0.15);
  border-color: var(--primary-light);
}
</style>
