<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  allowedStatusOptions,
  createOrder,
  deleteOrder,
  formatCurrency,
  getApiBaseUrl,
  getOrders,
  getProducts,
  getUsers,
  updateOrder,
  updateOrderStatus,
  type OrderItemInput,
  type OrderResponseDto,
  type OrderStatus,
  type ProductDto,
  type UserDto,
} from '../services/orderApi'

type EditorMode = 'create' | 'edit'
type StatusFilter = 'all' | OrderStatus

const orders = ref<OrderResponseDto[]>([])
const users = ref<UserDto[]>([])
const products = ref<ProductDto[]>([])
const isLoading = ref(true)
const isRefreshing = ref(false)
const errorMessage = ref('')
const syncMessage = ref('')
const searchQuery = ref('')
const statusFilter = ref<StatusFilter>('all')
const selectedOrderId = ref<number | null>(null)
const editorVisible = ref(false)
const editorMode = ref<EditorMode>('create')
const editorSubmitting = ref(false)
const savingStatusId = ref<number | null>(null)
const deletingOrderId = ref<number | null>(null)

const editorForm = reactive<{
  id: number | null
  userId: number | null
  items: OrderItemInput[]
}>({
  id: null,
  userId: null,
  items: [],
})

const apiBaseUrl = getApiBaseUrl()

function createEmptyItem(product?: ProductDto): OrderItemInput {
  return {
    productId: product?.id ?? null,
    quantity: 1,
    price: product?.price ?? 0,
  }
}

function createDefaultItems() {
  return [createEmptyItem(products.value[0])]
}

function resetEditor(order?: OrderResponseDto) {
  if (order) {
    editorForm.id = order.id
    editorForm.userId = order.userId
    editorForm.items = order.orderItems.length
      ? order.orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        }))
      : createDefaultItems()
    return
  }

  editorForm.id = null
  editorForm.userId = users.value[0]?.id ?? null
  editorForm.items = createDefaultItems()
}

function openCreateDialog() {
  editorMode.value = 'create'
  resetEditor()
  editorVisible.value = true
}

function openEditDialog(order: OrderResponseDto) {
  editorMode.value = 'edit'
  resetEditor(order)
  editorVisible.value = true
}

function closeEditor() {
  if (editorSubmitting.value) {
    return
  }

  editorVisible.value = false
}

function syncItemPrice(item: OrderItemInput) {
  const product = products.value.find((candidate) => candidate.id === item.productId)
  if (product) {
    item.price = product.price
  }
}

function addItemRow() {
  editorForm.items.push(createEmptyItem(products.value[0]))
}

function removeItemRow(index: number) {
  if (editorForm.items.length === 1) {
    editorForm.items.splice(0, 1, createEmptyItem(products.value[0]))
    return
  }

  editorForm.items.splice(index, 1)
}

function getUserLabel(userId: number) {
  const user = users.value.find((entry) => entry.id === userId)
  if (!user) {
    return `User #${userId}`
  }

  return `${user.fullName}`
}

function getProductLabel(productId: number) {
  const product = products.value.find((entry) => entry.id === productId)
  if (!product) {
    return `Product #${productId}`
  }

  return product.name
}

