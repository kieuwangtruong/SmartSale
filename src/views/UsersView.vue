<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
  type CreateUserPayload,
  type UserDto,
} from '../services/userApi'
import { getRoleLabel, USER_ROLES } from '../services/apiClient'

const users = ref<UserDto[]>([])
const loading = ref(false)
const error = ref('')
const editingId = ref<number | null>(null)
const form = reactive<CreateUserPayload>({
  userName: '',
  fullName: '',
  email: '',
  passwordHash: '',
  dateOfBirth: '2000-01-01',
  role: 'SalesStaff',
  sex: 0,
  address: '',
})

const search = ref('')
const showForm = ref(false)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = 10

// Filter logic
const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? users.value : users.value.filter((u) =>
    [u.userName, u.fullName, u.email].some((val) => val && val.toLowerCase().includes(q))
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

const editingUser = computed(() =>
  editingId.value ? users.value.find((u) => u.id === editingId.value) ?? null : null,
)
const isEditingAdmin = computed(() => editingUser.value?.role === 'Admin')

const roleOptions = computed(() =>
  USER_ROLES.map((role) => ({ label: role.label, value: role.value })),
)
const sexOptions = [
  { label: 'Nam', value: 0 },
  { label: 'Nữ', value: 1 },
  { label: 'Khác', value: 2 },
]

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
  Object.assign(form, {
    userName: '', fullName: '', email: '', passwordHash: '',
    dateOfBirth: '2000-01-01', role: 'SalesStaff', sex: 0, address: '',
  })
}

async function load() {
  loading.value = true
  error.value = ''
  try { users.value = await getUsers() } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không thể tải tài khoản.'
  } finally { loading.value = false }
}

function edit(user: UserDto) {
  editingId.value = user.id
  Object.assign(form, {
    userName: user.userName, fullName: user.fullName, email: user.email,
    passwordHash: '', dateOfBirth: user.dateOfBirth.slice(0, 10),
    role: user.role, sex: user.sex, address: user.address,
  })
  showForm.value = true
}

async function save() {
  error.value = ''
  try {
    if (editingId.value) {
      const { passwordHash, ...values } = form
      const payload = {
        id: editingId.value,
        ...values,
        ...(passwordHash && !isEditingAdmin.value ? { passwordHash } : {}),
      }
      await updateUser(payload)
    } else {
      await createUser(form)
    }
    reset()
    await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể lưu tài khoản.' }
}

async function remove(user: UserDto) {
  if (!confirm(`Xóa tài khoản ${user.fullName}?`)) return
  try { await deleteUser(user.id); await load() } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không thể xóa.'
  }
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>Quản lý tài khoản</h2>
        <p>Admin tạo và phân quyền nhân viên.</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" placeholder="Tìm tài khoản..." class="search-input" />
        <button type="button" class="primary" @click="showForm = true">
          <i class="pi pi-plus" /> Tạo tài khoản
        </button>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>

    <div v-if="showForm" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm" class="admin-modal" aria-label="Biểu mẫu tài khoản">
      <div class="modal-head">
        <h2>{{ editingId ? 'Cập nhật tài khoản' : 'Tạo tài khoản' }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="save">
        <label>Tên đăng nhập<input v-model="form.userName" required /></label>
        <label>Họ tên<input v-model="form.fullName" required /></label>
        <label>Email<input v-model="form.email" type="email" required /></label>
        <label>Mật khẩu
          <input
            v-model="form.passwordHash"
            type="password"
            :required="!editingId"
            :disabled="isEditingAdmin"
            :placeholder="isEditingAdmin ? '********' : ''"
          />
        </label>
        <p v-if="isEditingAdmin" class="admin-password-note">Không thể đổi mật khẩu tài khoản Admin.</p>
        <label>Ngày sinh<input v-model="form.dateOfBirth" type="date" required /></label>
        <label>Vai trò
          <SearchableSelect v-model="form.role" :options="roleOptions" placeholder="Chọn vai trò" />
        </label>
        <label>Giới tính
          <SearchableSelect v-model="form.sex" :options="sexOptions" placeholder="Chọn giới tính" />
        </label>
        <label>Địa chỉ<input v-model="form.address" /></label>
        <div class="actions">
          <button class="primary">Lưu</button>
          <button type="button" @click="reset">Hủy</button>
        </div>
      </form>
    </aside>

    <article class="panel table-wrap">
      <p v-if="loading">Đang tải...</p>
      <table v-else>
        <thead>
          <tr>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Vai trò</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in visible" :key="user.id">
            <td>{{ user.fullName }}<small>@{{ user.userName }}</small></td>
            <td>{{ user.email }}</td>
            <td><span class="role-label">{{ getRoleLabel(user.role) }}</span></td>
            <td class="actions">
              <button @click="edit(user)">Sửa</button>
              <button class="danger" @click="remove(user)">Xóa</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && totalPages > 1" class="pagination-footer">
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
.role-label { display: inline-flex; padding: 6px 9px; border-radius: 99px; color: #4338ca; background: #eef2ff; font-size: 11px; font-weight: 750; }
.admin-password-note {
  margin: -6px 0 10px;
  font-size: 12px;
  color: #64748b;
}
.app-dark .role-label { color: #a5b4fc; background: rgb(99 102 241 / 15%); }

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