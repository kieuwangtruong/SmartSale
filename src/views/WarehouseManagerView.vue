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

const inventoryValue = computed(() => products.value.reduce((sum, p) => sum + p.importPrice * p.quantity, 0))

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
    Object.assign(receipt, { supplierId: 0, note: '', items: [{ productId: 0, quantity: 1, importPrice: 0 }] })
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
    <div class="page-head"><div><h2>Kho hàng</h2><p>Điều chỉnh tồn, cảnh báo và nhập hàng từ nhà cung cấp.</p></div></div>
    <p v-if="error" class="alert error">{{ error }}</p>
    <div class="stats">
      <article><span>Sản phẩm</span><strong>{{ products.length }}</strong></article>
      <article><span>Sắp hết hàng</span><strong>{{ lowStock.length }}</strong></article>
      <article><span>Giá trị nhập kho</span><strong>{{ formatCurrency(inventoryValue) }}</strong></article>
      <article><span>Phiếu nhập</span><strong>{{ receipts.length }}</strong></article>
    </div>

    <div class="grid-2">
      <article class="panel table-wrap">
        <h3>Tồn kho</h3>
        <table><thead><tr><th>Sản phẩm</th><th>Tồn</th><th>Ngưỡng</th><th></th></tr></thead>
          <tbody><tr v-for="p in products" :key="p.id">
            <td>{{ p.name }}<small>ID: #{{ p.id }}</small></td>
            <td><input v-if="inventoryDraft[p.id]" v-model.number="inventoryDraft[p.id]!.quantity" type="number" min="0" /></td>
            <td><input v-if="inventoryDraft[p.id]" v-model.number="inventoryDraft[p.id]!.reserveStock" type="number" min="0" /></td>
            <td><button @click="saveInventory(p)">Lưu</button></td>
          </tr></tbody>
        </table>
      </article>

      <form class="panel form" @submit.prevent="submitReceipt">
        <h3>Tạo phiếu nhập</h3>
        <label>Nhà cung cấp<select v-model.number="receipt.supplierId"><option :value="0">Chọn nhà cung cấp</option><option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option></select></label>
        <label>Ghi chú<input v-model="receipt.note" /></label>
        <div v-for="(item, index) in receipt.items" :key="index" class="receipt-item">
          <select v-model.number="item.productId"><option :value="0">Chọn sản phẩm</option><option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option></select>
          <input v-model.number="item.quantity" type="number" min="1" placeholder="Số lượng" />
          <input v-model.number="item.importPrice" type="number" min="0" placeholder="Giá nhập" />
          <button type="button" @click="removeReceiptItem(index)">Xóa</button>
        </div>
        <div class="actions"><button type="button" @click="addReceiptItem">Thêm dòng</button><button class="primary">Tạo phiếu</button></div>
      </form>
    </div>

    <article class="panel table-wrap">
      <h3>Phiếu nhập kho</h3>
      <table><thead><tr><th>Mã</th><th>Nhà cung cấp</th><th>Chi tiết</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody><tr v-for="item in receipts" :key="item.id">
          <td>#{{ item.id }}<small>{{ new Date(item.createdAt).toLocaleString('vi-VN') }}</small></td><td>{{ item.supplierName }}</td>
          <td>{{ item.items.map((x) => `${x.productName} x${x.quantity}`).join(', ') }}</td><td>{{ item.status }}</td>
          <td class="actions"><button v-if="item.status === 'Draft'" class="primary" @click="confirmReceipt(item)">Xác nhận</button><button v-if="item.status === 'Draft'" class="danger" @click="cancelReceipt(item)">Hủy</button></td>
        </tr></tbody>
      </table>
    </article>
  </section>
</template>

<style scoped>
.receipt-item { display: grid; grid-template-columns: 1.5fr .7fr .9fr auto; gap: 8px; }
</style>