function getStatusTone(status: OrderStatus) {
  return `status-chip status-${status.toLowerCase()}`
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Chưa cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function orderItemCount(order: OrderResponseDto) {
  return order.orderItems.reduce((total, item) => total + item.quantity, 0)
}

function replaceOrder(updatedOrder: OrderResponseDto) {
  const index = orders.value.findIndex((order) => order.id === updatedOrder.id)
  if (index >= 0) {
    orders.value.splice(index, 1, updatedOrder)
  } else {
    orders.value.unshift(updatedOrder)
  }

  selectedOrderId.value = updatedOrder.id
}

async function loadDashboard() {
  errorMessage.value = ''
  syncMessage.value = ''
  isLoading.value = true

  const [ordersResult, usersResult, productsResult] = await Promise.allSettled([
    getOrders(),
    getUsers(),
    getProducts(),
  ])

  if (ordersResult.status === 'fulfilled') {
    orders.value = [...ordersResult.value].sort(
      (left, right) => +new Date(right.createdAt) - +new Date(left.createdAt),
    )
    selectedOrderId.value ??= orders.value[0]?.id ?? null
  } else {
    orders.value = []
    selectedOrderId.value = null
    errorMessage.value =
      ordersResult.reason instanceof Error
        ? ordersResult.reason.message
        : 'Không tải được danh sách đơn hàng'
  }

  if (usersResult.status === 'fulfilled') {
    users.value = usersResult.value
  } else if (!errorMessage.value) {
    syncMessage.value = 'Không tải được danh sách người dùng, form tạo đơn sẽ bị hạn chế.'
  }

  if (productsResult.status === 'fulfilled') {
    products.value = productsResult.value
  } else if (!errorMessage.value) {
    syncMessage.value = 'Không tải được danh sách sản phẩm, form tạo đơn sẽ bị hạn chế.'
  }

  if (editorVisible.value && editorForm.items.length === 0) {
    editorForm.items = createDefaultItems()
  }

  isLoading.value = false
  isRefreshing.value = false
}

async function refreshDashboard() {
  isRefreshing.value = true
  await loadDashboard()
}

const usersById = computed(() => new Map(users.value.map((user) => [user.id, user])))
const selectedOrder = computed(
  () => orders.value.find((order) => order.id === selectedOrderId.value) ?? null,
)

const visibleOrders = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return orders.value.filter((order) => {
    const user = usersById.value.get(order.userId)
    const userText = `${user?.fullName ?? ''} ${user?.email ?? ''}`.toLowerCase()
    const orderText = [
      String(order.id),
      String(order.userId),
      order.status,
      formatCurrency(order.total),
      userText,
    ].join(' ')

    const statusMatches = statusFilter.value === 'all' || order.status === statusFilter.value
    const queryMatches = !query || orderText.toLowerCase().includes(query)

    return statusMatches && queryMatches
  })
})

const dashboardStats = computed(() => {
  const totalOrders = orders.value.length
  const pendingOrders = orders.value.filter((order) => order.status === 'Pending').length
  const activeOrders = orders.value.filter((order) =>
    ['Pending', 'Processing', 'Shipped'].includes(order.status),
  ).length
  const revenue = orders.value.reduce((sum, order) => sum + order.total, 0)

  return [
    { label: 'Tổng đơn hàng', value: totalOrders.toString(), note: 'Đang quản lý' },
    { label: 'Đơn chờ xử lý', value: pendingOrders.toString(), note: 'Có thể xóa hoặc cập nhật' },
    { label: 'Đơn đang hoạt động', value: activeOrders.toString(), note: 'Pending → Shipped' },
    { label: 'Doanh thu gộp', value: formatCurrency(revenue), note: 'Tổng giá trị đơn' },
  ]
})

const editorSubtotal = computed(() =>
  editorForm.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
)

const editorValidationMessage = computed(() => {
  if (!editorForm.userId) {
    return 'Chọn một người dùng để tạo đơn.'
  }

  if (!editorForm.items.length) {
    return 'Đơn hàng phải có ít nhất một sản phẩm.'
  }

  for (const item of editorForm.items) {
    if (!item.productId) {
      return 'Mỗi dòng sản phẩm cần chọn sản phẩm.'
    }

    if (item.quantity <= 0) {
      return 'Số lượng phải lớn hơn 0.'
    }

    if (item.price <= 0) {
      return 'Giá sản phẩm phải lớn hơn 0.'
    }
  }

  return ''
})

const editorCanSubmit = computed(() => editorValidationMessage.value.length === 0)

async function submitEditor() {
  if (!editorCanSubmit.value || !editorForm.userId) {
    return
  }

  editorSubmitting.value = true
  errorMessage.value = ''
  syncMessage.value = ''

  const payload = {
    userId: editorForm.userId,
    orderItems: editorForm.items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
      price: Number(item.price),
    })),
  }

  try {
    const savedOrder =
      editorMode.value === 'create'
        ? await createOrder(payload)
        : await updateOrder({ ...payload, id: editorForm.id ?? 0 })

    replaceOrder(savedOrder)
    editorVisible.value = false
    syncMessage.value =
      editorMode.value === 'create' ? 'Đã tạo đơn hàng mới.' : 'Đã cập nhật đơn hàng.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Không thể lưu đơn hàng'
  } finally {
    editorSubmitting.value = false
  }
}

