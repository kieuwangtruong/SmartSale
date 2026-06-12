<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  clearStoredUserAuth,
  createUser,
  deleteUser,
  getStoredUserAuth,
  getUserApiBaseUrl,
  getUserById,
  getUsers,
  login,
  logout,
  refresh,
  setStoredUserAuth,
  type CreateUserPayload,
  type LoginRequestPayload,
  type LoginResponsePayload,
  type LogoutRequestPayload,
  type RefreshRequestPayload,
  type UpdateUserPayload,
  type UserDto,
  updateUser,
} from '../services/userApi'

type SearchMode = 'all' | 'username' | 'fullName' | 'email' | 'role' | 'address'
type EditorMode = 'create' | 'edit'
type UserRoleValue = 0 | 1 | 2 | 3
type GenderValue = 0 | 1 | 2

const userRoleOptions: Array<{ value: UserRoleValue; label: string }> = [
  { value: 0, label: 'Nhân viên bán hàng' },
  { value: 1, label: 'Quản trị viên' },
  { value: 2, label: 'Thủ kho' },
  { value: 3, label: 'Người dùng' },
]

const genderOptions: Array<{ value: GenderValue; label: string }> = [
  { value: 0, label: 'Nam' },
  { value: 1, label: 'Nữ' },
  { value: 2, label: 'Khác' },
]

interface UserFormState {
  userName: string
  fullName: string
  email: string
  passwordHash: string
  dateOfBirth: string
  role: UserRoleValue
  sex: number
  address: string
}

const searchMode = ref<SearchMode>('all')
const searchQuery = ref('')
const loading = ref(false)
const errorMessage = ref('')
const selectedUserId = ref<number | null>(null)
const users = ref<UserDto[]>([])
const infoMessage = ref('')
const responsePreview = ref('')
const authState = ref(getStoredUserAuth())

const editor = reactive({
  open: false,
  mode: 'create' as EditorMode,
  busy: false,
  form: createEmptyUserForm(),
})

const authForms = reactive({
  login: {
    email: '',
    password: '',
  } satisfies LoginRequestPayload,
  refresh: {
    refreshToken: '',
  } satisfies RefreshRequestPayload,
  logout: {
    refreshToken: '',
    deviceId: '',
  } satisfies LogoutRequestPayload,
})

