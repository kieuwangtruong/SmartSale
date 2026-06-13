<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { formatCurrency } from '../services/orderApi'
import { getProducts, type Product } from '../services/productApi'

interface CartLine {
  product: Product
  quantity: number
}

const products = ref<Product[]>([])
const cart = ref<CartLine[]>([])
const search = ref('')
const category = ref('')
const loading = ref(true)
const error = ref('')
const showCart = ref(false)

const categories = computed(() =>
  [...new Set(products.value.map((product) => product.categoryName).filter(Boolean))].sort(),
)
const visibleProducts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return products.value.filter((product) => {
    const matchesCategory = !category.value || product.categoryName === category.value
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.productCode.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  })
})
const cartCount = computed(() => cart.value.reduce((sum, line) => sum + line.quantity, 0))
const cartTotal = computed(() =>
  cart.value.reduce((sum, line) => sum + line.product.sellingPrice * line.quantity, 0),
)

async function loadProducts() {
  loading.value = true
  error.value = ''
  try {
    products.value = await getProducts()
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : 'Không thể tải danh sách sản phẩm.'
  } finally {
    loading.value = false
  }
}

function addToCart(product: Product) {
  const line = cart.value.find((item) => item.product.id === product.id)
  if (line) {
    if (line.quantity < product.quantity) line.quantity += 1
  } else {
    cart.value.push({ product, quantity: 1 })
  }
  showCart.value = true
}

function changeQuantity(line: CartLine, quantity: number) {
  line.quantity = Math.max(1, Math.min(quantity || 1, line.product.quantity))
}

function removeLine(productId: number) {
  cart.value = cart.value.filter((line) => line.product.id !== productId)
}

onMounted(loadProducts)
</script>

