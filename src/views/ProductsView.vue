<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import { formatCurrency } from '../services/orderApi'
import { getSuppliers, type Supplier } from '../services/orderApi'
import {
  createCategory,
  createProduct,
  createProductVariant,
  createVariantColor,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
  updateProductVariant,
  updateVariantColor,
  type Category,
  type Product,
  type ProductImageItem,
  type ProductPayload,
  type ProductVariant,
  type ProductVariantColor,
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
const editingId = ref<number | null>(null)
const categoryName = ref('')
const { t } = useLanguage()
const toast = useToast()
const detailImageCount = 4

function showError(msg: string) {
  toast.add({
    severity: 'error',
    summary: t('Lỗi', 'Error'),
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
const variantProduct = ref<Product | null>(null)
const editingVariantId = ref<number | null>(null)
const editingColorId = ref<number | null>(null)
const variantForm = reactive({ name: '', sku: '', originalPrice: 0, salePrice: null as number | null, quantity: 0, reserveStock: 0, isActive: true })
const colorForm = reactive({ name: '', hexCode: '', quantity: 0, isActive: true, imageUrls: ['', '', '', ''] })

function openVariantManager(product: Product) {
  variantProduct.value = product
  resetVariantForm()
}

function resetVariantForm() {
  editingVariantId.value = null
  editingColorId.value = null
  Object.assign(variantForm, { name: '', sku: '', originalPrice: 0, salePrice: null, quantity: 0, reserveStock: 0, isActive: true })
  Object.assign(colorForm, { name: '', hexCode: '', quantity: 0, isActive: true, imageUrls: ['', '', '', ''] })
}

function editVariant(variant: ProductVariant) {
  editingVariantId.value = variant.id
  editingColorId.value = null
  Object.assign(variantForm, { name: variant.name, sku: variant.sku, originalPrice: variant.originalPrice,
    salePrice: variant.salePrice ?? null, quantity: variant.quantity, reserveStock: variant.reserveStock, isActive: variant.isActive })
}

function editColor(color: ProductVariantColor) {
  editingColorId.value = color.id
  Object.assign(colorForm, { name: color.name, hexCode: color.hexCode ?? '', quantity: color.quantity,
    isActive: color.isActive, imageUrls: [...color.images.map((image) => image.imageUrl), '', '', '', ''].slice(0, 4) })
}

async function saveVariant() {
  if (!variantProduct.value) return
  try {
    if (editingVariantId.value) await updateProductVariant(editingVariantId.value, variantForm)
    else await createProductVariant(variantProduct.value.id, variantForm)
    await reloadVariantProduct()
    resetVariantForm()
  } catch (e) { showError(e instanceof Error ? e.message : t('Không thể lưu phiên bản.', 'Unable to save variant.')) }
}

async function saveColor(variantId: number) {
  try {
    const payload = { ...colorForm, hexCode: colorForm.hexCode || null, imageUrls: colorForm.imageUrls.map((url) => url.trim()).filter(Boolean) }
    if (editingColorId.value) await updateVariantColor(editingColorId.value, payload)
    else await createVariantColor(variantId, payload)
    await reloadVariantProduct()
    editingColorId.value = null
    Object.assign(colorForm, { name: '', hexCode: '', quantity: 0, isActive: true, imageUrls: ['', '', '', ''] })
  } catch (e) { showError(e instanceof Error ? e.message : t('Không thể lưu màu sắc.', 'Unable to save color.')) }
}

async function reloadVariantProduct() {
  const id = variantProduct.value?.id
  await load()
  variantProduct.value = products.value.find((product) => product.id === id) ?? null
}

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
  { label: t('Chọn danh mục', 'Select category'), value: 0 },
  ...categories.value.map((c) => ({ label: c.name, value: c.id })),
])
const supplierOptions = computed(() => [
  { label: t('Chọn nhà cung cấp', 'Select supplier'), value: 0 },
  ...suppliers.value.map((s) => ({ label: s.name, value: s.id })),
])

// Status display
const paginationInfo = computed(() => {
  const total = filtered.value.length
  if (total === 0) return ''
  const start = (currentPage.value - 1) * itemsPerPage + 1
  const end = Math.min(currentPage.value * itemsPerPage, total)
  return t(`Hiển thị ${start}-${end} trong tổng số ${total} mục`, `Showing ${start}-${end} of ${total} items`)
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
  catch (e) { showError(e instanceof Error ? e.message : t('Không thể tải sản phẩm.', 'Unable to load products.')) }
}
function edit(p: Product) {
  editingId.value = p.id
  const imageItems = (p.imageItems?.length
    ? p.imageItems
    : (p.imageUrls?.length ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [])
      .map((imageUrl) => ({ imageUrl })))
    .slice(0, detailImageCount)
  const imageUrls = imageItems.map((item) => item.imageUrl)
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

function normalizeDetailImageItems(): ProductImageItem[] {
  const seen = new Set<string>()
  return detailImageUrls.value
    .map((url) => ({
      imageUrl: url.trim(),
    }))
    .filter((item) => {
      if (!item.imageUrl) return false
      const key = item.imageUrl.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function buildProductPayload(): ProductPayload {
  const imageItems = normalizeDetailImageItems()
  return {
    ...form,
    imageUrls: imageItems.length
      ? imageItems.map((item) => item.imageUrl)
      : normalizeDetailImages(detailImageUrls.value),
    imageItems,
  }
}

async function save() {
  try {
    const payload = buildProductPayload()
    if (editingId.value) await updateProduct(editingId.value, payload)
    else await createProduct(payload)
    reset(); await load()
  } catch (e) { showError(e instanceof Error ? e.message : t('Không thể lưu sản phẩm.', 'Unable to save product.')) }
}
async function addCategory() {
  if (!categoryName.value.trim()) return
  try {
    await createCategory({ name: categoryName.value.trim(), parentCategoryId: null })
    categoryName.value = ''
    showCategoryModal.value = false
    await load()
  } catch (e) { showError(e instanceof Error ? e.message : t('Không thể tạo danh mục.', 'Unable to create category.')) }
}
async function remove(p: Product) {
  if (!confirm(t(`Xóa sản phẩm ${p.name}?`, `Delete product ${p.name}?`))) return
  try { await deleteProduct(p.id); await load() } catch (e) { showError(e instanceof Error ? e.message : t('Không thể xóa.', 'Unable to delete.')) }
}
onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>{{ t('Sản phẩm', 'Products') }}</h2>
        <p>{{ t('Danh mục, giá nhập, giá bán và tồn kho ban đầu.', 'Categories, import prices, selling prices and initial inventory.') }}</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" :placeholder="t('Tìm sản phẩm...', 'Search products...')" class="search-input" />
        
        <div v-if="canManageProducts" class="add-dropdown-container">
          <button type="button" class="primary" @click="toggleAddMenu">
            <i class="pi pi-plus" /> {{ t('Thêm mới', 'Add new') }} <i class="pi pi-angle-down" />
          </button>
          <div v-if="showAddMenu" class="add-dropdown-menu">
            <a href="#" @click.prevent="openAddProduct">{{ t('Thêm sản phẩm', 'Add product') }}</a>
            <a href="#" @click.prevent="openAddCategory">{{ t('Thêm danh mục', 'Add category') }}</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Product modal dialog -->
    <div v-if="showProductModal" class="modal-backdrop" @click="reset" />
    <aside v-if="showProductModal" class="admin-modal" :aria-label="t('Biểu mẫu sản phẩm', 'Product form')">
      <div class="modal-head">
        <h2>{{ editingId ? t('Cập nhật sản phẩm', 'Update Product') : t('Thêm sản phẩm', 'Add Product') }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="save">
        <div class="form-row" v-if="editingId">
          <label>{{ t('ID sản phẩm', 'Product ID') }}<input :value="editingId" disabled /></label>
          <label>{{ t('Tên sản phẩm', 'Product Name') }}<input v-model="form.name" required /></label>
        </div>
        <label v-else>{{ t('Tên sản phẩm', 'Product Name') }}<input v-model="form.name" required /></label>
        <label>{{ t('Mô tả sản phẩm', 'Product Description') }}
          <textarea
            v-model="form.description"
            rows="3"
            :placeholder="t('Nhập mô tả ngắn cho sản phẩm', 'Enter a short product description')"
          />
        </label>

        <div class="form-row">
          <label>{{ t('Danh mục', 'Category') }}
            <SearchableSelect v-model="form.categoryId" :options="categoryOptions" :placeholder="t('Tìm danh mục...', 'Search categories...')" />
          </label>
          <label>{{ t('Nhà cung cấp', 'Supplier') }}
            <SearchableSelect v-model="form.supplierId" :options="supplierOptions" :placeholder="t('Tìm nhà cung cấp...', 'Search suppliers...')" />
          </label>
        </div>

        <div class="form-row">
          <label>{{ t('Giá nhập (VND)', 'Import Price (VND)') }}<input v-model.number="form.importPrice" type="number" min="0" /></label>
          <label>{{ t('Giá bán hiện tại (VND)', 'Current Selling Price (VND)') }}<input v-model.number="form.sellingPrice" type="number" min="0" /></label>
        </div>

        <div class="form-row">
          <label>{{ t('Giá gốc (để gạch ngang)', 'Original Price (for strikethrough)') }}<input v-model.number="form.originalPrice" type="number" min="0" :placeholder="t('Chỉ nhập khi giảm giá', 'Only enter when discounted')" /></label>
          <label>{{ t('Giá khuyến mãi (sale)', 'Sale Price') }}<input v-model.number="form.salePrice" type="number" min="0" :placeholder="t('Chỉ nhập khi giảm giá', 'Only enter when discounted')" /></label>
        </div>

        <div class="form-row">
          <label>{{ t('Tồn kho ban đầu', 'Initial Stock') }}<input v-model.number="form.quantity" type="number" min="0" /></label>
          <label>{{ t('Ngưỡng cảnh báo', 'Alert Threshold') }}<input v-model.number="form.reserveStock" type="number" min="0" /></label>
        </div>

        <label>{{ t('Ảnh URL', 'Image URL') }}<input v-model="form.imageUrl" placeholder="https://..." /></label>
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
          <button class="primary">{{ t('Lưu sản phẩm', 'Save Product') }}</button>
          <button type="button" @click="reset">{{ t('Hủy', 'Cancel') }}</button>
        </div>
      </form>
    </aside>

    <!-- Category modal dialog -->
    <div v-if="showCategoryModal" class="modal-backdrop" @click="reset" />
    <aside v-if="showCategoryModal" class="admin-modal" :aria-label="t('Biểu mẫu danh mục', 'Category form')">
      <div class="modal-head">
        <h2>{{ t('Thêm danh mục mới', 'Add New Category') }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="addCategory">
        <label>{{ t('Tên danh mục mới', 'New Category Name') }}<input v-model="categoryName" :placeholder="t('Danh mục mới', 'New Category')" required /></label>
        <div class="actions"><button class="primary">{{ t('Thêm', 'Add') }}</button><button type="button" @click="reset">{{ t('Hủy', 'Cancel') }}</button></div>
      </form>
    </aside>

    <!-- Full width table -->
    <article class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>{{ t('Sản phẩm', 'Product') }}</th>
            <th>{{ t('Mô tả', 'Description') }}</th>
            <th>{{ t('Danh mục', 'Category') }}</th>
            <th>{{ t('Nhà cung cấp', 'Supplier') }}</th>
            <th>{{ t('Giá bán', 'Price') }}</th>
            <th>{{ t('Tồn kho', 'Stock') }}</th>
            <th>{{ t('Hành động', 'Actions') }}</th>
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
              <button v-if="canManageProducts" @click="edit(p)">{{ t('Sửa', 'Edit') }}</button>
              <button v-if="canManageProducts" class="danger" @click="remove(p)">{{ t('Xóa', 'Delete') }}</button>
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
            :aria-label="t('Về đầu', 'To beginning')"
            :title="t('Về đầu', 'To beginning')"
          >
            <i class="pi pi-chevron-double-left" />
          </button>
          <button 
            type="button" 
            :disabled="currentPage === 1"
            @click="currentPage--"
            :aria-label="t('Trang trước', 'Previous page')"
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
            :aria-label="t('Về cuối', 'To end')"
            :title="t('Về cuối', 'To end')"
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
