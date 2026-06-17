<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier, type Supplier } from '../services/orderApi'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'
import { useToast } from 'primevue/usetoast'

const auth = useAuthStore()
const canManageSuppliers = computed(
  () => auth.role === 'Admin' || auth.role === 'WarehouseKeeper',
)
const suppliers = ref<Supplier[]>([])
const editingId = ref<number | null>(null)
const error = ref('')
const form = reactive({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' })
const { t } = useLanguage()
const toast = useToast()

function showError(msg: string) {
  toast.add({
    severity: 'error',
    summary: t('Lỗi', 'Error'),
    detail: msg,
    life: 5000,
  })
}

const search = ref('')
const showForm = ref(false)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = 10

// Filter logic
const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? suppliers.value : suppliers.value.filter((s) =>
    [s.name, s.contactName, s.phone, s.email, s.address, s.notes].some((val) => val && val.toLowerCase().includes(q))
  )
})

// Pagination calculations
const totalPages = computed(() => {
  return Math.ceil(filtered.value.length / itemsPerPage) || 1
})

const visible = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filtered.value.slice(start, start + itemsPerPage)
})

// Status display
const paginationInfo = computed(() => {
  const total = filtered.value.length
  if (total === 0) return ''
  const start = (currentPage.value - 1) * itemsPerPage + 1
  const end = Math.min(currentPage.value * itemsPerPage, total)
  return t(`Hiển thị ${start}-${end} trong tổng số ${total} mục`, `Showing ${start}-${end} of ${total} items`)
})

// Reset to page 1 when search changes
watch(search, () => {
  currentPage.value = 1
})

function reset() {
  editingId.value = null
  showForm.value = false
  Object.assign(form, { name: '', contactName: '', phone: '', email: '', address: '', notes: '' })
}

async function load() {
  try {
    suppliers.value = await getSuppliers()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('Không thể tải nhà cung cấp.', 'Unable to load suppliers.'))
  }
}

function edit(item: Supplier) {
  editingId.value = item.id
  Object.assign(form, {
    name: item.name,
    contactName: item.contactName,
    phone: item.phone,
    email: item.email || '',
    address: item.address || '',
    notes: item.notes || ''
  })
  showForm.value = true
}

async function save() {
  try {
    if (editingId.value) {
      const current = suppliers.value.find((x) => x.id === editingId.value)!
      await updateSupplier({ ...current, ...form })
    } else await createSupplier(form)
    reset(); await load()
  } catch (e) { showError(e instanceof Error ? e.message : t('Không thể lưu nhà cung cấp.', 'Unable to save supplier.')) }
}

