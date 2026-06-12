<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Product {
  id: number
  name: string
  category: string
  price: number
  stock: number
  sku: string
  description: string
}

const products = ref<Product[]>([
  {
    id: 1,
    name: 'Laptop Dell XPS 13',
    category: 'Điện tử',
    price: 25000000,
    stock: 5,
    sku: 'DELL-XPS-13',
    description: 'Laptop cao cấp',
  },
  {
    id: 2,
    name: 'iPhone 15 Pro Max',
    category: 'Điện thoại',
    price: 35000000,
    stock: 8,
    sku: 'IPHONE-15-PM',
    description: 'Điện thoại Apple',
  },
  {
    id: 3,
    name: 'Samsung Galaxy S24 Ultra',
    category: 'Điện thoại',
    price: 28000000,
    stock: 3,
    sku: 'SAMSUNG-S24',
    description: 'Điện thoại Samsung',
  },
  {
    id: 4,
    name: 'Sony WH-1000XM5',
    category: 'Audio',
    price: 8500000,
    stock: 15,
    sku: 'SONY-WH-1000',
    description: 'Tai nghe cao cấp',
  },
  {
    id: 5,
    name: 'iPad Air 11-inch',
    category: 'Máy tính bảng',
    price: 18500000,
    stock: 7,
    sku: 'IPAD-AIR-11',
    description: 'Máy tính bảng Apple',
  },
  {
    id: 6,
    name: 'Apple Watch S9',
    category: 'Wearable',
    price: 12000000,
    stock: 10,
    sku: 'APPLE-WATCH-S9',
    description: 'Đồng hồ thông minh',
  },
  {
    id: 7,
    name: 'Google Pixel 8 Pro',
    category: 'Điện thoại',
    price: 22000000,
    stock: 6,
    sku: 'GOOGLE-PIXEL-8',
    description: 'Điện thoại Google',
  },
  {
    id: 8,
    name: 'Microsoft Surface Pro 10',
    category: 'Điện tử',
    price: 30000000,
    stock: 4,
    sku: 'SURFACE-PRO-10',
    description: 'Máy tính 2 trong 1',
  },
])

const searchQuery = ref('')
const selectedCategory = ref('Tất cả danh mục')
const editingProduct = ref<Product | null>(null)
const showModal = ref(false)

const categories = [
  'Tất cả danh mục',
  'Điện tử',
  'Điện thoại',
  'Audio',
  'Máy tính bảng',
  'Wearable',
]