async function changeOrderStatus(order: OrderResponseDto, nextStatus: OrderStatus) {
  if (order.status === nextStatus) {
    return
  }

  savingStatusId.value = order.id
  errorMessage.value = ''

  try {
    const updatedOrder = await updateOrderStatus({ id: order.id, status: nextStatus })
    replaceOrder(updatedOrder)
    syncMessage.value = `Đã chuyển đơn #${order.id} sang ${nextStatus}.`
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đơn hàng'
  } finally {
    savingStatusId.value = null
  }
}

async function removeOrder(order: OrderResponseDto) {
  if (order.status !== 'Pending') {
    errorMessage.value = 'Chỉ có thể xóa đơn hàng ở trạng thái Pending.'
    return
  }

  const confirmed = window.confirm(`Xóa đơn hàng #${order.id}? Hành động này không thể hoàn tác.`)
  if (!confirmed) {
    return
  }

  deletingOrderId.value = order.id
  errorMessage.value = ''

  try {
    await deleteOrder(order.id)
    orders.value = orders.value.filter((entry) => entry.id !== order.id)
    selectedOrderId.value = orders.value[0]?.id ?? null
    syncMessage.value = `Đã xóa đơn hàng #${order.id}.`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Không thể xóa đơn hàng'
  } finally {
    deletingOrderId.value = null
  }
}

function selectOrder(orderId: number) {
  selectedOrderId.value = orderId
}

onMounted(async () => {
  await loadDashboard()
})
</script>

