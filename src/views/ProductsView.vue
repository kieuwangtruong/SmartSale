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
  name: '', importPrice: 0, sellingPrice: 0,
  imageUrl: '', categoryId: 0, quantity: 0, reserveStock: 0,
})

const showProductModal = ref(false)
const showCategoryModal = ref(false)
const showAddMenu = ref(false)

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

const visible = computed(() => {
  const q = search.value.toLowerCase().trim()
  return !q ? products.value : products.value.filter((p) =>
    [p.name, p.categoryName, String(p.id)].some((value) => value.toLowerCase().includes(q)),
  )
})

function reset() {
  editingId.value = null
  showProductModal.value = false
  showCategoryModal.value = false
  Object.assign(form, { name: '', importPrice: 0, sellingPrice: 0, imageUrl: '', categoryId: 0, quantity: 0, reserveStock: 0 })
}
async function load() {
  try { ;[products.value, categories.value] = await Promise.all([getProducts(), getCategories()]) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tải sản phẩm.' }
}
function edit(p: Product) {
  editingId.value = p.id
  Object.assign(form, {
    name: p.name, importPrice: p.importPrice,
    sellingPrice: p.sellingPrice, imageUrl: p.imageUrl || '',
    categoryId: p.categoryId, quantity: p.quantity, reserveStock: p.reserveStock,
  })
  showProductModal.value = true
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
  try {
    await createCategory({ name: categoryName.value.trim(), parentCategoryId: null })
    categoryName.value = ''
    showCategoryModal.value = false
    await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tạo danh mục.' }
}
async function remove(p: Product) {
  if (!confirm(`Xóa sản phẩm ${p.name}?`)) return
  try { await deleteProduct(p.id); await load() } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể xóa.' }
}
onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head">
      <div>
        <h2>Sản phẩm</h2>
        <p>Danh mục, giá nhập, giá bán và tồn kho ban đầu.</p>
      </div>
      <div class="page-head-actions">
        <input v-model="search" placeholder="Tìm sản phẩm..." class="search-input" />
        
        <div class="add-dropdown-container">
          <button type="button" class="primary" @click="toggleAddMenu">
            <i class="pi pi-plus" /> Thêm mới <i class="pi pi-angle-down" />
          </button>
          <div v-if="showAddMenu" class="add-dropdown-menu">
            <a href="#" @click.prevent="openAddProduct">Thêm sản phẩm</a>
            <a href="#" @click.prevent="openAddCategory">Thêm danh mục</a>
          </div>
        </div>
      </div>
    </div>

    <p v-if="error" class="alert error">{{ error }}</p>

    <!-- Product modal dialog -->
    <div v-if="showProductModal" class="modal-backdrop" @click="reset" />
    <aside v-if="showProductModal" class="admin-modal" aria-label="Biểu mẫu sản phẩm">
      <div class="modal-head">
        <h2>{{ editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm' }}</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="save">
        <label v-if="editingId">ID sản phẩm<input :value="editingId" disabled /></label>
        <label>Tên sản phẩm<input v-model="form.name" required /></label>
        <label>Danh mục<select v-model.number="form.categoryId" required><option :value="0">Chọn danh mục</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
        <label>Giá nhập<input v-model.number="form.importPrice" type="number" min="0" /></label>
        <label>Giá bán<input v-model.number="form.sellingPrice" type="number" min="0" /></label>
        <label>Tồn kho<input v-model.number="form.quantity" type="number" min="0" /></label>
        <label>Ngưỡng cảnh báo<input v-model.number="form.reserveStock" type="number" min="0" /></label>
        <label>Ảnh URL<input v-model="form.imageUrl" /></label>
        <div class="actions"><button class="primary">Lưu</button><button type="button" @click="reset">Hủy</button></div>
      </form>
    </aside>

    <!-- Category modal dialog -->
    <div v-if="showCategoryModal" class="modal-backdrop" @click="reset" />
    <aside v-if="showCategoryModal" class="admin-modal" aria-label="Biểu mẫu danh mục">
      <div class="modal-head">
        <h2>Thêm danh mục mới</h2>
        <button type="button" @click="reset"><i class="pi pi-times" /></button>
      </div>
      <form class="form admin-modal-body" @submit.prevent="addCategory">
        <label>Tên danh mục mới<input v-model="categoryName" placeholder="Danh mục mới" required /></label>
        <div class="actions"><button class="primary">Thêm</button><button type="button" @click="reset">Hủy</button></div>
      </form>
    </aside>

    <!-- Full width table -->
    <article class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Danh mục</th>
            <th>Giá bán</th>
            <th>Tồn kho</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in visible" :key="p.id">
            <td>{{ p.name }}<small>ID: #{{ p.id }}</small></td>
            <td>{{ p.categoryName }}</td>
            <td>{{ formatCurrency(p.sellingPrice) }}</td>
            <td>
              <span :class="{ warning: p.quantity <= p.reserveStock }">
                {{ p.quantity }} / {{ p.reserveStock }}
              </span>
            </td>
            <td class="actions">
              <button @click="edit(p)">Sửa</button>
              <button v-if="auth.role === 'Admin'" class="danger" @click="remove(p)">Xóa</button>
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>
