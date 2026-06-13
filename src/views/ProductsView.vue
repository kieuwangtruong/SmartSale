<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { formatCurrency } from '../services/orderApi'
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

const auth = useAuthStore()
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const search = ref('')
const error = ref('')
const editingId = ref<number | null>(null)
const categoryName = ref('')
const form = reactive<ProductPayload>({
  productCode: '', name: '', importPrice: 0, sellingPrice: 0,
  imageUrl: '', categoryId: 0, quantity: 0, reserveStock: 0,
})

const visible = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? products.value : products.value.filter((p) =>
    [p.name, p.productCode, p.categoryName].some((v) => v.toLowerCase().includes(q)),
  )
})

function reset() {
  editingId.value = null
  Object.assign(form, { productCode: '', name: '', importPrice: 0, sellingPrice: 0, imageUrl: '', categoryId: 0, quantity: 0, reserveStock: 0 })
}
async function load() {
  try { ;[products.value, categories.value] = await Promise.all([getProducts(), getCategories()]) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tải sản phẩm.' }
}
function edit(p: Product) {
  editingId.value = p.id
  Object.assign(form, {
    productCode: p.productCode, name: p.name, importPrice: p.importPrice,
    sellingPrice: p.sellingPrice, imageUrl: p.imageUrl || '',
    categoryId: p.categoryId, quantity: p.quantity, reserveStock: p.reserveStock,
  })
}
async function save() {
  try {
    if (editingId.value) await updateProduct(editingId.value, form)
    else await createProduct(form)
    reset(); await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể lưu sản phẩm.' }
}
async function addCategory() {
  if (!categoryName.value.trim()) return
  try { await createCategory({ name: categoryName.value.trim(), parentCategoryId: null }); categoryName.value = ''; await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tạo danh mục.' }
}
async function remove(p: Product) {
  if (!confirm(`Xóa sản phẩm ${p.name}?`)) return
  try { await deleteProduct(p.id); await load() } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể xóa.' }
}
onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h2>Sản phẩm</h2><p>Danh mục, giá nhập, giá bán và tồn kho ban đầu.</p></div><input v-model="search" placeholder="Tìm sản phẩm..." /></div>
    <p v-if="error" class="alert error">{{ error }}</p>
    <div class="grid-form">
      <div>
        <form class="panel form" @submit.prevent="save">
          <h3>{{ editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm' }}</h3>
          <label>Mã sản phẩm<input v-model="form.productCode" required /></label>
          <label>Tên sản phẩm<input v-model="form.name" required /></label>
          <label>Danh mục<select v-model.number="form.categoryId" required><option :value="0">Chọn danh mục</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
          <label>Giá nhập<input v-model.number="form.importPrice" type="number" min="0" /></label>
          <label>Giá bán<input v-model.number="form.sellingPrice" type="number" min="0" /></label>
          <label>Tồn kho<input v-model.number="form.quantity" type="number" min="0" /></label>
          <label>Ngưỡng cảnh báo<input v-model.number="form.reserveStock" type="number" min="0" /></label>
          <label>Ảnh URL<input v-model="form.imageUrl" /></label>
          <div class="actions"><button class="primary">Lưu</button><button v-if="editingId" type="button" @click="reset">Hủy</button></div>
        </form>
        <form class="panel inline-form" @submit.prevent="addCategory"><input v-model="categoryName" placeholder="Danh mục mới" /><button class="primary">Thêm</button></form>
      </div>
      <article class="panel table-wrap">
        <table><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th></th></tr></thead>
          <tbody><tr v-for="p in visible" :key="p.id">
            <td>{{ p.name }}<small>{{ p.productCode }}</small></td><td>{{ p.categoryName }}</td><td>{{ formatCurrency(p.sellingPrice) }}</td>
            <td><span :class="{ warning: p.quantity <= p.reserveStock }">{{ p.quantity }} / {{ p.reserveStock }}</span></td>
            <td class="actions"><button @click="edit(p)">Sửa</button><button v-if="auth.role === 'Admin'" class="danger" @click="remove(p)">Xóa</button></td>
          </tr></tbody>
        </table>
      </article>
    </div>
  </section>
</template>
