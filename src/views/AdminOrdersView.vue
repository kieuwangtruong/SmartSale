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
  getPaymentMethodLabel,
  getOrders,
  ORDER_STATUSES,
  updateOrderStatus,
  type Customer,
  type Order,
  type OrderStatus,
} from '../services/orderApi'
import { getProducts, type Product } from '../services/productApi'
import { getUsers, type UserDto } from '../services/userApi'
import { filterVisibleOrders } from '../services/orderHiddenStorage'
import { useLanguage } from '../services/i18n'
import { useToast } from 'primevue/usetoast'

const auth = useAuthStore()
const isAdmin = computed(() => auth.role === 'Admin')
const canEditOrderStatus = computed(() => auth.role === 'Admin' || auth.role === 'SalesStaff')
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

const orders = ref<Order[]>([])
const products = ref<Product[]>([])
const customers = ref<Customer[]>([])
const staffUsers = ref<UserDto[]>([])
const loading = ref(false)
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
const selectedOrder = ref<Order | null>(null)
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
  { label: t('Khách lẻ', 'Walk-in Customer'), value: null as number | null },
  ...customers.value.map((c) => ({
    label: `${c.fullName} - ${c.phone}`,
    value: c.id,
  })),
])

const productOptions = computed(() =>
  products.value.map((p) => ({
    label: `${p.name} (${formatCurrency(p.sellingPrice)}) — ${t('Còn', 'Remaining')} ${p.quantity}`,
    value: p.id,
    disabled: p.quantity <= 0,
  })),
)

const statusFilterOptions = computed(() => [
  { label: t('Tất cả trạng thái', 'All Statuses'), value: 'All' as const },
  ...ORDER_STATUSES.map((s) => ({ label: getOrderStatusLabel(s), value: s })),
])

const orderTotalPreview = computed(() => {
  const subtotal = form.items.reduce((sum, item) => {
    const product = products.value.find((p) => p.id === item.productId)
    return sum + (product ? product.sellingPrice * item.quantity : 0)
  }, 0)
  return Math.max(0, subtotal - form.discountAmount)
})

const selectedOrderQuantity = computed(() =>
  selectedOrder.value?.orderItems.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
)

const usersById = computed(() => new Map(staffUsers.value.map((user) => [user.id, user])))

function getStaffRoleLabel(role: UserDto['role']) {
  if (role === 'Admin') return t('Quản trị viên', 'Administrator')
  if (role === 'SalesStaff') return t('Nhân viên bán hàng', 'Sales Staff')
  if (role === 'WarehouseKeeper') return t('Thủ kho', 'Warehouse Keeper')
  return t('Khách hàng', 'Customer')
}

function resolveOrderSalesStaff(order: Order) {
  const directName = order.salesStaffName?.trim() || order.createdByUserName?.trim()
  if (directName) {
    return {
      name: directName,
      roleLabel: t('Nhân viên bán hàng', 'Sales Staff'),
    }
  }

  const candidateIds = [order.salesStaffId, order.createdByUserId, order.userId].filter(
    (id): id is number => typeof id === 'number' && id > 0,
  )

  for (const id of candidateIds) {
    const user = usersById.value.get(id)
    if (!user) continue
    if (user.role === 'SalesStaff' || user.role === 'Admin') {
      return {
        name: user.fullName,
        roleLabel: getStaffRoleLabel(user.role),
        email: user.email,
      }
    }
  }

  return null
}

const selectedOrderSalesStaff = computed(() =>
  selectedOrder.value ? resolveOrderSalesStaff(selectedOrder.value) : null,
)

