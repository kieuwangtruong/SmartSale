<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import { normalizeCustomerFormExtras } from '../services/customerExtraStorage'
import { getErrorMessage } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import {
  createCustomer,
  createOrder,
  deleteOrderAnyStatus,
  formatCurrency,
  canChangeOrderStatus,
  getCustomers,
  getOrderStatusLabel,
  getOrderStatusOptions,
  getOrders,
  ORDER_STATUSES,
  updateOrderStatus,
  type Customer,
  type Order,
  type OrderStatus,
} from '../services/orderApi'
import { filterVisibleOrders } from '../services/orderHiddenStorage'
import { getProducts, type Product } from '../services/productApi'

const auth = useAuthStore()
const isAdmin = computed(() => auth.role === 'Admin')

const orders = ref<Order[]>([])
const products = ref<Product[]>([])
const customers = ref<Customer[]>([])
const loading = ref(false)
const pageError = ref('')
const orderError = ref('')
const customerError = ref('')
const filter = ref<'All' | OrderStatus>('All')
const form = reactive({
  customerId: null as number | null,
  discountAmount: 0,
  amountPaid: 0,
  items: [{ productId: 0, quantity: 1 }],
})

const search = ref('')
const showForm = ref(false)
const showCustomerForm = ref(false)
const customerForm = reactive({
  fullName: '',
  phone: '',
  email: '',
  address: '',
  gender: 0,
  cccd: '',
  age: null as number | null,
})

const currentPage = ref(1)
const itemsPerPage = 10
/** Giá trị hiển thị dropdown — reset về trạng thái gốc nếu không đổi được */
const statusDraft = reactive<Record<number, OrderStatus>>({})

const customerOptions = computed(() => [
  { label: 'Khách lẻ', value: null as number | null },
  ...customers.value.map((c) => ({
    label: `${c.fullName} - ${c.phone}`,
    value: c.id,
  })),
])

const productOptions = computed(() =>
  products.value.map((p) => ({
    label: `${p.name} (${formatCurrency(p.sellingPrice)}) — Còn ${p.quantity}`,
    value: p.id,
    disabled: p.quantity <= 0,
  })),
)

const statusFilterOptions = computed(() => [
  { label: 'Tất cả trạng thái', value: 'All' as const },
  ...ORDER_STATUSES.map((s) => ({ label: getOrderStatusLabel(s), value: s })),
])

const orderTotalPreview = computed(() => {
  const subtotal = form.items.reduce((sum, item) => {
    const product = products.value.find((p) => p.id === item.productId)
    return sum + (product ? product.sellingPrice * item.quantity : 0)
  }, 0)
  return Math.max(0, subtotal - form.discountAmount)
})

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
    o.orderItems.some((item) => item.productName.toLowerCase().includes(q)),
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

watch([search, filter], () => {
  currentPage.value = 1
})

function getProductPrice(productId: number) {
  return products.value.find((p) => p.id === productId)?.sellingPrice ?? 0
}

function resetCustomerForm() {
  showCustomerForm.value = false
  customerError.value = ''
  Object.assign(customerForm, {
    fullName: '', phone: '', email: '', address: '', gender: 0, cccd: '', age: null,
  })
}

function reset() {
  showForm.value = false
  orderError.value = ''
  resetCustomerForm()
  Object.assign(form, {
    customerId: null, discountAmount: 0, amountPaid: 0, items: [{ productId: 0, quantity: 1 }],
  })
}

function syncStatusDrafts(list: Order[] = orders.value) {
  for (const order of list) {
    statusDraft[order.id] = order.status
  }
}

async function load() {
  loading.value = true
  pageError.value = ''
  try {
    ;[orders.value, products.value, customers.value] = await Promise.all([
      getOrders(), getProducts(), getCustomers(),
    ])
    orders.value = filterVisibleOrders(orders.value)
    syncStatusDrafts()
  } catch (e) {
    pageError.value = getErrorMessage(e, 'Không thể tải dữ liệu.')
  } finally {
    loading.value = false
  }
}

function addItem() {
  form.items.push({ productId: 0, quantity: 1 })
}

function removeItem(index: number) {
  if (form.items.length > 1) form.items.splice(index, 1)
}

