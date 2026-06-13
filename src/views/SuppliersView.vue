<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier, type Supplier } from '../services/orderApi'
import { useAuthStore } from '../stores/authStore'

const auth = useAuthStore()
const suppliers = ref<Supplier[]>([])
const editingId = ref<number | null>(null)
const error = ref('')
const form = reactive({ name: '', contactName: '', phone: '', email: '', address: '', notes: '' })

const search = ref('')
const showForm = ref(false)

const visible = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? suppliers.value : suppliers.value.filter((s) =>
    [s.name, s.contactName, s.phone, s.email, s.address, s.notes].some((val) => val && val.toLowerCase().includes(q))
  )
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
          v-if="auth.role === 'Admin' || auth.role === 'WarehouseKeeper'"
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
    <div v-if="showForm && (auth.role === 'Admin' || auth.role === 'WarehouseKeeper')" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm && (auth.role === 'Admin' || auth.role === 'WarehouseKeeper')" class="admin-modal" aria-label="Biểu mẫu nhà cung cấp">
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
            <th v-if="auth.role === 'Admin' || auth.role === 'WarehouseKeeper'">Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in visible" :key="item.id">
            <td>{{ item.name }}<small>{{ item.address }}</small></td>
            <td>{{ item.contactName }}</td>
            <td>{{ item.phone }}<small>{{ item.email }}</small></td>
            <td>{{ item.notes }}</td>
            <td v-if="auth.role === 'Admin' || auth.role === 'WarehouseKeeper'" class="actions">
              <button @click="edit(item)">Sửa</button>
              <button v-if="auth.role === 'Admin'" class="danger" @click="remove(item)">Xóa</button>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>
