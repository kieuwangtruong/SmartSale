<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { createCustomer, deleteCustomer, formatCurrency, getCustomers, updateCustomer, type Customer } from '../services/orderApi'
import { useAuthStore } from '../stores/authStore'

const auth = useAuthStore()
const customers = ref<Customer[]>([])
const editingId = ref<number | null>(null)
const error = ref('')
const form = reactive({ fullName: '', phone: '', email: '', address: '' })

const search = ref('')
const showForm = ref(false)

const visible = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? customers.value : customers.value.filter((c) =>
    [c.fullName, c.phone, c.email, c.address].some((val) => val && val.toLowerCase().includes(q))
  )
})

function reset() {
  editingId.value = null
  showForm.value = false
  Object.assign(form, { fullName: '', phone: '', email: '', address: '' })
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
    address: item.address || ''
  })
  showForm.value = true
}

async function save() {
  try {
    if (editingId.value) {
      const current = customers.value.find((x) => x.id === editingId.value)!
      await updateCustomer({ ...current, ...form })
    } else await createCustomer(form)
    reset(); await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể lưu khách hàng.' }
}

async function remove(item: Customer) {
  if (!confirm(`Xóa khách hàng ${item.fullName}?`)) return
  try { await deleteCustomer(item.id); await load() } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể xóa.' }
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

    <!-- Customer modal form dialog -->
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
            <th>Khách hàng</th>
            <th>Liên hệ</th>
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
    </article>
  </section>
</template>
