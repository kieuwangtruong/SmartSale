<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import { formatCurrency } from '../services/orderApi'
import { getSuppliers, type Supplier } from '../services/orderApi'
import {
  createCategory,
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
  type Category,
  type Product,
  type ProductPayload,
} from '../services/productApi'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'
import { useToast } from 'primevue/usetoast'

const auth = useAuthStore()
const canManageProducts = computed(
  () => auth.role === 'Admin' || auth.role === 'WarehouseKeeper',
)
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const suppliers = ref<Supplier[]>([])
const search = ref('')
const error = ref('')
const editingId = ref<number | null>(null)
const categoryName = ref('')
const { t } = useLanguage()
const toast = useToast()
const detailImageCount = 4

function showError(msg: string) {
  toast.add({
    severity: 'error',
    summary: t('Lá»—i', 'Error'),
    detail: msg,
    life: 5000,
  })
}

const form = reactive<ProductPayload>({
  name: '',
  description: '',
  importPrice: 0,
  sellingPrice: 0,
  originalPrice: null,
  salePrice: null,
  imageUrl: '',
  imageUrls: [],
  categoryId: 0,
  quantity: 0,
  reserveStock: 0,
  supplierId: 0,
})

const detailImageUrls = ref(createEmptyDetailImages())
const showProductModal = ref(false)
const showCategoryModal = ref(false)
const showAddMenu = ref(false)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = 10

function toggleAddMenu() {
  showAddMenu.value = !showAddMenu.value
}

function openAddProduct() {
  showAddMenu.value = false
  reset()
  showProductModal.value = true
}

function openAddCategory() {
  showAddMenu.value = false
  categoryName.value = ''
  showCategoryModal.value = true
}