<template>
  <div class="store">
    <header class="store-header">
      <RouterLink class="store-brand" to="/">
        <span>S</span>
        <div><strong>Sales Store</strong><small>Sản phẩm chính hãng</small></div>
      </RouterLink>
      <nav>
        <a href="#products">Sản phẩm</a>
        <button type="button" @click="showCart = !showCart">
          Giỏ hàng ({{ cartCount }})
        </button>
        <RouterLink class="admin-link" to="/admin">Quản trị</RouterLink>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div>
          <p class="kicker">BÁN HÀNG & QUẢN LÝ KHO</p>
          <h1>Sản phẩm phù hợp,<br />tồn kho minh bạch.</h1>
          <p>Xem giá bán và số lượng còn hàng được cập nhật trực tiếp từ Product service.</p>
          <a href="#products">Xem sản phẩm</a>
        </div>
        <div class="hero-card">
          <span>{{ products.length }}</span>
          <strong>Sản phẩm đang kinh doanh</strong>
          <small>Dữ liệu trực tiếp từ hệ thống kho</small>
        </div>
      </section>

      <section id="products" class="catalog">
        <div class="catalog-head">
          <div><p class="kicker">DANH MỤC SẢN PHẨM</p><h2>Khám phá sản phẩm</h2></div>
          <div class="filters">
            <input v-model="search" type="search" placeholder="Tìm tên hoặc mã sản phẩm" />
            <select v-model="category">
              <option value="">Tất cả danh mục</option>
              <option v-for="item in categories" :key="item">{{ item }}</option>
            </select>
          </div>
        </div>

        <p v-if="error" class="store-alert">{{ error }}</p>
        <p v-if="loading" class="store-empty">Đang tải sản phẩm...</p>
        <p v-else-if="!visibleProducts.length" class="store-empty">Chưa có sản phẩm phù hợp.</p>

        <div v-else class="product-grid">
          <article v-for="product in visibleProducts" :key="product.id" class="product-card">
            <div class="product-image">
              <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" />
              <span v-else>{{ product.name.charAt(0).toUpperCase() }}</span>
            </div>
            <p class="category">{{ product.categoryName }}</p>
            <h3>{{ product.name }}</h3>
            <small>{{ product.productCode }}</small>
            <div class="product-meta">
              <strong>{{ formatCurrency(product.sellingPrice) }}</strong>
              <span :class="{ low: product.quantity <= product.reserveStock }">
                Còn {{ product.quantity }}
              </span>
            </div>
            <button
              type="button"
              :disabled="product.quantity <= 0"
              @click="addToCart(product)"
            >
              {{ product.quantity > 0 ? 'Thêm vào giỏ' : 'Hết hàng' }}
            </button>
          </article>
        </div>
      </section>
    </main>

    <aside v-if="showCart" class="cart-panel">
      <div class="cart-head">
        <div><small>GIỎ HÀNG</small><h2>{{ cartCount }} sản phẩm</h2></div>
        <button type="button" @click="showCart = false">Đóng</button>
      </div>
      <p v-if="!cart.length" class="store-empty">Giỏ hàng đang trống.</p>
      <div v-for="line in cart" :key="line.product.id" class="cart-line">
        <div><strong>{{ line.product.name }}</strong><small>{{ formatCurrency(line.product.sellingPrice) }}</small></div>
        <input
          :value="line.quantity"
          type="number"
          min="1"
          :max="line.product.quantity"
          @input="changeQuantity(line, Number(($event.target as HTMLInputElement).value))"
        />
        <button type="button" @click="removeLine(line.product.id)">Xóa</button>
      </div>
      <div v-if="cart.length" class="cart-footer">
        <span>Tạm tính</span><strong>{{ formatCurrency(cartTotal) }}</strong>
        <p>Vui lòng liên hệ nhân viên bán hàng để xác nhận khách hàng và tạo đơn.</p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.store { min-height: 100vh; background: #f8fafc; color: #0f172a; }
.store-header { height: 76px; padding: 0 max(24px, calc((100vw - 1180px) / 2)); display: flex; align-items: center; justify-content: space-between; background: white; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
.store-brand { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; }
.store-brand > span { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; background: #0f172a; color: white; font-weight: 800; }
.store-brand div { display: grid; }.store-brand small { color: #64748b; }
nav { display: flex; align-items: center; gap: 12px; }
nav a, nav button { padding: 9px 12px; border: 0; background: transparent; color: #334155; text-decoration: none; }
nav .admin-link { border-radius: 8px; background: #2563eb; color: white; }
main { max-width: 1180px; margin: auto; padding: 0 24px 70px; }
.hero { min-height: 440px; display: grid; grid-template-columns: 1.5fr .7fr; align-items: center; gap: 50px; }
.kicker { color: #2563eb; font-size: 12px; letter-spacing: .16em; font-weight: 800; }
.hero h1 { margin: 12px 0 18px; font-size: clamp(42px, 6vw, 72px); line-height: .98; letter-spacing: -.05em; }
.hero > div > p:not(.kicker) { max-width: 600px; color: #64748b; font-size: 17px; }
.hero a { display: inline-block; margin-top: 16px; padding: 12px 18px; border-radius: 9px; background: #0f172a; color: white; text-decoration: none; }
.hero-card { min-height: 240px; padding: 30px; border-radius: 24px; background: linear-gradient(145deg, #2563eb, #0f172a); color: white; display: flex; flex-direction: column; justify-content: flex-end; box-shadow: 0 30px 70px #1d4ed833; }
.hero-card span { font-size: 68px; font-weight: 800; }.hero-card strong { font-size: 19px; }.hero-card small { margin-top: 5px; color: #bfdbfe; }
.catalog { scroll-margin-top: 96px; }
.catalog-head { display: flex; justify-content: space-between; align-items: end; gap: 20px; margin-bottom: 24px; }
.catalog h2 { margin: 5px 0 0; font-size: 32px; }
.filters { display: flex; gap: 10px; }.filters input { min-width: 280px; }
.product-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
.product-card { padding: 16px; border: 1px solid #e2e8f0; border-radius: 16px; background: white; display: flex; flex-direction: column; }
.product-image { height: 170px; border-radius: 12px; background: #eff6ff; display: grid; place-items: center; overflow: hidden; color: #2563eb; font-size: 58px; font-weight: 800; }
.product-image img { width: 100%; height: 100%; object-fit: cover; }
.product-card .category { margin: 15px 0 5px; color: #2563eb; font-size: 11px; font-weight: 800; text-transform: uppercase; }
.product-card h3 { margin: 0 0 3px; font-size: 16px; }.product-card > small { color: #94a3b8; }
.product-meta { margin: 18px 0 14px; display: flex; align-items: center; justify-content: space-between; }
.product-meta strong { font-size: 17px; }.product-meta span { color: #15803d; font-size: 12px; }.product-meta .low { color: #dc2626; }
.product-card > button { margin-top: auto; border: 0; background: #0f172a; color: white; }.product-card > button:disabled { opacity: .45; }
.store-alert, .store-empty { padding: 24px; border-radius: 12px; text-align: center; background: white; color: #64748b; }
.store-alert { border: 1px solid #fecaca; color: #b91c1c; background: #fef2f2; }
.cart-panel { position: fixed; inset: 0 0 0 auto; z-index: 30; width: min(430px, 100vw); padding: 24px; background: white; box-shadow: -24px 0 70px #0f172a2e; overflow-y: auto; }
.cart-head { display: flex; justify-content: space-between; align-items: start; padding-bottom: 18px; border-bottom: 1px solid #e2e8f0; }.cart-head h2 { margin: 3px 0; }.cart-head small { color: #2563eb; font-weight: 800; }
.cart-line { display: grid; grid-template-columns: 1fr 70px auto; gap: 10px; align-items: center; padding: 16px 0; border-bottom: 1px solid #e2e8f0; }.cart-line div { display: grid; gap: 5px; }.cart-line small { color: #64748b; }
.cart-footer { margin-top: 24px; display: grid; grid-template-columns: 1fr auto; gap: 8px; }.cart-footer strong { font-size: 20px; }.cart-footer p { grid-column: 1 / -1; color: #64748b; font-size: 13px; }
@media (max-width: 900px) { .product-grid { grid-template-columns: repeat(2, 1fr); }.hero { grid-template-columns: 1fr; padding: 60px 0; }.hero-card { min-height: 180px; }.catalog-head { align-items: stretch; flex-direction: column; } }
@media (max-width: 600px) { .store-header { height: auto; padding: 14px 16px; align-items: flex-start; }.store-header nav { align-items: flex-end; flex-direction: column; gap: 3px; }.store-header nav > a:first-child { display: none; }.product-grid { grid-template-columns: 1fr; }.filters { flex-direction: column; }.filters input { min-width: 0; }.hero h1 { font-size: 45px; } }
</style>
