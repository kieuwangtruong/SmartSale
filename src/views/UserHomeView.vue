<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCartStore } from '../stores/cartStore'
import { formatCurrency } from '../services/productApi'

interface Product {
  id: string
  name: string
  price: number
  category: string
  stock: number
}

const cartStore = useCartStore()
const products = ref<Product[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('')

const filteredProducts = computed(() => {
  return products.value.filter(product => {
    const matchSearch = product.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchCategory = !selectedCategory.value || product.category === selectedCategory.value
    return matchSearch && matchCategory
  })
})

const categories = computed(() => {
  const cats = new Set(products.value.map(p => p.category))
  return Array.from(cats)
})

async function fetchProducts() {
  loading.value = true
  try {
    // Mock products data
    products.value = [
      { id: '1', name: 'Laptop Dell XPS 13', price: 25000000, category: 'Điện tử', stock: 5 },
      { id: '2', name: 'iPhone 15 Pro Max', price: 35000000, category: 'Điện thoại', stock: 8 },
      { id: '3', name: 'Samsung Galaxy S24 Ultra', price: 28000000, category: 'Điện thoại', stock: 3 },
      { id: '4', name: 'Sony WH-1000XM5', price: 8500000, category: 'Audio', stock: 15 },
      { id: '5', name: 'iPad Air 11-inch', price: 18500000, category: 'Máy tính bảng', stock: 7 },
      { id: '6', name: 'Apple Watch S9', price: 12000000, category: 'Wearable', stock: 10 },
      { id: '7', name: 'Google Pixel 8 Pro', price: 22000000, category: 'Điện thoại', stock: 6 },
      { id: '8', name: 'Microsoft Surface Pro 10', price: 30000000, category: 'Điện tử', stock: 4 },
    ]
  } catch (error) {
    console.error('Error fetching products:', error)
  } finally {
    loading.value = false
  }
}

function addToCart(product: Product) {
  cartStore.addToCart({
    id: product.id,
    name: product.name,
    price: product.price,
    category: product.category,
    stock: product.stock,
  })
}

onMounted(() => {
  fetchProducts()
})
</script>

<template>
  <div class="home-view">
    <div class="search-section">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="🔍 Tìm kiếm sản phẩm..."
        class="search-input"
      />
      <div class="filter-section">
        <select v-model="selectedCategory" class="category-select">
          <option value="">Tất cả danh mục</option>
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </div>
    </div>

    <div class="products-section">
      <p v-if="loading" class="loading">Đang tải sản phẩm...</p>
      <p v-else-if="filteredProducts.length === 0" class="empty">Không tìm thấy sản phẩm</p>
      <div v-else class="products-grid">
        <div v-for="product in filteredProducts" :key="product.id" class="product-card">
          <div class="product-header">
            <h3>{{ product.name }}</h3>
            <span class="category-badge">{{ product.category }}</span>
          </div>
          <div class="product-body">
            <p class="product-price">{{ formatCurrency(product.price) }}</p>
            <p class="product-stock" :class="{ 'low-stock': product.stock < 5 }">
              Tồn: {{ product.stock }}
            </p>
          </div>
          <button
            type="button"
            class="btn-add-cart"
            @click="addToCart(product)"
            :disabled="product.stock === 0"
          >
            {{ product.stock === 0 ? 'Hết hàng' : '🛒 Thêm vào giỏ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-view {
  flex: 1;
  padding: 30px;
  overflow-y: auto;
}

.search-section {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.search-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-section {
  display: flex;
  gap: 10px;
}

.category-select {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.category-select:focus {
  outline: none;
  border-color: #667eea;
}

.products-section {
  min-height: 200px;
}

.loading,
.empty {
  text-align: center;
  color: #999;
  padding: 40px 20px;
  font-size: 16px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.product-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.product-header h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
  flex: 1;
  line-height: 1.4;
}

.category-badge {
  font-size: 11px;
  background: #f0f0f0;
  color: #666;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.product-body {
  flex: 1;
}

.product-price {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #667eea;
}

.product-stock {
  margin: 6px 0 0 0;
  font-size: 12px;
  color: #999;
}

.product-stock.low-stock {
  color: #e74c3c;
  font-weight: 600;
}

.btn-add-cart {
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-add-cart:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.btn-add-cart:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
