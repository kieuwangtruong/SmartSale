<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import {
  decodeAddressWithExtras,
  encodeAddressWithExtras,
  normalizeCustomerFormExtras,
} from '../services/customerExtraStorage'
import {
  createCustomer,
  deleteCustomer,
  formatCurrency,
  getCustomers,
  GENDER_OPTIONS,
  updateCustomer,
  type Customer,
} from '../services/orderApi'
import { getUsers, updateUser, deleteUser, type UserDto } from '../services/userApi'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'
import { useToast } from 'primevue/usetoast'

const auth = useAuthStore()
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

interface CustomerWithTier extends Customer {
  tier?: string | null
}

const customers = ref<CustomerWithTier[]>([])
const registeredUsers = ref<UserDto[]>([])
const editingId = ref<number | null>(null)
const form = reactive({
  fullName: '',
  phone: '',
  email: '',
  address: '',
  gender: 0,
  cccd: '',
  age: null as number | null,
  tier: 'Standard',
})

const search = ref('')
const showForm = ref(false)
const currentPage = ref(1)
const itemsPerPage = 10

const genderOptions = computed(() =>
  GENDER_OPTIONS.map((g) => ({
    label: g.value === 0 ? t('Nam', 'Male') : g.value === 1 ? t('Nữ', 'Female') : t('Khác', 'Other'),
    value: g.value,
  })),
)

const tierOptions = computed(() => [
  { label: t('Thành viên thường', 'Standard Member'), value: 'Standard' },
  { label: t('Thành viên Bạc', 'Silver Member'), value: 'Silver' },
  { label: t('Thành viên Vàng', 'Gold Member'), value: 'Gold' },
  { label: t('Thành viên Kim cương', 'Platinum Member'), value: 'Platinum' },
])

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q
    ? customers.value
    : customers.value.filter((c) =>
        [c.fullName, c.phone, c.email, c.address, c.cccd]
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
  return t(`Hiển thị ${start}-${end} trong tổng số ${total} mục`, `Showing ${start}-${end} of ${total} items`)
})

watch(search, () => {
  currentPage.value = 1
})

function reset() {
  editingId.value = null
  showForm.value = false
  Object.assign(form, {
    fullName: '', phone: '', email: '', address: '', gender: 0, cccd: '', age: null, tier: 'Standard',
  })
}

async function load() {
  try {
    const list = await getCustomers()
    try {
      registeredUsers.value = await getUsers()
    } catch {
      registeredUsers.value = []
    }

    const customerUsers = registeredUsers.value.filter((u) => u.role === 'Customer')
    const merged = [...list]

    for (const u of customerUsers) {
      const exists = list.some((c) => c.email && c.email.toLowerCase() === u.email.toLowerCase())
      if (!exists) {
        const decoded = decodeAddressWithExtras(u.address)
        merged.push({
          id: -u.id, // negative ID to represent registered User ID
          fullName: u.fullName,
          phone: u.userName || '—', // username as fallback
          email: u.email,
          address: decoded.plainAddress || u.address || '—',
          gender: decoded.extras.gender ?? u.sex ?? 0,
          cccd: decoded.extras.cccd || '',
          age: decoded.extras.age ?? null,
          tier: decoded.extras.tier || 'Standard',
          orderCount: 0,
          totalSpent: 0,
          currentDebt: 0,
          createdAt: new Date().toISOString(),
        })
      }
    }

    customers.value = merged.map((c) => {
      if (c.id > 0) {
        const decoded = decodeAddressWithExtras(c.address)
        return {
          ...c,
          tier: decoded.extras.tier || 'Standard',
        }
      }
      return c
    })
  } catch (e) {
    showError(e instanceof Error ? e.message : t('Không thể tải khách hàng.', 'Failed to load customers.'))
  }
}

function edit(item: CustomerWithTier) {
  editingId.value = item.id
  Object.assign(form, {
    fullName: item.fullName,
    phone: item.id < 0 ? '' : (item.phone || ''),
    email: item.email || '',
    address: item.address || '',
    gender: item.gender ?? 0,
    cccd: item.cccd || '',
    age: item.age ?? null,
    tier: item.tier || 'Standard',
  })
  showForm.value = true
}

async function save() {
  try {
    const extras = normalizeCustomerFormExtras(form)
    if (editingId.value) {
      if (editingId.value < 0) {
        // Edit customer account
        const userId = -editingId.value
        await updateUser({
          id: userId,
          fullName: form.fullName,
          email: form.email,
          address: encodeAddressWithExtras(form.address, extras),
          sex: form.gender ?? 0,
        })
      } else {
        // Edit standard customer
        const current = customers.value.find((x) => x.id === editingId.value)!
        await updateCustomer({ ...current, ...form, ...extras })
      }
    } else {
      await createCustomer({ ...form, ...extras })
    }
    reset()
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('Không thể lưu khách hàng.', 'Failed to save customer.'))
  }
}

async function remove(item: CustomerWithTier) {
  if (!confirm(t(`Xóa khách hàng ${item.fullName}?`, `Delete customer ${item.fullName}?`))) return
  try {
    if (item.id < 0) {
      await deleteUser(-item.id)
    } else {
      await deleteCustomer(item.id, item.phone)
    }
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('Không thể xóa.', 'Failed to delete.'))
  }
}