const selectedUser = computed(
  () => users.value.find((user) => user.id === selectedUserId.value) ?? null,
)
const totalUsers = computed(() => users.value.length)
const adminUsers = computed(() => users.value.filter((user) => roleLabel(user.role) === 'Quản trị viên').length)
const searchTokens = computed(() => tokenizeSearch(searchQuery.value))
const visibleUsers = computed(() => {
  if (!searchTokens.value.length) {
    return users.value
  }

  return [...users.value]
    .map((user) => ({ user, score: scoreUser(user, searchTokens.value) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.user.id - right.user.id)
    .map((entry) => entry.user)
})
const visibleUserCount = computed(() => visibleUsers.value.length)
const userStats = computed(() => [
  { label: 'Tổng người dùng', value: totalUsers.value.toString(), note: 'Đang quản lý' },
  { label: 'Đang hiển thị', value: visibleUserCount.value.toString(), note: 'Theo bộ lọc' },
  { label: 'Quản trị viên', value: adminUsers.value.toString(), note: 'Quyền admin' },
])
const userValidationMessage = computed(() => {
  const missingFields: string[] = []

  if (!editor.form.userName.trim()) {
    missingFields.push('Username')
  }

  if (!editor.form.fullName.trim()) {
    missingFields.push('Họ tên')
  }

  if (!editor.form.email.trim()) {
    missingFields.push('Email')
  }

  if (editor.mode === 'create' && !editor.form.passwordHash.trim()) {
    missingFields.push('Mật khẩu / hash')
  }

  if (!editor.form.dateOfBirth) {
    missingFields.push('Ngày sinh')
  }

  if (!editor.form.address.trim()) {
    missingFields.push('Địa chỉ')
  }

  if (missingFields.length) {
    return `Vui lòng nhập các trường bắt buộc: ${missingFields.join(', ')}.`
  }

  return ''
})
const userCanSubmit = computed(() => userValidationMessage.value.length === 0)

function createEmptyUserForm(): UserFormState {
  return {
    userName: '',
    fullName: '',
    email: '',
    passwordHash: '',
    dateOfBirth: '',
    role: 3,
    sex: 0,
    address: '',
  }
}

function normalizeText(value?: string | number | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function tokenizeSearch(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
}

function scoreUser(user: UserDto, tokens: string[]) {
  const fieldValues =
    searchMode.value === 'all'
      ? [
          user.id,
          user.userName,
          user.fullName,
          user.email,
          user.address,
          roleLabel(user.role),
          sexLabel(user.sex),
        ]
      : searchMode.value === 'username'
        ? [user.userName]
        : searchMode.value === 'fullName'
          ? [user.fullName]
          : searchMode.value === 'email'
            ? [user.email]
            : searchMode.value === 'role'
              ? [roleLabel(user.role)]
              : [user.address]

  const normalizedFields = fieldValues.map((value) => normalizeText(value)).filter(Boolean)
  const combined = normalizedFields.join(' ')

  if (!tokens.every((token) => combined.includes(token))) {
    return 0
  }

  let score = 10

  for (const token of tokens) {
    if (normalizedFields.some((field) => field === token)) {
      score += 40
      continue
    }

    if (normalizedFields.some((field) => field.startsWith(token))) {
      score += 25
      continue
    }

    score += 10
  }

  return score
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatDateOnly(value?: string | null) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(date)
}

function sexLabel(value?: number | null) {
  if (value === null || value === undefined) {
    return 'Chưa chọn'
  }

  return genderOptions.find((option) => option.value === value)?.label ?? `Mã ${value}`
}

function roleLabel(value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return 'Chưa có'
  }

  if (typeof value === 'number') {
    return roleValueToLabel(value as UserRoleValue)
  }

  const normalized = value.toString().trim()
  if (/^\d+$/.test(normalized)) {
    return roleValueToLabel(Number(normalized) as UserRoleValue)
  }

  const lowerCased = normalized.toLowerCase()

  if (lowerCased === 'salesstaff') {
    return 'Nhân viên bán hàng'
  }

  if (lowerCased === 'warehousekeeper') {
    return 'Thủ kho'
  }

  if (lowerCased === 'admin') {
    return 'Quản trị viên'
  }

  if (lowerCased === 'user') {
    return 'Người dùng'
  }

  return normalized
}

function roleValueToLabel(value: UserRoleValue) {
  return userRoleOptions.find((entry) => entry.value === value)?.label ?? 'Người dùng'
}

function roleValueFromApi(value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return 3
  }

  if (typeof value === 'number') {
    return value === 0 || value === 1 || value === 2 || value === 3 ? value : 3
  }

  const normalized = value.toString().trim().toLowerCase()

  if (/^\d+$/.test(normalized)) {
    const numericValue = Number(normalized)
    return numericValue === 0 || numericValue === 1 || numericValue === 2 || numericValue === 3
      ? numericValue
      : 3
  }

  if (normalized === 'salesstaff') {
    return 0
  }

  if (normalized === 'admin') {
    return 1
  }

  if (normalized === 'warehousekeeper') {
    return 2
  }

  return 3
}

function updateAuthState(
  payload: LoginResponsePayload | { accessToken: string; refreshToken: string },
) {
  const nextState = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  }

  setStoredUserAuth(nextState)
  authState.value = nextState
}

function clearAuthState() {
  clearStoredUserAuth()
  authState.value = null
}

function normalizeUserList(payload: UserDto | UserDto[] | null | undefined) {
  if (!payload) {
    return []
  }

  return Array.isArray(payload) ? payload : [payload]
}

function setSelectedUser(user?: UserDto | null) {
  selectedUserId.value = user?.id ?? null
}

function openCreateDialog() {
  editor.mode = 'create'
  editor.form = createEmptyUserForm()
  editor.open = true
}

function openEditDialog(user: UserDto) {
  editor.mode = 'edit'
  editor.form = {
    userName: user.userName ?? '',
    fullName: user.fullName ?? '',
    email: user.email ?? '',
    passwordHash: '',
    dateOfBirth: toDateInputValue(user.dateOfBirth),
    role: roleValueFromApi(user.role),
    sex: user.sex ?? 0,
    address: user.address ?? '',
  }
  selectedUserId.value = user.id
  editor.open = true
}

function closeEditor() {
  editor.open = false
}

