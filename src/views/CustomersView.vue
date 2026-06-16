<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import { normalizeCustomerFormExtras } from '../services/customerExtraStorage'
import {
  createCustomer,
  deleteCustomer,
  formatCurrency,
  getCustomers,
  getGenderLabel,
  GENDER_OPTIONS,
  updateCustomer,
  type Customer,
} from '../services/orderApi'
import { useAuthStore } from '../stores/authStore'

const auth = useAuthStore()
const customers = ref<Customer[]>([])
const editingId = ref<number | null>(null)
const error = ref('')
const form = reactive({
  fullName: '',
  phone: '',
  email: '',
  address: '',
  gender: 0,
  cccd: '',
  age: null as number | null,
})

const search = ref('')
const showForm = ref(false)
const currentPage = ref(1)
const itemsPerPage = 10

const genderOptions = computed(() =>
  GENDER_OPTIONS.map((g) => ({ label: g.label, value: g.value })),
)

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q
    ? customers.value
    : customers.value.filter((c) =>
        [c.fullName, c.phone, c.email, c.address, c.cccd, getGenderLabel(c.gender)]
          .some((val) => val && String(val).toLowerCase().includes(q)),
      )
})

const totalPages = computed(() => Math.ceil(filtered.value.length / itemsPerPage) || 1)

const visible = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filtered.value.slice(start, start + itemsPerPage)
})

const paginationInfo = computed(() => {
  const total = filtered.value.length
  if (total === 0) return ''
  const start = (currentPage.value - 1) * itemsPerPage + 1
  const end = Math.min(currentPage.value * itemsPerPage, total)
  return `Hiển thị ${start}-${end} trong tổng số ${total} mục`
})

watch(search, () => {
  currentPage.value = 1
})

function reset() {
  editingId.value = null
  showForm.value = false
  Object.assign(form, {
    fullName: '', phone: '', email: '', address: '', gender: 0, cccd: '', age: null,
  })
}

async function load() {
  try {
    customers.value = await getCustomers()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không thể tải khách hàng.'
  }
}

function edit(item: Customer) {
  editingId.value = item.id
  Object.assign(form, {
    fullName: item.fullName,
    phone: item.phone,
    email: item.email || '',
    address: item.address || '',
    gender: item.gender ?? 0,
    cccd: item.cccd || '',
    age: item.age ?? null,
  })
  showForm.value = true
}

async function save() {
  error.value = ''
  try {
    const extras = normalizeCustomerFormExtras(form)
    if (editingId.value) {
      const current = customers.value.find((x) => x.id === editingId.value)!
      await updateCustomer({ ...current, ...form, ...extras })
    } else {
      await createCustomer({ ...form, ...extras })
    }
    reset()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không thể lưu khách hàng.'
  }
}

async function remove(item: Customer) {
  if (!confirm(`Xóa khách hàng ${item.fullName}?`)) return
  try {
    await deleteCustomer(item.id, item.phone)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không thể xóa.'
  }
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>Khách hàng</h2>
        <p>Thông tin, lịch sử mua và công nợ.</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" placeholder="Tìm khách hàng..." class="search-input" />
        <button type="button" class="primary" @click="showForm = true">
          <i class="pi pi-plus" /> Thêm khách hàng
        </button>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>

    <div v-if="showForm" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm" class="admin-modal" aria-label="Biểu mẫu khách hàng">
      <div class="modal-head">
        <h2>{{ editingId ? 'Cập nhật khách hàng' : 'Thêm khách hàng' }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="save">
        <label>Họ tên<input v-model="form.fullName" required /></label>
        <label>Số điện thoại<input v-model="form.phone" required /></label>
        <label>Email<input v-model="form.email" type="email" /></label>
        <label>Địa chỉ<input v-model="form.address" /></label>
        <label>Giới tính
          <SearchableSelect v-model="form.gender" :options="genderOptions" placeholder="Chọn giới tính" />
        </label>
        <label>CCCD<input v-model="form.cccd" /></label>
        <label>Tuổi<input v-model.number="form.age" type="number" min="1" max="120" /></label>
        <div class="actions">
          <button class="primary">Lưu</button>
          <button type="button" @click="reset">Hủy</button>
        </div>
      </form>
    </aside>

    <article class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>Khách hàng</th>
            <th>Liên hệ</th>
            <th>Giới tính</th>
            <th>CCCD</th>
            <th>Tuổi</th>
            <th>Đơn hàng</th>
            <th>Đã mua</th>
            <th>Công nợ</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visible" :key="item.id">
            <td>{{ item.fullName }}<small>{{ item.address }}</small></td>
            <td>{{ item.phone }}<small>{{ item.email }}</small></td>
            <td>{{ getGenderLabel(item.gender) }}</td>
            <td>{{ item.cccd || '—' }}</td>
            <td>{{ item.age ?? '—' }}</td>
            <td>{{ item.orderCount }}</td>
            <td>{{ formatCurrency(item.totalSpent) }}</td>
            <td>{{ formatCurrency(item.currentDebt) }}</td>
            <td class="actions">
              <button @click="edit(item)">Sửa</button>
              <button v-if="auth.role === 'Admin'" class="danger" @click="remove(item)">Xóa</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="pagination-footer">
        <span class="pagination-info">{{ paginationInfo }}</span>
        <div class="pagination-controls">
          <button type="button" :disabled="currentPage === 1" @click="currentPage = 1"><i class="pi pi-chevron-double-left" /></button>
          <button type="button" :disabled="currentPage === 1" @click="currentPage--"><i class="pi pi-chevron-left" /></button>
          <span class="page-indicator">Trang <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage++"><i class="pi pi-chevron-right" /></button>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage = totalPages"><i class="pi pi-chevron-double-right" /></button>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
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
  cursor: pointer;
}
.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-indicator {
  font-size: 12px;
  color: #6b7280;
  padding: 0 10px;
}
</style>