async function submitCustomer() {
  customerError.value = ''
  try {
    const extras = normalizeCustomerFormExtras(customerForm)
    const created = await createCustomer({ ...customerForm, ...extras })
    form.customerId = created.id
    resetCustomerForm()
    customers.value = await getCustomers()
  } catch (e) {
    customerError.value = getErrorMessage(e, 'Không thể tạo khách hàng.')
  }
}

async function submit() {
  const items = form.items.filter((item) => item.productId > 0 && item.quantity > 0)
  if (!auth.user || !items.length) {
    orderError.value = 'Vui lòng chọn ít nhất một sản phẩm.'
    return
  }
  try {
    await createOrder({
      userId: auth.user.id,
      customerId: form.customerId,
      discountAmount: form.discountAmount,
      amountPaid: form.amountPaid,
      orderItems: items,
    })
    reset()
    await load()
  } catch (e) {
    orderError.value = getErrorMessage(e, 'Không thể tạo đơn.')
  }
}

function getEditableStatusOptions(order: Order) {
  return getOrderStatusOptions(order.status)
}

/** Tăng key để dropdown reset về trạng thái gốc khi đổi thất bại */
const statusSelectKey = reactive<Record<number, number>>({})

function resetStatusDraft(order: Order) {
  statusDraft[order.id] = order.status
  statusSelectKey[order.id] = (statusSelectKey[order.id] ?? 0) + 1
}

async function changeStatus(order: Order, status: OrderStatus | null) {
  if (!status || status === order.status) {
    resetStatusDraft(order)
    return
  }
  if (!canChangeOrderStatus(order.status)) {
    resetStatusDraft(order)
    return
  }
  const allowed = getEditableStatusOptions(order).map((o) => o.value)
  if (!allowed.includes(status)) {
    resetStatusDraft(order)
    return
  }
  pageError.value = ''
  try {
    await updateOrderStatus(order.id, status)
    await load()
  } catch (e) {
    resetStatusDraft(order)
    pageError.value = getErrorMessage(e, 'Không thể cập nhật trạng thái.')
  }
}