function updateResponsePreview(value: unknown) {
  responsePreview.value = JSON.stringify(value, null, 2)
}

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''
  infoMessage.value = ''

  try {
    const payload = await getUsers()
    users.value = normalizeUserList(payload)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể tải danh sách user'
    users.value = []
  }

  // Add customer user from orders data in localStorage
  const ordersStr = localStorage.getItem('orders')
  if (ordersStr) {
    try {
      const orders = JSON.parse(ordersStr)
      if (Array.isArray(orders) && orders.length > 0) {
        // Check if customer user is not already in the API list
        const customerUserExists = users.value.some((u) => u.email === 'user@gmail.com')
        if (!customerUserExists) {
          const customerUser: UserDto = {
            id: 9999,
            userName: 'user',
            fullName: 'user',
            email: 'user@gmail.com',
            role: '3',
            dateOfBirth: '',
            sex: 0,
            address: '',
            createdAt: new Date().toISOString(),
          }
          users.value.push(customerUser)
        }
      }
    } catch (e) {
      // Silently ignore errors
    }
  }

  setSelectedUser(users.value[0])

  infoMessage.value = 'Đã tải danh sách user. Bạn có thể lọc theo username, email, tên, role hoặc địa chỉ.'
  loading.value = false
}

async function submitEditor() {
  if (!userCanSubmit.value) {
    errorMessage.value = userValidationMessage.value
    return
  }

  editor.busy = true
  errorMessage.value = ''

  const payload: CreateUserPayload = {
    userName: editor.form.userName.trim() || null,
    fullName: editor.form.fullName.trim() || null,
    email: editor.form.email.trim() || null,
    passwordHash: editor.form.passwordHash.trim() || null,
    dateOfBirth: editor.form.dateOfBirth
      ? new Date(`${editor.form.dateOfBirth}T00:00:00`).toISOString()
      : null,
    role: editor.form.role,
    sex: editor.form.sex ?? 0,
    address: editor.form.address.trim() || null,
  }

  try {
    if (editor.mode === 'create') {
      const created = await createUser(payload)
      updateResponsePreview(created)
      infoMessage.value = 'Đã tạo user mới.'
    } else if (!selectedUser.value) {
      throw new Error('Chưa chọn user để chỉnh sửa')
    } else {
      const updatedPayload: UpdateUserPayload = {
        id: selectedUser.value.id,
        ...payload,
      }
      const updated = await updateUser(updatedPayload)
      updateResponsePreview(updated)
      infoMessage.value = 'Đã cập nhật user.'
    }

    closeEditor()
    await loadUsers()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể lưu user'
  } finally {
    editor.busy = false
  }
}

async function removeUser(user: UserDto) {
  if (
    !window.confirm(
      `Xóa user #${user.id} - ${user.fullName ?? user.userName ?? user.email ?? ''}?`,
    )
  ) {
    return
  }

  errorMessage.value = ''

  try {
    const result = await deleteUser(user.id)
    updateResponsePreview(result)
    infoMessage.value = 'Đã xóa user.'
    await loadUsers()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể xóa user'
  }
}

async function inspectUser(user: UserDto) {
  errorMessage.value = ''

  try {
    const detail = await getUserById(user.id)
    updateResponsePreview(detail)
    setSelectedUser(detail)
    infoMessage.value = `Đã tải chi tiết user #${user.id}.`
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể lấy chi tiết user'
  }
}

async function submitLogin() {
  try {
    const result = await login(authForms.login)
    updateAuthState(result)
    authForms.refresh.refreshToken = result.refreshToken
    authForms.logout.refreshToken = result.refreshToken
    updateResponsePreview(result)
    infoMessage.value = 'Đã gọi login.'
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể login'
  }
}

async function submitRefresh() {
  try {
    const result = await refresh(authForms.refresh)
    if (authState.value?.refreshToken) {
      updateAuthState({
        accessToken: result.accessToken,
        refreshToken: authState.value.refreshToken,
      })
    } else if (authForms.refresh.refreshToken.trim()) {
      updateAuthState({
        accessToken: result.accessToken,
        refreshToken: authForms.refresh.refreshToken.trim(),
      })
    }
    updateResponsePreview(result)
    infoMessage.value = 'Đã gọi refresh.'
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể refresh token'
  }
}

