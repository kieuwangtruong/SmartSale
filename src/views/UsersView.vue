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
import { USER_ROLES, type UserRole } from '../services/apiClient'
import { useLanguage } from '../services/i18n'
import { useToast } from 'primevue/usetoast'

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
  USER_ROLES
    .filter((r) => r.value !== 'Customer')
    .map((role) => ({
      label: role.value === 'Admin'
        ? t('Quản trị viên', 'Admin')
        : role.value === 'SalesStaff'
          ? t('Nhân viên bán hàng', 'Retail Staff')
          : t('Thủ kho', 'Warehouse Keeper'),
      value: role.value
    }))
)

const sexOptions = computed(() => [
  { label: t('Nam', 'Male'), value: 0 },
  { label: t('Nữ', 'Female'), value: 1 },
  { label: t('Khác', 'Other'), value: 2 },
])

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
  Object.assign(form, {
    userName: '', fullName: '', email: '', passwordHash: '',
    dateOfBirth: '2000-01-01', role: 'SalesStaff', sex: 0, address: '',
  })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const all = await getUsers()
    // Exclude customer accounts from internal employee/account management
    users.value = all.filter((u) => u.role !== 'Customer')
  } catch (e) {
    showError(e instanceof Error ? e.message : t('Không thể tải tài khoản.', 'Failed to load accounts.'))
  } finally {
    loading.value = false
  }
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
  } catch (e) {
    showError(e instanceof Error ? e.message : t('Không thể lưu tài khoản.', 'Failed to save account.'))
  }
}

async function remove(user: UserDto) {
  if (!confirm(t(`Xóa tài khoản ${user.fullName}?`, `Delete account ${user.fullName}?`))) return
  try {
    await deleteUser(user.id)
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('Không thể xóa.', 'Failed to delete.'))
  }
}

function translateRole(role: UserRole) {
  if (role === 'Admin') return t('Quản trị viên', 'Admin')
  if (role === 'SalesStaff') return t('Nhân viên bán hàng', 'Retail Staff')
  if (role === 'WarehouseKeeper') return t('Thủ kho', 'Warehouse Keeper')
  if (role === 'Customer') return t('Khách hàng', 'Customer')
  return role
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>{{ t('Quản lý tài khoản', 'Account Management') }}</h2>
        <p>{{ t('Admin tạo và phân quyền nhân viên.', 'Admin creation and role assignment for staff.') }}</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" :placeholder="t('Tìm tài khoản...', 'Search accounts...')" class="search-input" />
        <button type="button" class="primary" @click="showForm = true">
          <i class="pi pi-plus" /> {{ t('Tạo tài khoản', 'Create Account') }}
        </button>
      </div>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm" class="admin-modal" :aria-label="t('Biểu mẫu tài khoản', 'Account Form')">
      <div class="modal-head">
        <h2>{{ editingId ? t('Cập nhật tài khoản', 'Update Account') : t('Tạo tài khoản', 'Create Account') }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="save">
        <label>{{ t('Tên đăng nhập', 'Username') }}<input v-model="form.userName" required /></label>
        <label>{{ t('Họ tên', 'Full Name') }}<input v-model="form.fullName" required /></label>
        <label>{{ t('Email', 'Email') }}<input v-model="form.email" type="email" required /></label>
        <label>{{ t('Mật khẩu', 'Password') }}
          <input
            v-model="form.passwordHash"
            type="password"
            :required="!editingId"
            :disabled="isEditingAdmin"
            :placeholder="isEditingAdmin ? '********' : ''"
          />
        </label>
        <p v-if="isEditingAdmin" class="admin-password-note">{{ t('Không thể đổi mật khẩu tài khoản Admin.', 'Cannot change password of Admin account.') }}</p>
        <label>{{ t('Ngày sinh', 'Date of Birth') }}<input v-model="form.dateOfBirth" type="date" required /></label>
        <label>{{ t('Vai trò', 'Role') }}
          <SearchableSelect v-model="form.role" :options="roleOptions" :placeholder="t('Chọn vai trò', 'Select role')" />
        </label>
        <label>{{ t('Giới tính', 'Gender') }}
          <SearchableSelect v-model="form.sex" :options="sexOptions" :placeholder="t('Chọn giới tính', 'Select gender')" />
        </label>
        <label>{{ t('Địa chỉ', 'Address') }}<input v-model="form.address" /></label>
        <div class="actions">
          <button class="primary">{{ t('Lưu', 'Save') }}</button>
          <button type="button" @click="reset">{{ t('Hủy', 'Cancel') }}</button>
        </div>
      </form>
    </aside>

    <article class="panel table-wrap">
      <p v-if="loading">{{ t('Đang tải...', 'Loading...') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('Họ tên', 'Full Name') }}</th>
            <th>{{ t('Email', 'Email') }}</th>
            <th>{{ t('Vai trò', 'Role') }}</th>
            <th>{{ t('Hành động', 'Actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in visible" :key="user.id">
            <td>{{ user.fullName }}<small>@{{ user.userName }}</small></td>
            <td>{{ user.email }}</td>
            <td><span class="role-label">{{ translateRole(user.role) }}</span></td>
            <td class="actions">
              <button @click="edit(user)">{{ t('Sửa', 'Edit') }}</button>
              <button class="danger" @click="remove(user)">{{ t('Xóa', 'Delete') }}</button>
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
          <span class="page-indicator">{{ t('Trang', 'Page') }} <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
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