async function remove(order: Order) {
  if (!confirm(`Xóa đơn #${order.id} (${getOrderStatusLabel(order.status)})?`)) return

  pageError.value = ''
  try {
    await deleteOrderAnyStatus(order.id, order.status)
    await load()
  } catch (e) {
    pageError.value = getErrorMessage(e, 'Không thể xóa đơn.')
  }
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
        <SearchableSelect
          v-model="filter"
          :options="statusFilterOptions"
          placeholder="Lọc trạng thái"
          class="filter-select-wrap"
        />
        <input v-model="search" placeholder="Tìm đơn, khách hàng..." class="search-input" />
        <button type="button" class="primary" @click="showForm = true">
          <i class="pi pi-plus" /> Tạo đơn mới
        </button>
      </div>
    </div>

    <p v-if="pageError" class="alert error">{{ pageError }}</p>

    <div v-if="showForm" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm" class="admin-modal" aria-label="Tạo đơn bán hàng">
      <div class="modal-head">
        <h2>Tạo đơn hàng mới</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="submit">
        <p v-if="orderError" class="alert error" style="margin-bottom: 15px;">{{ orderError }}</p>
        <div class="customer-row">
          <label>Khách hàng
            <SearchableSelect
              v-model="form.customerId"
              :options="customerOptions"
              placeholder="Chọn khách hàng"
            />
          </label>
          <button type="button" class="secondary add-customer-btn" @click="showCustomerForm = true">
            <i class="pi pi-user-plus" /> Thêm KH
          </button>
        </div>
        <label>Giảm giá<input v-model.number="form.discountAmount" type="number" min="0" /></label>
        <label>Đã thanh toán<input v-model.number="form.amountPaid" type="number" min="0" /></label>

        <div class="form-section-title">Danh sách sản phẩm</div>
        <div v-for="(item, index) in form.items" :key="index" class="item-row">
          <SearchableSelect
            v-model="item.productId"
            :options="[{ label: 'Chọn sản phẩm', value: 0 }, ...productOptions]"
            placeholder="Tìm sản phẩm..."
          />
          <input v-model.number="item.quantity" type="number" min="1" placeholder="SL" />
          <span class="line-price">{{ formatCurrency(getProductPrice(item.productId) * item.quantity) }}</span>
          <button type="button" class="danger" @click="removeItem(index)"><i class="pi pi-trash" /></button>
        </div>
        <button type="button" class="add-row-btn" @click="addItem"><i class="pi pi-plus" /> Thêm sản phẩm</button>

        <div class="order-total-preview">
          <span>Tổng dự kiến</span>
          <strong>{{ formatCurrency(orderTotalPreview) }}</strong>
        </div>

        <div class="actions">
          <button class="primary">Tạo đơn</button>
          <button type="button" @click="reset">Hủy</button>
        </div>
      </form>
    </aside>

    <div v-if="showCustomerForm" class="modal-backdrop customer-modal-backdrop" @click="resetCustomerForm" />
    <aside v-if="showCustomerForm" class="admin-modal customer-modal" aria-label="Thêm khách hàng">
      <div class="modal-head">
        <h2>Thêm khách hàng mới</h2>
        <button type="button" @click="resetCustomerForm"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="submitCustomer">
        <p v-if="customerError" class="alert error" style="margin-bottom: 15px;">{{ customerError }}</p>
        <label>Họ tên<input v-model="customerForm.fullName" required /></label>
        <label>Số điện thoại<input v-model="customerForm.phone" required /></label>
        <label>Email<input v-model="customerForm.email" type="email" /></label>
        <label>Địa chỉ<input v-model="customerForm.address" /></label>
        <label>Giới tính
          <select v-model.number="customerForm.gender">
            <option :value="0">Nam</option>
            <option :value="1">Nữ</option>
            <option :value="2">Khác</option>
          </select>
        </label>
        <label>CCCD<input v-model="customerForm.cccd" /></label>
        <label>Tuổi<input v-model.number="customerForm.age" type="number" min="1" max="120" /></label>
        <div class="actions">
          <button class="primary">Lưu & chọn</button>
          <button type="button" @click="resetCustomerForm">Hủy</button>
        </div>
      </form>
    </aside>

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
              <SearchableSelect
                v-if="isAdmin && canChangeOrderStatus(order.status)"
                :key="`status-${order.id}-${statusSelectKey[order.id] ?? 0}`"
                :model-value="statusDraft[order.id] ?? order.status"
                :options="getEditableStatusOptions(order)"
                placeholder="Trạng thái"
                class="status-select-wrap"
                @update:model-value="changeStatus(order, $event as OrderStatus)"
              />
              <span v-else :class="['status-badge', order.status.toLowerCase()]">{{ getOrderStatusLabel(order.status) }}</span>
            </td>
            <td>
              <button v-if="isAdmin" class="danger" @click="remove(order)">Xóa</button>
              <span v-else class="muted-action">—</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && totalPages > 1" class="pagination-footer">
        <span class="pagination-info">{{ paginationInfo }}</span>
        <div class="pagination-controls">
          <button type="button" :disabled="currentPage === 1" @click="currentPage = 1" aria-label="Về đầu"><i class="pi pi-chevron-double-left" /></button>
          <button type="button" :disabled="currentPage === 1" @click="currentPage--" aria-label="Trang trước"><i class="pi pi-chevron-left" /></button>
          <span class="page-indicator">Trang <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage++" aria-label="Trang sau"><i class="pi pi-chevron-right" /></button>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage = totalPages" aria-label="Về cuối"><i class="pi pi-chevron-double-right" /></button>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.filter-select-wrap {
  min-width: 180px;
}
.customer-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: end;
}
.add-customer-btn {
  min-height: 38px;
  white-space: nowrap;
}
.customer-modal-backdrop {
  z-index: 60;
}
.customer-modal {
  z-index: 61;
}
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
  grid-template-columns: 1fr 70px 100px auto;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.item-row input {
  min-height: 38px;
}
.line-price {
  font-size: 12px;
  font-weight: 600;
  color: #059669;
  white-space: nowrap;
}
.order-total-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 8px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}
.order-total-preview strong {
  font-size: 18px;
  color: #059669;
}
.app-dark .order-total-preview {
  background: #14532d33;
  border-color: #166534;
}
.status-select-wrap {
  min-width: 170px;
}
.status-select-wrap :deep(.p-select) {
  min-height: 34px;
  font-size: 13px;
}
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  background: #f3f4f6;
  font-size: 13px;
}
.app-dark .status-badge {
  background: #374151;
}
.muted-action {
  color: #94a3b8;
  font-size: 12px;
}
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
}
.app-dark .pagination-controls button {
  border-color: #4b5563;
  background: #374151;
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
</style>