const filtered = computed(() => {
  let list = orders.value
  if (filter.value !== 'All') {
    list = list.filter((o) => o.status === filter.value)
  }
  const q = search.value.toLowerCase().trim()
  if (!q) return list
  return list.filter((o) =>
    (o.customerName || t('Khách lẻ', 'Walk-in')).toLowerCase().includes(q) ||
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
  return t(`Hiển thị ${start}-${end} trong tổng số ${total} mục`, `Showing ${start}-${end} of ${total} items`)
})

watch([search, filter], () => {
  currentPage.value = 1
})

function getProductPrice(productId: number) {
  return products.value.find((p) => p.id === productId)?.sellingPrice ?? 0
}

function resetCustomerForm() {
  showCustomerForm.value = false
  Object.assign(customerForm, {
    fullName: '', phone: '', email: '', address: '', gender: 0, cccd: '', age: null,
  })
}

function reset() {
  showForm.value = false
  resetCustomerForm()
  Object.assign(form, {
    customerId: null, discountAmount: 0, amountPaid: 0, items: [{ productId: 0, quantity: 1 }],
  })
}

function openOrderDetail(order: Order) {
  selectedOrder.value = order
}

function closeOrderDetail() {
  selectedOrder.value = null
}

function syncStatusDrafts(list: Order[] = orders.value) {
  for (const order of list) {
    statusDraft[order.id] = order.status
  }
}

async function load() {
  loading.value = true
  try {
    ;[orders.value, products.value, customers.value, staffUsers.value] = await Promise.all([
      getOrders(), getProducts(), getCustomers(), getUsers(),
    ])
    orders.value = filterVisibleOrders(orders.value)
    syncStatusDrafts()
  } catch (e) {
    showError(getErrorMessage(e, t('Không thể tải dữ liệu.', 'Unable to load data.')))
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
  try {
    const extras = normalizeCustomerFormExtras(customerForm)
    const created = await createCustomer({ ...customerForm, ...extras })
    form.customerId = created.id
    resetCustomerForm()
    customers.value = await getCustomers()
  } catch (e) {
    showError(getErrorMessage(e, t('Không thể tạo khách hàng.', 'Unable to create customer.')))
  }
}

async function submit() {
  const items = form.items.filter((item) => item.productId > 0 && item.quantity > 0)
  if (!auth.user || !items.length) {
    showError(t('Vui lòng chọn ít nhất một sản phẩm.', 'Please select at least one product.'))
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
    showError(getErrorMessage(e, t('Không thể tạo đơn.', 'Unable to create order.')))
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
  try {
    await updateOrderStatus(order.id, status)
    await load()
  } catch (e) {
    resetStatusDraft(order)
    showError(getErrorMessage(e, t('Không thể cập nhật trạng thái.', 'Unable to update status.')))
  }
}

async function remove(order: Order) {
  if (!confirm(t(`Xóa đơn #${order.id} (${getOrderStatusLabel(order.status)})?`, `Delete order #${order.id} (${getOrderStatusLabel(order.status)})?`))) return

  try {
    await deleteOrderAnyStatus(order.id, order.status)
    await load()
  } catch (e) {
    showError(getErrorMessage(e, t('Không thể xóa đơn.', 'Unable to delete order.')))
  }
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>{{ t('Đơn bán hàng', 'Sales Orders') }}</h2>
        <p>{{ t('Tạo đơn, giữ tồn kho và theo dõi công nợ.', 'Create orders, reserve inventory, and track credit/debt.') }}</p>
      </div>
      <div class="page-head-actions">
        <SearchableSelect
          v-model="filter"
          :options="statusFilterOptions"
          :placeholder="t('Lọc trạng thái', 'Filter status')"
          class="filter-select-wrap"
        />
        <input v-model="search" :placeholder="t('Tìm đơn, khách hàng...', 'Search orders, customers...')" class="search-input" />
        <button type="button" class="primary" @click="showForm = true">
          <i class="pi pi-plus" /> {{ t('Tạo đơn mới', 'Create Order') }}
        </button>
      </div>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click="reset" />
    <aside v-if="showForm" class="admin-modal" :aria-label="t('Tạo đơn bán hàng', 'Create sales order')">
      <div class="modal-head">
        <h2>{{ t('Tạo đơn hàng mới', 'Create New Order') }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="submit">
        <div class="customer-row">
          <label>{{ t('Khách hàng', 'Customer') }}
            <SearchableSelect
              v-model="form.customerId"
              :options="customerOptions"
              :placeholder="t('Chọn khách hàng', 'Select customer')"
            />
          </label>
          <button type="button" class="secondary add-customer-btn" @click="showCustomerForm = true">
            <i class="pi pi-user-plus" /> {{ t('Thêm KH', 'Add Customer') }}
          </button>
        </div>
        <label>{{ t('Giảm giá', 'Discount') }}<input v-model.number="form.discountAmount" type="number" min="0" /></label>
        <label>{{ t('Đã thanh toán', 'Amount Paid') }}<input v-model.number="form.amountPaid" type="number" min="0" /></label>

        <div class="form-section-title">{{ t('Danh sách sản phẩm', 'Product List') }}</div>
        <div v-for="(item, index) in form.items" :key="index" class="item-row">
          <SearchableSelect
            v-model="item.productId"
            :options="[{ label: t('Chọn sản phẩm', 'Select product'), value: 0 }, ...productOptions]"
            :placeholder="t('Tìm sản phẩm...', 'Search products...')"
          />
          <input v-model.number="item.quantity" type="number" min="1" placeholder="SL" />
          <span class="line-price">{{ formatCurrency(getProductPrice(item.productId) * item.quantity) }}</span>
          <button type="button" class="danger" @click="removeItem(index)"><i class="pi pi-trash" /></button>
        </div>
        <button type="button" class="add-row-btn" @click="addItem"><i class="pi pi-plus" /> {{ t('Thêm sản phẩm', 'Add Product') }}</button>

        <div class="order-total-preview">
          <span>{{ t('Tổng dự kiến', 'Estimated Total') }}</span>
          <strong>{{ formatCurrency(orderTotalPreview) }}</strong>
        </div>

        <div class="actions">
          <button class="primary">{{ t('Tạo đơn', 'Create Order') }}</button>
          <button type="button" @click="reset">{{ t('Hủy', 'Cancel') }}</button>
        </div>
      </form>
    </aside>

    <div v-if="showCustomerForm" class="modal-backdrop customer-modal-backdrop" @click="resetCustomerForm" />
    <aside v-if="showCustomerForm" class="admin-modal customer-modal" :aria-label="t('Thêm khách hàng', 'Add customer')">
      <div class="modal-head">
        <h2>{{ t('Thêm khách hàng mới', 'Add New Customer') }}</h2>
        <button type="button" @click="resetCustomerForm"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="submitCustomer">
        <label>{{ t('Họ tên', 'Full Name') }}<input v-model="customerForm.fullName" required /></label>
        <label>{{ t('Số điện thoại', 'Phone Number') }}<input v-model="customerForm.phone" required /></label>
        <label>{{ t('Email', 'Email') }}<input v-model="customerForm.email" type="email" /></label>
        <label>{{ t('Địa chỉ', 'Address') }}<input v-model="customerForm.address" /></label>
        <label>{{ t('Giới tính', 'Gender') }}
          <select v-model.number="customerForm.gender">
            <option :value="0">{{ t('Nam', 'Male') }}</option>
            <option :value="1">{{ t('Nữ', 'Female') }}</option>
            <option :value="2">{{ t('Khác', 'Other') }}</option>
          </select>
        </label>
        <label>{{ t('CCCD', 'Citizen ID') }}<input v-model="customerForm.cccd" /></label>
        <label>{{ t('Tuổi', 'Age') }}<input v-model.number="customerForm.age" type="number" min="1" max="120" /></label>
        <div class="actions">
          <button class="primary">{{ t('Lưu & chọn', 'Save & Select') }}</button>
          <button type="button" @click="resetCustomerForm">{{ t('Hủy', 'Cancel') }}</button>
        </div>
      </form>
    </aside>

    <div v-if="selectedOrder" class="modal-backdrop detail-modal-backdrop" @click="closeOrderDetail" />
    <aside v-if="selectedOrder" class="admin-modal order-detail-modal" :aria-label="t('Chi tiết đơn hàng', 'Order detail')">
      <div class="modal-head">
        <div>
          <h2>{{ t('Chi tiết đơn hàng', 'Order Detail') }} #{{ selectedOrder.id }}</h2>
          <p>{{ t('Ngày tạo', 'Created at') }}: {{ new Date(selectedOrder.createdAt).toLocaleString('vi-VN') }}</p>
        </div>
        <button type="button" @click="closeOrderDetail"><i class="pi pi-times" /></button>
      </div>

      <div class="admin-modal-body order-detail-body">
        <div class="detail-grid">
          <div class="detail-card">
            <span>{{ t('Khách hàng', 'Customer') }}</span>
            <strong>{{ selectedOrder.customerName || t('Khách lẻ', 'Walk-in') }}</strong>
          </div>
          <div class="detail-card">
            <span>{{ t('Trạng thái', 'Status') }}</span>
            <strong :class="['status-badge', selectedOrder.status.toLowerCase()]">{{ getOrderStatusLabel(selectedOrder.status) }}</strong>
          </div>
          <div class="detail-card">
            <span>{{ t('Thanh toán', 'Payment') }}</span>
            <strong>{{ getPaymentMethodLabel(selectedOrder.paymentMethod) }}</strong>
          </div>
          <div class="detail-card">
            <span>{{ t('Số lượng sản phẩm', 'Total quantity') }}</span>
            <strong>{{ selectedOrderQuantity }}</strong>
          </div>
          <div class="detail-card">
            <span>{{ t('Cập nhật cuối', 'Last updated') }}</span>
            <strong>{{ selectedOrder.lastModifiedAt ? new Date(selectedOrder.lastModifiedAt).toLocaleString('vi-VN') : '—' }}</strong>
          </div>
          <div class="detail-card detail-card-wide sales-staff-card">
            <span>{{ t('Nhân viên bán hàng', 'Sales Staff') }}</span>
            <template v-if="selectedOrderSalesStaff">
              <strong>{{ selectedOrderSalesStaff.name }}</strong>
              <small>{{ selectedOrderSalesStaff.roleLabel }}</small>
              <small v-if="selectedOrderSalesStaff.email">{{ selectedOrderSalesStaff.email }}</small>
            </template>
            <template v-else>
              <strong class="sales-staff-pending">{{ t('Chưa gán nhân viên', 'Not assigned yet') }}</strong>
              <small>{{ t('Đơn đặt online hoặc chưa có NV xác nhận.', 'Online order or not yet confirmed by staff.') }}</small>
            </template>
          </div>
        </div>

        <div class="detail-section-title">{{ t('Sản phẩm trong đơn', 'Order Items') }}</div>
        <div class="detail-items">
          <table>
            <thead>
              <tr>
                <th>{{ t('Sản phẩm', 'Product') }}</th>
                <th>{{ t('Số lượng', 'Qty') }}</th>
                <th>{{ t('Đơn giá', 'Price') }}</th>
                <th>{{ t('Thành tiền', 'Subtotal') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in selectedOrder.orderItems" :key="item.id">
                <td>{{ item.productName }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ formatCurrency(item.price) }}</td>
                <td>{{ formatCurrency(item.subTotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="detail-summary">
          <div>
            <span>{{ t('Tạm tính', 'Subtotal') }}</span>
            <strong>{{ formatCurrency(selectedOrder.subtotal) }}</strong>
          </div>
          <div>
            <span>{{ t('Giảm giá', 'Discount') }}</span>
            <strong>{{ formatCurrency(selectedOrder.discountAmount) }}</strong>
          </div>
          <div>
            <span>{{ t('Đã thanh toán', 'Paid') }}</span>
            <strong>{{ formatCurrency(selectedOrder.amountPaid) }}</strong>
          </div>
          <div>
            <span>{{ t('Công nợ', 'Debt') }}</span>
            <strong>{{ formatCurrency(selectedOrder.debtAmount) }}</strong>
          </div>
          <div class="grand-total">
            <span>{{ t('Tổng tiền', 'Total') }}</span>
            <strong>{{ formatCurrency(selectedOrder.total) }}</strong>
          </div>
        </div>
      </div>
    </aside>

    <article class="panel table-wrap">
      <p v-if="loading">{{ t('Đang tải...', 'Loading...') }}</p>
      <table v-else>
        <thead>
          <tr>
            <th>{{ t('Đơn', 'Order') }}</th>
            <th>{{ t('Khách hàng', 'Customer') }}</th>
            <th>{{ t('Tổng tiền', 'Total Amount') }}</th>
            <th>{{ t('Thanh toán', 'Payment') }}</th>
            <th>{{ t('Công nợ', 'Debt') }}</th>
            <th>{{ t('Trạng thái', 'Status') }}</th>
            <th>{{ t('Hành động', 'Actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in visible" :key="order.id" class="clickable-order-row" @click="openOrderDetail(order)">
            <td>#{{ order.id }}</td>
            <td>{{ order.customerName || t('Khách lẻ', 'Walk-in') }}</td>
            <td>{{ formatCurrency(order.total) }}</td>
            <td><span class="payment-method-badge">{{ getPaymentMethodLabel(order.paymentMethod) }}</span></td>
            <td>{{ formatCurrency(order.debtAmount) }}</td>
            <td @click.stop>
              <SearchableSelect
                v-if="canEditOrderStatus && canChangeOrderStatus(order.status)"
                :key="`status-${order.id}-${statusSelectKey[order.id] ?? 0}`"
                :model-value="statusDraft[order.id] ?? order.status"
                :options="getEditableStatusOptions(order)"
                :placeholder="t('Trạng thái', 'Status')"
                class="status-select-wrap"
                @update:model-value="changeStatus(order, $event as OrderStatus)"
              />
              <span v-else :class="['status-badge', order.status.toLowerCase()]">{{ getOrderStatusLabel(order.status) }}</span>
            </td>
            <td @click.stop>
              <button v-if="isAdmin" class="danger" @click="remove(order)">{{ t('Xóa', 'Delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!loading && totalPages > 1" class="pagination-footer">
        <span class="pagination-info">{{ paginationInfo }}</span>
        <div class="pagination-controls">
          <button type="button" :disabled="currentPage === 1" @click="currentPage = 1" :aria-label="t('Về đầu', 'To beginning')" :title="t('Về đầu', 'To beginning')"><i class="pi pi-chevron-double-left" /></button>
          <button type="button" :disabled="currentPage === 1" @click="currentPage--" :aria-label="t('Trang trước', 'Previous page')"><i class="pi pi-chevron-left" /></button>
          <span class="page-indicator">{{ t('Trang', 'Page') }} <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage++" :aria-label="t('Trang sau', 'Next page')"><i class="pi pi-chevron-right" /></button>
          <button type="button" :disabled="currentPage === totalPages" @click="currentPage = totalPages" :aria-label="t('Về cuối', 'To end')" :title="t('Về cuối', 'To end')"><i class="pi pi-chevron-double-right" /></button>
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
.clickable-order-row {
  cursor: pointer;
}
.clickable-order-row:hover {
  background: #f8fafc;
}
.app-dark .clickable-order-row:hover {
  background: #1f2937;
}
.detail-btn {
  margin-right: 8px;
}
.payment-method-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.app-dark .payment-method-badge {
  background: rgba(16, 185, 129, 0.16);
  color: #6ee7b7;
}
.detail-modal-backdrop {
  z-index: 70;
}
.order-detail-modal {
  z-index: 71;
  width: min(860px, calc(100vw - 32px));
}
.order-detail-modal .modal-head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}
.order-detail-body {
  display: grid;
  gap: 18px;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.detail-card {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.detail-card span {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}
.detail-card strong {
  color: #0f172a;
  font-size: 14px;
}
.detail-card-wide {
  grid-column: span 2;
}
.sales-staff-card {
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.sales-staff-card strong {
  display: block;
  font-size: 16px;
}
.sales-staff-card small {
  display: block;
  margin-top: 4px;
  color: #047857;
  font-size: 12px;
}
.sales-staff-pending {
  color: #b45309 !important;
}
.detail-section-title {
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
}
.detail-items {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.detail-items table {
  min-width: 620px;
}
.detail-summary {
  display: grid;
  gap: 8px;
  justify-self: end;
  min-width: 320px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}
.detail-summary div {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  color: #475569;
}
.detail-summary strong {
  color: #0f172a;
}
.detail-summary .grand-total {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid #dbe3ef;
  color: #0f172a;
  font-weight: 800;
}
.detail-summary .grand-total strong {
  color: #059669;
  font-size: 18px;
}
.app-dark .detail-card,
.app-dark .detail-summary,
.app-dark .detail-items {
  background: #111827;
  border-color: #374151;
}
.app-dark .detail-card strong,
.app-dark .detail-section-title,
.app-dark .detail-summary strong,
.app-dark .detail-summary .grand-total {
  color: #f8fafc;
}
.app-dark .detail-card span,
.app-dark .detail-summary div,
.app-dark .order-detail-modal .modal-head p {
  color: #9ca3af;
}
.app-dark .sales-staff-card {
  background: #064e3b33;
  border-color: #047857;
}
.app-dark .sales-staff-card small {
  color: #6ee7b7;
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
