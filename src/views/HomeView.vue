<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

interface User {
  email: string
  role: string
  fullName: string
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
const isAuthenticated = ref(false)
const currentUser = ref<User | null>(null)
const showUserMenu = ref(false)

const mainCategories = [
  { name: 'Điện tử', icon: '⚡' },
  { name: 'Điện thoại', icon: '📱' },
  { name: 'Audio', icon: '🎧' },
  { name: 'Máy tính bảng', icon: '📋' },
  { name: 'Wearable', icon: '⌚' },
]

const filterCategories = [
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

onMounted(() => {
  const auth = localStorage.getItem('isAuthenticated')
  const user = localStorage.getItem('user')
  if (auth === 'true' && user) {
    isAuthenticated.value = true
    currentUser.value = JSON.parse(user)
  }
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

function handleRegister() {
  router.push('/register')
}

function handleLogout() {
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('user')
  isAuthenticated.value = false
  currentUser.value = null
  showUserMenu.value = false
  router.push('/')
}

function handleViewCart() {
  router.push('/user/cart')
}

function handleViewOrders() {
  router.push('/user/orders')
}
</script>

<template>
  <div class="home-wrapper">
    <!-- Header -->
    <header class="header">
      <div class="header-top">
        <div class="logo-section">
          <h1 class="logo">🛍️ SHOP</h1>
          <span class="tagline">Cửa hàng online</span>
        </div>

        <div class="search-section">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Tìm kiếm sản phẩm..."
            class="search-input"
          />
        </div>

        <div class="header-actions">
          <div v-if="!isAuthenticated" class="auth-buttons">
            <button @click="handleRegister" class="btn-register">Đăng kí</button>
            <button @click="handleLogin" class="btn-login">Đăng nhập</button>
          </div>
          <div v-else class="user-section">
            <button @click="handleViewCart" class="cart-btn">
              🛒 Giỏ hàng
            </button>
            <div class="user-menu-wrapper">
              <button @click="showUserMenu = !showUserMenu" class="user-btn">
                👤 {{ currentUser?.fullName || 'Người dùng' }}
              </button>
              <div v-if="showUserMenu" class="user-dropdown">
                <a href="#" @click.prevent="handleViewCart" class="dropdown-item">Giỏ hàng</a>
                <a href="#" @click.prevent="handleViewOrders" class="dropdown-item">Đơn hàng của tôi</a>
                <a href="#" @click.prevent="handleLogout" class="dropdown-item logout">Đăng xuất</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Categories -->
      <nav class="nav-categories">
        <a
          v-for="cat in mainCategories"
          :key="cat.name"
          href="#"
          class="nav-link"
          @click.prevent="selectedCategory = cat.name"
        >
          <span class="nav-icon">{{ cat.icon }}</span>
          <span class="nav-text">{{ cat.name }}</span>
        </a>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Banner Section -->
      <section class="banner-section">
        <div class="banner-main">
          <div class="banner-left">
            <div class="banner-item red">
              <h2>🎁 ĐỒNG HỒ</h2>
              <p>GIÁ XÃ KHO<br/>UU ĐAI CỰC TO</p>
            </div>
          </div>
          <div class="banner-right">
            <div class="banner-item large">
              <h2>🎉 GIẢM SỐC ĐẾN 80%</h2>
              <p>Bảo hành 1 tháng</p>
            </div>
            <div class="banner-item">
              <h2>🔧 PHỤ KIỆN</h2>
              <p>ĐÃ SỬ DỤNG</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Promo Banner -->
      <section class="promo-banner">
        <div class="promo-content">
          <div class="promo-left">
            <span class="promo-label">Máy cũ</span>
            <span class="promo-highlight">Tiết kiếm đến 50%</span>
            <span class="promo-label">Trả chậm</span>
            <span class="promo-highlight">0% lãi suất</span>
          </div>
          <span class="promo-arrow">⟩⟩⟩</span>
        </div>
      </section>

      <!-- Category Shortcuts -->
      <section class="category-shortcuts">
        <div class="shortcuts-header">Mua sắm theo danh mục</div>
        <div class="shortcuts-grid">
          <button
            v-for="cat in mainCategories"
            :key="cat.name"
            @click="selectedCategory = cat.name"
            class="shortcut-item"
          >
            <div class="shortcut-icon">{{ cat.icon }}</div>
            <div class="shortcut-name">{{ cat.name }}</div>
          </button>
        </div>
      </section>

      <!-- Filter Section -->
      <section class="filter-section">
        <select v-model="selectedCategory" class="category-select">
          <option v-for="cat in filterCategories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </section>

      <!-- Products Grid -->
      <section class="products-section">
        <div v-if="filteredProducts.length > 0" class="products-grid">
          <div v-for="product in filteredProducts" :key="product.id" class="product-card">
            <div class="product-image">
              <div class="product-placeholder">📦</div>
              <div v-if="product.stock < 5" class="stock-badge">Hạn hàng</div>
            </div>

            <div class="product-content">
              <div class="product-category">{{ product.category }}</div>
              <h3 class="product-name">{{ product.name }}</h3>
              <p class="product-description">{{ product.description }}</p>

              <div class="product-footer">
                <div class="price">{{ formatCurrency(product.price) }}</div>
                <div class="stock" :class="{ 'low-stock': product.stock < 5 }">
                  Tồn: {{ product.stock }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div v-else class="no-results">
          📭 Không tìm thấy sản phẩm nào phù hợp
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.home-wrapper {
  background: #f5f5f5;
  min-height: 100vh;
}

/* Header Styles */
.header {
  background: linear-gradient(135deg, #ffd000 0%, #ffb800 100%);
  padding: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 15px 40px;
  flex-wrap: wrap;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1a1a1a;
  margin: 0;
  white-space: nowrap;
}

.tagline {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
}

.search-section {
  flex: 1;
  min-width: 250px;
  max-width: 500px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid white;
  border-radius: 25px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
}

.search-input:focus {
  border-color: #ffd000;
  box-shadow: 0 0 8px rgba(255, 208, 0, 0.3);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.auth-buttons {
  display: flex;
  gap: 10px;
}

.btn-register,
.btn-login {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.btn-register {
  background: transparent;
  color: #1a1a1a;
  border: 2px solid #1a1a1a;
}

.btn-register:hover {
  background: #1a1a1a;
  color: #ffd000;
}

.btn-login {
  background: #1a1a1a;
  color: #ffd000;
}

.btn-login:hover {
  background: #333;
  transform: translateY(-2px);
}

.user-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cart-btn {
  padding: 10px 16px;
  background: white;
  color: #1a1a1a;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.cart-btn:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
}

.user-menu-wrapper {
  position: relative;
}

.user-btn {
  padding: 10px 16px;
  background: white;
  color: #1a1a1a;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.user-btn:hover {
  background: #f0f0f0;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  min-width: 150px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  margin-top: 5px;
}

.dropdown-item {
  display: block;
  padding: 12px 16px;
  color: #333;
  text-decoration: none;
  border-bottom: 1px solid #eee;
  transition: background 0.3s;
  font-size: 14px;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item.logout:hover {
  background: #fee;
  color: #c00;
}

/* Navigation */
.nav-categories {
  display: flex;
  gap: 0;
  overflow-x: auto;
  padding: 0 40px;
  background: white;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.nav-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 20px;
  text-decoration: none;
  color: #333;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
  transition: all 0.3s;
  font-size: 13px;
  font-weight: 500;
}

.nav-icon {
  font-size: 1.5rem;
}

.nav-text {
  font-size: 12px;
}

.nav-link:hover {
  border-bottom-color: #ffd000;
  background: #fafafa;
}

/* Main Content */
.main-content {
  padding: 20px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Banners */
.banner-section {
  margin-bottom: 20px;
}

.banner-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.banner-left {
  grid-column: 1;
}

.banner-right {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 15px;
}

.banner-item {
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
  color: white;
  padding: 30px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 150px;
}

.banner-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(255, 107, 107, 0.3);
}

.banner-item h2 {
  font-size: 1.8rem;
  margin-bottom: 8px;
  line-height: 1.2;
}

.banner-item p {
  font-size: 0.9rem;
  opacity: 0.9;
}

.banner-item.red {
  background: linear-gradient(135deg, #d63031, #c92a2a);
}

.banner-item.large {
  grid-row: 1 / 3;
  background: linear-gradient(135deg, #4ecdc4, #44b39a);
  min-height: auto;
  padding: 40px;
}

/* Promo Banner */
.promo-banner {
  background: linear-gradient(90deg, #ffd000, #ffb800);
  padding: 20px 30px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.promo-content {
  display: flex;
  align-items: center;
  gap: 40px;
  flex: 1;
  color: white;
  font-weight: bold;
}

.promo-left {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.promo-label {
  background: rgba(0, 0, 0, 0.2);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.promo-highlight {
  color: #d63031;
  font-size: 1.4rem;
  font-weight: bold;
}

.promo-arrow {
  font-size: 1.5rem;
  color: white;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(5px); }
}

/* Category Shortcuts */
.category-shortcuts {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.shortcuts-header {
  font-size: 1.1rem;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 15px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
  color: #333;
}

.shortcut-item:hover {
  border-color: #ffd000;
  background: #fffbf0;
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(255, 208, 0, 0.2);
}

.shortcut-icon {
  font-size: 2rem;
}

.shortcut-name {
  font-size: 0.85rem;
  text-align: center;
}

/* Filter Section */
.filter-section {
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  gap: 15px;
  align-items: center;
}

.category-select {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  background: white;
  transition: all 0.3s;
}

.category-select:hover {
  border-color: #ffd000;
}

.category-select:focus {
  outline: none;
  border-color: #ffd000;
  box-shadow: 0 0 6px rgba(255, 208, 0, 0.3);
}

/* Products Section */
.products-section {
  margin-bottom: 40px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.product-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  cursor: pointer;
}

.product-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-5px);
}

.product-image {
  position: relative;
  background: #f5f5f5;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.product-placeholder {
  font-size: 3rem;
}

.stock-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #ff4444;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.product-content {
  padding: 12px;
}

.product-category {
  display: inline-block;
  background: #f0f0f0;
  color: #666;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: bold;
  margin-bottom: 6px;
}

.product-name {
  font-size: 0.95rem;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 4px;
  line-height: 1.3;
  min-height: 2.6em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-description {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.2;
  min-height: 2.4em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #eee;
}

.price {
  font-size: 1.1rem;
  font-weight: bold;
  color: #d63031;
}

.stock {
  font-size: 0.75rem;
  padding: 4px 8px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 3px;
  font-weight: bold;
}

.stock.low-stock {
  background: #ffebee;
  color: #c62828;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 8px;
  color: #999;
  font-size: 1.1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* Responsive */
@media (max-width: 1024px) {
  .main-content {
    padding: 15px 20px;
  }

  .header-top {
    padding: 12px 20px;
    gap: 15px;
  }

  .nav-categories {
    padding: 0 20px;
  }

  .banner-main {
    grid-template-columns: 1fr;
  }

  .banner-right {
    grid-template-columns: 1fr 1fr;
  }

  .banner-item.large {
    grid-row: 1;
    grid-column: 1 / -1;
  }

  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .header-top {
    padding: 10px 15px;
    gap: 10px;
  }

  .logo {
    font-size: 1.2rem;
  }

  .search-section {
    min-width: 100%;
    max-width: 100%;
    order: 3;
  }

  .header-actions {
    gap: 8px;
  }

  .nav-categories {
    padding: 0 15px;
    gap: 0;
  }

  .nav-link {
    padding: 10px 12px;
    font-size: 11px;
  }

  .nav-icon {
    font-size: 1.2rem;
  }

  .main-content {
    padding: 10px 15px;
  }

  .banner-main {
    grid-template-columns: 1fr;
  }

  .banner-right {
    grid-template-columns: 1fr;
  }

  .banner-item {
    min-height: 120px;
    padding: 20px;
  }

  .banner-item h2 {
    font-size: 1.3rem;
  }

  .promo-content {
    gap: 15px;
  }

  .shortcuts-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .shortcut-item {
    padding: 10px;
  }

  .shortcut-icon {
    font-size: 1.5rem;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .category-shortcuts {
    padding: 15px;
  }

  .filter-section {
    padding: 12px 15px;
  }
}

@media (max-width: 480px) {
  .header-top {
    flex-direction: column;
  }

  .logo-section {
    width: 100%;
    justify-content: center;
  }

  .search-section {
    width: 100%;
  }

  .auth-buttons {
    width: 100%;
    justify-content: center;
  }

  .banner-item {
    min-height: 100px;
    padding: 15px;
  }

  .banner-item h2 {
    font-size: 1rem;
  }

  .shortcuts-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