<template>
  <main class="dashboard-shell">
    <section class="hero-card">
      <div class="hero-copy">
        <p class="eyebrow">Sales & Inventory Management</p>
        <h1 class="hero-title, eyebrow">Quản Lý Đơn Hàng</h1>
        <p class="hero-text">
          Theo dõi trạng thái đơn hàng, xem chi tiết từng sản phẩm, tạo đơn mới và cập nhật tiến
          trình xử lý ngay trên một màn hình.
        </p>

        <div class="hero-actions">
          <button class="primary-button" type="button" @click="openCreateDialog">
            Tạo đơn hàng
          </button>
          <button class="secondary-button" type="button" @click="refreshDashboard">
            {{ isRefreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu' }}
          </button>
        </div>

        <div class="mini-banner">
          <span class="mini-label">API backend Order</span>
          <strong>{{ apiBaseUrl }}</strong>
          <span class="mini-label">API backend User</span>
          <strong>https://nhom3-sales-and-inventory-management.onrender.com/</strong>
        </div>
      </div>

      <div class="hero-metrics">
        <article v-for="stat in dashboardStats" :key="stat.label" class="stat-card">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
          <small>{{ stat.note }}</small>
        </article>
      </div>
    </section>



    <section v-if="errorMessage || syncMessage" class="message-stack">
      <div v-if="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div v-if="syncMessage" class="alert alert-success">{{ syncMessage }}</div>
    </section>

    <section class="toolbar-card">
      <div class="search-field">
        <label for="order-search">Tìm đơn hàng</label>
        <input
          id="order-search"
          v-model="searchQuery"
          type="text"
          placeholder="Nhập mã đơn, user, trạng thái hoặc giá trị..."
        />
      </div>

      <div class="filter-field">
        <label for="status-filter">Lọc trạng thái</label>
        <select id="status-filter" v-model="statusFilter">
          <option value="all">Tất cả</option>
          <option
            v-for="status in ['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled']"
            :key="status"
            :value="status"
          >
            {{ status }}
          </option>
        </select>
      </div>

      <div class="toolbar-actions">
        <button class="secondary-button" type="button" @click="refreshDashboard">
          {{ isRefreshing ? 'Đang tải...' : 'Tải lại' }}
        </button>
        <button class="primary-button" type="button" @click="openCreateDialog">Thêm đơn</button>
      </div>
    </section>

    <section class="content-grid">
      <div class="orders-column">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Danh sách đơn hàng</p>
            <h2>{{ visibleOrders.length }} đơn hàng phù hợp</h2>
          </div>
          <span class="count-pill">{{ orders.length }} tổng đơn</span>
        </div>

        <div v-if="isLoading" class="state-card">Đang tải dữ liệu...</div>
        <div v-else-if="!visibleOrders.length" class="state-card">
          Không có đơn hàng phù hợp với bộ lọc hiện tại.
        </div>

        <article
          v-for="order in visibleOrders"
          :key="order.id"
          class="order-card"
          :class="{ active: selectedOrderId === order.id }"
          @click="selectOrder(order.id)"
        >
          <div class="order-card-top">
            <div>
              <p class="order-id">#{{ order.id }}</p>
              <h3>{{ getUserLabel(order.userId) }}</h3>
            </div>
            <span :class="getStatusTone(order.status)">{{ order.status }}</span>
          </div>

          <div class="order-meta-grid">
            <div>
              <span>Ngày tạo: </span>
              <strong>{{ formatDateOnly(order.createdAt) }}</strong>
            </div>
            <div>
              <span>Số sản phẩm: </span>
              <strong>{{ order.orderItems.length }}</strong>
            </div>
            <div>
              <span>Số lượng: </span>
              <strong>{{ orderItemCount(order) }}</strong>
            </div>
            <div>
              <span>Tổng tiền: </span>
              <strong>{{ formatCurrency(order.total) }}</strong>
            </div>
          </div>

          <div class="order-card-actions" @click.stop>
            <button class="ghost-button" type="button" @click="openEditDialog(order)">Sửa</button>
            <select
              class="status-select compact"
              :value="order.status"
              :disabled="savingStatusId === order.id"
              @change="
                changeOrderStatus(order, ($event.target as HTMLSelectElement).value as OrderStatus)
              "
            >
              <option
                v-for="status in allowedStatusOptions(order.status)"
                :key="status"
                :value="status"
              >
                Chuyển sang {{ status }}
              </option>
            </select>
            <button
              class="danger-button"
              type="button"
              :disabled="order.status !== 'Pending' || deletingOrderId === order.id"
              @click="removeOrder(order)"
            >
              {{ deletingOrderId === order.id ? 'Đang xóa...' : 'Xóa' }}
            </button>
          </div>
        </article>
      </div>

      <aside class="detail-column">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Chi tiết đơn hàng</p>
            <h2>Thông tin đang chọn</h2>
          </div>
          <button
            v-if="selectedOrder"
            class="ghost-button"
            type="button"
            @click="openEditDialog(selectedOrder)"
          >
            Chỉnh sửa
          </button>
        </div>

        <div v-if="selectedOrder" class="detail-card">
          <div class="detail-top">
            <div>
              <p class="detail-label">Đơn hàng</p>
              <h3>#{{ selectedOrder.id }}</h3>
              <p class="detail-subtext">Khách hàng: {{ getUserLabel(selectedOrder.userId) }}</p>
            </div>
            <span :class="getStatusTone(selectedOrder.status)">{{ selectedOrder.status }}</span>
          </div>

          <dl class="detail-grid">
            <div>
              <dt>Ngày tạo</dt>
              <dd>{{ formatDateTime(selectedOrder.createdAt) }}</dd>
            </div>
            <div>
              <dt>Chỉnh sửa gần nhất</dt>
              <dd>{{ formatDateTime(selectedOrder.lastModifiedAt) }}</dd>
            </div>
            <div>
              <dt>Thành tiền</dt>
              <dd>{{ formatCurrency(selectedOrder.total) }}</dd>
            </div>
            <div>
              <dt>Tổng sản phẩm</dt>
              <dd>{{ orderItemCount(selectedOrder) }}</dd>
            </div>
          </dl>

          <div class="detail-actions">
            <label>
              Cập nhật trạng thái
              <select
                class="status-select"
                :value="selectedOrder.status"
                :disabled="savingStatusId === selectedOrder.id"
                @change="
                  changeOrderStatus(
                    selectedOrder,
                    ($event.target as HTMLSelectElement).value as OrderStatus,
                  )
                "
              >
                <option
                  v-for="status in allowedStatusOptions(selectedOrder.status)"
                  :key="status"
                  :value="status"
                >
                  {{ status }}
                </option>
              </select>
            </label>

            <button class="secondary-button" type="button" @click="openEditDialog(selectedOrder)">
              Sửa đơn
            </button>
            <button
              class="danger-button"
              type="button"
              :disabled="selectedOrder.status !== 'Pending' || deletingOrderId === selectedOrder.id"
              @click="removeOrder(selectedOrder)"
            >
              Xóa đơn
            </button>
          </div>

          <div class="line-items">
            <div class="line-items-head">
              <span>Sản phẩm</span>
              <span>SL</span>
              <span>Giá</span>
              <span>Thành tiền</span>
            </div>

            <div v-for="item in selectedOrder.orderItems" :key="item.id" class="line-item-row">
              <strong>{{ getProductLabel(item.productId) }}</strong>
              <span>{{ item.quantity }}</span>
              <span>{{ formatCurrency(item.price) }}</span>
              <span>{{ formatCurrency(item.subTotal) }}</span>
            </div>
          </div>
        </div>

        <div v-else class="state-card">
          Chọn một đơn hàng bên trái để xem chi tiết, đổi trạng thái hoặc mở form chỉnh sửa.
        </div>
      </aside>
    </section>

    <transition name="modal-fade">
      <div v-if="editorVisible" class="modal-backdrop" @click.self="closeEditor">
        <section class="modal-card">
          <header class="modal-header">
            <div>
              <p class="panel-kicker">
                {{ editorMode === 'create' ? 'Tạo đơn mới' : 'Chỉnh sửa đơn' }}
              </p>
              <h2>
                {{
                  editorMode === 'create'
                    ? 'Nhập thông tin đơn hàng'
                    : `Chỉnh sửa đơn #${editorForm.id}`
                }}
              </h2>
            </div>
            <button class="ghost-button" type="button" @click="closeEditor">Đóng</button>
          </header>

          <form class="editor-form" @submit.prevent="submitEditor">
            <div class="form-grid">
              <label class="field">
                <span>Người dùng</span>
                <select v-model.number="editorForm.userId">
                  <option :value="null" disabled>Chọn người dùng</option>
                  <option v-for="user in users" :key="user.id" :value="user.id">
                    {{ user.fullName }} - {{ user.email }}
                  </option>
                </select>
              </label>

              <div class="field">
                <span>Giá trị tạm tính</span>
                <strong class="subtotal-display">{{ formatCurrency(editorSubtotal) }}</strong>
              </div>
            </div>

            <div class="items-block">
              <div class="items-header">
                <div>
                  <h3>Sản phẩm trong đơn</h3>
                  <p>Chọn sản phẩm, số lượng và giá. Backend sẽ kiểm tra tồn kho.</p>
                </div>
                <button class="secondary-button" type="button" @click="addItemRow">
                  Thêm dòng
                </button>
              </div>

              <div v-for="(item, index) in editorForm.items" :key="index" class="item-row">
                <label class="field wide">
                  <span>Sản phẩm</span>
                  <select v-model.number="item.productId" @change="syncItemPrice(item)">
                    <option :value="null" disabled>Chọn sản phẩm</option>
                    <option v-for="product in products" :key="product.id" :value="product.id">
                      {{ product.name }} - {{ formatCurrency(product.price) }} - tồn
                      {{ product.stock }}
                    </option>
                  </select>
                </label>

                <label class="field small">
                  <span>Số lượng</span>
                  <input v-model.number="item.quantity" min="1" type="number" />
                </label>

                <label class="field small">
                  <span>Đơn giá</span>
                  <input v-model.number="item.price" min="0" step="1000" type="number" />
                </label>

                <button
                  class="ghost-button danger-inline"
                  type="button"
                  @click="removeItemRow(index)"
                >
                  Xóa
                </button>
              </div>
            </div>

            <p v-if="editorValidationMessage" class="validation-text">
              {{ editorValidationMessage }}
            </p>

            <footer class="modal-footer">
              <button class="secondary-button" type="button" @click="closeEditor">Hủy</button>
              <button
                class="primary-button"
                type="submit"
                :disabled="editorSubmitting || !editorCanSubmit"
              >
                {{
                  editorSubmitting
                    ? 'Đang lưu...'
                    : editorMode === 'create'
                      ? 'Tạo đơn hàng'
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

<style scoped>
.dashboard-shell {
  display: grid;
  gap: 1.5rem;
}

.hero-card,
.toolbar-card,
.detail-card,
.order-card,
.state-card,
.modal-card {
  background: rgba(11, 18, 32, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 24px 70px rgba(2, 6, 23, 0.35);
  backdrop-filter: blur(18px);
}

.hero-card {
  border-radius: 28px;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 1.25rem;
  position: relative;
  overflow: hidden;
}

.hero-card::before,
.hero-card::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  filter: blur(10px);
  pointer-events: none;
}

.hero-card::before {
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(248, 113, 113, 0.28), transparent 70%);
  top: -70px;
  right: 12%;
}

.hero-card::after {
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.22), transparent 72%);
  bottom: -50px;
  left: -30px;
}

.hero-copy,
.hero-metrics {
  position: relative;
  z-index: 1;
}

.eyebrow,
.panel-kicker,
.mini-label,
.detail-label {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.7rem;
  color: #93c5fd;
}

h1,
h2,
h3,
strong {
  color: #f8fafc;
}

.hero-copy h1 {
  margin: 0.5rem 0 0.9rem;
  font-size: clamp(2rem, 4vw, 3.9rem);
  line-height: 1.02;
}

.hero-text {
  max-width: 64ch;
  color: #cbd5e1;
  font-size: 1.02rem;
}

.hero-title {
  margin: 0.35rem 0 0.85rem;
  color: #f8fafc;
  font-size: clamp(2.4rem, 5vw, 4.6rem);
  line-height: 0.98;
  font-weight: 800;
  letter-spacing: -0.05em;
  max-width: none;
  white-space: nowrap;
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin: 1.5rem 0;
}

.mini-banner {
  display: inline-grid;
  gap: 0.25rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.mini-banner strong,
.stat-card strong,
.detail-grid dd,
.detail-top h3,
.order-card h3,
.line-item-row strong {
  font-size: 1.05rem;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.stat-card,
.state-card {
  border-radius: 22px;
  padding: 1rem;
}

.stat-card {
  min-height: 120px;
  display: grid;
  align-content: space-between;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.62));
}

.stat-card span,
.stat-card small,
.detail-subtext,
.items-header p,
.line-items-head,
.line-item-row,
.order-meta-grid span,
.field span,
.validation-text,
.state-card,
.alert {
  color: #cbd5e1;
}

.message-stack {
  display: grid;
  gap: 0.75rem;
}

.alert {
  border-radius: 18px;
  padding: 0.95rem 1rem;
  border: 1px solid transparent;
}

.alert-error {
  background: rgba(127, 29, 29, 0.48);
  border-color: rgba(248, 113, 113, 0.3);
}

.alert-success {
  background: rgba(20, 83, 45, 0.48);
  border-color: rgba(74, 222, 128, 0.3);
}

.toolbar-card {
  border-radius: 24px;
  padding: 1rem;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.7fr) auto;
  gap: 1rem;
  align-items: end;
}

