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

function scoreOrder(order: OrderResponseDto, tokens: string[]) {
  const user = usersById.value.get(order.userId)
  const fieldValues = [
    order.id,
    order.userId,
    order.status,
    order.total,
    formatCurrency(order.total),
    formatDateTime(order.createdAt),
    formatDateOnly(order.createdAt),
    user?.fullName,
    user?.email,
    user?.role,
    order.orderItems.map((item) => getProductLabel(item.productId)).join(' '),
  ]

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

function createEmptyItem(product?: ProductDto): OrderItemInput {
  return {
    productId: product?.id ?? null,
    quantity: 1,
    price: product?.price ?? 0,
  }
}

function getProductStock(productId: number) {
  return products.value.find((entry) => entry.id === productId)?.stock ?? 0
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
  const tokens = tokenizeSearch(searchQuery.value)

  return [...orders.value]
    .map((order) => ({ order, score: tokens.length ? scoreOrder(order, tokens) : 1 }))
    .filter((entry) => {
      const statusMatches =
        statusFilter.value === 'all' || entry.order.status === statusFilter.value

      return statusMatches && entry.score > 0
    })
    .sort((left, right) => right.score - left.score || right.order.id - left.order.id)
    .map((entry) => entry.order)
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

    const availableStock = getProductStock(item.productId)

    if (item.quantity <= 0) {
      return 'Số lượng phải lớn hơn 0.'
    }

    if (item.quantity > availableStock) {
      return `Số lượng của ${getProductLabel(item.productId)} không được vượt quá tồn kho (${availableStock}).`
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
        <h1 class="hero-title">Quản Lý Đơn Hàng</h1>


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

        
        </article>
      </div>

      <aside class="detail-column">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Chi tiết đơn hàng</p>
            <h2>Thông tin đang chọn</h2>
          </div>
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
                  <input
                    v-model.number="item.price"
                    min="0"
                    step="1000"
                    type="number"
                    disabled
                  />
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
