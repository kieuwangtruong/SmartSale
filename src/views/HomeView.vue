<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Product {
  id: number
  name: string
  category: string
  price: number
  stock: number
  description: string
}

const products = ref<Product[]>([
  {
    id: 1,
    name: 'Laptop Dell XPS 13',
    category: 'Điện tử',
    price: 25000000,
    stock: 5,
    description: 'Laptop cao cấp với hiệu năng mạnh',
  },
  {
    id: 2,
    name: 'iPhone 15 Pro Max',
    category: 'Điện thoại',
    price: 35000000,
    stock: 8,
    description: 'Điện thoại Apple flagship mới nhất',
  },
  {
    id: 3,
    name: 'Samsung Galaxy S24 Ultra',
    category: 'Điện thoại',
    price: 28000000,
    stock: 3,
    description: 'Điện thoại Samsung cao cấp',
  },
  {
    id: 4,
    name: 'Sony WH-1000XM5',
    category: 'Audio',
    price: 8500000,
    stock: 15,
    description: 'Tai nghe chống ồn cao cấp',
  },
  {
    id: 5,
    name: 'iPad Air 11-inch',
    category: 'Máy tính bảng',
    price: 18500000,
    stock: 7,
    description: 'Máy tính bảng Apple 11 inch',
  },
  {
    id: 6,
    name: 'Apple Watch S9',
    category: 'Wearable',
    price: 12000000,
    stock: 10,
    description: 'Đồng hồ thông minh Apple',
  },
  {
    id: 7,
    name: 'Google Pixel 8 Pro',
    category: 'Điện thoại',
    price: 22000000,
    stock: 6,
    description: 'Điện thoại Google Pixel mới nhất',
  },
  {
    id: 8,
    name: 'Microsoft Surface Pro 10',
    category: 'Điện tử',
    price: 30000000,
    stock: 4,
    description: 'Máy tính bảng 2 trong 1',
  },
])

const searchQuery = ref('')
const selectedCategory = ref('Tất cả danh mục')

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
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())
    const matchesCategory =
      selectedCategory.value === 'Tất cả danh mục' ||
      product.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

function handleLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="home-container">
    <div class="hero-section">
      <h1>🛍️ Cửa hàng online</h1>
      <p>Khám phá các sản phẩm điện tử chất lượng cao</p>
    </div>

    <!-- Search and Filter -->
    <div class="controls">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="🔍 Tìm kiếm sản phẩm..."
        />
      </div>
      <select v-model="selectedCategory" class="category-select">
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ cat }}
        </option>
      </select>
      <button @click="handleLogin" class="btn-login">Đăng nhập để mua hàng</button>
    </div>

    <!-- Products Grid -->
    <div class="products-grid">
      <div v-for="product in filteredProducts" :key="product.id" class="product-card">
        <div class="product-header">
          <h3>{{ product.name }}</h3>
          <span class="category-badge">{{ product.category }}</span>
        </div>

        <div class="product-description">
          {{ product.description }}
        </div>

        <div class="product-info">
          <div class="price">{{ formatCurrency(product.price) }}</div>
          <div class="stock" :class="{ 'low-stock': product.stock < 5 }">
            Tồn: {{ product.stock }} cái
          </div>
        </div>
      </div>
    </div>

    <!-- No Results -->
    <div v-if="filteredProducts.length === 0" class="no-results">
      📭 Không tìm thấy sản phẩm nào
    </div>
  </div>
</template>

<style scoped>
.home-container {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.hero-section {
  text-align: center;
  color: white;
  margin-bottom: 40px;
  padding: 30px 0;
}

.hero-section h1 {
  font-size: 2.5rem;
  margin: 0 0 10px 0;
}

.hero-section p {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  align-items: center;
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.search-box input {
  flex: 1;
  min-width: 200px;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.search-box input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
}

.category-select {
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
}

.btn-login {
  padding: 12px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
  white-space: nowrap;
}

.btn-login:hover {
  background: #5568d3;
  transform: scale(1.05);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.product-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: 0.3s;
}

.product-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(-5px);
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.product-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  flex: 1;
}

.category-badge {
  background: #667eea;
  color: white;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  white-space: nowrap;
  font-weight: bold;
}

.product-description {
  color: #666;
  font-size: 0.95rem;
  line-height: 1.4;
  margin-bottom: 15px;
  min-height: 40px;
}

.product-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.price {
  font-size: 1.3rem;
  font-weight: bold;
  color: #667eea;
}

.stock {
  padding: 6px 12px;
  background: #e0f2fe;
  color: #0369a1;
  border-radius: 5px;
  font-size: 0.9rem;
  font-weight: bold;
}

.stock.low-stock {
  background: #fef2f2;
  color: #991b1b;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 10px;
  color: #999;
  font-size: 1.1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .hero-section h1 {
    font-size: 1.8rem;
  }

  .controls {
    flex-direction: column;
  }

  .search-box input,
  .category-select,
  .btn-login {
    width: 100%;
  }

  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }
}
</style>
