<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import {
  clearStoredUserAuth,
  createUser,
  deleteUser,
  getStoredUserAuth,
  getUserApiBaseUrl,
  getUserByEmail,
  getUserById,
  getUserByUsername,
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
} from "../services/userApi";

type SearchMode = "all" | "username" | "email";
type EditorMode = "create" | "edit";

interface UserFormState {
  userName: string;
  fullName: string;
  email: string;
  passwordHash: string;
  dateOfBirth: string;
  sex: number;
  address: string;
}

const searchMode = ref<SearchMode>("all");
const searchQuery = ref("");
const loading = ref(false);
const errorMessage = ref("");
const selectedUserId = ref<number | null>(null);
const users = ref<UserDto[]>([]);
const infoMessage = ref("");
const responsePreview = ref("");
const authState = ref(getStoredUserAuth());

const editor = reactive({
  open: false,
  mode: "create" as EditorMode,
  busy: false,
  form: createEmptyUserForm(),
});

const authForms = reactive({
  login: {
    email: "",
    password: "",
  } satisfies LoginRequestPayload,
  refresh: {
    refreshToken: "",
  } satisfies RefreshRequestPayload,
  logout: {
    refreshToken: "",
    deviceId: "",
  } satisfies LogoutRequestPayload,
});

const selectedUser = computed(
  () => users.value.find((user) => user.id === selectedUserId.value) ?? null,
);
const totalUsers = computed(() => users.value.length);
const visibleUserCount = computed(() => users.value.length);

function createEmptyUserForm(): UserFormState {
  return {
    userName: "",
    fullName: "",
    email: "",
    passwordHash: "",
    dateOfBirth: "",
    sex: 0,
    address: "",
  };
}

function toDateTimeInputValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value?: string | null) {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(date);
}

function sexLabel(value?: number | null) {
  if (value === null || value === undefined) {
    return "Chưa chọn";
  }

  return `Mã ${value}`;
}

function roleLabel(value?: string | null) {
  if (!value) {
    return "Chưa có";
  }

  return value;
}

function updateAuthState(
  payload: LoginResponsePayload | { accessToken: string; refreshToken: string },
) {
  const nextState = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };

  setStoredUserAuth(nextState);
  authState.value = nextState;
}

function clearAuthState() {
  clearStoredUserAuth();
  authState.value = null;
}

function normalizeUserList(payload: UserDto | UserDto[] | null | undefined) {
  if (!payload) {
    return [];
  }

  return Array.isArray(payload) ? payload : [payload];
}

function setSelectedUser(user?: UserDto | null) {
  selectedUserId.value = user?.id ?? null;
}

function openCreateDialog() {
  editor.mode = "create";
  editor.form = createEmptyUserForm();
  editor.open = true;
}

function openEditDialog(user: UserDto) {
  editor.mode = "edit";
  editor.form = {
    userName: user.userName ?? "",
    fullName: user.fullName ?? "",
    email: user.email ?? "",
    passwordHash: "",
    dateOfBirth: toDateTimeInputValue(user.dateOfBirth),
    sex: user.sex ?? 0,
    address: user.address ?? "",
  };
  selectedUserId.value = user.id;
  editor.open = true;
}

function closeEditor() {
  editor.open = false;
}

function updateResponsePreview(value: unknown) {
  responsePreview.value = JSON.stringify(value, null, 2);
}

async function loadUsers() {
  loading.value = true;
  errorMessage.value = "";
  infoMessage.value = "";

  try {
    let payload: UserDto | UserDto[] | null;

    if (!searchQuery.value.trim() || searchMode.value === "all") {
      payload = await getUsers();
    } else if (searchMode.value === "username") {
      payload = await getUserByUsername(searchQuery.value.trim());
    } else {
      payload = await getUserByEmail(searchQuery.value.trim());
    }

    users.value = normalizeUserList(payload);
    setSelectedUser(users.value[0]);

    infoMessage.value =
      searchQuery.value.trim() && searchMode.value !== "all"
        ? `Đã lọc theo ${searchMode.value === "username" ? "username" : "email"}.`
        : "Đã tải danh sách user.";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Không thể tải danh sách user";
  } finally {
    loading.value = false;
  }
}

