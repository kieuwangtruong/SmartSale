<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import {
  createOrder,
  deleteOrder,
  formatCurrency,
  getCustomers,
  getOrders,
  ORDER_STATUSES,
  updateOrderStatus,
  type Customer,
  type Order,
  type OrderStatus,
} from '../services/orderApi'
import { getProducts, type Product } from '../services/productApi'

const auth = useAuthStore()
const orders = ref<Order[]>([])
const products = ref<Product[]>([])
const customers = ref<Customer[]>([])
const loading = ref(false)
const error = ref('')
const filter = ref<'All' | OrderStatus>('All')
const form = reactive({
  customerId: null as number | null,
  discountAmount: 0,
  amountPaid: 0,
  items: [{ productId: 0, quantity: 1 }],
})

const search = ref('')
const showForm = ref(false)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = 10

const filtered = computed(() => {
  let list = orders.value
  if (filter.value !== 'All') {
    list = list.filter((o) => o.status === filter.value)
  }
  const q = search.value.toLowerCase().trim()
  if (!q) return list
  return list.filter((o) =>
    (o.customerName || 'Khách lẻ').toLowerCase().includes(q) ||
    String(o.id).includes(q) ||
    o.orderItems.some((item) => item.productName.toLowerCase().includes(q))
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

// Reset to page 1 when search/filter changes
watch([search, filter], () => {
  currentPage.value = 1
})

function reset() {
  showForm.value = false
  Object.assign(form, { customerId: null, discountAmount: 0, amountPaid: 0, items: [{ productId: 0, quantity: 1 }] })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[orders.value, products.value, customers.value] = await Promise.all([
      getOrders(), getProducts(), getCustomers(),
    ])
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tải dữ liệu.' }
  finally { loading.value = false }
}

function addItem() { form.items.push({ productId: 0, quantity: 1 }) }
function removeItem(index: number) { if (form.items.length > 1) form.items.splice(index, 1) }

async function submit() {
  const items = form.items.filter((item) => item.productId > 0 && item.quantity > 0)
  if (!auth.user || !items.length) { error.value = 'Vui lòng chọn ít nhất một sản phẩm.'; return }
  try {
    await createOrder({
      userId: auth.user.id, customerId: form.customerId,
      discountAmount: form.discountAmount, amountPaid: form.amountPaid, orderItems: items,
    })
    reset()
    await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tạo đơn.' }
}

async function changeStatus(order: Order, status: OrderStatus) {
  try { await updateOrderStatus(order.id, status); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể cập nhật trạng thái.' }
}

async function remove(order: Order) {
  if (!confirm(`Xóa đơn #${order.id}?`)) return
  try { await deleteOrder(order.id); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể xóa đơn.' }
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>Đơn bán hàng</h2>
        <p>Tạo đơn, giữ tồn kho và theo dõi công nợ.</p>
      </div>
      <div class="page-head-actions">
        <select v-model="filter" class="filter-select">
          <option value="All">Tất cả trạng thái</option>
          <option v-for="s in ORDER_STATUSES" :key="s">{{ s }}</option>
        </select>
        <input v-model="search" placeholder="Tìm đơn, khách hàng..." class="search-input" />
        <button type="button" class="primary" @click="showForm = true">
          <i class="pi pi-plus" /> Tạo đơn mới
        </button>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>

    <!-- Create Order Modal -->
    <div v-if="showForm" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm" class="admin-modal" aria-label="Tạo đơn bán hàng">
      <div class="modal-head">
        <h2>Tạo đơn hàng mới</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="submit">
        <label>Khách hàng<select v-model="form.customerId"><option :value="null">Khách lẻ</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.fullName }} - {{ c.phone }}</option></select></label>
        <label>Giảm giá<input v-model.number="form.discountAmount" type="number" min="0" /></label>
        <label>Đã thanh toán<input v-model.number="form.amountPaid" type="number" min="0" /></label>
        
        <div class="form-section-title">Danh sách sản phẩm</div>
        <div v-for="(item, index) in form.items" :key="index" class="item-row">
          <select v-model.number="item.productId" required><option :value="0">Chọn sản phẩm</option><option v-for="p in products" :key="p.id" :value="p.id" :disabled="p.quantity <= 0">{{ p.name }} (Còn {{ p.quantity }})</option></select>
          <input v-model.number="item.quantity" type="number" min="1" placeholder="SL" />
          <button type="button" class="danger" @click="removeItem(index)"><i class="pi pi-trash" /></button>
        </div>
        <button type="button" class="add-row-btn" @click="addItem"><i class="pi pi-plus" /> Thêm sản phẩm</button>
        
        <div class="actions">
          <button class="primary">Tạo đơn</button>
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
            <th>Đơn</th>
            <th>Khách hàng</th>
            <th>Tổng tiền</th>
            <th>Công nợ</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in visible" :key="order.id">
            <td>#{{ order.id }}<small>{{ order.orderItems.map((i) => `${i.productName} x${i.quantity}`).join(', ') }}</small></td>
            <td>{{ order.customerName || 'Khách lẻ' }}</td>
            <td>{{ formatCurrency(order.total) }}</td>
            <td>{{ formatCurrency(order.debtAmount) }}</td>
            <td>
              <select :value="order.status" @change="changeStatus(order, ($event.target as HTMLSelectElement).value as OrderStatus)">
                <option v-for="s in ORDER_STATUSES" :key="s">{{ s }}</option>
              </select>
            </td>
            <td>
              <button class="danger" @click="remove(order)">Xóa</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
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
.form-section-title {
  font-weight: 700;
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 15px;
  margin-bottom: 5px;
  text-align: left;
}
.add-row-btn {
  background: var(--surface-ground) !important;
  border: 1px dashed var(--surface-border) !important;
  color: var(--text-main) !important;
  width: 100%;
  margin-top: 8px;
  margin-bottom: 15px;
  font-weight: 600;
  min-height: 38px;
  border-radius: 8px;
}
.app-dark .add-row-btn {
  background: #1e293b !important;
  border-color: #334155 !important;
}
.item-row {
  display: grid;
  grid-template-columns: 1fr 90px auto;
  gap: 8px;
  margin-bottom: 8px;
}
.item-row select,
.item-row input {
  min-height: 38px;
}
.item-row button {
  min-height: 38px;
  width: 38px;
  padding: 0;
  display: grid;
  place-items: center;
}

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
