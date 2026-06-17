<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import { formatCurrency, getSuppliers, type Supplier } from '../services/orderApi'
import {
  cancelStockReceipt,
  confirmStockReceipt,
  createStockReceipt,
  getLowStock,
  getProducts,
  getStockReceipts,
  submitStockReceipt,
  updateInventory,
  type Product,
  type StockReceipt,
} from '../services/productApi'
import { useLanguage } from '../services/i18n'
import { useToast } from 'primevue/usetoast'

const products = ref<Product[]>([])
const suppliers = ref<Supplier[]>([])
const receipts = ref<StockReceipt[]>([])
const lowStock = ref<Array<{ productId: number; productName: string; quantity: number; reserveStock: number }>>([])
const error = ref('')
const inventoryDraft = reactive<Record<number, { quantity: number; reserveStock: number }>>({})
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

const receipt = reactive({
  supplierId: 0,
  invoiceNumber: '',
  importDate: new Date().toISOString().slice(0, 10),
  note: '',
  items: [{ productId: 0, quantity: 1, importPrice: 0 }],
})

const search = ref('')
const showReceiptForm = ref(false)

// Pagination state
const currentPage = ref(1)
const itemsPerPage = 10

const inventoryValue = computed(() => products.value.reduce((sum, p) => sum + p.importPrice * p.quantity, 0))

const supplierOptions = computed(() => [
  { label: t('Chọn nhà cung cấp', 'Select supplier'), value: 0 },
  ...suppliers.value.map((s) => ({ label: s.name, value: s.id })),
])

const productOptions = computed(() => [
  { label: t('Chọn sản phẩm', 'Select product'), value: 0 },
  ...products.value.map((p) => ({ label: p.name, value: p.id })),
])

const filteredProducts = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? products.value : products.value.filter((p) =>
    p.name.toLowerCase().includes(q) || String(p.id).includes(q)
  )
})

// Pagination calculations
const totalPages = computed(() => {
  return Math.ceil(filteredProducts.value.length / itemsPerPage) || 1
})

const visibleProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredProducts.value.slice(start, start + itemsPerPage)
})

// Status display
const paginationInfo = computed(() => {
  const total = filteredProducts.value.length
  if (total === 0) return ''
  const start = (currentPage.value - 1) * itemsPerPage + 1
  const end = Math.min(currentPage.value * itemsPerPage, total)
  return t(`Hiển thị ${start}-${end} trong tổng số ${total} mục`, `Showing ${start}-${end} of ${total} items`)
})

// Reset to page 1 when search changes
watch(search, () => {
  currentPage.value = 1
})

function resetReceipt() {
  showReceiptForm.value = false
  Object.assign(receipt, {
    supplierId: 0,
    invoiceNumber: '',
    importDate: new Date().toISOString().slice(0, 10),
    note: '',
    items: [{ productId: 0, quantity: 1, importPrice: 0 }],
  })
}

async function load() {
  error.value = ''
  try {
    ;[products.value, suppliers.value, receipts.value, lowStock.value] = await Promise.all([
      getProducts(), getSuppliers(), getStockReceipts(), getLowStock(),
    ])
    for (const p of products.value) {
      inventoryDraft[p.id] = { quantity: p.quantity, reserveStock: p.reserveStock }
    }
  } catch (e) { showError(e instanceof Error ? e.message : t('Không thể tải dữ liệu kho.', 'Unable to load warehouse data.')) }
}

async function saveInventory(product: Product) {
  const draft = inventoryDraft[product.id]
  if (!draft) return
  try {
    await updateInventory(product.id, product.quantity, draft.reserveStock)
    await load()
  } catch (e) {
    showError(e instanceof Error ? e.message : t('Không thể cập nhật ngưỡng tồn.', 'Unable to update stock threshold.'))
  }
}

// Helper methods for receipt items list
function addReceiptItem() { receipt.items.push({ productId: 0, quantity: 1, importPrice: 0 }) }
function removeReceiptItem(index: number) { if (receipt.items.length > 1) receipt.items.splice(index, 1) }