async function submitEditor() {
  editor.busy = true;
  errorMessage.value = "";

  const payload: CreateUserPayload = {
    userName: editor.form.userName.trim() || null,
    fullName: editor.form.fullName.trim() || null,
    email: editor.form.email.trim() || null,
    passwordHash: editor.form.passwordHash.trim() || null,
    dateOfBirth: editor.form.dateOfBirth
      ? new Date(editor.form.dateOfBirth).toISOString()
      : null,
    sex: editor.form.sex ?? 0,
    address: editor.form.address.trim() || null,
  };

  try {
    if (editor.mode === "create") {
      const created = await createUser(payload);
      updateResponsePreview(created);
      infoMessage.value = "Đã tạo user mới.";
    } else if (!selectedUser.value) {
      throw new Error("Chưa chọn user để chỉnh sửa");
    } else {
      const updatedPayload: UpdateUserPayload = {
        id: selectedUser.value.id,
        ...payload,
      };
      const updated = await updateUser(updatedPayload);
      updateResponsePreview(updated);
      infoMessage.value = "Đã cập nhật user.";
    }

    closeEditor();
    await loadUsers();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Không thể lưu user";
  } finally {
    editor.busy = false;
  }
}

async function removeUser(user: UserDto) {
  if (
    !window.confirm(
      `Xóa user #${user.id} - ${user.fullName ?? user.userName ?? user.email ?? ""}?`,
    )
  ) {
    return;
  }

  errorMessage.value = "";

  try {
    const result = await deleteUser(user.id);
    updateResponsePreview(result);
    infoMessage.value = "Đã xóa user.";
    await loadUsers();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Không thể xóa user";
  }
}

async function inspectUser(user: UserDto) {
  errorMessage.value = "";

  try {
    const detail = await getUserById(user.id);
    updateResponsePreview(detail);
    setSelectedUser(detail);
    infoMessage.value = `Đã tải chi tiết user #${user.id}.`;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Không thể lấy chi tiết user";
  }
}

async function submitLogin() {
  try {
    const result = await login(authForms.login);
    updateAuthState(result);
    authForms.refresh.refreshToken = result.refreshToken;
    authForms.logout.refreshToken = result.refreshToken;
    updateResponsePreview(result);
    infoMessage.value = "Đã gọi login.";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Không thể login";
  }
}

async function submitRefresh() {
  try {
    const result = await refresh(authForms.refresh);
    if (authState.value?.refreshToken) {
      updateAuthState({
        accessToken: result.accessToken,
        refreshToken: authState.value.refreshToken,
      });
    } else if (authForms.refresh.refreshToken.trim()) {
      updateAuthState({
        accessToken: result.accessToken,
        refreshToken: authForms.refresh.refreshToken.trim(),
      });
    }
    updateResponsePreview(result);
    infoMessage.value = "Đã gọi refresh.";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Không thể refresh token";
  }
}

