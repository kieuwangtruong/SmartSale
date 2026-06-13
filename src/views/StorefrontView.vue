<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { formatCurrency } from "../services/orderApi";
import { getProducts, type Product } from "../services/productApi";

interface CartLine {
  product: Product;
  quantity: number;
}

type SortOption = "featured" | "price-asc" | "price-desc" | "name";

const products = ref<Product[]>([]);
const cart = ref<CartLine[]>([]);
const search = ref("");
const category = ref("");
const sort = ref<SortOption>("featured");
const loading = ref(true);
const error = ref("");
const showCart = ref(false);

const categories = computed(() =>
  [
    ...new Set(
      products.value.map((product) => product.categoryName).filter(Boolean),
    ),
  ].sort(),
);
const availableProducts = computed(
  () => products.value.filter((product) => product.quantity > 0).length,
);
const visibleProducts = computed(() => {
  const query = search.value.trim().toLowerCase();
  const filtered = products.value.filter((product) => {
    const matchesCategory =
      !category.value || product.categoryName === category.value;
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      String(product.id).includes(query) ||
      product.categoryName.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return [...filtered].sort((first, second) => {
    if (sort.value === "price-asc")
      return first.sellingPrice - second.sellingPrice;
    if (sort.value === "price-desc")
      return second.sellingPrice - first.sellingPrice;
    if (sort.value === "name")
      return first.name.localeCompare(second.name, "vi");
    return Number(second.quantity > 0) - Number(first.quantity > 0);
  });
});
const cartCount = computed(() =>
  cart.value.reduce((sum, line) => sum + line.quantity, 0),
);
const cartTotal = computed(() =>
  cart.value.reduce(
    (sum, line) => sum + line.product.sellingPrice * line.quantity,
    0,
  ),
);

async function loadProducts() {
  loading.value = true;
  error.value = "";
  try {
    products.value = await getProducts();
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : "Không thể tải danh sách sản phẩm.";
  } finally {
    loading.value = false;
  }
}

function addToCart(product: Product) {
  const line = cart.value.find((item) => item.product.id === product.id);
  if (line) {
    if (line.quantity < product.quantity) line.quantity += 1;
  } else {
    cart.value.push({ product, quantity: 1 });
  }
  showCart.value = true;
}

function changeQuantity(line: CartLine, quantity: number) {
  line.quantity = Math.max(1, Math.min(quantity || 1, line.product.quantity));
}

function removeLine(productId: number) {
  cart.value = cart.value.filter((line) => line.product.id !== productId);
}

function clearFilters() {
  search.value = "";
  category.value = "";
  sort.value = "featured";
}

onMounted(loadProducts);
</script>

<template>
  <div class="store">
    <div class="announcement">
      <span
        ><i class="pi pi-sparkles" /> Giá bán và tồn kho được đồng bộ trực
        tiếp</span
      >
      <RouterLink to="/admin"
        >Dành cho nhân viên <i class="pi pi-arrow-up-right"
      /></RouterLink>
    </div>

    <header class="store-header">
      <RouterLink class="store-brand" to="/">
        <span class="brand-mark"><i class="pi pi-shopping-bag" /></span>
        <span class="brand-copy"
          ><strong>Smart Sale Store</strong><small>Smart store</small></span
        >
      </RouterLink>

      <nav class="main-nav">
        <a href="#products">Sản phẩm</a>
        <a href="#service">Dịch vụ</a>
        <a href="#footer">Liên hệ</a>
      </nav>

      <button class="cart-button" type="button" @click="showCart = true">
        <i class="pi pi-shopping-bag" />
        <span>Giỏ hàng</span>
        <b>{{ cartCount }}</b>
      </button>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <span class="eyebrow">BỘ SƯU TẬP ĐƯỢC TUYỂN CHỌN</span>
          <h1>Mua sắm tinh gọn.<br /><em>Chọn lựa thông minh.</em></h1>
          <p>
            Khám phá danh mục sản phẩm được cập nhật trực tiếp từ hệ thống quản
            lý kho, với mức giá rõ ràng và số lượng tồn thực tế.
          </p>
          <div class="hero-actions">
            <a class="primary-cta" href="#products">
              Xem sản phẩm <i class="pi pi-arrow-right" />
            </a>
            <span
              ><i class="pi pi-check-circle" /> {{ availableProducts }} sản phẩm
              sẵn hàng</span
            >
          </div>
        </div>

        <div class="hero-visual">
          <div class="visual-grid"></div>
          <div class="hero-orbit orbit-one"></div>
          <div class="hero-orbit orbit-two"></div>
          <div class="hero-product">
            <span class="hero-icon"><i class="pi pi-box" /></span>
            <small>DANH MỤC HIỆN CÓ</small>
            <strong>{{ products.length }}</strong>
            <p>Sản phẩm được quản lý tập trung</p>
          </div>
          <div class="floating-card top-card">
            <i class="pi pi-sync" />
            <span
              ><strong>Real-time</strong><small>Đồng bộ tồn kho</small></span
            >
          </div>
          <div class="floating-card bottom-card">
            <i class="pi pi-shield" />
            <span
              ><strong>Minh bạch</strong><small>Giá và mã sản phẩm</small></span
            >
          </div>
        </div>
      </section>

      <section id="service" class="service-strip">
        <article>
          <span><i class="pi pi-database" /></span>
          <div>
            <strong>Dữ liệu chính xác</strong
            ><small>Cập nhật trực tiếp từ Product service</small>
          </div>
        </article>
        <article>
          <span><i class="pi pi-chart-line" /></span>
          <div>
            <strong>Tồn kho minh bạch</strong
            ><small>Biết chính xác sản phẩm còn hàng</small>
          </div>
        </article>
        <article>
          <span><i class="pi pi-comments" /></span>
          <div>
            <strong>Hỗ trợ tận tâm</strong
            ><small>Nhân viên xác nhận đơn nhanh chóng</small>
          </div>
        </article>
      </section>

      <section id="products" class="catalog">
        <div class="section-heading">
          <div>
            <span class="eyebrow">SHOP THE COLLECTION</span>
            <h2>Sản phẩm nổi bật</h2>
            <p>
              {{ visibleProducts.length }} sản phẩm phù hợp với lựa chọn của bạn
            </p>
          </div>
          <div class="search-box">
            <i class="pi pi-search" />
            <input
              v-model="search"
              type="search"
              placeholder="Tìm tên, mã hoặc danh mục..."
            />
          </div>
        </div>

        <div class="catalog-toolbar">
          <div class="category-list">
            <button
              :class="{ active: !category }"
              type="button"
              @click="category = ''"
            >
              Tất cả
            </button>
            <button
              v-for="item in categories"
              :key="item"
              :class="{ active: category === item }"
              type="button"
              @click="category = item"
            >
              {{ item }}
            </button>
          </div>
          <label class="sort-control">
            <span>Sắp xếp</span>
            <select v-model="sort">
              <option value="featured">Nổi bật</option>
              <option value="price-asc">Giá thấp đến cao</option>
              <option value="price-desc">Giá cao đến thấp</option>
              <option value="name">Tên A–Z</option>
            </select>
          </label>
        </div>

        <div v-if="error" class="state-card error-state">
          <span><i class="pi pi-wifi" /></span>
          <div>
            <strong>Chưa thể kết nối Product service</strong>
            <p>{{ error }}</p>
          </div>
          <button type="button" @click="loadProducts">Thử lại</button>
        </div>

        <div v-else-if="loading" class="product-grid">
          <article
            v-for="item in 8"
            :key="item"
            class="product-card skeleton-card"
          >
            <div class="skeleton image-skeleton"></div>
            <div class="skeleton line short"></div>
            <div class="skeleton line"></div>
            <div class="skeleton line medium"></div>
          </article>
        </div>

        <div v-else-if="!visibleProducts.length" class="state-card empty-state">
          <span><i class="pi pi-search" /></span>
          <div>
            <strong>Không tìm thấy sản phẩm</strong>
            <p>Hãy thử từ khóa hoặc danh mục khác.</p>
          </div>
          <button type="button" @click="clearFilters">Xóa bộ lọc</button>
        </div>

        <div v-else class="product-grid">
          <article
            v-for="product in visibleProducts"
            :key="product.id"
            class="product-card"
          >
            <div class="product-image">
              <span v-if="product.quantity <= 0" class="stock-badge sold-out"
                >Hết hàng</span
              >
              <span
                v-else-if="product.quantity <= product.reserveStock"
                class="stock-badge low-stock"
              >
                Sắp hết
              </span>
              <img
                v-if="product.imageUrl"
                :src="product.imageUrl"
                :alt="product.name"
              />
              <div v-else class="image-placeholder">
                <i class="pi pi-box" />
                <small>ID #{{ product.id }}</small>
              </div>
              <button
                class="quick-add"
                type="button"
                :disabled="product.quantity <= 0"
                :aria-label="`Thêm ${product.name} vào giỏ`"
                @click="addToCart(product)"
              >
                <i class="pi pi-plus" />
              </button>
            </div>
            <div class="product-content">
              <div class="product-labels">
                <span>{{ product.categoryName || "Sản phẩm" }}</span>
                <small>ID #{{ product.id }}</small>
              </div>
              <h3>{{ product.name }}</h3>
              <div class="product-footer">
                <div>
                  <strong>{{ formatCurrency(product.sellingPrice) }}</strong>
                  <small v-if="product.quantity > 0">
                    <i class="pi pi-check-circle" /> Còn
                    {{ product.quantity }} sản phẩm
                  </small>
                  <small v-else class="unavailable">Tạm hết hàng</small>
                </div>
                <button
                  type="button"
                  :disabled="product.quantity <= 0"
                  @click="addToCart(product)"
                >
                  <i class="pi pi-shopping-bag" />
                  <span>Thêm</span>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="closing-banner">
        <div>
          <span class="eyebrow">SALESFLOW STORE</span>
          <h2>Mọi thông tin bạn cần,<br />trước khi lựa chọn.</h2>
        </div>
        <p>
          Sản phẩm, giá bán và tồn kho được quản lý trên cùng một hệ thống, giúp
          trải nghiệm mua sắm rõ ràng và đáng tin cậy hơn.
        </p>
        <a href="#products">Tiếp tục mua sắm <i class="pi pi-arrow-up" /></a>
      </section>
    </main>

    <button
      v-if="showCart"
      class="cart-backdrop"
      type="button"
      aria-label="Đóng giỏ hàng"
      @click="showCart = false"
    />
    <aside class="cart-panel" :class="{ open: showCart }" aria-label="Giỏ hàng">
      <div class="cart-head">
        <div>
          <span>GIỎ HÀNG CỦA BẠN</span>
          <h2>{{ cartCount }} sản phẩm</h2>
        </div>
        <button type="button" aria-label="Đóng" @click="showCart = false">
          <i class="pi pi-times" />
        </button>
      </div>

      <div v-if="!cart.length" class="empty-cart">
        <span><i class="pi pi-shopping-bag" /></span>
        <h3>Giỏ hàng đang trống</h3>
        <p>Khám phá danh mục và thêm sản phẩm bạn quan tâm.</p>
        <button type="button" @click="showCart = false">Xem sản phẩm</button>
      </div>

      <div v-else class="cart-body">
        <div v-for="line in cart" :key="line.product.id" class="cart-line">
          <div class="cart-image">
            <img
              v-if="line.product.imageUrl"
              :src="line.product.imageUrl"
              :alt="line.product.name"
            />
            <i v-else class="pi pi-box" />
          </div>
          <div class="cart-info">
            <small>{{ line.product.categoryName }}</small>
            <strong>{{ line.product.name }}</strong>
            <span>{{ formatCurrency(line.product.sellingPrice) }}</span>
            <div class="quantity-control">
              <button
                type="button"
                aria-label="Giảm số lượng"
                @click="changeQuantity(line, line.quantity - 1)"
              >
                <i class="pi pi-minus" />
              </button>
              <input
                :value="line.quantity"
                type="number"
                min="1"
                :max="line.product.quantity"
                @input="
                  changeQuantity(
                    line,
                    Number(($event.target as HTMLInputElement).value),
                  )
                "
              />
              <button
                type="button"
                aria-label="Tăng số lượng"
                @click="changeQuantity(line, line.quantity + 1)"
              >
                <i class="pi pi-plus" />
              </button>
            </div>
          </div>
          <button
            class="remove-line"
            type="button"
            aria-label="Xóa sản phẩm"
            @click="removeLine(line.product.id)"
          >
            <i class="pi pi-trash" />
          </button>
        </div>
      </div>

      <div v-if="cart.length" class="cart-footer">
        <div>
          <span>Tạm tính</span><strong>{{ formatCurrency(cartTotal) }}</strong>
        </div>
        <p>
          <i class="pi pi-info-circle" /> Nhân viên bán hàng sẽ xác nhận thông
          tin và tạo đơn.
        </p>
        <button type="button">
          Liên hệ đặt hàng <i class="pi pi-arrow-right" />
        </button>
      </div>
    </aside>

    <footer id="footer">
      <div class="footer-content">
        <div>
          <RouterLink class="store-brand footer-brand" to="/">
            <span class="brand-mark"><i class="pi pi-shopping-bag" /></span>
            <span class="brand-copy"
              ><strong>SalesFlow</strong><small>Smart store</small></span
            >
          </RouterLink>
          <p>
            Trải nghiệm mua sắm được kết nối trực tiếp với hệ thống bán hàng và
            kho.
          </p>
        </div>
        <div class="footer-links">
          <strong>Khám phá</strong>
          <a href="#products">Sản phẩm</a>
          <a href="#service">Dịch vụ</a>
        </div>
        <div class="footer-links">
          <strong>Hệ thống</strong>
          <RouterLink to="/admin">Đăng nhập nhân viên</RouterLink>
          <span>Dữ liệu Product service</span>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 SalesFlow. Sales & Inventory Management.</span>
        <span><i class="pi pi-circle-fill" /> Hệ thống đang hoạt động</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.store {
  --ink: #14213d;
  --muted: #687385;
  --cream: #f8f7f2;
  --line: #e8e7e1;
  --teal: #0f766e;
  --teal-dark: #0b5f59;
  min-height: 100vh;
  color: var(--ink);
  background: var(--cream);
}
.store .hero-copy {
  min-width: 0;
  width: 100%;
  display: block;
}
.store .hero-copy h1 {
  margin: 20px 0 24px;
  color: var(--ink);
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(48px, 6vw, 78px);
  font-weight: 500;
  line-height: 0.98;
  letter-spacing: -0.055em;
  white-space: normal;
}
.store .hero-actions {
  margin-top: 34px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 22px;
  flex-wrap: nowrap;
}
.store .state-card {
  min-height: 220px;
  padding: 30px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
  box-shadow: none;
}
.store input,
.store select {
  color: var(--ink);
  font-family: inherit;
  font-weight: 400;
}
.store button {
  font-family: inherit;
}
.announcement {
  min-height: 34px;
  padding: 7px max(24px, calc((100vw - 1240px) / 2));
  color: #dce7e5;
  background: #102a2e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 11px;
  letter-spacing: 0.02em;
}
.announcement span,
.announcement a {
  display: flex;
  align-items: center;
  gap: 7px;
}
.announcement a {
  color: white;
  text-decoration: none;
  font-weight: 700;
}
.store-header {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 78px;
  padding: 0 max(24px, calc((100vw - 1240px) / 2));
  border-bottom: 1px solid rgb(20 33 61 / 8%);
  background: rgb(248 247 242 / 92%);
  backdrop-filter: blur(18px);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}
.store-brand {
  width: fit-content;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
}
.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  background: var(--teal);
  display: grid;
  place-items: center;
}
.brand-copy {
  display: grid;
  line-height: 1.05;
}
.brand-copy strong {
  font-family: Georgia, serif;
  font-size: 20px;
  letter-spacing: -0.02em;
}
.brand-copy small {
  margin-top: 5px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.main-nav {
  display: flex;
  align-items: center;
  gap: 30px;
}
.main-nav a {
  position: relative;
  color: #39445a;
  text-decoration: none;
  font-size: 13px;
  font-weight: 650;
}
.main-nav a::after {
  content: "";
  position: absolute;
  right: 50%;
  bottom: -9px;
  left: 50%;
  height: 1px;
  background: var(--teal);
  transition: 0.2s ease;
}
.main-nav a:hover::after {
  right: 0;
  left: 0;
}
.cart-button {
  justify-self: end;
  min-height: 42px;
  padding: 0 13px 0 15px;
  border: 1px solid #d9d9d2;
  border-radius: 99px;
  color: var(--ink);
  background: transparent;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  font-weight: 750;
}
.cart-button b {
  min-width: 23px;
  height: 23px;
  padding: 0 6px;
  border-radius: 50%;
  color: white;
  background: var(--teal);
  display: grid;
  place-items: center;
  font-size: 10px;
}
main {
  max-width: 1240px;
  margin: auto;
  padding: 0 24px 100px;
}
.hero {
  min-height: 610px;
  padding: 62px 0 50px;
  display: grid;
  grid-template-columns: 1fr 0.82fr;
  align-items: center;
  gap: clamp(50px, 8vw, 110px);
}
.eyebrow {
  color: var(--teal);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.22em;
}
.hero h1 {
  max-width: 700px;
}
.hero h1 em {
  color: var(--teal);
  font-weight: 500;
}
.hero-copy > p {
  max-width: 590px;
  margin: 0;
  color: var(--muted);
  font-size: 17px;
  line-height: 1.75;
}
.primary-cta {
  min-height: 50px;
  padding: 0 21px;
  border-radius: 3px;
  color: white;
  background: var(--ink);
  display: inline-flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 750;
  transition: 0.18s ease;
}
.primary-cta:hover {
  background: var(--teal);
  transform: translateY(-2px);
}
.hero-actions > span {
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
}
.hero-actions > span i {
  color: var(--teal);
}
.hero-visual {
  position: relative;
  min-height: 480px;
  border-radius: 50% 50% 16px 16px;
  background: linear-gradient(145deg, #dce9e5, #b9d3cc);
  overflow: visible;
}
.visual-grid {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  opacity: 0.35;
  background-image:
    linear-gradient(#ffffff80 1px, transparent 1px),
    linear-gradient(90deg, #ffffff80 1px, transparent 1px);
  background-size: 36px 36px;
}
.hero-orbit {
  position: absolute;
  border: 1px solid rgb(255 255 255 / 65%);
  border-radius: 50%;
}
.orbit-one {
  inset: 70px 45px;
}
.orbit-two {
  inset: 115px 90px;
}
.hero-product {
  position: absolute;
  inset: 50%;
  width: 220px;
  height: 250px;
  padding: 30px;
  transform: translate(-50%, -50%);
  border: 1px solid #ffffff80;
  border-radius: 110px 110px 18px 18px;
  color: white;
  background: rgb(15 118 110 / 86%);
  box-shadow: 0 34px 70px rgb(15 74 70 / 28%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  backdrop-filter: blur(10px);
}
.hero-icon {
  width: 52px;
  height: 52px;
  margin-bottom: 20px;
  border: 1px solid #ffffff66;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 20px;
}
.hero-product small {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.hero-product strong {
  margin: 6px 0;
  font-family: Georgia, serif;
  font-size: 62px;
  font-weight: 500;
  line-height: 1;
}
.hero-product p {
  margin: 0;
  color: #d9efeb;
  font-size: 11px;
}
.floating-card {
  position: absolute;
  min-width: 170px;
  padding: 13px 16px;
  border: 1px solid #ffffffb3;
  border-radius: 10px;
  background: #fffffff2;
  box-shadow: 0 20px 40px rgb(20 33 61 / 12%);
  display: flex;
  align-items: center;
  gap: 10px;
}
.floating-card > i {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--teal);
  background: #e6f2ef;
  display: grid;
  place-items: center;
}
.floating-card span {
  display: grid;
  gap: 2px;
}
.floating-card strong {
  font-size: 12px;
}
.floating-card small {
  color: var(--muted);
  font-size: 10px;
}
.top-card {
  top: 54px;
  left: -45px;
}
.bottom-card {
  right: -38px;
  bottom: 58px;
}
.service-strip {
  margin-bottom: 100px;
  padding: 25px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}
.service-strip article {
  padding: 0 34px;
  border-right: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 14px;
}
.service-strip article:first-child {
  padding-left: 0;
}
.service-strip article:last-child {
  padding-right: 0;
  border-right: 0;
}
.service-strip article > span {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 50%;
  color: var(--teal);
  background: #e8f0ed;
  display: grid;
  place-items: center;
}
.service-strip article div {
  display: grid;
  gap: 4px;
}
.service-strip strong {
  font-size: 13px;
}
.service-strip small {
  color: var(--muted);
  font-size: 11px;
}
.catalog {
  scroll-margin-top: 120px;
}
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 30px;
}
.section-heading h2 {
  margin: 12px 0 5px;
  font-family: Georgia, serif;
  font-size: 42px;
  font-weight: 500;
  letter-spacing: -0.04em;
}
.section-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}
.search-box {
  width: min(380px, 100%);
  padding: 0 15px;
  border-bottom: 1px solid #aeb4b2;
  display: flex;
  align-items: center;
  gap: 9px;
}
.search-box i {
  color: var(--muted);
}
.search-box input {
  min-height: 46px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.search-box input:focus {
  outline: 0;
}
.catalog-toolbar {
  margin: 34px 0 30px;
  padding-bottom: 17px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.category-list {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  scrollbar-width: none;
}
.category-list button {
  min-height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 99px;
  color: #626b79;
  background: transparent;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
}
.category-list button.active {
  color: white;
  background: var(--teal);
}
.sort-control {
  flex: 0 0 auto;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.sort-control select {
  width: auto;
  min-height: 36px;
  padding: 0 30px 0 10px;
  border-color: var(--line);
  background-color: transparent;
  font-size: 11px;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 28px 18px;
}
.product-card {
  min-width: 0;
}
.product-image {
  position: relative;
  aspect-ratio: 1 / 1.08;
  border-radius: 4px;
  background: #ecebe5;
  overflow: hidden;
}
.product-image::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgb(20 33 61 / 4%);
}
.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s ease;
}
.product-card:hover .product-image img {
  transform: scale(1.035);
}
.image-placeholder {
  width: 100%;
  height: 100%;
  color: #80918d;
  background: linear-gradient(145deg, #edf1ee, #dfe8e4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.image-placeholder i {
  font-size: 44px;
  opacity: 0.65;
}
.image-placeholder small {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.15em;
}
.stock-badge {
  position: absolute;
  top: 13px;
  left: 13px;
  z-index: 2;
  padding: 6px 9px;
  border-radius: 2px;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.low-stock {
  color: #8a4b0f;
  background: #fff3dc;
}
.sold-out {
  color: #fff;
  background: #7c4040;
}
.quick-add {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: white;
  background: var(--ink);
  display: grid;
  place-items: center;
  opacity: 0;
  transform: translateY(8px);
  transition: 0.2s ease;
}
.product-card:hover .quick-add {
  opacity: 1;
  transform: translateY(0);
}
.quick-add:hover {
  background: var(--teal);
}
.quick-add:disabled {
  display: none;
}
.product-content {
  padding: 14px 2px 0;
}
.product-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.product-labels span {
  overflow: hidden;
  color: var(--teal);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.11em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}
.product-labels small {
  color: #9a9fa8;
  font-size: 9px;
}
.product-content h3 {
  min-height: 42px;
  margin: 7px 0 15px;
  font-family: Georgia, serif;
  font-size: 17px;
  font-weight: 500;
  line-height: 1.25;
}
.product-footer {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 10px;
}
.product-footer > div {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.product-footer strong {
  font-size: 15px;
}
.product-footer small {
  color: #748079;
  font-size: 9px;
}
.product-footer small i {
  color: var(--teal);
}
.product-footer .unavailable {
  color: #9f4d4d;
}
.product-footer > button {
  min-height: 35px;
  padding: 0 11px;
  border: 1px solid #d8d9d4;
  border-radius: 2px;
  color: var(--ink);
  background: transparent;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 750;
}
.product-footer > button:hover {
  border-color: var(--teal);
  color: white;
  background: var(--teal);
}
.product-footer > button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}
.state-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: left;
}
.state-card > span {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  color: var(--teal);
  background: #e8f1ee;
  display: grid;
  place-items: center;
  font-size: 20px;
}
.state-card strong {
  font-family: Georgia, serif;
  font-size: 20px;
}
.state-card p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 12px;
}
.state-card button {
  margin-left: 20px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--ink);
  border-radius: 2px;
  color: var(--ink);
  background: transparent;
}
.error-state > span {
  color: #9f3b3b;
  background: #f9e8e8;
}
.skeleton-card {
  padding: 0;
}
.skeleton {
  border-radius: 3px;
  background: linear-gradient(90deg, #e9e8e2 25%, #f3f2ed 50%, #e9e8e2 75%);
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite;
}
.image-skeleton {
  aspect-ratio: 1 / 1.08;
}
.line {
  height: 12px;
  margin-top: 12px;
}
.line.short {
  width: 38%;
}
.line.medium {
  width: 66%;
}
@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
.closing-banner {
  margin-top: 110px;
  padding: 60px;
  color: white;
  background: #102a2e;
  display: grid;
  grid-template-columns: 1fr 0.8fr auto;
  align-items: end;
  gap: 50px;
}
.closing-banner .eyebrow {
  color: #9dc9c2;
}
.closing-banner h2 {
  margin: 13px 0 0;
  font-family: Georgia, serif;
  font-size: 36px;
  font-weight: 500;
  line-height: 1.08;
}
.closing-banner p {
  margin: 0;
  color: #b9cbc8;
  font-size: 12px;
  line-height: 1.8;
}
.closing-banner a {
  color: white;
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
}
.cart-backdrop {
  position: fixed;
  inset: 0;
  z-index: 49;
  border: 0;
  background: rgb(9 20 31 / 55%);
  backdrop-filter: blur(3px);
}
.cart-panel {
  position: fixed;
  inset: 0 0 0 auto;
  z-index: 50;
  width: min(460px, 100vw);
  padding: 0;
  background: #fbfbf8;
  box-shadow: -30px 0 80px rgb(10 24 35 / 24%);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  visibility: hidden;
  transition:
    transform 0.28s ease,
    visibility 0.28s;
}
.cart-panel.open {
  transform: translateX(0);
  visibility: visible;
}
.cart-head {
  min-height: 92px;
  padding: 22px 26px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cart-head span {
  color: var(--teal);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.15em;
}
.cart-head h2 {
  margin: 5px 0 0;
  font-family: Georgia, serif;
  font-size: 25px;
  font-weight: 500;
}
.cart-head button,
.remove-line {
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--ink);
  background: transparent;
  display: grid;
  place-items: center;
}
.empty-cart {
  margin: auto;
  padding: 40px;
  text-align: center;
}
.empty-cart > span {
  width: 76px;
  height: 76px;
  margin: 0 auto 22px;
  border-radius: 50%;
  color: var(--teal);
  background: #e8f1ee;
  display: grid;
  place-items: center;
  font-size: 27px;
}
.empty-cart h3 {
  margin: 0;
  font-family: Georgia, serif;
  font-size: 25px;
  font-weight: 500;
}
.empty-cart p {
  color: var(--muted);
  font-size: 12px;
}
.empty-cart button {
  min-height: 42px;
  margin-top: 10px;
  padding: 0 18px;
  border: 0;
  color: white;
  background: var(--ink);
}
.cart-body {
  flex: 1;
  padding: 5px 26px;
  overflow-y: auto;
}
.cart-line {
  position: relative;
  padding: 20px 0;
  border-bottom: 1px solid var(--line);
  display: grid;
  grid-template-columns: 84px 1fr 34px;
  gap: 15px;
}
.cart-image {
  width: 84px;
  height: 100px;
  border-radius: 3px;
  background: #e8ece8;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #81908b;
  font-size: 22px;
}
.cart-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cart-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.cart-info > small {
  color: var(--teal);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.cart-info > strong {
  margin: 5px 0;
  font-family: Georgia, serif;
  font-size: 15px;
  font-weight: 500;
}
.cart-info > span {
  font-size: 12px;
  font-weight: 750;
}
.quantity-control {
  height: 32px;
  margin-top: auto;
  border: 1px solid #d8d9d4;
  display: grid;
  grid-template-columns: 31px 38px 31px;
}
.quantity-control button {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 8px;
}
.quantity-control input {
  min-height: 30px;
  padding: 0;
  border: 0;
  border-right: 1px solid #e2e2dc;
  border-left: 1px solid #e2e2dc;
  border-radius: 0;
  text-align: center;
  appearance: textfield;
}
.quantity-control input::-webkit-inner-spin-button {
  appearance: none;
}
.remove-line {
  width: 32px;
  height: 32px;
  color: #8b5555;
  font-size: 11px;
}
.cart-footer {
  padding: 23px 26px 26px;
  border-top: 1px solid var(--line);
  background: white;
}
.cart-footer > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cart-footer > div span {
  color: var(--muted);
  font-size: 12px;
}
.cart-footer > div strong {
  font-family: Georgia, serif;
  font-size: 24px;
  font-weight: 500;
}
.cart-footer p {
  margin: 14px 0;
  padding: 10px;
  color: #65716e;
  background: #f0f4f2;
  font-size: 10px;
}
.cart-footer > button {
  width: 100%;
  min-height: 48px;
  border: 0;
  color: white;
  background: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-weight: 750;
}
footer {
  color: #d9e3e1;
  background: #0c2024;
}
.footer-content {
  max-width: 1240px;
  margin: auto;
  padding: 58px 24px;
  display: grid;
  grid-template-columns: 1.5fr 0.5fr 0.7fr;
  gap: 80px;
}
.footer-brand {
  color: white;
}
.footer-brand .brand-mark {
  background: #d9eee9;
  color: #0f625c;
}
.footer-brand .brand-copy small {
  color: #8fa6a2;
}
.footer-content > div:first-child > p {
  max-width: 370px;
  margin: 20px 0 0;
  color: #8fa6a2;
  font-size: 12px;
  line-height: 1.7;
}
.footer-links {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.footer-links strong {
  margin-bottom: 5px;
  color: white;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.footer-links a,
.footer-links span {
  color: #8fa6a2;
  text-decoration: none;
  font-size: 11px;
}
.footer-bottom {
  max-width: 1240px;
  margin: auto;
  padding: 18px 24px;
  border-top: 1px solid rgb(255 255 255 / 8%);
  color: #718986;
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 0.04em;
}
.footer-bottom span:last-child {
  color: #8fbdb5;
}
.footer-bottom i {
  margin-right: 5px;
  font-size: 5px;
}
@media (max-width: 1000px) {
  .hero {
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }
  .hero-visual {
    min-height: 420px;
  }
  .top-card {
    left: -15px;
  }
  .bottom-card {
    right: -15px;
  }
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .closing-banner {
    grid-template-columns: 1fr 1fr;
  }
  .closing-banner a {
    grid-column: 2;
  }
}
@media (max-width: 780px) {
  .announcement {
    justify-content: center;
  }
  .announcement a {
    display: none;
  }
  .store-header {
    grid-template-columns: 1fr auto;
  }
  .main-nav {
    display: none;
  }
  .hero {
    min-height: auto;
    padding: 70px 0;
    grid-template-columns: 1fr;
  }
  .store .hero-copy {
    text-align: center;
  }
  .hero-copy > p {
    margin-inline: auto;
  }
  .store .hero-actions {
    justify-content: center;
  }
  .hero-visual {
    width: min(500px, 92%);
    margin: 20px auto 0;
  }
  .service-strip {
    grid-template-columns: 1fr;
  }
  .service-strip article,
  .service-strip article:first-child,
  .service-strip article:last-child {
    padding: 18px 5px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .service-strip article:last-child {
    border-bottom: 0;
  }
  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .search-box {
    width: 100%;
  }
  .catalog-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .sort-control {
    justify-content: flex-end;
  }
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .quick-add {
    opacity: 1;
    transform: none;
  }
  .closing-banner {
    padding: 40px;
    grid-template-columns: 1fr;
  }
  .closing-banner a {
    grid-column: auto;
  }
  .footer-content {
    grid-template-columns: 1fr 1fr;
  }
  .footer-content > div:first-child {
    grid-column: 1 / -1;
  }
}
@media (max-width: 520px) {
  .announcement {
    padding-inline: 14px;
    font-size: 9px;
  }
  .store-header {
    height: 68px;
    padding-inline: 14px;
  }
  .brand-copy small {
    display: none;
  }
  .brand-mark {
    width: 36px;
    height: 36px;
  }
  .cart-button {
    width: 40px;
    height: 40px;
    padding: 0;
    justify-content: center;
  }
  .cart-button > span,
  .cart-button > b {
    display: none;
  }
  main {
    padding: 0 14px 70px;
  }
  .hero {
    padding: 54px 0;
  }
  .store .hero-copy h1 {
    font-size: 44px;
  }
  .hero-copy > p {
    font-size: 14px;
  }
  .store .hero-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .primary-cta {
    justify-content: center;
  }
  .hero-visual {
    min-height: 360px;
  }
  .hero-product {
    width: 185px;
    height: 220px;
  }
  .hero-product strong {
    font-size: 52px;
  }
  .floating-card {
    min-width: 145px;
    padding: 10px;
  }
  .top-card {
    top: 35px;
    left: -8px;
  }
  .bottom-card {
    right: -8px;
    bottom: 40px;
  }
  .service-strip {
    margin-bottom: 70px;
  }
  .section-heading h2 {
    font-size: 34px;
  }
  .product-grid {
    grid-template-columns: 1fr;
    gap: 34px;
  }
  .product-image {
    aspect-ratio: 1 / 1;
  }
  .product-content h3 {
    min-height: auto;
    font-size: 19px;
  }
  .product-footer > button span {
    display: inline;
  }
  .state-card {
    align-items: center;
    flex-direction: column;
    text-align: center;
  }
  .state-card button {
    margin-left: 0;
  }
  .closing-banner {
    margin-top: 75px;
    padding: 34px 24px;
  }
  .closing-banner h2 {
    font-size: 30px;
  }
  .footer-content {
    padding: 45px 20px;
    grid-template-columns: 1fr;
    gap: 35px;
  }
  .footer-content > div:first-child {
    grid-column: auto;
  }
  .footer-bottom {
    padding: 18px 20px;
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