.search-field,
.filter-field,
.field {
  display: grid;
  gap: 0.45rem;
}

.search-field input,
.filter-field select,
.field select,
.field input,
.status-select {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.9);
  color: #f8fafc;
  padding: 0.85rem 0.95rem;
  outline: none;
}

.search-field input::placeholder {
  color: #94a3b8;
}

.toolbar-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.primary-button,
.secondary-button,
.ghost-button,
.danger-button {
  border: 0;
  border-radius: 14px;
  padding: 0.85rem 1rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    opacity 0.2s ease,
    background-color 0.2s ease;
}

.primary-button:hover,
.secondary-button:hover,
.ghost-button:hover,
.danger-button:hover {
  transform: translateY(-1px);
}

.primary-button {
  background: linear-gradient(135deg, #38bdf8, #2563eb);
  color: white;
}

.secondary-button {
  background: rgba(30, 41, 59, 0.92);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.ghost-button {
  background: rgba(15, 23, 42, 0.88);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.danger-button {
  background: rgba(127, 29, 29, 0.9);
  color: white;
}

.danger-button:disabled,
.secondary-button:disabled,
.ghost-button:disabled,
.primary-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
  gap: 1.25rem;
  align-items: start;
}

.orders-column,
.detail-column {
  display: grid;
  gap: 1rem;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.count-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 0.8rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: #bfdbfe;
  border: 1px solid rgba(96, 165, 250, 0.28);
}

.order-card,
.detail-card {
  border-radius: 24px;
  padding: 1rem;
}

.order-card {
  display: grid;
  gap: 1rem;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.order-card:hover,
.order-card.active {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.38);
  background: rgba(15, 23, 42, 0.9);
}

.order-card-top,
.detail-top,
.modal-header,
.items-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.order-id {
  color: #93c5fd;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.order-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.order-meta-grid div,
.detail-grid div,
.field,
.item-row,
.line-items,
.modal-card,
.toolbar-card,
.hero-card,
.state-card {
  border-radius: 18px;
}

.order-meta-grid div {
  background: rgba(15, 23, 42, 0.6);
  padding: 0.85rem;
}

.order-card-actions,
.detail-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.compact {
  min-width: 165px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.45rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 700;
}

.status-pending {
  background: rgba(250, 204, 21, 0.18);
  color: #fde68a;
}

.status-processing {
  background: rgba(59, 130, 246, 0.18);
  color: #bfdbfe;
}

.status-shipped {
  background: rgba(20, 184, 166, 0.18);
  color: #99f6e4;
}

.status-completed {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

.status-cancelled {
  background: rgba(248, 113, 113, 0.18);
  color: #fecaca;
}

.detail-card {
  display: grid;
  gap: 1.15rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.detail-grid div {
  padding: 0.9rem;
  background: rgba(15, 23, 42, 0.64);
}

.detail-grid dt,
.field span {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.detail-grid dd,
.subtotal-display {
  margin-top: 0.35rem;
}

.line-items {
  display: grid;
  gap: 0.5rem;
  background: rgba(15, 23, 42, 0.58);
  padding: 0.9rem;
}

.line-items-head,
.line-item-row {
  display: grid;
  grid-template-columns: 1.7fr 0.45fr 0.7fr 0.7fr;
  gap: 0.75rem;
  align-items: center;
}

.line-items-head {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.line-item-row {
  background: rgba(30, 41, 59, 0.75);
  border-radius: 14px;
  padding: 0.75rem;
}

.state-card {
  padding: 1.2rem;
  color: #cbd5e1;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(2, 6, 23, 0.72);
}

.modal-card {
  width: min(1060px, 100%);
  max-height: 92vh;
  overflow: auto;
  padding: 1.25rem;
}

.editor-form {
  display: grid;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 1rem;
}

.items-block {
  display: grid;
  gap: 0.85rem;
}

.item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px 160px auto;
  gap: 0.75rem;
  padding: 0.9rem;
  background: rgba(15, 23, 42, 0.62);
}

.field.wide {
  min-width: 0;
}

.field.small {
  align-self: start;
}

.danger-inline {
  align-self: end;
}

.validation-text {
  color: #fca5a5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.18s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1120px) {
  .hero-card,
  .content-grid,
  .toolbar-card,
  .form-grid,
  .item-row {
    grid-template-columns: 1fr;
  }

  .hero-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar-actions,
  .detail-actions,
  .order-card-actions,
  .modal-footer {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .hero-card,
  .toolbar-card,
  .detail-card,
  .order-card,
  .state-card,
  .modal-card {
    border-radius: 20px;
  }

  .hero-metrics,
  .detail-grid,
  .order-meta-grid {
    grid-template-columns: 1fr;
  }

  .line-items-head,
  .line-item-row {
    grid-template-columns: 1fr 0.45fr 0.75fr 0.75fr;
    font-size: 0.9rem;
  }

  .panel-heading,
  .order-card-top,
  .detail-top,
  .modal-header,
  .items-header {
    flex-direction: column;
  }

  .hero-title {
    white-space: normal;
  }
}
</style>
