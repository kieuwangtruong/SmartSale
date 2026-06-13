<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
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

const visible = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? users.value : users.value.filter((u) =>
    [u.userName, u.fullName, u.email].some((val) => val && val.toLowerCase().includes(q))
  )
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
        ...(passwordHash ? { passwordHash } : {}),
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

    <!-- User modal form dialog -->
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
        <label>Mật khẩu<input v-model="form.passwordHash" type="password" :required="!editingId" /></label>
        <label>Ngày sinh<input v-model="form.dateOfBirth" type="date" required /></label>
        <label>Vai trò<select v-model="form.role"><option v-for="role in USER_ROLES" :key="role.value" :value="role.value">{{ role.label }}</option></select></label>
        <label>Giới tính<select v-model.number="form.sex"><option :value="0">Nam</option><option :value="1">Nữ</option><option :value="2">Khác</option></select></label>
        <label>Địa chỉ<input v-model="form.address" /></label>
        <div class="actions">
          <button class="primary">Lưu</button>
          <button type="button" @click="reset">Hủy</button>
        </div>
      </form>
    </aside>

    <!-- Full width table -->
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
    </article>
  </section>
</template>

<style scoped>
.role-label { display: inline-flex; padding: 6px 9px; border-radius: 99px; color: #4338ca; background: #eef2ff; font-size: 11px; font-weight: 750; }
.app-dark .role-label { color: #a5b4fc; background: rgb(99 102 241 / 15%); }
</style>
