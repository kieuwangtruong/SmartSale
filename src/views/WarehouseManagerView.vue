<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { formatCurrency, getSuppliers, type Supplier } from '../services/orderApi'
import {
  cancelStockReceipt,
  confirmStockReceipt,
  createStockReceipt,
  getLowStock,
  getProducts,
  getStockReceipts,
  updateInventory,
  type Product,
  type StockReceipt,
} from '../services/productApi'

const products = ref<Product[]>([])
const suppliers = ref<Supplier[]>([])
const receipts = ref<StockReceipt[]>([])
const lowStock = ref<Array<{ productId: number; productName: string; quantity: number; reserveStock: number }>>([])
const error = ref('')
const inventoryDraft = reactive<Record<number, { quantity: number; reserveStock: number }>>({})
const receipt = reactive({
  supplierId: 0,
  note: '',
  items: [{ productId: 0, quantity: 1, importPrice: 0 }],
})

const search = ref('')
const showReceiptForm = ref(false)

const inventoryValue = computed(() => products.value.reduce((sum, p) => sum + p.importPrice * p.quantity, 0))

const filteredProducts = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? products.value : products.value.filter((p) =>
    p.name.toLowerCase().includes(q) || String(p.id).includes(q)
  )
})

function resetReceipt() {
  showReceiptForm.value = false
  Object.assign(receipt, { supplierId: 0, note: '', items: [{ productId: 0, quantity: 1, importPrice: 0 }] })
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
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tải dữ liệu kho.' }
}

async function saveInventory(product: Product) {
  const draft = inventoryDraft[product.id]
  if (!draft) return
  try { await updateInventory(product.id, draft.quantity, draft.reserveStock); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể cập nhật tồn kho.' }
}

function addReceiptItem() { receipt.items.push({ productId: 0, quantity: 1, importPrice: 0 }) }
function removeReceiptItem(index: number) { if (receipt.items.length > 1) receipt.items.splice(index, 1) }

async function submitReceipt() {
  const items = receipt.items.filter((x) => x.productId && x.quantity > 0)
  if (!receipt.supplierId || !items.length) { error.value = 'Chọn nhà cung cấp và sản phẩm nhập.'; return }
  try {
    await createStockReceipt({ supplierId: receipt.supplierId, note: receipt.note, items })
    resetReceipt()
    await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tạo phiếu nhập.' }
}

async function confirmReceipt(item: StockReceipt) {
  try { await confirmStockReceipt(item.id); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể xác nhận phiếu.' }
}
async function cancelReceipt(item: StockReceipt) {
  try { await cancelStockReceipt(item.id); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể hủy phiếu.' }
}
onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>Kho hàng</h2>
        <p>Điều chỉnh tồn, cảnh báo và nhập hàng từ nhà cung cấp.</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" placeholder="Tìm sản phẩm tồn kho..." class="search-input" />
        <button type="button" class="primary" @click="showReceiptForm = true">
          <i class="pi pi-plus" /> Tạo phiếu nhập
        </button>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>
    <div class="stats">
      <article><span>Sản phẩm</span><strong>{{ products.length }}</strong></article>
      <article><span>Sắp hết hàng</span><strong>{{ lowStock.length }}</strong></article>
      <article><span>Giá trị nhập kho</span><strong>{{ formatCurrency(inventoryValue) }}</strong></article>
      <article><span>Phiếu nhập</span><strong>{{ receipts.length }}</strong></article>
    </div>

    <!-- Create Stock Receipt Modal -->
    <div v-if="showReceiptForm" class="modal-backdrop" @click="resetReceipt" />
    <aside v-if="showReceiptForm" class="admin-modal" aria-label="Tạo phiếu nhập kho">
      <div class="modal-head">
        <h2>Tạo phiếu nhập kho mới</h2>
        <button type="button" @click="resetReceipt"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="submitReceipt">
        <label>Nhà cung cấp<select v-model.number="receipt.supplierId" required><option :value="0">Chọn nhà cung cấp</option><option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
        <label>Ghi chú<input v-model="receipt.note" /></label>
        
        <div class="form-section-title">Danh sách mặt hàng nhập</div>
        <div v-for="(item, index) in receipt.items" :key="index" class="receipt-item">
          <select v-model.number="item.productId" required><option :value="0">Chọn sản phẩm</option><option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option></select>
          <input v-model.number="item.quantity" type="number" min="1" placeholder="SL" />
          <input v-model.number="item.importPrice" type="number" min="0" placeholder="Giá nhập" />
          <button type="button" class="danger" @click="removeReceiptItem(index)"><i class="pi pi-trash" /></button>
        </div>
        <button type="button" class="add-row-btn" @click="addReceiptItem"><i class="pi pi-plus" /> Thêm mặt hàng</button>

        <div class="actions">
          <button class="primary">Tạo phiếu</button>
          <button type="button" @click="resetReceipt">Hủy</button>
        </div>
      </form>
    </aside>

    <div class="full-width-tables-container">
      <article class="panel table-wrap">
        <h3>Tồn kho</h3>
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th style="width: 140px;">Tồn</th>
              <th style="width: 140px;">Ngưỡng</th>
              <th style="width: 100px;">Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredProducts" :key="p.id">
              <td>{{ p.name }}<small>ID: #{{ p.id }}</small></td>
              <td><input v-if="inventoryDraft[p.id]" v-model.number="inventoryDraft[p.id]!.quantity" type="number" min="0" class="table-number-input" /></td>
              <td><input v-if="inventoryDraft[p.id]" v-model.number="inventoryDraft[p.id]!.reserveStock" type="number" min="0" class="table-number-input" /></td>
              <td><button class="primary table-save-btn" @click="saveInventory(p)">Lưu</button></td>
            </tr>
          </tbody>
        </table>
      </article>

      <article class="panel table-wrap" style="margin-top: 24px;">
        <h3>Phiếu nhập kho</h3>
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Nhà cung cấp</th>
              <th>Chi tiết</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in receipts" :key="item.id">
              <td>#{{ item.id }}<small>{{ new Date(item.createdAt).toLocaleString('vi-VN') }}</small></td>
              <td>{{ item.supplierName }}</td>
              <td>{{ item.items.map((x) => `${x.productName} x${x.quantity}`).join(', ') }}</td>
              <td>{{ item.status }}</td>
              <td class="actions">
                <button v-if="item.status === 'Draft'" class="primary" @click="confirmReceipt(item)">Xác nhận</button>
                <button v-if="item.status === 'Draft'" class="danger" @click="cancelReceipt(item)">Hủy</button>
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
.full-width-tables-container {
  margin-top: 24px;
}
</style>