async function submitReceipt() {
  const items = receipt.items.filter((x) => x.productId && x.quantity > 0)
  if (!receipt.supplierId || !items.length) { showError(t('Chọn nhà cung cấp và sản phẩm nhập.', 'Please select supplier and products to import.')); return }
  try {
    await createStockReceipt({
      supplierId: receipt.supplierId,
      invoiceNumber: receipt.invoiceNumber,
      importDate: receipt.importDate,
      note: receipt.note,
      items,
    })
    resetReceipt()
    await load()
  } catch (e) { showError(e instanceof Error ? e.message : t('Không thể tạo phiếu nhập.', 'Unable to create import receipt.')) }
}

async function confirmReceipt(item: StockReceipt) {
  try { await confirmStockReceipt(item.id); await load() }
  catch (e) { showError(e instanceof Error ? e.message : t('Không thể xác nhận phiếu.', 'Unable to confirm receipt.')) }
}
async function submitReceiptForApproval(item: StockReceipt) {
  try { await submitStockReceipt(item.id); await load() }
  catch (e) { showError(e instanceof Error ? e.message : t('Không thể gửi duyệt phiếu.', 'Unable to submit receipt for approval.')) }
}
async function cancelReceipt(item: StockReceipt) {
  try { await cancelStockReceipt(item.id); await load() }
  catch (e) { showError(e instanceof Error ? e.message : t('Không thể hủy phiếu.', 'Unable to cancel receipt.')) }
}
onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>{{ t('Kho hàng', 'Warehouse') }}</h2>
        <p>{{ t('Điều chỉnh tồn, cảnh báo và nhập hàng từ nhà cung cấp.', 'Adjust stock, warnings and imports from suppliers.') }}</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" :placeholder="t('Tìm sản phẩm tồn kho...', 'Search inventory products...')" class="search-input" />
        <button type="button" class="primary" @click="showReceiptForm = true">
          <i class="pi pi-plus" /> {{ t('Tạo phiếu nhập', 'Create Import Receipt') }}
        </button>
      </div>
    </div>
    <div class="stats">
      <article><span>{{ t('Sản phẩm', 'Products') }}</span><strong>{{ products.length }}</strong></article>
      <article><span>{{ t('Sắp hết hàng', 'Low Stock') }}</span><strong>{{ lowStock.length }}</strong></article>
      <article><span>{{ t('Giá trị nhập kho', 'Import Value') }}</span><strong>{{ formatCurrency(inventoryValue) }}</strong></article>
      <article><span>{{ t('Phiếu nhập', 'Import Receipts') }}</span><strong>{{ receipts.length }}</strong></article>
    </div>

    <!-- Create Stock Receipt Modal -->
    <div v-if="showReceiptForm" class="modal-backdrop" @click="resetReceipt" />
    <aside v-if="showReceiptForm" class="admin-modal" :aria-label="t('Tạo phiếu nhập kho', 'Create import receipt')">
      <div class="modal-head">
        <h2>{{ t('Tạo phiếu nhập kho mới', 'Create New Import Receipt') }}</h2>
        <button type="button" @click="resetReceipt"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="submitReceipt">
        <label>{{ t('Nhà cung cấp', 'Supplier') }}
          <SearchableSelect v-model="receipt.supplierId" :options="supplierOptions" :placeholder="t('Tìm nhà cung cấp...', 'Search suppliers...')" />
        </label>
        <label>{{ t('Mã hóa đơn', 'Invoice Number') }}<input v-model="receipt.invoiceNumber" /></label>
        <label>{{ t('Ngày nhập', 'Import Date') }}<input v-model="receipt.importDate" type="date" /></label>
        <label>{{ t('Ghi chú', 'Note') }}<input v-model="receipt.note" /></label>
        
        <div class="form-section-title">{{ t('Danh sách mặt hàng nhập', 'Items to Import') }}</div>
        <div v-for="(item, index) in receipt.items" :key="index" class="receipt-item">
          <SearchableSelect v-model="item.productId" :options="productOptions" :placeholder="t('Tìm sản phẩm...', 'Search products...')" />
          <input v-model.number="item.quantity" type="number" min="1" placeholder="SL" />
          <input v-model.number="item.importPrice" type="number" min="0" :placeholder="t('Giá nhập', 'Import price')" />
          <button type="button" class="danger" @click="removeReceiptItem(index)"><i class="pi pi-trash" /></button>
        </div>
        <button type="button" class="add-row-btn" @click="addReceiptItem"><i class="pi pi-plus" /> {{ t('Thêm mặt hàng', 'Add Item') }}</button>

        <div class="actions">
          <button class="primary">{{ t('Tạo phiếu', 'Create Receipt') }}</button>
          <button type="button" @click="resetReceipt">{{ t('Hủy', 'Cancel') }}</button>
        </div>
      </form>
    </aside>

    <div class="full-width-tables-container">
      <article class="panel table-wrap">
        <h3>{{ t('Tồn kho', 'Inventory') }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ t('Sản phẩm', 'Product') }}</th>
              <th style="width: 140px;">{{ t('Tồn', 'Stock') }}</th>
              <th style="width: 140px;">{{ t('Ngưỡng', 'Threshold') }}</th>
              <th style="width: 100px;">{{ t('Hành động', 'Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in visibleProducts" :key="p.id">
              <td>{{ p.name }}<small>ID: #{{ p.id }}</small></td>
              <td><span v-if="inventoryDraft[p.id]" class="stock-readonly">{{ p.quantity }}</span></td>
              <td><input v-if="inventoryDraft[p.id]" v-model.number="inventoryDraft[p.id]!.reserveStock" type="number" min="0" class="table-number-input" /></td>
              <td><button class="primary table-save-btn" @click="saveInventory(p)">{{ t('Lưu ngưỡng', 'Save Threshold') }}</button></td>
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

      <article class="panel table-wrap" style="margin-top: 24px;">
        <h3>{{ t('Phiếu nhập kho', 'Import Receipts') }}</h3>
        <table>
          <thead>
            <tr>
              <th>{{ t('Mã', 'ID') }}</th>
              <th>{{ t('Nhà cung cấp', 'Supplier') }}</th>
              <th>{{ t('Chi tiết', 'Details') }}</th>
              <th>{{ t('Trạng thái', 'Status') }}</th>
              <th>{{ t('Hành động', 'Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in receipts" :key="item.id">
              <td>#{{ item.id }}<small>{{ new Date(item.createdAt).toLocaleString('vi-VN') }}</small></td>
              <td>{{ item.supplierName }}</td>
              <td>{{ item.items.map((x) => `${x.productName} x${x.quantity}`).join(', ') }}</td>
              <td>{{ item.status }}</td>
              <td class="actions">
                <button v-if="item.status === 'Draft'" class="primary" @click="submitReceiptForApproval(item)">{{ t('Gửi duyệt', 'Submit') }}</button>
                <button v-if="item.status === 'PendingApproval'" class="primary" @click="confirmReceipt(item)">{{ t('Duyệt', 'Approve') }}</button>
                <button v-if="item.status === 'PendingApproval'" class="danger" @click="cancelReceipt(item)">{{ t('Từ chối', 'Reject') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  </section>
</template>

<style scoped>
.receipt-item {
  display: grid;
  grid-template-columns: 1.5fr .6fr .8fr auto;
  gap: 8px;
  margin-bottom: 8px;
}
.receipt-item select,
.receipt-item input {
  min-height: 38px;
}
.receipt-item button {
  min-height: 38px;
  width: 38px;
  padding: 0;
  display: grid;
  place-items: center;
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
.table-number-input {
  min-height: 34px !important;
  max-width: 110px;
  padding: 5px 8px;
}
.table-save-btn {
  min-height: 34px !important;
  padding: 4px 12px !important;
}
.stock-readonly {
  display: inline-block;
  min-width: 60px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #f3f4f6;
  font-weight: 600;
}
.app-dark .stock-readonly {
  background: #374151;
}
.full-width-tables-container {
  margin-top: 24px;
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
