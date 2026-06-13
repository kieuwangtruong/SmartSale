<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  createProduct,
  deleteProduct,
  formatCurrency,
  getProductApiBaseUrl,
  getProductById,
  getProducts,
  getStatusColor,
  type CreateProductPayload,
  type ProductDto,
  type UpdateProductPayload,
} from '../services/productApi'

type SearchMode = 'all' | 'productName' | 'sku' | 'category' | 'price'
type EditorMode = 'create' | 'edit'

const statusOptions: Array<{ value: string; label: string }> = [
  { value: 'Active', label: 'Hoạt động' },
  { value: 'Inactive', label: 'Không hoạt động' },
  { value: 'Discontinued', label: 'Ngừng bán' },
]

interface ProductFormState {
  productName: string
  description: string
  price: number | null
  stock: number | null
  category: string
  sku: string
  status: string
}

const searchMode = ref<SearchMode>('all')
const searchQuery = ref('')
const loading = ref(false)
const errorMessage = ref('')
const selectedProductId = ref<number | null>(null)
const products = ref<ProductDto[]>([])
const infoMessage = ref('')
const responsePreview = ref('')

const editor = reactive({
  open: false,
  mode: 'create' as EditorMode,
  busy: false,
  form: createEmptyProductForm(),
})

const selectedProduct = computed(
  () => products.value.find((product) => product.id === selectedProductId.value) ?? null,
)
const totalProducts = computed(() => products.value.length)
const activeProducts = computed(
  () => products.value.filter((product) => product.status === 'Active').length,
)
const lowStockProducts = computed(
  () => products.value.filter((product) => (product.stock || 0) < 10).length,
)
const totalInventoryValue = computed(() =>
  products.value.reduce((sum, p) => sum + ((p.price || 0) * (p.stock || 0)), 0),
)
const searchTokens = computed(() => tokenizeSearch(searchQuery.value))
const visibleProducts = computed(() => {
  if (!searchTokens.value.length) {
    return products.value
  }

  return [...products.value]
    .map((product) => ({ product, score: scoreProduct(product, searchTokens.value) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.product.id - right.product.id)
    .map((entry) => entry.product)
})
const visibleProductCount = computed(() => visibleProducts.value.length)
const productStats = computed(() => [
  { label: 'Tổng sản phẩm', value: totalProducts.value.toString(), note: 'Đang quản lý' },
  { label: 'Đang hiển thị', value: visibleProductCount.value.toString(), note: 'Theo bộ lọc' },
  { label: 'Sản phẩm hoạt động', value: activeProducts.value.toString(), note: 'Có sẵn' },
  {
    label: 'Sắp hết hàng',
    value: lowStockProducts.value.toString(),
    note: 'Dưới 10 cái',
  },
])
const productValidationMessage = computed(() => {
  const missingFields: string[] = []

  if (!editor.form.productName.trim()) {
    missingFields.push('Tên sản phẩm')
  }

  if (editor.form.price === null || editor.form.price < 0) {
    missingFields.push('Giá')
  }

  if (editor.form.stock === null || editor.form.stock < 0) {
    missingFields.push('Tồn kho')
  }

  if (missingFields.length) {
    return `Vui lòng nhập các trường bắt buộc: ${missingFields.join(', ')}.`
  }

  return ''
})
const productCanSubmit = computed(() => productValidationMessage.value.length === 0)

function createEmptyProductForm(): ProductFormState {
  return {
    productName: '',
    description: '',
    price: null,
    stock: null,
    category: '',
    sku: '',
    status: 'Active',
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

function scoreProduct(product: ProductDto, tokens: string[]) {
  const fieldValues =
    searchMode.value === 'all'
      ? [
          product.id,
          product.productName,
          product.sku,
          product.category,
          product.price,
          product.status,
        ]
      : searchMode.value === 'productName'
        ? [product.productName]
        : searchMode.value === 'sku'
          ? [product.sku]
          : searchMode.value === 'category'
            ? [product.category]
            : [product.price]

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

function updateResponsePreview(value: unknown) {
  responsePreview.value = JSON.stringify(value, null, 2)
}

async function loadProducts() {
  loading.value = true
  errorMessage.value = ''
  infoMessage.value = ''

  try {
    const payload = await getProducts()
    products.value = Array.isArray(payload) ? payload : [payload]
    const firstProduct = products.value[0]
    if (firstProduct) {
      selectedProductId.value = firstProduct.id
    }

    infoMessage.value =
      'Đã tải danh sách sản phẩm. Bạn có thể lọc theo tên, SKU, danh mục hoặc giá.'
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể tải danh sách sản phẩm'
  } finally {
    loading.value = false
  }
}

async function submitEditor() {
  if (!productCanSubmit.value) {
    errorMessage.value = productValidationMessage.value
    return
  }

  editor.busy = true
  errorMessage.value = ''

  const payload: CreateProductPayload = {
    productName: editor.form.productName.trim() || null,
    description: editor.form.description.trim() || null,
    price: editor.form.price,
    stock: editor.form.stock,
    category: editor.form.category.trim() || null,
    sku: editor.form.sku.trim() || null,
    status: editor.form.status || 'Active',
  }

  try {
    if (editor.mode === 'create') {
      const created = await createProduct(payload)
      updateResponsePreview(created)
      infoMessage.value = 'Đã tạo sản phẩm mới.'
    } else if (!selectedProduct.value) {
      throw new Error('Chưa chọn sản phẩm để chỉnh sửa')
    } else {
      const updatedPayload: UpdateProductPayload = {
        id: selectedProduct.value.id,
        ...payload,
      }
      const updated = await updateProduct(updatedPayload)
      updateResponsePreview(updated)
      infoMessage.value = 'Đã cập nhật sản phẩm.'
    }

    closeEditor()
    await loadProducts()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể lưu sản phẩm'
  } finally {
    editor.busy = false
  }
}

async function removeProduct(product: ProductDto) {
  if (
    !window.confirm(
      `Xóa sản phẩm #${product.id} - ${product.productName ?? ''}?`,
    )
  ) {
    return
  }

  errorMessage.value = ''

  try {
    const result = await deleteProduct(product.id)
    updateResponsePreview(result)
    infoMessage.value = 'Đã xóa sản phẩm.'
    await loadProducts()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể xóa sản phẩm'
  }
}

async function inspectProduct(product: ProductDto) {
  errorMessage.value = ''

  try {
    const detail = await getProductById(product.id)
    updateResponsePreview(detail)
    selectedProductId.value = detail.id
    infoMessage.value = `Đã tải chi tiết sản phẩm #${product.id}.`
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không thể lấy chi tiết sản phẩm'
  }
}

function openCreateDialog() {
  editor.mode = 'create'
  editor.form = createEmptyProductForm()
  editor.open = true
}

function openEditDialog(product: ProductDto) {
  editor.mode = 'edit'
  editor.form = {
    productName: product.productName ?? '',
    description: product.description ?? '',
    price: product.price ?? null,
    stock: product.stock ?? null,
    category: product.category ?? '',
    sku: product.sku ?? '',
    status: product.status ?? 'Active',
  }
  selectedProductId.value = product.id
  editor.open = true
}

function closeEditor() {
  editor.open = false
}

function setSelectedProduct(product?: ProductDto | null) {
  selectedProductId.value = product?.id ?? null
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

async function updateProduct(payload: UpdateProductPayload): Promise<ProductDto> {
  const response = await fetch(`${getProductApiBaseUrl()}/products/${payload.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  const result = await response.json()
  return result.data ?? result
}

onMounted(() => {
  loadProducts()
})
</script>

<template>
  <main class="dashboard-shell users-view">
    <section class="hero-card">
      <div class="hero-copy">
        <div>
          <p class="eyebrow">Product Management</p>
          <h1 class="hero-title">Quản lý sản phẩm</h1>
        </div>

        <div class="hero-actions">
          <button class="primary-button" type="button" @click="openCreateDialog">
            Tạo sản phẩm
          </button>
          <button class="secondary-button" type="button" @click="loadProducts">
            {{ loading ? 'Đang làm mới...' : 'Làm mới dữ liệu' }}
          </button>
        </div>
      </div>

      <div class="mini-banner">
        <span class="mini-label">Product API</span>
        <strong>{{ getProductApiBaseUrl() }}</strong>
      </div>

      <div class="hero-metrics">
        <article v-for="stat in productStats" :key="stat.label" class="stat-card">
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
        <label for="product-search">Tìm sản phẩm</label>
        <input
          id="product-search"
          v-model="searchQuery"
          type="text"
          placeholder="Nhập tên, SKU, danh mục hoặc giá..."
        />
      </div>

      <div class="filter-field">
        <label for="mode-filter">Lọc theo</label>
        <select id="mode-filter" v-model="searchMode">
          <option value="all">Tất cả</option>
          <option value="productName">Tên sản phẩm</option>
          <option value="sku">SKU</option>
          <option value="category">Danh mục</option>
          <option value="price">Giá</option>
        </select>
      </div>
    </section>

    <section class="content-grid">
      <div class="orders-column">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Danh sách sản phẩm</p>
            <h2>{{ visibleProducts.length }} sản phẩm phù hợp</h2>
          </div>
          <span class="count-pill">{{ products.length }} tổng sản phẩm</span>
        </div>

        <div v-if="loading" class="state-card">Đang tải dữ liệu...</div>
        <div v-else-if="!visibleProducts.length" class="state-card">
          Không có sản phẩm phù hợp với bộ lọc hiện tại.
        </div>

        <article
          v-for="product in visibleProducts"
          :key="product.id"
          class="order-card"
          :class="{ active: selectedProductId === product.id }"
          @click="setSelectedProduct(product)"
        >
          <div class="order-card-top">
            <div>
              <p class="order-id">#{{ product.id }}</p>
              <h3>{{ product.productName || 'Chưa có tên' }}</h3>
            </div>
            <span class="status-chip" :style="{ background: getStatusColor(product.status) }">
              {{ product.status || 'N/A' }}
            </span>
          </div>

          <div class="order-meta-grid">
            <div>
              <span>SKU</span>
              <strong>{{ product.sku || 'Chưa có' }}</strong>
            </div>
            <div>
              <span>Danh mục</span>
              <strong>{{ product.category || 'Chưa có' }}</strong>
            </div>
            <div>
              <span>Giá</span>
              <strong>{{ formatCurrency(product.price || 0) }}</strong>
            </div>
            <div>
              <span>Tồn kho</span>
              <strong :style="{ color: (product.stock || 0) < 10 ? '#f5a524' : '#23b987' }">
                {{ product.stock || 0 }} cái
              </strong>
            </div>
          </div>

          <div class="order-card-actions" @click.stop>
            <button class="ghost-button" type="button" @click="inspectProduct(product)">
              Chi tiết
            </button>
            <button class="secondary-button" type="button" @click="openEditDialog(product)">
              Sửa
            </button>
            <button class="danger-button" type="button" @click="removeProduct(product)">
              Xóa
            </button>
          </div>
        </article>
      </div>

      <aside class="detail-column">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Chi tiết đang chọn</p>
            <h2>Thông tin sản phẩm</h2>
          </div>
        </div>

        <div v-if="selectedProduct" class="detail-card">
          <div class="detail-top">
            <div>
              <p class="detail-label">Sản phẩm #{{ selectedProduct.id }}</p>
              <h3>{{ selectedProduct.productName || 'Chưa có tên' }}</h3>
              <p class="detail-subtext">{{ selectedProduct.sku || 'Chưa có SKU' }}</p>
            </div>
            <span
              class="status-chip"
              :style="{ background: getStatusColor(selectedProduct.status) }"
            >
              {{ selectedProduct.status || 'N/A' }}
            </span>
          </div>

          <dl class="detail-grid">
            <div>
              <dt>Tên sản phẩm</dt>
              <dd>{{ selectedProduct.productName || 'Chưa có' }}</dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd>{{ selectedProduct.sku || 'Chưa có' }}</dd>
            </div>
            <div>
              <dt>Danh mục</dt>
              <dd>{{ selectedProduct.category || 'Chưa có' }}</dd>
            </div>
            <div>
              <dt>Giá bán</dt>
              <dd>{{ formatCurrency(selectedProduct.price || 0) }}</dd>
            </div>
            <div>
              <dt>Tồn kho</dt>
              <dd
                :style="{ color: (selectedProduct.stock || 0) < 10 ? '#f5a524' : '#23b987' }"
              >
                {{ selectedProduct.stock || 0 }} cái
              </dd>
            </div>
            <div>
              <dt>Cập nhật</dt>
              <dd>{{ formatDateTime(selectedProduct.lastModified) }}</dd>
            </div>
          </dl>

          <div class="detail-list compact-list">
            <div>
              <dt>Mô tả</dt>
              <dd>{{ selectedProduct.description || 'Chưa có mô tả' }}</dd>
            </div>
          </div>

          <div class="order-card-actions">
            <button class="secondary-button" type="button" @click="openEditDialog(selectedProduct)">
              Sửa sản phẩm
            </button>
            <button class="danger-button" type="button" @click="removeProduct(selectedProduct)">
              Xóa sản phẩm
            </button>
          </div>
        </div>

        <div v-else class="state-card">
          Chọn một sản phẩm trong danh sách để xem hồ sơ chi tiết và thao tác nhanh.
        </div>

        <div class="panel response-panel">
          <div class="panel-heading">
            <div>
              <p class="panel-kicker">API Response</p>
              <h3>Phản hồi API</h3>
            </div>
          </div>
          <pre>{{ responsePreview || 'Chưa có phản hồi API.' }}</pre>
        </div>
      </aside>
    </section>

    <transition name="modal-fade">
      <div v-if="editor.open" class="modal-backdrop" @click.self="closeEditor">
        <section class="modal-card">
          <header class="modal-header">
            <div>
              <p class="panel-kicker">
                {{ editor.mode === 'create' ? 'Tạo sản phẩm mới' : 'Chỉnh sửa sản phẩm' }}
              </p>
              <h2>
                {{
                  editor.mode === 'create'
                    ? 'Nhập thông tin sản phẩm'
                    : `Chỉnh sửa sản phẩm #${selectedProduct?.id ?? ''}`
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
                <span>Tên sản phẩm (bắt buộc)</span>
                <input v-model="editor.form.productName" type="text" />
              </label>

              <label class="field">
                <span>SKU</span>
                <input v-model="editor.form.sku" type="text" />
              </label>

              <label class="field">
                <span>Giá (bắt buộc)</span>
                <input v-model.number="editor.form.price" type="number" min="0" step="1000" />
              </label>

              <label class="field">
                <span>Tồn kho (bắt buộc)</span>
                <input v-model.number="editor.form.stock" type="number" min="0" />
              </label>

              <label class="field">
                <span>Danh mục</span>
                <input v-model="editor.form.category" type="text" />
              </label>

              <label class="field">
                <span>Trạng thái</span>
                <select v-model="editor.form.status">
                  <option
                    v-for="option in statusOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label class="field full-span">
                <span>Mô tả</span>
                <textarea v-model="editor.form.description" rows="4"></textarea>
              </label>
            </div>

            <p v-if="productValidationMessage" class="validation-text">
              {{ productValidationMessage }}
            </p>

            <footer class="modal-footer">
              <button class="secondary-button" type="button" @click="closeEditor">
                Hủy
              </button>
              <button
                class="primary-button"
                type="submit"
                :disabled="editor.busy || !productCanSubmit"
              >
                {{
                  editor.busy
                    ? 'Đang lưu...'
                    : editor.mode === 'create'
                      ? 'Tạo sản phẩm'
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
.response-panel {
  margin-top: 2rem;
}

.response-panel pre {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 1rem;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