function translateGender(gender?: number | null) {
  if (gender === 1) return t('Nữ', 'Female')
  if (gender === 2) return t('Khác', 'Other')
  return t('Nam', 'Male')
}

function translateTier(tier: string | null | undefined) {
  if (tier === 'Silver') return t('Bạc', 'Silver')
  if (tier === 'Gold') return t('Vàng', 'Gold')
  if (tier === 'Platinum') return t('Kim cương', 'Platinum')
  return t('Thường', 'Standard')
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>{{ t('Khách hàng', 'Customers') }}</h2>
        <p>{{ t('Thông tin, lịch sử mua và công nợ.', 'Profiles, orders history and current debt.') }}</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" :placeholder="t('Tìm khách hàng...', 'Search customers...')" class="search-input" />
        <button type="button" class="primary" @click="showForm = true">
          <i class="pi pi-plus" /> {{ t('Thêm khách hàng', 'Add Customer') }}
        </button>
      </div>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm" class="admin-modal" :aria-label="t('Biểu mẫu khách hàng', 'Customer Form')">
      <div class="modal-head">
        <h2>{{ editingId ? t('Cập nhật khách hàng', 'Update Customer') : t('Thêm khách hàng', 'Add Customer') }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="save">
        <label>{{ t('Họ tên', 'Full Name') }}<input v-model="form.fullName" required /></label>
        <label v-if="editingId === null || editingId > 0">{{ t('Số điện thoại', 'Phone Number') }}<input v-model="form.phone" required /></label>
        <label>{{ t('Email', 'Email') }}<input v-model="form.email" type="email" /></label>
        <label>{{ t('Địa chỉ', 'Address') }}<input v-model="form.address" /></label>
        <label>{{ t('Giới tính', 'Gender') }}
          <SearchableSelect v-model="form.gender" :options="genderOptions" :placeholder="t('Chọn giới tính', 'Select gender')" />
        </label>
        <label>{{ t('CCCD', 'CCCD') }}<input v-model="form.cccd" /></label>
        <label>{{ t('Tuổi', 'Age') }}<input v-model.number="form.age" type="number" min="1" max="120" /></label>
        <label>{{ t('Hạng thành viên', 'Membership Tier') }}
          <SearchableSelect v-model="form.tier" :options="tierOptions" :placeholder="t('Chọn hạng', 'Select tier')" />
        </label>
        <div class="actions">
          <button class="primary">{{ t('Lưu', 'Save') }}</button>
          <button type="button" @click="reset">{{ t('Hủy', 'Cancel') }}</button>
        </div>
      </form>
    </aside>

    <article class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>{{ t('Khách hàng', 'Customer') }}</th>
            <th>{{ t('Liên hệ', 'Contact') }}</th>
            <th>{{ t('Hạng', 'Tier') }}</th>
            <th>{{ t('Giới tính', 'Gender') }}</th>
            <th>{{ t('CCCD', 'CCCD') }}</th>
            <th>{{ t('Tuổi', 'Age') }}</th>
            <th>{{ t('Đơn hàng', 'Orders') }}</th>
            <th>{{ t('Đã mua', 'Total Spent') }}</th>
            <th>{{ t('Công nợ', 'Debt') }}</th>
            <th>{{ t('Hành động', 'Actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visible" :key="item.id">
            <td>{{ item.fullName }}<small>{{ item.address }}</small></td>
            <td>{{ item.phone }}<small>{{ item.email }}</small></td>
            <td><span class="tier-label" :class="item.tier?.toLowerCase()">{{ translateTier(item.tier) }}</span></td>
            <td>{{ translateGender(item.gender) }}</td>
            <td>{{ item.cccd || '—' }}</td>
            <td>{{ item.age ?? '—' }}</td>
            <td>{{ item.orderCount }}</td>
            <td>{{ formatCurrency(item.totalSpent) }}</td>
            <td>{{ formatCurrency(item.currentDebt) }}</td>
            <td class="actions">
              <button @click="edit(item)">{{ t('Sửa', 'Edit') }}</button>
              <button v-if="auth.role === 'Admin'" class="danger" @click="remove(item)">{{ t('Xóa', 'Delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="totalPages > 1" class="pagination-footer">
        <span class="pagination-info">{{ paginationInfo }}</span>
        <div class="pagination-controls">
          <button type="button" :disabled="currentPage === 1" @click="currentPage = 1"><i class="pi pi-chevron-double-left" /></button>
          <button type="button" :disabled="currentPage === 1" @click="currentPage--"><i class="pi pi-chevron-left" /></button>
          <span class="page-indicator">{{ t('Trang', 'Page') }} <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage++"><i class="pi pi-chevron-right" /></button>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage = totalPages"><i class="pi pi-chevron-double-right" /></button>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.tier-label {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 750;
  text-transform: uppercase;
}
.tier-label.standard { background: #f3f4f6; color: #4b5563; }
.tier-label.silver { background: #e2e8f0; color: #64748b; }
.tier-label.gold { background: #fef3c7; color: #d97706; }
.tier-label.platinum { background: #fae8ff; color: #a21caf; }

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