async function submitLogout() {
  try {
    const result = await logout(authForms.logout)
    clearAuthState()
    updateResponsePreview(result)
    infoMessage.value = 'Đã gọi logout.'
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể logout'
  }
}

onMounted(() => {
  if (authState.value?.refreshToken) {
    authForms.refresh.refreshToken = authState.value.refreshToken
    authForms.logout.refreshToken = authState.value.refreshToken
  }

  loadUsers()
})
</script>

<template>
  <main class="dashboard-shell users-view">
    <section class="hero-card">
      <div class="hero-copy">
        <div>
          <p class="eyebrow">User Analytics</p>
          <h1 class="hero-title">Quản lý người dùng</h1>
        </div>

        <div class="hero-actions">
          <button class="primary-button" type="button" @click="openCreateDialog">
            Tạo người dùng
          </button>
          <button class="secondary-button" type="button" @click="loadUsers">
            {{ loading ? 'Đang làm mới...' : 'Làm mới dữ liệu' }}
          </button>
        </div>
      </div>

      <div class="mini-banner">
        <span class="mini-label">User API</span>
        <strong>{{ getUserApiBaseUrl() }}</strong>
        <span class="mini-label">Auth</span>
        <strong>{{ authState ? 'Đã đăng nhập' : 'Chưa có token' }}</strong>
      </div>

      <div class="hero-metrics">
        <article v-for="stat in userStats" :key="stat.label" class="stat-card">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
          <small>{{ stat.note }}</small>
        </article>
      </div>
    </section>

    <section v-if="errorMessage || infoMessage" class="message-stack">
      <div v-if="errorMessage" class="alert alert-error">
        {{ errorMessage }}
      </div>
      <div v-if="infoMessage" class="alert alert-success">
        {{ infoMessage }}
      </div>
    </section>

    <section class="toolbar-card">
      <div class="search-field">
        <label for="user-search">Tìm user</label>
        <input
          id="user-search"
          v-model="searchQuery"
          type="text"
          placeholder="Nhập username, email, họ tên, role hoặc địa chỉ..."
        />
      </div>

      <div class="filter-field">
        <label for="mode-filter">Lọc theo</label>
        <select id="mode-filter" v-model="searchMode">
          <option value="all">Tất cả</option>
          <option value="username">Username</option>
          <option value="fullName">Họ tên</option>
          <option value="email">Email</option>
          <option value="role">Role</option>
          <option value="address">Địa chỉ</option>
        </select>
      </div>
    </section>

    <section class="content-grid">
      <div class="orders-column">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Danh sách user</p>
            <h2>{{ visibleUsers.length }} người dùng phù hợp</h2>
          </div>
          <span class="count-pill">{{ users.length }} tổng người dùng</span>
        </div>

        <div v-if="loading" class="state-card">Đang tải dữ liệu...</div>
        <div v-else-if="!visibleUsers.length" class="state-card">
          Không có user phù hợp với bộ lọc hiện tại.
        </div>

        <article
          v-for="user in visibleUsers"
          :key="user.id"
          class="order-card"
          :class="{ active: selectedUserId === user.id }"
          @click="setSelectedUser(user)"
        >
          <div class="order-card-top">
            <div>
              <p class="order-id">#{{ user.id }}</p>
              <h3>{{ user.fullName || user.userName }}</h3>
            </div>
            <span class="status-chip status-processing">{{ roleLabel(user.role) }}</span>
          </div>

          <div class="order-meta-grid">
            <div>
              <span>Username</span>
              <strong>{{ user.userName || 'Chưa có' }}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{{ user.email || 'Chưa có' }}</strong>
            </div>
            <div>
              <span>Ngày sinh</span>
              <strong>{{ formatDateOnly(user.dateOfBirth) }}</strong>
            </div>
            <div>
              <span>Tạo lúc</span>
              <strong>{{ formatDateTime(user.createdAt) }}</strong>
            </div>
          </div>

          <div class="order-card-actions" @click.stop>
            <button class="ghost-button" type="button" @click="inspectUser(user)">
              Chi tiết
            </button>
            <button class="secondary-button" type="button" @click="openEditDialog(user)">
              Sửa
            </button>
            <button class="danger-button" type="button" @click="removeUser(user)">
              Xóa
            </button>
          </div>
        </article>
      </div>

      <aside class="detail-column">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Hồ sơ đang chọn</p>
            <h2>Chi tiết user</h2>
          </div>
        </div>

        <div v-if="selectedUser" class="detail-card">
          <div class="detail-top">
            <div>
              <p class="detail-label">User #{{ selectedUser.id }}</p>
              <h3>{{ selectedUser.fullName || selectedUser.userName }}</h3>
              <p class="detail-subtext">{{ selectedUser.email || 'Chưa có email' }}</p>
            </div>
            <span class="status-chip status-processing">{{ roleLabel(selectedUser.role) }}</span>
          </div>

          <dl class="detail-grid">
            <div>
              <dt>Username</dt>
              <dd>{{ selectedUser.userName || 'Chưa có' }}</dd>
            </div>
            <div>
              <dt>Giới tính</dt>
              <dd>{{ sexLabel(selectedUser.sex) }}</dd>
            </div>
            <div>
              <dt>Ngày sinh</dt>
              <dd>{{ formatDateOnly(selectedUser.dateOfBirth) }}</dd>
            </div>
            <div>
              <dt>Cập nhật</dt>
              <dd>{{ formatDateTime(selectedUser.lastModified) }}</dd>
            </div>
          </dl>

          <div class="detail-list compact-list">
            <div>
              <dt>Địa chỉ</dt>
              <dd>{{ selectedUser.address || 'Chưa có địa chỉ' }}</dd>
            </div>
          </div>

          <div class="order-card-actions">
            <button class="secondary-button" type="button" @click="openEditDialog(selectedUser)">
              Sửa user
            </button>
            <button class="danger-button" type="button" @click="removeUser(selectedUser)">
              Xóa user
            </button>
          </div>
        </div>

        <div v-else class="state-card">
          Chọn một user trong danh sách để xem hồ sơ chi tiết và thao tác nhanh.
        </div>


      </aside>
    </section>

    <transition name="modal-fade">
      <div v-if="editor.open" class="modal-backdrop" @click.self="closeEditor">
        <section class="modal-card">
          <header class="modal-header">
            <div>
              <p class="panel-kicker">
                {{ editor.mode === 'create' ? 'Tạo user mới' : 'Chỉnh sửa user' }}
              </p>
              <h2>
                {{
                  editor.mode === 'create'
                    ? 'Nhập thông tin user'
                    : `Chỉnh sửa user #${selectedUser?.id ?? ''}`
                }}
              </h2>
            </div>
            <button class="ghost-button" type="button" @click="closeEditor">
              Đóng
            </button>
          </header>

          <form class="editor-form" @submit.prevent="submitEditor">
            <div class="form-grid">
              <label class="field">
                <span>Username (bắt buộc)</span>
                <input v-model="editor.form.userName" type="text" />
              </label>

              <label class="field">
                <span>Họ tên (bắt buộc)</span>
                <input v-model="editor.form.fullName" type="text" />
              </label>

              <label class="field">
                <span>Email (bắt buộc)</span>
                <input v-model="editor.form.email" type="email" />
              </label>

              <label class="field">
                <span>Mật khẩu / hash (bắt buộc khi tạo mới)</span>
                <input
                  v-model="editor.form.passwordHash"
                  :required="editor.mode === 'create'"
                  type="text"
                />
              </label>

              <label class="field">
                <span>Role (bắt buộc)</span>
                <select v-model.number="editor.form.role">
                  <option
                    v-for="option in userRoleOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Ngày sinh (bắt buộc)</span>
                <input v-model="editor.form.dateOfBirth" type="date" />
              </label>

              <label class="field">
                <span>Giới tính (bắt buộc)</span>
                <select v-model.number="editor.form.sex">
                  <option
                    v-for="option in genderOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="field full-span">
                <span>Địa chỉ (bắt buộc)</span>
                <input v-model="editor.form.address" type="text" />
              </label>
            </div>

            <p v-if="userValidationMessage" class="validation-text">
              {{ userValidationMessage }}
            </p>

            <footer class="modal-footer">
              <button class="secondary-button" type="button" @click="closeEditor">
                Hủy
              </button>
              <button
                class="primary-button"
                type="submit"
                :disabled="editor.busy || !userCanSubmit"
              >
                {{
                  editor.busy
                    ? 'Đang lưu...'
                    : editor.mode === 'create'
                      ? 'Tạo user'
                      : 'Lưu thay đổi'
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </transition>
  </main>
</template>