const filteredProducts = computed(() => {
  return products.value.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory =
      selectedCategory.value === 'Tất cả danh mục' ||
      product.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

const lowStockProducts = computed(() => {
  return products.value.filter((p) => p.stock < 5)
})

const totalValue = computed(() => {
  return products.value.reduce((sum, p) => sum + p.price * p.stock, 0)
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

function openEditModal(product: Product) {
  editingProduct.value = { ...product }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingProduct.value = null
}

function saveProduct() {
  if (!editingProduct.value) return

  const index = products.value.findIndex((p) => p.id === editingProduct.value?.id)
  if (index !== -1) {
    products.value[index] = editingProduct.value
  }
  closeModal()
}

function deleteProduct(id: number) {
  if (confirm('Bạn chắc chắn muốn xóa sản phẩm này?')) {
    products.value = products.value.filter((p) => p.id !== id)
  }
}

function addProduct() {
  editingProduct.value = {
    id: Math.max(...products.value.map((p) => p.id), 0) + 1,
    name: '',
    category: 'Điện tử',
    price: 0,
    stock: 0,
    sku: '',
    description: '',
  }
  showModal.value = true
}

function saveNewProduct() {
  if (!editingProduct.value || !editingProduct.value.name) {
    alert('Vui lòng nhập tên sản phẩm')
    return
  }

  if (editingProduct.value.id > Math.max(...products.value.map((p) => p.id))) {
    products.value.push(editingProduct.value)
  } else {
    const index = products.value.findIndex((p) => p.id === editingProduct.value?.id)
    if (index !== -1) {
      products.value[index] = editingProduct.value
    }
  }
  closeModal()
}
</script>

<template>
  <div class="warehouse-container">
    <div class="header">
      <h1>📦 Quản lý kho hàng</h1>
      <p>Quản lý sản phẩm và tồn kho</p>
    </div>

    <!-- Statistics -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Tổng sản phẩm</div>
        <div class="stat-value">{{ products.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sản phẩm sắp hết</div>
        <div class="stat-value" style="color: #f59e0b">{{ lowStockProducts.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Giá trị kho</div>
        <div class="stat-value small">{{ formatCurrency(totalValue) }}</div>
      </div>
    </div>

    <!-- Search and Filter -->
    <div class="controls">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="🔍 Tìm kiếm sản phẩm hoặc SKU..."
        />
      </div>
      <select v-model="selectedCategory" class="category-select">
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>
      <button @click="addProduct" class="btn-primary">➕ Thêm sản phẩm</button>
    </div>

    <!-- Low Stock Alert -->
    <div v-if="lowStockProducts.length > 0" class="alert alert-warning">
      ⚠️ {{ lowStockProducts.length }} sản phẩm có tồn kho dưới 5 cái:
      <span>{{ lowStockProducts.map((p) => p.name).join(', ') }}</span>
    </div>

    <!-- Products Table -->
    <div class="table-container">
      <table class="products-table">
        <thead>
          <tr>
            <th>Tên sản phẩm</th>
            <th>SKU</th>
            <th>Danh mục</th>
            <th>Giá</th>
            <th>Tồn kho</th>
            <th>Giá trị</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in filteredProducts" :key="product.id" :class="{ 'low-stock': product.stock < 5 }">
            <td><strong>{{ product.name }}</strong></td>
            <td>{{ product.sku }}</td>
            <td>{{ product.category }}</td>
            <td>{{ formatCurrency(product.price) }}</td>
            <td>
              <span :class="['stock-badge', product.stock < 5 ? 'danger' : 'success']">
                {{ product.stock }}
              </span>
            </td>
            <td>{{ formatCurrency(product.price * product.stock) }}</td>
            <td>
              <button @click="openEditModal(product)" class="btn-edit">✏️ Sửa</button>
              <button @click="deleteProduct(product.id)" class="btn-delete">🗑️ Xóa</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingProduct?.id && products.some(p => p.id === editingProduct?.id) ? 'Sửa sản phẩm' : 'Thêm sản phẩm' }}</h2>
          <button @click="closeModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Tên sản phẩm</label>
            <input v-model="editingProduct!.name" type="text" placeholder="Nhập tên sản phẩm" />
          </div>
          <div class="form-group">
            <label>SKU</label>
            <input v-model="editingProduct!.sku" type="text" placeholder="Nhập mã SKU" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Danh mục</label>
              <select v-model="editingProduct!.category">
                <option v-for="cat in categories.slice(1)" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Giá (₫)</label>
              <input v-model.number="editingProduct!.price" type="number" placeholder="0" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Tồn kho</label>
              <input v-model.number="editingProduct!.stock" type="number" placeholder="0" />
            </div>
            <div class="form-group">
              <label>Mô tả</label>
              <input v-model="editingProduct!.description" type="text" placeholder="Nhập mô tả" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="btn-secondary">Hủy</button>
          <button @click="saveNewProduct" class="btn-primary">Lưu</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.warehouse-container {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.header {
  margin-bottom: 30px;
  color: white;
}

.header h1 {
  font-size: 2rem;
  margin: 0 0 5px 0;
}

.header p {
  margin: 0;
  opacity: 0.9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.stat-label {
  color: #999;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.stat-value.small {
  font-size: 1.2rem;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.search-box input {
  flex: 1;
  min-width: 200px;
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
}

.category-select {
  padding: 10px 15px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
}

.btn-primary {
  padding: 10px 20px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
}

.btn-primary:hover {
  background: #f0f0f0;
  transform: scale(1.05);
}

.alert {
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  color: white;
}

.alert-warning {
  background: #f59e0b;
}

.alert span {
  display: block;
  margin-top: 5px;
  font-weight: bold;
}

.table-container {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.products-table {
  width: 100%;
  border-collapse: collapse;
}

.products-table thead {
  background: #f5f5f5;
  border-bottom: 2px solid #ddd;
}

.products-table th {
  padding: 15px;
  text-align: left;
  font-weight: bold;
  color: #333;
}

.products-table td {
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.products-table tr:hover {
  background: #f9f9f9;
}

.products-table tr.low-stock {
  background: #fff5f5;
}

.stock-badge {
  padding: 5px 10px;
  border-radius: 5px;
  font-weight: bold;
  font-size: 0.9rem;
}

.stock-badge.success {
  background: #d4edda;
  color: #155724;
}

.stock-badge.danger {
  background: #f8d7da;
  color: #721c24;
}

.btn-edit,
.btn-delete {
  padding: 8px 12px;
  margin: 0 5px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: 0.3s;
}

.btn-edit {
  background: #3b82f6;
  color: white;
}

.btn-edit:hover {
  background: #2563eb;
}

.btn-delete {
  background: #ef4444;
  color: white;
}

.btn-delete:hover {
  background: #dc2626;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 10px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #eee;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 10px 20px;
  background: #e5e7eb;
  color: #333;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
}

.btn-secondary:hover {
  background: #d1d5db;
}

@media (max-width: 768px) {
  .controls {
    flex-direction: column;
  }

  .search-box input,
  .category-select,
  .btn-primary {
    width: 100%;
  }

  .products-table {
    font-size: 0.9rem;
  }

  .products-table th,
  .products-table td {
    padding: 10px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