async function remove(item: Supplier) {
  if (!confirm(t(`Xóa nhà cung cấp ${item.name}?`, `Delete supplier ${item.name}?`))) return
  try { await deleteSupplier(item.id); await load() } catch (e) { showError(e instanceof Error ? e.message : t('Không thể xóa.', 'Unable to delete.')) }
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>{{ t('Nhà cung cấp', 'Suppliers') }}</h2>
        <p>{{ t('Danh bạ nhà cung cấp dùng khi lập phiếu nhập kho.', 'Supplier directory for stock receipts.') }}</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" :placeholder="t('Tìm nhà cung cấp...', 'Search suppliers...')" class="search-input" />
        <button
          v-if="canManageSuppliers"
          type="button"
          class="primary"
          @click="showForm = true"
        >
          <i class="pi pi-plus" /> {{ t('Thêm nhà cung cấp', 'Add Supplier') }}
        </button>
      </div>
    </div>

    <!-- Supplier modal form dialog -->
    <div v-if="showForm && canManageSuppliers" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm && canManageSuppliers" class="admin-modal" :aria-label="t('Biểu mẫu nhà cung cấp', 'Supplier form')">
      <div class="modal-head">
        <h2>{{ editingId ? t('Cập nhật nhà cung cấp', 'Update Supplier') : t('Thêm nhà cung cấp', 'Add Supplier') }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="save">
        <label>{{ t('Tên nhà cung cấp', 'Supplier Name') }}<input v-model="form.name" required /></label>
        <label>{{ t('Người liên hệ', 'Contact Person') }}<input v-model="form.contactName" required /></label>
        <label>{{ t('Số điện thoại', 'Phone Number') }}<input v-model="form.phone" required /></label>
        <label>{{ t('Email', 'Email') }}<input v-model="form.email" type="email" /></label>
        <label>{{ t('Địa chỉ', 'Address') }}<input v-model="form.address" /></label>
        <label>{{ t('Ghi chú', 'Notes') }}<textarea v-model="form.notes"></textarea></label>
        <div class="actions">
          <button class="primary">{{ t('Lưu', 'Save') }}</button>
          <button type="button" @click="reset">{{ t('Hủy', 'Cancel') }}</button>
        </div>
      </form>
    </aside>

    <!-- Full width table -->
    <article class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>{{ t('Nhà cung cấp', 'Supplier') }}</th>
            <th>{{ t('Người liên hệ', 'Contact Person') }}</th>
            <th>{{ t('Liên lạc', 'Contact info') }}</th>
            <th>{{ t('Ghi chú', 'Notes') }}</th>
            <th v-if="canManageSuppliers">{{ t('Hành động', 'Actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visible" :key="item.id">
            <td>{{ item.name }}<small>{{ item.address }}</small></td>
            <td>{{ item.contactName }}</td>
            <td>{{ item.phone }}<small>{{ item.email }}</small></td>
            <td>{{ item.notes }}</td>
            <td v-if="canManageSuppliers" class="actions">
              <button @click="edit(item)">{{ t('Sửa', 'Edit') }}</button>
              <button class="danger" @click="remove(item)">{{ t('Xóa', 'Delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-footer">
        <span class="pagination-info">{{ paginationInfo }}</span>
        <div class="pagination-controls">
          <button 
            type="button" 
            :disabled="currentPage === 1"
            @click="currentPage = 1"
            :aria-label="t('Về đầu', 'To beginning')"
            :title="t('Về đầu', 'To beginning')"
          >
            <i class="pi pi-chevron-double-left" />
          </button>
          <button 
            type="button" 
            :disabled="currentPage === 1"
            @click="currentPage--"
            :aria-label="t('Trang trước', 'Previous page')"
          >
            <i class="pi pi-chevron-left" />
          </button>
          <span class="page-indicator">{{ t('Trang', 'Page') }} <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
          <button 
            type="button" 
            :disabled="currentPage === totalPages"
            @click="currentPage++"
            :aria-label="t('Trang sau', 'Next page')"
          >
            <i class="pi pi-chevron-right" />
          </button>
          <button 
            type="button" 
            :disabled="currentPage === totalPages"
            @click="currentPage = totalPages"
            :aria-label="t('Về cuối', 'To end')"
            :title="t('Về cuối', 'To end')"
          >
            <i class="pi pi-chevron-double-right" />
          </button>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
/* Pagination Styles */
.pagination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  gap: 20px;
}

.app-dark .pagination-footer {
  border-top-color: #374151;
  background: #1f2937;
}

.pagination-info {
  font-size: 12px;
  color: #6b7280;
  min-width: 180px;
}

.app-dark .pagination-info {
  color: #9ca3af;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-controls button {
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.app-dark .pagination-controls button {
  border-color: #4b5563;
  background: #374151;
  color: #e5e7eb;
}

.pagination-controls button:hover:not(:disabled) {
  border-color: #3b82f6;
  background: #f3f4f6;
  color: #1f2937;
}

.app-dark .pagination-controls button:hover:not(:disabled) {
  border-color: #3b82f6;
  background: #4b5563;
  color: #e5e7eb;
}

.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 12px;
  color: #6b7280;
  padding: 0 10px;
  white-space: nowrap;
}

.app-dark .page-indicator {
  color: #9ca3af;
}
</style>