// Filter logic
const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? products.value : products.value.filter((p) =>
    [p.name, p.categoryName, String(p.id)].some((value) => value.toLowerCase().includes(q)),
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

const categoryOptions = computed(() => [
  { label: t('Chá»n danh má»¥c', 'Select category'), value: 0 },
  ...categories.value.map((c) => ({ label: c.name, value: c.id })),
])
const supplierOptions = computed(() => [
  { label: t('Chá»n nhÃ  cung cáº¥p', 'Select supplier'), value: 0 },
  ...suppliers.value.map((s) => ({ label: s.name, value: s.id })),
])

// Status display
const paginationInfo = computed(() => {
  const total = filtered.value.length
  if (total === 0) return ''
  const start = (currentPage.value - 1) * itemsPerPage + 1
  const end = Math.min(currentPage.value * itemsPerPage, total)
  return t(`Hiá»ƒn thá»‹ ${start}-${end} trong tá»•ng sá»‘ ${total} má»¥c`, `Showing ${start}-${end} of ${total} items`)
})

// Reset to page 1 when search changes
watch(search, () => {
  currentPage.value = 1
})

// Fix potential typescript strict mode issue
function createEmptyDetailImages() {
  return Array.from({ length: detailImageCount }, () => '')
}

function reset() {
  editingId.value = null
  showProductModal.value = false
  showCategoryModal.value = false
  detailImageUrls.value = createEmptyDetailImages()
  Object.assign(form, {
    name: '',
    description: '',
    importPrice: 0,
    sellingPrice: 0,
    originalPrice: null,
    salePrice: null,
    imageUrl: '',
    imageUrls: [],
    categoryId: 0,
    supplierId: 0,
    quantity: 0,
    reserveStock: 0,
  })
}
async function load() {
  try {
    const requests: [Promise<Product[]>, Promise<Category[]>, Promise<Supplier[] | null>] = [
      getProducts(),
      getCategories(),
      canManageProducts.value ? getSuppliers() : Promise.resolve(null),
    ]
    const [productData, categoryData, supplierData] = await Promise.all(requests)
    products.value = productData
    categories.value = categoryData
    suppliers.value = supplierData ?? []
  }
  catch (e) { showError(e instanceof Error ? e.message : t('KhÃ´ng thá»ƒ táº£i sáº£n pháº©m.', 'Unable to load products.')) }
}
function edit(p: Product) {
  editingId.value = p.id
  const imageUrls = (p.imageUrls?.length ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [])
    .slice(0, detailImageCount)
  detailImageUrls.value = [
    ...imageUrls,
    ...Array.from({ length: Math.max(detailImageCount - imageUrls.length, 0) }, () => ''),
  ]
  Object.assign(form, {
    name: p.name,
    description: p.description || '',
    importPrice: p.importPrice,
    sellingPrice: p.sellingPrice,
    originalPrice: p.originalPrice ?? null,
    salePrice: p.salePrice ?? null,
    imageUrl: p.imageUrl || '',
    imageUrls: detailImageUrls.value,
    categoryId: p.categoryId,
    supplierId: p.supplierId,
    quantity: p.quantity,
    reserveStock: p.reserveStock,
  })
  showProductModal.value = true
}

function normalizeDetailImages(imageUrls: string[]) {
  return imageUrls
    .map((url) => url.trim())
    .filter(Boolean)
    .filter((url, index, urls) => urls.findIndex((item) => item.toLowerCase() === url.toLowerCase()) === index)
}

function buildProductPayload(): ProductPayload {
  return {
    ...form,
    imageUrls: normalizeDetailImages(detailImageUrls.value),
  }
}

async function save() {
  try {
    const payload = buildProductPayload()
    if (editingId.value) await updateProduct(editingId.value, payload)
    else await createProduct(payload)
    reset(); await load()
  } catch (e) { showError(e instanceof Error ? e.message : t('KhÃ´ng thá»ƒ lÆ°u sáº£n pháº©m.', 'Unable to save product.')) }
}
async function addCategory() {
  if (!categoryName.value.trim()) return
  try {
    await createCategory({ name: categoryName.value.trim(), parentCategoryId: null })
    categoryName.value = ''
    showCategoryModal.value = false
    await load()
  } catch (e) { showError(e instanceof Error ? e.message : t('KhÃ´ng thá»ƒ táº¡o danh má»¥c.', 'Unable to create category.')) }
}
async function remove(p: Product) {
  if (!confirm(t(`XÃ³a sáº£n pháº©m ${p.name}?`, `Delete product ${p.name}?`))) return
  try { await deleteProduct(p.id); await load() } catch (e) { showError(e instanceof Error ? e.message : t('KhÃ´ng thá»ƒ xÃ³a.', 'Unable to delete.')) }
}
onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>{{ t('Sáº£n pháº©m', 'Products') }}</h2>
        <p>{{ t('Danh má»¥c, giÃ¡ nháº­p, giÃ¡ bÃ¡n vÃ  tá»“n kho ban Ä‘áº§u.', 'Categories, import prices, selling prices and initial inventory.') }}</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" :placeholder="t('TÃ¬m sáº£n pháº©m...', 'Search products...')" class="search-input" />
        
        <div v-if="canManageProducts" class="add-dropdown-container">
          <button type="button" class="primary" @click="toggleAddMenu">
            <i class="pi pi-plus" /> {{ t('ThÃªm má»›i', 'Add new') }} <i class="pi pi-angle-down" />
          </button>
          <div v-if="showAddMenu" class="add-dropdown-menu">
            <a href="#" @click.prevent="openAddProduct">{{ t('ThÃªm sáº£n pháº©m', 'Add product') }}</a>
            <a href="#" @click.prevent="openAddCategory">{{ t('ThÃªm danh má»¥c', 'Add category') }}</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Product modal dialog -->
    <div v-if="showProductModal" class="modal-backdrop" @click="reset" />
    <aside v-if="showProductModal" class="admin-modal" :aria-label="t('Biá»ƒu máº«u sáº£n pháº©m', 'Product form')">
      <div class="modal-head">
        <h2>{{ editingId ? t('Cáº­p nháº­t sáº£n pháº©m', 'Update Product') : t('ThÃªm sáº£n pháº©m', 'Add Product') }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="save">
        <div class="form-row" v-if="editingId">
          <label>{{ t('ID sáº£n pháº©m', 'Product ID') }}<input :value="editingId" disabled /></label>
          <label>{{ t('TÃªn sáº£n pháº©m', 'Product Name') }}<input v-model="form.name" required /></label>
        </div>
        <label v-else>{{ t('TÃªn sáº£n pháº©m', 'Product Name') }}<input v-model="form.name" required /></label>
        <label>{{ t('Mô tả sản phẩm', 'Product Description') }}
          <textarea
            v-model="form.description"
            rows="3"
            :placeholder="t('Nhập mô tả ngắn cho sản phẩm', 'Enter a short product description')"
          />
        </label>

        <div class="form-row">
          <label>{{ t('Danh má»¥c', 'Category') }}
            <SearchableSelect v-model="form.categoryId" :options="categoryOptions" :placeholder="t('TÃ¬m danh má»¥c...', 'Search categories...')" />
          </label>
          <label>{{ t('NhÃ  cung cáº¥p', 'Supplier') }}
            <SearchableSelect v-model="form.supplierId" :options="supplierOptions" :placeholder="t('TÃ¬m nhÃ  cung cáº¥p...', 'Search suppliers...')" />
          </label>
        </div>

        <div class="form-row">
          <label>{{ t('GiÃ¡ nháº­p (VND)', 'Import Price (VND)') }}<input v-model.number="form.importPrice" type="number" min="0" /></label>
          <label>{{ t('GiÃ¡ bÃ¡n hiá»‡n táº¡i (VND)', 'Current Selling Price (VND)') }}<input v-model.number="form.sellingPrice" type="number" min="0" /></label>
        </div>

        <div class="form-row">
          <label>{{ t('GiÃ¡ gá»‘c (Ä‘á»ƒ gáº¡ch ngang)', 'Original Price (for strikethrough)') }}<input v-model.number="form.originalPrice" type="number" min="0" :placeholder="t('Chá»‰ nháº­p khi giáº£m giÃ¡', 'Only enter when discounted')" /></label>
          <label>{{ t('GiÃ¡ khuyáº¿n mÃ£i (sale)', 'Sale Price') }}<input v-model.number="form.salePrice" type="number" min="0" :placeholder="t('Chá»‰ nháº­p khi giáº£m giÃ¡', 'Only enter when discounted')" /></label>
        </div>

        <div class="form-row">
          <label>{{ t('Tá»“n kho ban Ä‘áº§u', 'Initial Stock') }}<input v-model.number="form.quantity" type="number" min="0" /></label>
          <label>{{ t('NgÆ°á»¡ng cáº£nh bÃ¡o', 'Alert Threshold') }}<input v-model.number="form.reserveStock" type="number" min="0" /></label>
        </div>

        <label>{{ t('áº¢nh URL', 'Image URL') }}<input v-model="form.imageUrl" placeholder="https://..." /></label>
        <section class="detail-image-editor">
          <div class="detail-image-editor-head">
            <strong>{{ t('Ảnh chi tiết sản phẩm', 'Product Detail Images') }}</strong>
            <span>{{ t('4 ảnh cho phần chi tiết', '4 images for product detail') }}</span>
          </div>
          <div
            v-for="(_, index) in detailImageUrls"
            :key="index"
            class="detail-image-row"
          >
            <div class="detail-image-preview">
              <img v-if="detailImageUrls[index]" :src="detailImageUrls[index]" :alt="`Ảnh ${index + 1}`" />
              <i v-else class="pi pi-image" />
            </div>
            <label>
              {{ t(`Ảnh ${index + 1}`, `Image ${index + 1}`) }}
              <input v-model="detailImageUrls[index]" placeholder="https://..." />
            </label>
          </div>
        </section>

        <div class="actions">
          <button class="primary">{{ t('LÆ°u sáº£n pháº©m', 'Save Product') }}</button>
          <button type="button" @click="reset">{{ t('Há»§y', 'Cancel') }}</button>
        </div>
      </form>
    </aside>

    <!-- Category modal dialog -->
    <div v-if="showCategoryModal" class="modal-backdrop" @click="reset" />
    <aside v-if="showCategoryModal" class="admin-modal" :aria-label="t('Biá»ƒu máº«u danh má»¥c', 'Category form')">
      <div class="modal-head">
        <h2>{{ t('ThÃªm danh má»¥c má»›i', 'Add New Category') }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="addCategory">
        <label>{{ t('TÃªn danh má»¥c má»›i', 'New Category Name') }}<input v-model="categoryName" :placeholder="t('Danh má»¥c má»›i', 'New Category')" required /></label>
        <div class="actions"><button class="primary">{{ t('ThÃªm', 'Add') }}</button><button type="button" @click="reset">{{ t('Há»§y', 'Cancel') }}</button></div>
      </form>
    </aside>

    <!-- Full width table -->
    <article class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>{{ t('Sáº£n pháº©m', 'Product') }}</th>
            <th>{{ t('Mô tả', 'Description') }}</th>
            <th>{{ t('Danh má»¥c', 'Category') }}</th>
            <th>{{ t('NhÃ  cung cáº¥p', 'Supplier') }}</th>
            <th>{{ t('GiÃ¡ bÃ¡n', 'Price') }}</th>
            <th>{{ t('Tá»“n kho', 'Stock') }}</th>
            <th>{{ t('HÃ nh Ä‘á»™ng', 'Actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in visible" :key="p.id">
            <td>{{ p.name }}<small>ID: #{{ p.id }}</small></td>
            <td class="product-description">{{ p.description || t('Chưa có mô tả', 'No description') }}</td>
            <td>{{ p.categoryName }}</td>
            <td>{{ p.supplierName }}</td>
            <td>{{ formatCurrency(p.sellingPrice) }}</td>
            <td>
              <span :class="{ warning: p.quantity <= p.reserveStock }">
                {{ p.quantity }} / {{ p.reserveStock }}
              </span>
            </td>
            <td class="actions">
              <button v-if="canManageProducts" @click="edit(p)">{{ t('Sá»­a', 'Edit') }}</button>
              <button v-if="auth.role === 'Admin'" class="danger" @click="remove(p)">{{ t('XÃ³a', 'Delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-footer">
        <span class="pagination-info">{{ paginationInfo }}</span>
        <div class="pagination-controls">
          <button 
            type="button" 
            :disabled="currentPage === 1"
            @click="currentPage = 1"
            :aria-label="t('Vá» Ä‘áº§u', 'To beginning')"
            :title="t('Vá» Ä‘áº§u', 'To beginning')"
          >
            <i class="pi pi-chevron-double-left" />
          </button>
          <button 
            type="button" 
            :disabled="currentPage === 1"
            @click="currentPage--"
            :aria-label="t('Trang trÆ°á»›c', 'Previous page')"
          >
            <i class="pi pi-chevron-left" />
          </button>
          <span class="page-indicator">{{ t('Trang', 'Page') }} <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
          <button 
            type="button" 
            :disabled="currentPage === totalPages"
            @click="currentPage++"
            :aria-label="t('Trang sau', 'Next page')"
          >
            <i class="pi pi-chevron-right" />
          </button>
          <button 
            type="button" 
            :disabled="currentPage === totalPages"
            @click="currentPage = totalPages"
            :aria-label="t('Vá» cuá»‘i', 'To end')"
            :title="t('Vá» cuá»‘i', 'To end')"
          >
            <i class="pi pi-chevron-double-right" />
          </button>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.warning { color: #d97706; }

.product-description {
  max-width: 260px;
  color: #64748b;
  line-height: 1.45;
  white-space: normal;
}

.app-dark .product-description {
  color: #cbd5e1;
}

.detail-image-editor {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.03);
}

.detail-image-editor-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #0f172a;
}

.detail-image-editor-head span {
  color: #64748b;
  font-size: 13px;
}

.detail-image-row {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 12px;
  align-items: center;
}

.detail-image-preview {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid #dbe4ef;
  border-radius: 12px;
  background: #f8fafc;
  color: #94a3b8;
}

.detail-image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-dark .detail-image-editor {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.35);
}

.app-dark .detail-image-editor-head {
  color: #e2e8f0;
}

.app-dark .detail-image-editor-head span {
  color: #94a3b8;
}

.app-dark .detail-image-preview {
  border-color: rgba(148, 163, 184, 0.24);
  background: rgba(15, 23, 42, 0.55);
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