async function submitLogout() {
  try {
    const result = await logout(authForms.logout);
    clearAuthState();
    updateResponsePreview(result);
    infoMessage.value = "Đã gọi logout.";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "Không thể logout";
  }
}

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <main class="dashboard-shell">
    <section class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">Sales & Inventory Management</p>
        <h1 class="hero-title">Quản Lý Nhân Sự</h1>
        <p class="hero-text">
          Quản lý danh sách Nhân Sự, xem chi tiết, tạo mới, cập nhật, xóa 
        </p>

        <div class="hero-actions">
          <button
            class="primary-button"
            type="button"
            @click="openCreateDialog"
          >
            Tạo Nhân Sự
          </button>
          <button class="secondary-button" type="button" @click="loadUsers">
            {{ loading ? "Đang làm mới..." : "Làm mới dữ liệu" }}
          </button>
        </div>

        <div class="mini-banner">
          <span class="mini-label">API backend User</span>
          <strong>{{ getUserApiBaseUrl() }}</strong>
          <span class="mini-label">Auth</span>
          <strong>{{ authState ? "Đã đăng nhập" : "Chưa có token" }}</strong>
        </div>
      </div>

      <div class="hero-metrics">
        <article class="stat-card">
          <span>Tổng Nhân Sự</span>
          <strong>{{ totalUsers }}</strong>
          <small>Đang quản lý</small>
        </article>
        <article class="stat-card">
          <span>Hiển thị</span>
          <strong>{{ visibleUserCount }}</strong>
          <small>Phù hợp bộ lọc</small>
        </article>
        <article class="stat-card">
          <span>Backend</span>
          <strong>{{ getUserApiBaseUrl() }}</strong>
          <small>User service</small>
        </article>
        <article class="stat-card">
          <span>Auth token</span>
          <strong>{{ authState ? "Có" : "Chưa có" }}</strong>
          <small>Login / refresh / logout</small>
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
          placeholder="Nhập username hoặc email..."
        />
      </div>

      <div class="filter-field">
        <label for="mode-filter">Lọc theo</label>
        <select id="mode-filter" v-model="searchMode">
          <option value="all">Tất cả</option>
          <option value="username">Username</option>
          <option value="email">Email</option>
        </select>
      </div>
    </section>

    <section class="content-grid">
      <div class="orders-column">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Danh sách user</p>
            <h2>{{ users.length }} nhân sự phù hợp</h2>
          </div>
          <span class="count-pill">{{ users.length }} tổng nhân sự</span>
        </div>

        <div v-if="loading" class="state-card">Đang tải dữ liệu...</div>
        <div v-else-if="!users.length" class="state-card">
          Không có user phù hợp với bộ lọc hiện tại.
        </div>

        <article
          v-for="user in users"
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
            <span class="status-chip status-processing">{{
              roleLabel(user.role)
            }}</span>
          </div>

          <div class="order-meta-grid">
            <div>
              <span>Username: </span>
              <strong>{{ user.userName || "Chưa có" }}</strong>
            </div>
            <div>
              <span>Email: </span>
              <strong>{{ user.email || "Chưa có" }}</strong>
            </div>
            <div>
              <span>Ngày sinh: </span>
              <strong>{{ formatDateOnly(user.dateOfBirth) }}</strong>
            </div>
            <div>
              <span>Tạo lúc: </span>
              <strong>{{ formatDateTime(user.createdAt) }}</strong>
            </div>
          </div>

          <div class="order-card-actions" @click.stop>
            <button
              class="ghost-button"
              type="button"
              @click="openEditDialog(user)"
            >
              Sửa
            </button>
            <button
              class="danger-button"
              type="button"
              @click="removeUser(user)"
            >
              Xóa
            </button>
          </div>
        </article>
      </div>
    </section>

    <transition name="modal-fade">
      <div v-if="editor.open" class="modal-backdrop" @click.self="closeEditor">
        <section class="modal-card">
          <header class="modal-header">
            <div>
              <p class="panel-kicker">
                {{
                  editor.mode === "create" ? "Tạo user mới" : "Chỉnh sửa user"
                }}
              </p>
              <h2>
                {{
                  editor.mode === "create"
                    ? "Nhập thông tin user"
                    : `Chỉnh sửa user #${selectedUser?.id ?? ""}`
                }}
              </h2>
            </div>
            <button class="ghost-button" type="button" @click="closeEditor">
              Đóng
            </button>
          </header>

          <form class=" " @submit.prevent="submitEditor">
            <div class="form-grid">
              <label class="field">
                <span>Username</span>
                <input v-model="editor.form.userName" type="text" />
              </label>

              <label class="field">
                <span>Họ tên</span>
                <input v-model="editor.form.fullName" type="text" />
              </label>

              <label class="field">
                <span>Email</span>
                <input v-model="editor.form.email" type="email" />
              </label>

              <label class="field">
                <span>Mật khẩu / hash</span>
                <input v-model="editor.form.passwordHash" type="text" />
              </label>

              <label class="field">
                <span>Ngày sinh</span>
                <input
                  v-model="editor.form.dateOfBirth"
                  type="datetime-local"
                />
              </label>

              <label class="field">
                <span>Giới tính</span>
                <select v-model.number="editor.form.sex">
                  <option :value="0">0</option>
                  <option :value="1">1</option>
                  <option :value="2">2</option>
                </select>
              </label>

              <label class="field full-span">
                <span>Địa chỉ</span>
                <input v-model="editor.form.address" type="text" />
              </label>
            </div>

            <footer class="modal-footer">
              <button
                class="secondary-button"
                type="button"
                @click="closeEditor"
              >
                Hủy
              </button>
              <button
                class="primary-button"
                type="submit"
                :disabled="editor.busy"
              >
                {{
                  editor.busy
                    ? "Đang lưu..."
                    : editor.mode === "create"
                      ? "Tạo user"
                      : "Lưu thay đổi"
                }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </transition>
  </main>
</template>
