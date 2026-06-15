<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier, type Supplier } from '../services/orderApi'
import { useAuthStore } from '../stores/authStore'

const auth = useAuthStore()
const canManageSuppliers = computed(
  () => auth.role === 'Admin' || auth.role === 'WarehouseKeeper',
)
const suppliers = ref<Supplier[]>([])
const editingId = ref<number | null>(null)
const error = ref('')
const form = reactive({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' })

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
  return `Hiển thị ${start}-${end} trong tổng số ${total} mục`
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
    error.value = e instanceof Error ? e.message : 'Không thể tải nhà cung cấp.'
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
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể lưu nhà cung cấp.' }
}

async function remove(item: Supplier) {
  if (!confirm(`Xóa nhà cung cấp ${item.name}?`)) return
  try { await deleteSupplier(item.id); await load() } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể xóa.' }
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>Nhà cung cấp</h2>
        <p>Danh bạ nhà cung cấp dùng khi lập phiếu nhập kho.</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" placeholder="Tìm nhà cung cấp..." class="search-input" />
        <button
          v-if="canManageSuppliers"
          type="button"
          class="primary"
          @click="showForm = true"
        >
          <i class="pi pi-plus" /> Thêm nhà cung cấp
        </button>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>

    <!-- Supplier modal form dialog -->
    <div v-if="showForm && canManageSuppliers" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm && canManageSuppliers" class="admin-modal" aria-label="Biểu mẫu nhà cung cấp">
      <div class="modal-head">
        <h2>{{ editingId ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp' }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="save">
        <label>Tên nhà cung cấp<input v-model="form.name" required /></label>
        <label>Người liên hệ<input v-model="form.contactName" required /></label>
        <label>Số điện thoại<input v-model="form.phone" required /></label>
        <label>Email<input v-model="form.email" type="email" /></label>
        <label>Địa chỉ<input v-model="form.address" /></label>
        <label>Ghi chú<textarea v-model="form.notes"></textarea></label>
        <div class="actions">
          <button class="primary">Lưu</button>
          <button type="button" @click="reset">Hủy</button>
        </div>
      </form>
    </aside>

    <!-- Full width table -->
    <article class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nhà cung cấp</th>
            <th>Người liên hệ</th>
            <th>Liên lạc</th>
            <th>Ghi chú</th>
            <th v-if="canManageSuppliers">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visible" :key="item.id">
            <td>{{ item.name }}<small>{{ item.address }}</small></td>
            <td>{{ item.contactName }}</td>
            <td>{{ item.phone }}<small>{{ item.email }}</small></td>
            <td>{{ item.notes }}</td>
            <td v-if="canManageSuppliers" class="actions">
              <button @click="edit(item)">Sửa</button>
              <button class="danger" @click="remove(item)">Xóa</button>
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
            aria-label="Về đầu"
            title="Về đầu"
          >
            <i class="pi pi-chevron-double-left" />
          </button>
          <button 
            type="button" 
            :disabled="currentPage === 1"
            @click="currentPage--"
            aria-label="Trang trước"
          >
            <i class="pi pi-chevron-left" />
          </button>
          <span class="page-indicator">Trang <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
          <button 
            type="button" 
            :disabled="currentPage === totalPages"
            @click="currentPage++"
            aria-label="Trang sau"
          >
            <i class="pi pi-chevron-right" />
          </button>
          <button 
            type="button" 
            :disabled="currentPage === totalPages"
            @click="currentPage = totalPages"
            aria-label="Về cuối"
            title="Về cuối"
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
