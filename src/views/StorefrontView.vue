<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { createPaymentLink, formatCurrency, getMyPurchases, getOrderStatusLabel, type Order } from "../services/orderApi";
import { getProducts, type Product } from "../services/productApi";
import { getMyProfile, type UserDto } from "../services/userApi";
import { useAuthStore } from "../stores/authStore";
import { useLanguage } from "../services/i18n";

const { t, currentLanguage, setLanguage } = useLanguage();
function toggleLang() {
  setLanguage(currentLanguage.value === 'vi' ? 'en' : 'vi');
}

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
const animateCart = ref(false);
const route = useRoute();
const auth = useAuthStore();
const CART_STORAGE_KEY = "storefront-cart";
const showCustomerPanel = ref(false);
const customerProfile = ref<UserDto | null>(auth.user);
const customerOrders = ref<Order[]>([]);
const customerPanelLoading = ref(false);
const customerPanelError = ref("");
const customerPanelLoaded = ref(false);

// Product Detail Modal state
const selectedProduct = ref<Product | null>(null);
const selectedImageIndex = ref(0);
const productDetailQuantity = ref(1);

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

const showOnlySales = ref(false);

watch(showOnlySales, () => {
  currentPage.value = 1;
});

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
    const matchesSales =
      !showOnlySales.value || (product.salePrice && product.salePrice < product.originalPrice);
    return matchesCategory && matchesSearch && matchesSales;
  });

  return [...filtered].sort((first, second) => {
    if (sort.value === "price-asc")
      return first.sellingPrice - second.sellingPrice;
    if (sort.value === "price-desc")
      return second.sellingPrice - first.sellingPrice;
    if (sort.value === "name")
      return first.name.localeCompare(second.name, "vi");
    return 0;
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
const customerInitials = computed(() => {
  const name = (customerProfile.value?.fullName || auth.user?.fullName || "").trim();
  if (!name) return "KH";
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "K";
  const second = parts[1] ?? first[1] ?? "H";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? "K"}${second[0] ?? "H"}`.toUpperCase();
});
const isCustomerLoggedIn = computed(() => auth.user?.role === "Customer");
const paidCustomerOrders = computed(() =>
  customerOrders.value.filter((order) =>
    ["Paid", "Processing", "Shipped", "Completed"].includes(order.status),
  ),
);

async function loadProducts() {
  loading.value = true;
  error.value = "";
  try {
    const data = await getProducts();
    // Auto-prefill sale prices if they are not defined or invalid
    products.value = data.map((product) => {
      const hasSale = product.salePrice && product.salePrice < product.originalPrice;
      if (!product.originalPrice || !product.salePrice || !hasSale) {
        // Automatically put products on sale based on ID pattern
        if (product.id % 3 === 0) {
          const original = product.originalPrice || product.sellingPrice || 100000;
          const discountPercent = 20 + (product.id % 4) * 10; // 20%, 30%, 40%, 50%
          const sale = Math.round(original * (1 - discountPercent / 100) / 1000) * 1000;
          return {
            ...product,
            originalPrice: original,
            salePrice: sale,
            sellingPrice: sale,
          };
        } else {
          return {
            ...product,
            originalPrice: product.originalPrice || product.sellingPrice,
            salePrice: null,
          };
        }
      }
      return product;
    });
  } catch (exception) {
    error.value =
      exception instanceof Error
        ? exception.message
        : t("Không thể tải danh sách sản phẩm.", "Unable to load products.");
  } finally {
    loading.value = false;
  }
}

async function toggleCustomerPanel() {
  showCustomerPanel.value = !showCustomerPanel.value;
  if (showCustomerPanel.value && !customerPanelLoaded.value) {
    await loadCustomerPanel();
  }
}

async function loadCustomerPanel() {
  if (!isCustomerLoggedIn.value) return;
  customerPanelLoading.value = true;
  customerPanelError.value = "";
  try {
    const [profile, orders] = await Promise.all([getMyProfile(), getMyPurchases()]);
    customerProfile.value = profile;
    customerOrders.value = orders;
    customerPanelLoaded.value = true;
  } catch (exception) {
    customerPanelError.value =
      exception instanceof Error ? exception.message : t("Không thể tải thông tin tài khoản.", "Unable to load account information.");
  } finally {
    customerPanelLoading.value = false;
  }
}

async function logoutCustomer() {
  await auth.logout();
  customerProfile.value = null;
  customerOrders.value = [];
  customerPanelLoaded.value = false;
  showCustomerPanel.value = false;
}

// Open product detail modal for quick view
function openProductDetail(product: Product) {
  selectedProduct.value = product;
  selectedImageIndex.value = 0;
  productDetailQuantity.value = 1;
  if (product.salePrice && product.salePrice < product.originalPrice) {
    startProductCountdown(product);
  }
}

// Close product detail modal
function closeProductDetail() {
  selectedProduct.value = null;
  selectedImageIndex.value = 0;
  productDetailQuantity.value = 1;
  if (productTimerId) {
    clearInterval(productTimerId);
    productTimerId = null;
  }
}

// Add to cart from product detail modal
function addToCartFromDetail() {
  if (!selectedProduct.value) return;
  const line = cart.value.find((item) => item.product.id === selectedProduct.value!.id);
  const quantity = productDetailQuantity.value;
  
  if (line) {
    if (line.quantity + quantity <= selectedProduct.value.quantity) {
      line.quantity += quantity;
    }
  } else {
    cart.value.push({ product: selectedProduct.value, quantity });
  }
  
  // Animate cart button
  animateCart.value = true;
  setTimeout(() => {
    animateCart.value = false;
  }, 600);
  
  closeProductDetail();
}

// Mock additional product images (in real app, would come from API)
function getProductImages(product: Product): string[] {
  const images = [product.imageUrl || ""];
  // Add mock alternative images for demo
  if (images[0]) {
    images.push(
      `${images[0]}?alt=1`,
      `${images[0]}?alt=2`,
      `${images[0]}?alt=3`
    );
  }
  return images.filter(Boolean);
}

// Direct add to cart (triggered from add button, not modal)
function quickAddToCart(product: Product) {
  if (product.quantity <= 0) return;
  
  const line = cart.value.find((item) => item.product.id === product.id);
  
  if (line) {
    if (line.quantity + 1 <= product.quantity) {
      line.quantity += 1;
    }
  } else {
    cart.value.push({ product, quantity: 1 });
  }
  
  // Animate cart button
  animateCart.value = true;
  setTimeout(() => {
    animateCart.value = false;
  }, 600);
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

const showCheckout = ref(false);
const checkoutLoading = ref(false);
const checkoutError = ref("");
const showPaymentConfirm = ref(false);

const customerForm = ref({
  fullName: "",
  phone: "",
  email: "",
  address: ""
});

// Countdown Timer campaigns
const storewideCountdownText = ref("");

const getPromoTargetDate = () => {
  const key = "storewide-promo-end-time";
  let stored = localStorage.getItem(key);
  if (!stored) {
    const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    stored = date.toISOString();
    localStorage.setItem(key, stored);
  }
  if (new Date(stored).getTime() < Date.now()) {
    const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    stored = date.toISOString();
    localStorage.setItem(key, stored);
  }
  return new Date(stored);
};

const updateStorewideCountdown = () => {
  const target = getPromoTargetDate();
  const diff = target.getTime() - Date.now();
  if (diff <= 0) {
    storewideCountdownText.value = t("Đã kết thúc", "Ended");
    return;
  }
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  const dStr = days > 0 ? `${days} days ` : "";
  const hStr = String(hours).padStart(2, "0");
  const mStr = String(minutes).padStart(2, "0");
  const sStr = String(seconds).padStart(2, "0");

  storewideCountdownText.value = `${dStr}${hStr}:${mStr}:${sStr}`;
};

const productCountdownText = ref("");
let productTimerId: any = null;

const startProductCountdown = (product: Product) => {
  if (productTimerId) clearInterval(productTimerId);

  // Set detailed deal target time: e.g. 5 hours from now
  const targetTime = Date.now() + 5.5 * 60 * 60 * 1000;

  const updateText = () => {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      productCountdownText.value = "00:00:00";
      clearInterval(productTimerId);
      return;
    }
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((diff % (60 * 1000)) / 1000);

    const hStr = String(hours).padStart(2, "0");
    const mStr = String(minutes).padStart(2, "0");
    const sStr = String(seconds).padStart(2, "0");

    productCountdownText.value = `${hStr}:${mStr}:${sStr}`;
  };

  updateText();
  productTimerId = setInterval(updateText, 1000);
};

function openCheckoutModal() {
  checkoutError.value = "";
  if (isCustomerLoggedIn.value && auth.user) {
    customerForm.value.fullName = auth.user.fullName || "";
    customerForm.value.email = auth.user.email || "";
    customerForm.value.address = auth.user.address || "";
    customerForm.value.phone = localStorage.getItem("customer-phone") || "";

    if (customerForm.value.fullName && customerForm.value.address && customerForm.value.phone) {
      requestPaymentConfirmation();
      return;
    }
  }
  showCheckout.value = true;
}

async function submitOrder() {
  if (checkoutLoading.value) return;
  checkoutLoading.value = true;
  checkoutError.value = "";
  try {
    const payment = await createPaymentLink({
      fullName: customerForm.value.fullName,
      phone: customerForm.value.phone,
      email: customerForm.value.email || null,
      address: customerForm.value.address,
      orderItems: cart.value.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    });
    
    // Save customer phone to localStorage for future bypasses
    if (isCustomerLoggedIn.value && customerForm.value.phone) {
      localStorage.setItem("customer-phone", customerForm.value.phone);
    }
    
    window.location.assign(payment.checkoutUrl);
  } catch (e) {
    checkoutError.value = e instanceof Error ? e.message : t("Không thể tạo liên kết thanh toán.", "Unable to create payment link.");
  } finally {
    checkoutLoading.value = false;
  }
}

function requestPaymentConfirmation() {
  checkoutError.value = "";
  if (isCustomerLoggedIn.value && customerForm.value.phone) {
    localStorage.setItem("customer-phone", customerForm.value.phone);
  }
  showPaymentConfirm.value = true;
}

const isDark = ref(false);

function toggleDarkMode() {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add("app-dark");
    localStorage.setItem("theme-dark", "true");
  } else {
    document.documentElement.classList.remove("app-dark");
    localStorage.setItem("theme-dark", "false");
  }
}

// Carousel, Category banners, and pagination logic
const showAllProducts = ref(false);
const currentPage = ref(1);
const itemsPerPage = ref(8);

const totalPages = computed(() => {
  return Math.ceil(visibleProducts.value.length / itemsPerPage.value) || 1;
});

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return visibleProducts.value.slice(start, start + itemsPerPage.value);
});

const featuredProducts = computed(() => {
  return visibleProducts.value.slice(0, 12);
});

const activeSlide = ref(0);
const slides = computed(() => [
  {
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
    title: t("Văn phòng phẩm cao cấp", "Premium Stationery"),
    subtitle: t("Nâng tầm hiệu suất làm việc với bộ sưu tập sổ tay và bút ký tinh tế.", "Elevate your workspace performance with premium notebooks and fine pens."),
    category: t("Văn phòng", "Office")
  },
  {
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200",
    title: t("Phụ kiện thông minh", "Smart Accessories"),
    subtitle: t("Thiết bị công nghệ chính xác, đồng bộ hóa phong cách sống hiện đại.", "High precision tech devices, synchronizing with your modern lifestyle."),
    category: t("Phụ kiện", "Accessories")
  },
  {
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=1200",
    title: t("Gia dụng tinh tế", "Minimalist Home Appliances"),
    subtitle: t("Không gian sống ấm cúng với các thiết bị gia dụng tối giản, hiện đại.", "Warm cozy living spaces with minimalist, modern home appliances."),
    category: t("Gia dụng", "Home")
  }
]);

const activePromoSlide = ref(0);
const promoProducts = computed(() => {
  return products.value.filter((p) => p.salePrice && p.salePrice < p.originalPrice).slice(0, 4);
});

let promoSlideInterval: any = null;
function startPromoSlideTimer() {
  if (promoSlideInterval) return;
  promoSlideInterval = setInterval(() => {
    if (promoProducts.value.length > 0) {
      activePromoSlide.value = (activePromoSlide.value + 1) % promoProducts.value.length;
    }
  }, 5000);
}
function stopPromoSlideTimer() {
  if (promoSlideInterval) {
    clearInterval(promoSlideInterval);
    promoSlideInterval = null;
  }
}

let slideInterval: any = null;
function startSlideTimer() {
  slideInterval = setInterval(() => {
    activeSlide.value = (activeSlide.value + 1) % slides.value.length;
  }, 4000);
}
function stopSlideTimer() {
  if (slideInterval) {
    clearInterval(slideInterval);
    slideInterval = null;
  }
}

watch([search, category, sort, showAllProducts], () => {
  currentPage.value = 1;
});

const categoryBanner = computed(() => {
  if (showAllProducts.value) {
    return {
      title: t("Tất cả sản phẩm", "All Products"),
      desc: t("Khám phá toàn bộ danh mục sản phẩm chất lượng cao của chúng tôi.", "Discover our complete range of high-quality products."),
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200"
    };
  }
  const cat = category.value;
  if (cat === "Gia dụng" || cat.toLowerCase().includes("gia dụng")) {
    return {
      title: t("Thiết bị Gia dụng", "Home Appliances"),
      desc: t("Thiết bị tiện nghi, hiện đại kiến tạo không gian sống lý tưởng.", "Comfortable, modern appliances creating the ideal living space."),
      image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200"
    };
  }
  if (cat === "Phụ kiện" || cat.toLowerCase().includes("phụ kiện")) {
    return {
      title: t("Phụ kiện công nghệ", "Tech Accessories"),
      desc: t("Đồng hành cùng phong cách sống hiện đại và năng động.", "Companion to modern and active lifestyles."),
      image: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=1200"
    };
  }
  if (cat === "Văn phòng" || cat.toLowerCase().includes("văn phòng")) {
    return {
      title: t("Văn phòng phẩm", "Office Stationery"),
      desc: t("Khơi nguồn cảm hứng làm việc chuyên nghiệp mỗi ngày.", "Inspiring professional work every day."),
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200"
    };
  }
  return {
    title: cat || t("Cửa hàng bán lẻ", "Retail Store"),
    desc: t("Bộ sưu tập sản phẩm ", "Collection of ") + (cat || t("chất lượng cao", "high quality")) + ".",
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=1200"
  };
});

let storewideTimerId: any = null;

onMounted(() => {
  isDark.value = localStorage.getItem("theme-dark") === "true";
  if (isDark.value) {
    document.documentElement.classList.add("app-dark");
  } else {
    document.documentElement.classList.remove("app-dark");
  }
  const savedCart = localStorage.getItem(CART_STORAGE_KEY);
  if (savedCart) {
    try {
      cart.value = JSON.parse(savedCart) as CartLine[];
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }
  showCart.value = route.query.cart === "open";
  loadProducts();
  startSlideTimer();
  startPromoSlideTimer();

  // Start storewide countdown timer
  updateStorewideCountdown();
  storewideTimerId = setInterval(updateStorewideCountdown, 1000);
});

watch(
  cart,
  (value) => localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(value)),
  { deep: true },
);

onUnmounted(() => {
  stopSlideTimer();
  stopPromoSlideTimer();
  if (storewideTimerId) clearInterval(storewideTimerId);
  if (productTimerId) clearInterval(productTimerId);
});
</script>

<template>
  <div class="store">
    <div class="announcement">
      <span><i class="pi pi-sparkles" /> {{ t('Giá bán và tồn kho được đồng bộ trực tiếp', 'Real-time stock and price synchronization active') }}</span>
      <RouterLink to="/login/staff">{{ t('Dành cho nhân viên', 'Staff Login') }} <i class="pi pi-arrow-up-right" /></RouterLink>
    </div>

    <header class="store-header">
      <RouterLink class="store-brand" to="/">
        <span class="brand-mark"><img src="/icon.png" alt="Smart Sale Store"></span>
        <span class="brand-copy"><strong>Smart Sale Store</strong><small>Smart store</small></span>
      </RouterLink>

      <nav class="main-nav">
        <a href="#" :class="{ active: !category && !showAllProducts }" @click.prevent="category = ''; showAllProducts = false;">{{ t('Trang chủ', 'Home') }}</a>
        <a href="#" :class="{ active: !category && showAllProducts }" @click.prevent="category = ''; showAllProducts = true;">{{ t('Tất cả sản phẩm', 'All Products') }}</a>
        <a 
          v-for="cat in categories" 
          :key="cat" 
          href="#" 
          :class="{ active: category === cat }" 
          @click.prevent="category = cat; showAllProducts = false;"
        >
          {{ cat }}
        </a>
      </nav>

      <div class="header-right">
        <!-- Language Switcher -->
        <button class="lang-toggle-btn" type="button" @click="toggleLang" :title="t('Đổi ngôn ngữ', 'Switch Language')">
          <i class="pi pi-globe" />
          <span>{{ currentLanguage === 'vi' ? 'EN' : 'VI' }}</span>
        </button>

        <RouterLink v-if="!isCustomerLoggedIn" class="customer-link icon-only" to="/customer-login" :title="t('Tài khoản', 'Account')">
          <i class="pi pi-user" />
        </RouterLink>
        <div v-else class="customer-menu">
          <button class="customer-avatar" type="button" @click="toggleCustomerPanel">
            {{ customerInitials }}
          </button>
          <aside v-if="showCustomerPanel" class="customer-panel">
            <div class="customer-panel-head">
              <span class="customer-avatar large">{{ customerInitials }}</span>
              <div>
                <strong>{{ customerProfile?.fullName || auth.user?.fullName }}</strong>
                <small>{{ customerProfile?.email || auth.user?.email }}</small>
              </div>
            </div>
            <p v-if="customerPanelError" class="customer-panel-error">{{ customerPanelError }}</p>
            <p v-else-if="customerPanelLoading" class="customer-panel-muted">{{ t('Đang tải thông tin...', 'Loading profile info...') }}</p>
            <template v-else>
              <div class="customer-tier-card">
                <small>{{ t('Hạng thành viên', 'Membership Tier') }}</small>
                <strong>{{ customerProfile?.customerTierLabel || t('Thành viên thường', 'Standard Member') }}</strong>
                <span>{{ customerProfile?.paidOrderCount ?? paidCustomerOrders.length }} {{ t('đơn đã thanh toán', 'paid orders') }}</span>
              </div>
              <div class="customer-info">
                <p><b>{{ t('Tài khoản:', 'Username:') }}</b> {{ customerProfile?.userName || auth.user?.userName }}</p>
                <p><b>{{ t('Địa chỉ:', 'Address:') }}</b> {{ customerProfile?.address || auth.user?.address || t('Chưa cập nhật', 'Not updated') }}</p>
              </div>
              <div class="customer-history">
                <div class="customer-history-title">
                  <strong>{{ t('Lịch sử đơn hàng', 'Order History') }}</strong>
                  <button type="button" @click="loadCustomerPanel">{{ t('Làm mới', 'Refresh') }}</button>
                </div>
                <div v-if="!customerOrders.length" class="customer-panel-muted">{{ t('Chưa có đơn hàng.', 'No orders yet.') }}</div>
                <article v-for="order in customerOrders.slice(0, 5)" :key="order.id" class="customer-order-line">
                  <div>
                    <strong>#{{ order.id }} - <span :class="['status-badge', order.status.toLowerCase()]">{{ getOrderStatusLabel(order.status) }}</span></strong>
                    <small>{{ order.orderItems.map((item) => `${item.productName} x${item.quantity}`).join(', ') }}</small>
                  </div>
                  <span>{{ formatCurrency(order.total) }}</span>
                </article>
              </div>
            </template>
            <button class="logout-customer" type="button" @click="logoutCustomer">
              <i class="pi pi-sign-out" /> {{ t('Đăng xuất', 'Logout') }}
            </button>
          </aside>
        </div>
        <button class="theme-toggle" type="button" @click="toggleDarkMode" :aria-label="t('Đổi giao diện', 'Switch theme')">
          <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
        </button>
        <button class="cart-button" :class="{ 'cart-pop': animateCart }" type="button" @click="showCart = true">
          <i class="pi pi-shopping-bag" />
          <span>{{ t('Giỏ hàng', 'Cart') }}</span>
          <b>{{ cartCount }}</b>
        </button>
      </div>
    </header>

    <main>
      <section v-if="!category && !showAllProducts" class="hero">
        <div class="hero-copy">
          <span class="eyebrow">{{ t('BỘ SƯU TẬP ĐƯỢC TUYỂN CHỌN', 'CURATED COLLECTION') }}</span>
          <h1>{{ t('Mua sắm tinh gọn.', 'Minimalist Shopping.') }}<br /><em class="fs-6">{{ t('Chọn lựa thông minh.', 'Smart Choices.') }}</em></h1>
          <div class="hero-actions">
            <a class="primary-cta" href="#products" @click.prevent="showAllProducts = true; category = '';">
              {{ t('Xem sản phẩm', 'Explore Products') }} <i class="pi pi-arrow-right" />
            </a>
            <span><i class="pi pi-check-circle" /> {{ availableProducts }} {{ t('sản phẩm sẵn hàng', 'products in stock') }}</span>
          </div>
        </div>

        <div class="hero-visual">
          <div class="visual-grid"></div>
          <div class="hero-orbit orbit-one"></div>
          <div class="hero-orbit orbit-two"></div>
          <div class="hero-product">
            <span class="hero-icon"><i class="pi pi-box" /></span>
            <small>{{ t('DANH MỤC HIỆN CÓ', 'CATEGORIES IN STORE') }}</small>
            <strong>{{ products.length }}</strong>
            <p>{{ t('Sản phẩm được quản lý tập trung', 'Centrally managed products') }}</p>
          </div>
          <div class="floating-card top-card">
            <i class="pi pi-sync" />
            <span><strong>{{ t('Real-time', 'Real-time') }}</strong><small>{{ t('Đồng bộ tồn kho', 'Stock synchronized') }}</small></span>
          </div>
          <div class="floating-card bottom-card">
            <i class="pi pi-shield" />
            <span><strong>{{ t('Minh bạch', 'Transparent') }}</strong><small>{{ t('Giá và mã sản phẩm', 'Price and product ID') }}</small></span>
          </div>
        </div>
      </section>

      <section v-if="!category && !showAllProducts" class="home-carousel">
        <div class="carousel-track">
          <div 
            v-for="(slide, index) in slides" 
            :key="index"
            class="carousel-slide" 
            :class="{ active: activeSlide === index }"
            :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.45)), url(${slide.image})` }"
          >
            <div class="slide-content">
              <span class="slide-badge">{{ slide.category }}</span>
              <h2>{{ slide.title }}</h2>
              <p>{{ slide.subtitle }}</p>
              <button class="slide-btn" type="button" @click="category = slide.category; showAllProducts = false;">
                {{ t('Khám phá ngay', 'Explore now') }} <i class="pi pi-arrow-right" />
              </button>
            </div>
          </div>
        </div>
        <div class="carousel-dots">
          <span 
            v-for="(slide, index) in slides" 
            :key="index"
            class="dot" 
            :class="{ active: activeSlide === index }"
            @click="activeSlide = index"
          />
        </div>
      </section>

      <section v-if="!category && !showAllProducts" class="category-strip">
        <article 
          class="category-banner-card"
          @click="category = 'Gia dụng'; showAllProducts = false;"
          :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=600)` }"
        >
          <div class="card-inner">
            <h3>{{ t('Thiết bị Gia dụng', 'Home Appliances') }}</h3>
            <p>{{ t('Kiến tạo không gian sống tiện nghi, tối giản.', 'Creating comfortable, minimalist living spaces.') }}</p>
          </div>
        </article>
        <article 
          class="category-banner-card"
          @click="category = 'Phụ kiện'; showAllProducts = false;"
          :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=600)` }"
        >
          <div class="card-inner">
            <h3>{{ t('Phụ kiện thông minh', 'Smart Accessories') }}</h3>
            <p>{{ t('Đồng hồ, túi xách, kính mắt và trang sức đẳng cấp.', 'Elegant watches, bags, glasses and premium accessories.') }}</p>
          </div>
        </article>
        <article 
          class="category-banner-card"
          @click="category = 'Văn phòng'; showAllProducts = false;"
          :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600)` }"
        >
          <div class="card-inner">
            <h3>{{ t('Văn phòng phẩm', 'Office Stationery') }}</h3>
            <p>{{ t('Nguồn cảm hứng cho ngày làm việc chuyên nghiệp.', 'Inspiration for a professional workday.') }}</p>
          </div>
        </article>
      </section>

      <section v-if="category || showAllProducts" class="category-hero-banner" :style="{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.6)), url(${categoryBanner.image})` }">
        <div class="category-banner-content">
          <h1>{{ categoryBanner.title }}</h1>
          <p>{{ categoryBanner.desc }}</p>
        </div>
      </section>

      <!-- Promo Campaign Flash Sale Banner Slider with Countdown Timer -->
      <section class="promo-flash-banner-slider">
        <div class="promo-track">
          <div 
            v-for="(product, index) in (promoProducts.length ? promoProducts : [null])" 
            :key="product ? product.id : 'default'"
            class="promo-slide"
            :class="{ active: activePromoSlide === index }"
            :style="product && product.imageUrl ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.75)), url(${product.imageUrl})` } : {}"
            @click="product ? openProductDetail(product) : (showOnlySales = true, showAllProducts = true, category = '')"
          >
            <div class="promo-flash-content">
              <div class="promo-flash-text">
                <span class="promo-badge">
                  <i class="pi pi-bolt" /> 
                  {{ (product && product.salePrice && product.originalPrice) ? t(`GIẢM SỐC ${Math.round((1 - product.salePrice / product.originalPrice) * 100)}%`, `HOT DEAL -${Math.round((1 - product.salePrice / product.originalPrice) * 100)}%`) : t('GIẢM SỐC 50%', '50% FLASH SALE') }}
                </span>
                <h2>
                  {{ product ? t(`SIÊU CAMPAIGN: ${product.name.toUpperCase()}`, `MEGA CAMPAIGN: ${product.name.toUpperCase()}`) : t('SIÊU KHUYẾN MÃI MÙA HÈ - ĐỒNG GIÁ SĂN SALE', 'SUMMER FLASHSALE - HOT SAVINGS') }}
                </h2>
                <p>
                  {{ (product && product.salePrice) ? t(`Sở hữu ngay ${product.name} với giá ưu đãi cực sốc chỉ còn ${formatCurrency(product.salePrice)}. Số lượng có hạn!`, `Own ${product.name} now for only ${formatCurrency(product.salePrice)}. Limited stock!`) : t('Cơ hội tốt nhất để sở hữu những sản phẩm cao cấp với giá ưu đãi cực hấp dẫn toàn sàn!', 'Best opportunity to claim top products at a fraction of their original prices!') }}
                </p>
              </div>
              <div class="promo-flash-timer-wrapper" @click.stop>
                <span>{{ t('Thời gian còn lại:', 'Time remaining:') }}</span>
                <div class="countdown-clock">
                  <strong>{{ storewideCountdownText }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Slide indicators (dots) -->
        <div v-if="promoProducts.length > 1" class="promo-dots">
          <span 
            v-for="(product, index) in promoProducts" 
            :key="index"
            class="promo-dot" 
            :class="{ active: activePromoSlide === index }"
            @click.stop="activePromoSlide = index"
          />
        </div>
      </section>

      <section id="products" class="catalog">
        <div v-if="!category && !showAllProducts">
          <div class="section-heading">
            <div>
              <span class="eyebrow">{{ t('SẢN PHẨM KHUYÊN DÙNG', 'RECOMMENDED FOR YOU') }}</span>
              <h2>{{ t('Sản phẩm nổi bật', 'Featured Products') }}</h2>
              <p>{{ t('Những sản phẩm được khách hàng lựa chọn nhiều nhất.', 'The most selected items by our customers.') }}</p>
            </div>
          </div>
          
          <div v-if="loading" class="product-grid" style="margin-top: 30px;">
            <article v-for="item in 8" :key="item" class="product-card skeleton-card">
              <div class="skeleton image-skeleton"></div>
              <div class="skeleton line short"></div>
              <div class="skeleton line"></div>
              <div class="skeleton line medium"></div>
            </article>
          </div>
          <div v-else class="product-grid" style="margin-top: 30px;">
            <article v-for="product in featuredProducts" :key="product.id" class="product-card" @click="openProductDetail(product)">
              <div class="product-image">
                <div class="discount-badge-square" v-if="product.salePrice && product.salePrice < product.originalPrice">
                  -{{ Math.round((1 - product.salePrice / product.originalPrice) * 100) }}%
                </div>
                <div class="ribbon-wrapper" v-if="product.quantity > 0 && product.quantity <= product.reserveStock">
                  <div class="ribbon low-stock">{{ t('Sắp hết', 'Low Stock') }}</div>
                </div>
                <span v-if="product.quantity <= 0" class="stock-badge sold-out">{{ t('Hết hàng', 'Out of stock') }}</span>
                <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" />
                <div v-else class="image-placeholder">
                  <i class="pi pi-box" />
                  <small>ID #{{ product.id }}</small>
                </div>
              </div>
              <div class="product-content">
                <div class="product-labels">
                  <span>{{ product.categoryName || t('Sản phẩm', 'Product') }}</span>
                  <small>ID #{{ product.id }}</small>
                </div>
                <h3>{{ product.name }}</h3>
                <div class="product-footer">
                  <div>
                    <del v-if="product.salePrice && product.salePrice < product.originalPrice">{{ formatCurrency(product.originalPrice) }}</del>
                    <strong :class="{ sale: product.salePrice && product.salePrice < product.originalPrice }">{{ formatCurrency(product.sellingPrice) }}</strong>
                    <small v-if="product.quantity > 0" :class="product.quantity <= product.reserveStock ? 'low-stock-text' : 'in-stock-text'">
                      <i class="pi pi-check-circle" />
                      {{ product.quantity <= product.reserveStock ? t(`Sắp hết (Còn ${product.quantity})`, `Low stock (${product.quantity} left)`) : t(`Còn hàng (${product.quantity})`, `In stock (${product.quantity})`) }}
                    </small>
                    <small v-else class="unavailable">{{ t('Tạm hết hàng', 'Out of stock') }}</small>
                  </div>
                  <button type="button" :disabled="product.quantity <= 0" @click.stop="quickAddToCart(product)">
                    <i class="pi pi-shopping-bag" />
                    <span>{{ t('Thêm', 'Add') }}</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div v-else>
          <div class="section-heading">
            <div>
              <span class="eyebrow">{{ t('DANH MỤC SẢN PHẨM', 'PRODUCT CATALOG') }}</span>
              <h2>{{ category || t('Tất cả sản phẩm', 'All Products') }}</h2>
              <p>{{ visibleProducts.length }} {{ t('sản phẩm phù hợp', 'matching products') }}</p>
            </div>
            <div class="search-box">
              <i class="pi pi-search" />
              <input v-model="search" type="search" :placeholder="t('Tìm tên, mã hoặc danh mục...', 'Search name, code or category...')" />
            </div>
          </div>

          <div class="catalog-toolbar">
            <div class="active-filters">
              <span class="filter-tag" v-if="search">{{ t('Tìm kiếm:', 'Search:') }} "{{ search }}" <i class="pi pi-times" style="cursor: pointer; margin-left: 4px;" @click="search = ''" /></span>
              <span class="filter-tag sales-tag" v-if="showOnlySales" style="background: #fef2f2; color: #be123c; border-color: #fca5a5;">{{ t('Khuyến mãi: "Ưu đãi 50%"', 'Promotion: "50% Off"') }} <i class="pi pi-times" style="cursor: pointer; margin-left: 4px;" @click="showOnlySales = false" /></span>
            </div>
            <label class="sort-control">
              <span>{{ t('Sắp xếp', 'Sort by') }}</span>
              <select v-model="sort">
                <option value="featured">{{ t('Nổi bật', 'Featured') }}</option>
                <option value="price-asc">{{ t('Giá thấp đến cao', 'Price: Low to High') }}</option>
                <option value="price-desc">{{ t('Giá cao đến thấp', 'Price: High to Low') }}</option>
                <option value="name">{{ t('Tên A-Z', 'Name A-Z') }}</option>
              </select>
            </label>
          </div>

          <div v-if="error" class="state-card error-state">
            <span><i class="pi pi-wifi" /></span>
            <div>
              <strong>{{ t('Chưa thể kết nối Product service', 'Could not connect to Product service') }}</strong>
              <p>{{ error }}</p>
            </div>
            <button type="button" @click="loadProducts">{{ t('Thử lại', 'Retry') }}</button>
          </div>

          <div v-else-if="loading" class="product-grid">
            <article v-for="item in 8" :key="item" class="product-card skeleton-card">
              <div class="skeleton image-skeleton"></div>
              <div class="skeleton line short"></div>
              <div class="skeleton line"></div>
              <div class="skeleton line medium"></div>
            </article>
          </div>

          <div v-else-if="!visibleProducts.length" class="state-card empty-state">
            <span><i class="pi pi-search" /></span>
            <div>
              <strong>{{ t('Không tìm thấy sản phẩm', 'No products found') }}</strong>
              <p>{{ t('Hãy thử từ khóa hoặc danh mục khác.', 'Please try different keywords or categories.') }}</p>
            </div>
            <button type="button" @click="clearFilters">{{ t('Xóa bộ lọc', 'Clear filters') }}</button>
          </div>

          <div v-else>
            <div class="product-grid">
              <article v-for="product in paginatedProducts" :key="product.id" class="product-card" @click="openProductDetail(product)">
                <div class="product-image">
                  <div class="discount-badge-square" v-if="product.salePrice && product.salePrice < product.originalPrice">
                    -{{ Math.round((1 - product.salePrice / product.originalPrice) * 100) }}%
                  </div>
                  <div class="ribbon-wrapper" v-if="product.quantity > 0 && product.quantity <= product.reserveStock">
                    <div class="ribbon low-stock">{{ t('Sắp hết', 'Low Stock') }}</div>
                  </div>
                  <span v-if="product.quantity <= 0" class="stock-badge sold-out">{{ t('Hết hàng', 'Out of stock') }}</span>
                  <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" />
                  <div v-else class="image-placeholder">
                    <i class="pi pi-box" />
                    <small>ID #{{ product.id }}</small>
                  </div>
                </div>
                <div class="product-content">
                  <div class="product-labels">
                    <span>{{ product.categoryName || t('Sản phẩm', 'Product') }}</span>
                    <small>ID #{{ product.id }}</small>
                  </div>
                  <h3>{{ product.name }}</h3>
                  <div class="product-footer">
                    <div>
                      <del v-if="product.salePrice && product.salePrice < product.originalPrice">{{ formatCurrency(product.originalPrice) }}</del>
                      <strong :class="{ sale: product.salePrice && product.salePrice < product.originalPrice }">{{ formatCurrency(product.sellingPrice) }}</strong>
                      <small v-if="product.quantity > 0" :class="product.quantity <= product.reserveStock ? 'low-stock-text' : 'in-stock-text'">
                        <i class="pi pi-check-circle" />
                        {{ product.quantity <= product.reserveStock ? t(`Sắp hết (Còn ${product.quantity})`, `Low stock (${product.quantity} left)`) : t(`Còn hàng (${product.quantity})`, `In stock (${product.quantity})`) }}
                      </small>
                      <small v-else class="unavailable">{{ t('Tạm hết hàng', 'Out of stock') }}</small>
                    </div>
                    <button type="button" :disabled="product.quantity <= 0" @click.stop="quickAddToCart(product)">
                      <i class="pi pi-shopping-bag" />
                      <span>{{ t('Thêm', 'Add') }}</span>
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <div class="pagination-container" v-if="totalPages > 1">
              <button class="pag-btn" :disabled="currentPage === 1" @click="currentPage--" :aria-label="t('Trang trước', 'Previous Page')">
                <i class="pi pi-chevron-left" />
              </button>
              <span class="pag-info">{{ t('Trang', 'Page') }} <strong>{{ currentPage }}</strong> / {{ totalPages }}</span>
              <button class="pag-btn" :disabled="currentPage === totalPages" @click="currentPage++" :aria-label="t('Trang sau', 'Next Page')">
                <i class="pi pi-chevron-right" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Product Detail Modal (Full-screen) -->
    <div v-if="selectedProduct" class="product-detail-overlay" @click.self="closeProductDetail" />
    <div v-if="selectedProduct" class="product-detail-modal" aria-modal="true" role="dialog">
      <!-- Close button -->
      <button type="button" class="detail-close-btn" :aria-label="t('Đóng', 'Close')" @click="closeProductDetail">
        <i class="pi pi-times" />
      </button>

      <!-- Two-column layout -->
      <div class="detail-container">
        <!-- Left column: Image Gallery -->
        <div class="detail-gallery">
          <div class="main-image">
            <img 
              v-if="getProductImages(selectedProduct)[selectedImageIndex]" 
              :src="getProductImages(selectedProduct)[selectedImageIndex]" 
              :alt="selectedProduct.name"
            />
            <div v-else class="image-placeholder-large">
              <i class="pi pi-box" />
              <small>ID #{{ selectedProduct.id }}</small>
            </div>
          </div>
          
          <!-- Thumbnails -->
          <div class="thumbnails">
            <button 
              v-for="(image, idx) in getProductImages(selectedProduct)" 
              :key="idx"
              type="button"
              :class="{ active: idx === selectedImageIndex }"
              @click="selectedImageIndex = idx"
              :aria-label="`Image ${idx + 1}`"
            >
              <img :src="image" :alt="`Product image ${idx + 1}`" />
            </button>
          </div>
        </div>

        <!-- Right column: Product Info & Actions -->
        <div class="detail-info">
          <div class="detail-header">
            <span class="detail-category">{{ selectedProduct.categoryName || t('Sản phẩm', 'Product') }}</span>
            <h1 class="detail-title">{{ selectedProduct.name }}</h1>
            <p v-if="selectedProduct.description" class="detail-description">
              {{ selectedProduct.description }}
            </p>
            
            <!-- Product ID and Stock Status -->
            <div class="detail-meta">
              <span class="product-id">{{ t('Mã ID:', 'Product ID:') }} <strong>#{{ selectedProduct.id }}</strong></span>
              <div v-if="selectedProduct.quantity > 0" class="stock-status in-stock">
                <i class="pi pi-check-circle" />
                <span>{{ selectedProduct.quantity <= selectedProduct.reserveStock ? t(`Sắp hết (Còn ${selectedProduct.quantity})`, `Low stock (${selectedProduct.quantity} left)`) : t(`Còn hàng (${selectedProduct.quantity} sản phẩm)`, `In stock (${selectedProduct.quantity} products)`) }}</span>
              </div>
              <div class="stock-status out-of-stock" v-else>
                <i class="pi pi-times-circle" />
                <span>{{ t('Hết hàng', 'Out of stock') }}</span>
              </div>
            </div>
          </div>

          <!-- Price -->
          <div class="detail-price">
            <span class="price-label">{{ t('Giá bán', 'Price') }}</span>
            <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
              <del style="color: var(--muted); font-size: 16px;" v-if="selectedProduct.salePrice && selectedProduct.salePrice < selectedProduct.originalPrice">
                {{ formatCurrency(selectedProduct.originalPrice) }}
              </del>
              <strong class="price-value" :style="{ color: selectedProduct.salePrice && selectedProduct.salePrice < selectedProduct.originalPrice ? 'var(--teal)' : 'inherit' }">
                {{ formatCurrency(selectedProduct.sellingPrice) }}
              </strong>
              <span class="detail-discount-percent-badge" v-if="selectedProduct.salePrice && selectedProduct.salePrice < selectedProduct.originalPrice">
                {{ t('Giảm', 'Save') }} {{ Math.round((1 - selectedProduct.salePrice / selectedProduct.originalPrice) * 100) }}%
              </span>
            </div>
          </div>
          
          <!-- Detailed Countdown Deal for product -->
          <div class="detail-deal-countdown" v-if="selectedProduct.salePrice && selectedProduct.salePrice < selectedProduct.originalPrice">
            <i class="pi pi-bolt" /> <span>{{ t('Ưu đãi Flash Deal kết thúc sau:', 'Flash Deal expires in:') }}</span>
            <strong>{{ productCountdownText }}</strong>
          </div>

          <!-- Quantity Picker -->
          <div class="quantity-picker">
            <label for="qty">{{ t('Số lượng', 'Quantity') }}</label>
            <div class="qty-controls">
              <button 
                type="button" 
                :aria-label="t('Giảm số lượng', 'Decrease quantity')"
                @click="productDetailQuantity = Math.max(1, productDetailQuantity - 1)"
              >
                <i class="pi pi-minus" />
              </button>
              <input 
                id="qty"
                v-model.number="productDetailQuantity"
                type="number"
                min="1"
                :max="selectedProduct.quantity"
              />
              <button 
                type="button"
                :aria-label="t('Tăng số lượng', 'Increase quantity')"
                @click="productDetailQuantity = Math.min(selectedProduct.quantity, productDetailQuantity + 1)"
              >
                <i class="pi pi-plus" />
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="detail-actions">
            <button 
              type="button" 
              class="btn-add-to-cart" 
              :disabled="selectedProduct.quantity <= 0"
              @click="addToCartFromDetail"
            >
              <i class="pi pi-shopping-bag" />
              <span>{{ t('Thêm vào giỏ hàng', 'Add to Cart') }}</span>
            </button>
            <button 
              type="button" 
              class="btn-back-to-store"
              @click="closeProductDetail"
            >
              <i class="pi pi-arrow-left" />
              <span>{{ t('Quay lại cửa hàng', 'Back to Store') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <aside class="cart-panel" :class="{ open: showCart }" :aria-label="t('Giỏ hàng', 'Cart')">
      <div class="cart-head">
        <div>
          <span>{{ t('GIỎ HÀNG CỦA BẠN', 'YOUR CART') }}</span>
          <h2>{{ cartCount }} {{ t('sản phẩm', 'products') }}</h2>
        </div>
        <button type="button" :aria-label="t('Đóng', 'Close')" @click="showCart = false">
          <i class="pi pi-times" />
        </button>
      </div>

      <div v-if="!cart.length" class="empty-cart">
        <span><i class="pi pi-shopping-bag" /></span>
        <h3>{{ t('Giỏ hàng đang trống', 'Your cart is empty') }}</h3>
        <p>{{ t('Khám phá danh mục và thêm sản phẩm bạn quan tâm.', 'Explore our catalog and add items that interest you.') }}</p>
        <button type="button" @click="showCart = false">{{ t('Xem sản phẩm', 'Browse Products') }}</button>
      </div>

      <div v-else class="cart-body">
        <div v-for="line in cart" :key="line.product.id" class="cart-line">
          <div class="cart-image">
            <img v-if="line.product.imageUrl" :src="line.product.imageUrl" :alt="line.product.name" />
            <i v-else class="pi pi-box" />
          </div>
          <div class="cart-info">
            <small>{{ line.product.categoryName }}</small>
            <strong>{{ line.product.name }}</strong>
            <span>{{ formatCurrency(line.product.sellingPrice) }}</span>
            <div class="quantity-control">
              <button type="button" :aria-label="t('Giảm số lượng', 'Decrease quantity')" @click="changeQuantity(line, line.quantity - 1)">
                <i class="pi pi-minus" />
              </button>
              <input
                :value="line.quantity"
                type="number"
                min="1"
                :max="line.product.quantity"
                @input="changeQuantity(line, Number(($event.target as HTMLInputElement).value))"
              />
              <button type="button" :aria-label="t('Tăng số lượng', 'Increase quantity')" @click="changeQuantity(line, line.quantity + 1)">
                <i class="pi pi-plus" />
              </button>
            </div>
          </div>
          <button class="remove-line" type="button" :aria-label="t('Xóa sản phẩm', 'Remove item')" @click="removeLine(line.product.id)">
            <i class="pi pi-trash" />
          </button>
        </div>
      </div>

      <div v-if="cart.length" class="cart-footer">
        <div>
          <span>{{ t('Tạm tính', 'Subtotal') }}</span><strong>{{ formatCurrency(cartTotal) }}</strong>
        </div>
        <p><i class="pi pi-info-circle" /> {{ t('Nhân viên bán hàng sẽ xác nhận thông tin và tạo đơn.', 'Sales staff will verify details and issue the order.') }}</p>
        <button type="button" @click="openCheckoutModal">
          {{ t('Liên hệ đặt hàng', 'Proceed to Checkout') }} <i class="pi pi-arrow-right" />
        </button>
      </div>
    </aside>

    <div v-if="showCheckout" class="modal-backdrop" @click="showCheckout = false" />
    <aside v-if="showCheckout" class="checkout-modal" :aria-label="t('Thông tin đặt hàng', 'Order Information')">
      <div class="modal-head">
        <h2>{{ t('Thông tin đặt hàng', 'Order Information') }}</h2>
        <button type="button" :aria-label="t('Đóng', 'Close')" @click="showCheckout = false">
          <i class="pi pi-times" />
        </button>
      </div>
      
      <form class="modal-body" @submit.prevent="requestPaymentConfirmation">
        <p class="modal-summary" v-html="t('Bạn đang đặt mua <strong>' + cartCount + '</strong> sản phẩm với tổng trị giá <strong>' + formatCurrency(cartTotal) + '</strong>.', 'You are purchasing <strong>' + cartCount + '</strong> items with a total value of <strong>' + formatCurrency(cartTotal) + '</strong>.')"></p>
        
        <label class="form-field">
          <span>{{ t('Họ và tên', 'Full Name') }} <b class="required">*</b></span>
          <input v-model="customerForm.fullName" required :placeholder="t('Nhập họ và tên', 'Enter full name')" />
        </label>
        
        <label class="form-field">
          <span>{{ t('Số điện thoại', 'Phone Number') }} <b class="required">*</b></span>
          <input v-model="customerForm.phone" type="tel" required :placeholder="t('Nhập số điện thoại', 'Enter phone number')" />
        </label>
        
        <label class="form-field">
          <span>{{ t('Email', 'Email') }}</span>
          <input v-model="customerForm.email" type="email" :placeholder="t('Nhập địa chỉ email', 'Enter email address')" />
        </label>
        
        <label class="form-field">
          <span>{{ t('Địa chỉ giao hàng', 'Shipping Address') }} <b class="required">*</b></span>
          <textarea v-model="customerForm.address" required :placeholder="t('Số nhà, tên đường, quận/huyện...', 'House number, street name, district...')" />
        </label>

        <div v-if="checkoutError" class="checkout-error">
          <i class="pi pi-exclamation-circle"></i> {{ checkoutError }}
        </div>
        
        <button type="submit" class="submit-btn" :disabled="checkoutLoading">
          <span>{{ t('Xác nhận', 'Confirm') }}</span>
        </button>
      </form>
    </aside>

    <div
      v-if="showPaymentConfirm"
      class="payment-confirm-overlay"
      @click="!checkoutLoading && (showPaymentConfirm = false)"
    />
    <section
      v-if="showPaymentConfirm"
      class="payment-confirm-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="t('Xác nhận thanh toán', 'Confirm Payment')"
    >
      <span class="confirm-icon"><i class="pi pi-question-circle" /></span>
      <h2>{{ t('Bạn đã chắc chắn với thông tin này!', 'Are you sure with these details?') }}</h2>
      <p>{{ t('Đơn hàng sẽ được tạo và liên kết thanh toán có hiệu lực trong 10 phút.', 'The order will be created and payment link will be valid for 10 minutes.') }}</p>
      <div v-if="checkoutError" class="checkout-error">
        <i class="pi pi-exclamation-circle" /> {{ checkoutError }}
      </div>
      <div class="confirm-actions">
        <button
          type="button"
          :disabled="checkoutLoading"
          @click="showPaymentConfirm = false"
        >
          {{ t('Hủy', 'Cancel') }}
        </button>
        <button
          type="button"
          class="pay-button"
          :disabled="checkoutLoading"
          @click="submitOrder"
        >
          <i v-if="checkoutLoading" class="pi pi-spin pi-spinner" />
          <span>{{ checkoutLoading ? t('Đang tạo liên kết...', 'Generating link...') : t('Thanh toán', 'Pay Now') }}</span>
        </button>
      </div>
    </section>

    <footer id="footer">
      <div class="footer-content">
        <div class="footer-brand-section">
          <RouterLink class="store-brand footer-brand" to="/">
            <span class="brand-mark"><i class="pi pi-shopping-bag" /></span>
            <span class="brand-copy">
              <strong>Smart Sale Store</strong>
              <small>{{ t('Hệ thống bán hàng thông minh', 'Smart Sales & Inventory System') }}</small>
            </span>
          </RouterLink>
          <div class="social-links">
            <a href="#" :aria-label="t('Facebook', 'Facebook')"><i class="pi pi-facebook" /></a>
            <a href="#" :aria-label="t('Youtube', 'Youtube')"><i class="pi pi-youtube" /></a>
            <a href="#" :aria-label="t('Twitter', 'Twitter')"><i class="pi pi-twitter" /></a>
          </div>
        </div>
        
        <div class="footer-links">
          <strong>{{ t('Danh mục mua sắm', 'Shop Categories') }}</strong>
          <a href="#products">{{ t('Tất cả sản phẩm', 'All Products') }}</a>
          <a href="#service">{{ t('Dịch vụ khách hàng', 'Customer Service') }}</a>
          <a href="#footer">{{ t('Liên hệ hỗ trợ', 'Contact Support') }}</a>
        </div>
        
        <div class="footer-links">
          <strong>{{ t('Thông tin liên hệ', 'Contact Information') }}</strong>
          <span><i class="pi pi-phone" /> {{ t('Hotline: 1900 6789', 'Hotline: 1900 6789') }}</span>
          <span><i class="pi pi-envelope" /> support@smartsales.com</span>
          <span><i class="pi pi-map-marker" /> {{ t('Hà Nội, Việt Nam', 'Hanoi, Vietnam') }}</span>
        </div>

        <div class="footer-links">
          <strong>{{ t('Hệ thống nội bộ', 'Internal System') }}</strong>
          <RouterLink class="staff-login-btn" to="/login/staff">
            <i class="pi pi-lock" /> {{ t('Đăng nhập nhân viên', 'Staff Login') }}
          </RouterLink>
          <span class="status-indicator"><i class="pi pi-server" /> {{ t('Kết nối API Service', 'API Service Connected') }}</span>
        </div>
      </div>
      <div class="footer-bottom">
        <span>{{ t('© 2026 Smart Sale Store. Bảo lưu mọi quyền.', '© 2026 Smart Sale Store. All rights reserved.') }}</span>
        <span class="system-status"><i class="pi pi-circle-fill" /> {{ t('Hệ thống trực tuyến', 'System Online') }}</span>
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
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(40px, 5.5vw, 68px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
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
.store-header .brand-mark img {
  width: 28px;
  height: 28px;
  border-radius: 5px;
  object-fit: contain;
}
.brand-copy {
  display: grid;
  line-height: 1.05;
}
.brand-copy strong {
  font-family: sans-serif;
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
.main-nav a:hover::after,
.main-nav a.active::after {
  right: 0;
  left: 0;
}
.main-nav a.active {
  color: var(--teal);
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
.cart-pop {
  animation: cartBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes cartBounce {
  0% { transform: scale(1); }
  30% { transform: scale(1.35) rotate(-8deg); }
  50% { transform: scale(0.85) rotate(8deg); }
  85% { transform: scale(1.1) rotate(-3deg); }
  100% { transform: scale(1) rotate(0); }
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
  display: inline-block;
  color: var(--teal);
  font-weight: 800;
  font-style: normal;
  white-space: nowrap;
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
  font-family: sans-serif;
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
.home-carousel {
  position: relative;
  width: 100%;
  height: 400px;
  margin: 30px 0 50px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}
.carousel-track {
  width: 100%;
  height: 100%;
  position: relative;
}
.carousel-slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.8s ease, visibility 0.8s ease;
  display: flex;
  align-items: center;
  padding: 0 60px;
}
.carousel-slide.active {
  opacity: 1;
  visibility: visible;
}
.slide-content {
  max-width: 600px;
  color: white;
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.slide-badge {
  display: inline-block;
  padding: 6px 14px;
  background: var(--teal);
  color: #ffffff;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 99px;
  margin-bottom: 18px;
}
.slide-content h2 {
  font-family: sans-serif;
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 700;
  margin: 0 0 12px;
  line-height: 1.2;
  color: #ffffff;
}
.slide-content p {
  font-size: clamp(13px, 1.8vw, 16px);
  color: #ffffff;
  margin: 0 0 26px;
  line-height: 1.6;
  font-weight: 500;
}
.slide-btn {
  min-height: 44px;
  padding: 0 22px;
  border-radius: 99px;
  border: none;
  background: white;
  color: #0b0f19;
  font-weight: 750;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.2s, background 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
}
.slide-btn:hover {
  transform: translateY(-2px);
  background: var(--cream);
}
.carousel-dots {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 5;
}
.carousel-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
}
.carousel-dots .dot.active {
  width: 24px;
  border-radius: 99px;
  background: white;
}
.category-strip {
  margin-bottom: 80px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.category-banner-card {
  position: relative;
  min-height: 180px;
  border-radius: 16px;
  background-size: cover;
  background-position: center;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  display: flex;
  align-items: flex-end;
  padding: 24px;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.category-banner-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.12);
}
.card-inner {
  color: white;
  position: relative;
  z-index: 2;
  text-align: left;
}
.card-inner h3 {
  font-family: sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 6px;
  color: #ffffff;
}
.card-inner p {
  font-size: 11px;
  color: #ffffff;
  margin: 0;
  line-height: 1.4;
  font-weight: 500;
}
.category-hero-banner {
  min-height: 250px;
  margin: 20px 0 50px;
  border-radius: 20px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  padding: 0 50px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  text-align: left;
}
.category-banner-content {
  max-width: 650px;
  color: white;
}
.category-banner-content h1 {
  font-family: sans-serif;
  font-size: clamp(28px, 3.5vw, 42px);
  font-weight: 700;
  margin: 0 0 10px;
  color: #ffffff;
}
.category-banner-content p {
  font-size: clamp(12px, 1.5vw, 15px);
  color: #ffffff;
  margin: 0;
  line-height: 1.6;
  font-weight: 500;
}
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-top: 50px;
  padding: 20px 0;
  border-top: 1px solid var(--line);
}
.pag-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid var(--line) !important;
  background: white;
  color: var(--ink);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s;
  box-sizing: border-box;
}
.pag-btn:hover:not(:disabled) {
  border-color: var(--teal) !important;
  color: var(--teal);
  background: #f0fdfa;
}
.pag-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pag-info {
  font-size: 13px;
  color: var(--muted);
}
.pag-info strong {
  color: var(--ink);
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
  font-family: sans-serif;
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
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e8e7e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
}
.product-image {
  position: relative;
  aspect-ratio: 1 / 1.08;
  border-radius: 14px;
  background: #ecebe5;
  overflow: hidden;
  cursor: pointer;
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
  border-radius: 6px;
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
  padding: 10px 10px 8px;
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
  min-height: 34px;
  margin: 5px 0 8px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ink);
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
  font-size: 17px;
  font-weight: 850;
  color:#582cdb;
}
.product-footer del {
  color: #94a3b8;
  font-size: 13px;
}
.product-footer strong.sale {
  color: #dc2626;
}
.ribbon-wrapper {
  position: absolute;
  top: 0;
  right: 0;
  width: 85px;
  height: 85px;
  overflow: hidden;
  z-index: 3;
  pointer-events: none;
}
.ribbon {
  position: absolute;
  top: 15px;
  right: -21px;
  width: 110px;
  padding: 3px 0;
  background-color: #f59e0b;
  color: #fff;
  font-size: 9px;
  font-weight: 850;
  text-transform: uppercase;
  text-align: center;
  letter-spacing: 0.05em;
  transform: rotate(45deg);
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}
.app-dark .ribbon {
  background-color: #d97706;
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
  cursor: pointer;
  transition: all 0.2s;
}
.product-footer > button:hover:not(:disabled) {
  border-color: var(--teal);
  color: white;
  background: var(--teal);
}
.product-footer > button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

/* =========================================================================
   PRODUCT DETAIL MODAL (FULL-SCREEN)
   ========================================================================= */
.product-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 60;
  backdrop-filter: blur(4px);
}

.product-detail-modal {
  position: fixed;
  inset: 0;
  z-index: 61;
  background: var(--cream);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 24px;
}

.detail-close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--cream);
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10;
}

.detail-close-btn:hover {
  background: var(--ink);
  color: white;
  border-color: var(--ink);
}

.detail-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  max-width: 1400px;
  margin: auto;
  width: 100%;
  padding-top: 40px;
}

/* Gallery Section */
.detail-gallery {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-image {
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  background: var(--cream);
  overflow: hidden;
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder-large {
  width: 100%;
  height: 100%;
  color: #80918d;
  background: linear-gradient(145deg, #edf1ee, #dfe8e4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  font-size: 48px;
}

.app-dark .image-placeholder-large {
  color: #6b7280;
  background: linear-gradient(145deg, #1e293b, #0f172a);
}

.thumbnails {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.thumbnails button {
  aspect-ratio: 1 / 1;
  padding: 0;
  border: 2px solid var(--line);
  border-radius: 8px;
  background: var(--cream);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s;
}

.thumbnails button:hover {
  border-color: var(--teal);
}

.thumbnails button.active {
  border-color: var(--teal);
  box-shadow: 0 0 0 1px var(--teal);
}

.thumbnails button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Product Info Section */
.detail-info {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-top: 20px;
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-category {
  color: var(--teal);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.detail-title {
  font-family: sans-serif;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  color: var(--ink);
}

.detail-description {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-line;
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 8px;
}

.product-id {
  font-size: 13px;
  color: var(--muted);
}

.product-id strong {
  color: var(--ink);
  font-family: monospace;
  font-weight: 700;
}

.stock-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 6px;
  width: fit-content;
}

.stock-status.in-stock {
  color: #15803d;
  background: #dcfce7;
}

.stock-status.out-of-stock {
  color: #7f1d1d;
  background: #fee2e2;
}

.stock-status i {
  font-size: 14px;
}

/* Price Section */
.detail-price {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--cream);
}

.price-label {
  font-size: 11px;
  font-weight: 750;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.price-value {
  font-family: sans-serif;
  font-size: 32px;
  font-weight: 700;
  color: #582cdb;
}

/* Quantity Picker */
.quantity-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quantity-picker label {
  font-weight: 600;
  font-size: 13px;
  color: var(--ink);
}

.qty-controls {
  display: grid;
  grid-template-columns: 44px 80px 44px;
  gap: 0;
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}

.qty-controls button {
  padding: 0;
  border: 0;
  border-right: 1px solid var(--line);
  background: var(--cream);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.qty-controls button:last-child {
  border-right: 0;
  border-left: 1px solid var(--line);
}

.qty-controls button:hover {
  background: rgba(56, 189, 248, 0.1);
  color: var(--teal);
}

.qty-controls input {
  padding: 0;
  border: 0;
  text-align: center;
  font-weight: 700;
  font-size: 14px;
  background: var(--cream);
  color: var(--ink);
}

.qty-controls input:focus {
  outline: none;
}

.qty-controls input::-webkit-outer-spin-button,
.qty-controls input::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

/* Action Buttons */
.detail-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-top: 16px;
}

.btn-add-to-cart {
  min-height: 52px;
  padding: 0 24px;
  border: 0;
  border-radius: 6px;
  background: var(--teal);
  color: white;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-to-cart:hover:not(:disabled) {
  background: var(--teal-dark);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
}

.btn-add-to-cart:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-back-to-store {
  min-height: 52px;
  padding: 0 24px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
  color: var(--ink);
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back-to-store:hover {
  border-color: var(--ink);
  background: var(--ink);
  color: white;
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
  font-family: sans-serif;
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
  font-family: sans-serif;
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

/* =========================================================================
   THAY DOI CSS SUA LOI GIO HANG: GO BO BACKDROP CHE KHUAT, GIU CHO NEN TU DO CLICK
   ========================================================================= */
.cart-panel {
  position: fixed;
  inset: 0 0 0 auto;
  z-index: 50;
  width: min(460px, 100vw);
  padding: 0;
  background: #fbfbf8;
  /* Tang cuong do do bong ro net de phan tach gio hang voi lop san pham co the tuong tac phia sau */
  box-shadow: -15px 0 40px rgba(10, 24, 35, 0.15);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  visibility: hidden;
  transition: transform 0.28s cubic-bezier(0.25, 1, 0.5, 1), visibility 0.28s;
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
  font-family: sans-serif;
  font-size: 25px;
  font-weight: 500;
}
.cart-head button,
.remove-line {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--ink);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.cart-head button:hover,
.remove-line:hover {
  border-color: var(--teal);
  background: #f0fdfa;
  color: var(--teal);
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
  font-family: sans-serif;
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
  background: var(--teal);
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
  font-family: sans-serif;
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
  width: 40px;
  height: 40px;
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
  font-family: sans-serif;
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
  color: #cbd5e1;
  background: #0f172a;
  border-top: 1px solid rgb(255 255 255 / 8%);
}
.footer-content {
  max-width: 1240px;
  margin: auto;
  padding: 70px 24px;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 40px;
}
.footer-brand-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.footer-brand {
  color: white;
}
.footer-brand .brand-mark {
  background: var(--teal);
  color: white;
}
.brand-desc {
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}
.social-links {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}
.social-links a {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgb(255 255 255 / 8%);
  color: #cbd5e1;
  display: grid;
  place-items: center;
  text-decoration: none;
  transition: all 0.2s;
}
.social-links a:hover {
  background: var(--teal);
  color: white;
  transform: translateY(-2px);
}
.footer-links {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.footer-links strong {
  color: white;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 5px;
}
.footer-links a,
.footer-links span {
  color: #94a3b8;
  text-decoration: none;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s;
}
.footer-links a:hover {
  color: var(--teal);
}
.staff-login-btn {
  padding: 8px 12px;
  border: 1px solid rgb(255 255 255 / 15%);
  border-radius: 6px;
  background: rgb(255 255 255 / 5%);
  color: white !important;
  text-align: center;
  justify-content: center;
  font-weight: 600;
}
.staff-login-btn:hover {
  background: var(--teal);
  border-color: var(--teal);
}
.footer-bottom {
  max-width: 1240px;
  margin: auto;
  padding: 24px;
  border-top: 1px solid rgb(255 255 255 / 8%);
  color: #64748b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}
.system-status {
  color: #22c55e !important;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.system-status i {
  font-size: 8px;
  animation: blink 2s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
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
  .detail-container {
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    padding-top: 30px;
  }
  .detail-title {
    font-size: 28px;
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
    font-size: clamp(30px, 8vw, 44px);
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
  .product-detail-modal {
    padding: 20px;
  }
  .detail-container {
    grid-template-columns: 1fr;
    gap: 30px;
    padding-top: 20px;
  }
  .detail-title {
    font-size: 22px;
  }
  .detail-close-btn {
    width: 40px;
    height: 40px;
    top: 16px;
    right: 16px;
  }
  .thumbnails {
    grid-template-columns: repeat(3, 1fr);
  }
  .detail-actions {
    grid-template-columns: 1fr;
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

.checkout-modal {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(460px, 100%);
  background: white;
  z-index: 60;
  box-shadow: -10px 0 40px rgb(0 0 0 / 15%);
  display: flex;
  flex-direction: column;
  padding: 24px;
  animation: slideIn 0.25s ease-out;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 59;
  background: rgb(20 33 61 / 45%);
  backdrop-filter: blur(4px);
}
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.modal-head h2 {
  font-family: sans-serif;
  font-size: 22px;
  margin: 0;
  color: var(--ink);
}
.modal-head button {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--muted);
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}
.modal-summary {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  margin: 0 0 6px;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-align: left;
}
.form-field span {
  color: var(--ink);
}
.form-field input, .form-field textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d2;
  border-radius: 6px;
  background: white;
  font-size: 13px;
  font-weight: 400;
}
.form-field textarea {
  min-height: 70px;
  resize: vertical;
}
.required {
  color:#582cdb;
}
.checkout-error {
  padding: 10px;
  border-radius: 6px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.checkout-success {
  padding: 10px;
  border-radius: 6px;
  background: #f0fdf4;
  color: #16a34a;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.submit-btn {
  margin-top: 8px;
  min-height: 44px;
  background: var(--teal);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 750;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s;
  cursor: pointer;
}
.submit-btn:hover {
  background: var(--teal-dark);
}
.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Storefront Dark Mode Overrides */
.app-dark .store {
  --ink: #f1f5f9;
  --muted: #94a3b8;
  --cream: #0b0f19;
  --line: #23304c;
  --teal: #38bdf8;
  --teal-dark: #0284c7;
  background: var(--cream);
}
.app-dark .store-header {
  background: rgb(11 15 25 / 92%);
  border-bottom-color: #23304c;
}
.app-dark .product-card,
.app-dark .cart-panel,
.app-dark .checkout-modal,
.app-dark .state-card,
.app-dark .demo-login-box {
  background: #151d30;
  border-color: #23304c;
}
.app-dark .store-brand, 
.app-dark .main-nav a {
  color: #f1f5f9;
}
.app-dark .cart-button {
  border-color: #23304c;
  color: #f1f5f9;
}
.app-dark .quantity-control input {
  background: #151d30;
  border-color: #23304c;
  color: #f1f5f9;
}
.app-dark .quantity-control button {
  background: #23304c;
  color: #f1f5f9;
}
.app-dark .announcement {
  background: #070a13;
}
.app-dark .hero-visual {
  background: linear-gradient(145deg, #151d30, #0b0f19);
}
.app-dark .visual-grid {
  opacity: 0.1;
}
.app-dark .hero-product {
  background: rgb(2 132 199 / 86%);
  box-shadow: 0 34px 70px rgb(0 0 0 / 40%);
}
.app-dark .floating-card {
  background: #151d30;
  border-color: #23304c;
  color: #f1f5f9;
}
.app-dark .service-strip {
  border-color: #23304c;
}
.app-dark .service-strip article span {
  background: #151d30;
  color: #38bdf8;
}
.app-dark .catalog-toolbar {
  border-bottom-color: #23304c;
}
.app-dark .category-list button {
  color: #94a3b8;
}
.app-dark .category-list button.active {
  color: #f1f5f9;
  background: #23304c;
}
.app-dark .sort-control select {
  background: #151d30;
  border-color: #23304c;
  color: #f1f5f9;
}
.app-dark .product-footer button {
  background: #23304c;
  color: #f1f5f9;
}
.app-dark .product-footer button:hover {
  background: #384f7a;
}
.app-dark .cart-line {
  border-bottom-color: #23304c;
}
.app-dark .primary-cta {
  color: #0b0f19;
}
.app-dark .cart-footer {
  background: #151d30;
  border-top-color: #23304c;
}
.app-dark .cart-footer > div strong {
  color: #ffffff;
}
.app-dark .cart-footer p {
  color: #cbd5e1;
  background: #23304c;
}
.app-dark footer {
  border-top-color: #23304c;
}
.app-dark .footer-bottom {
  border-top-color: #23304c;
}
.app-dark .modal-summary {
  background: #151d30;
  color: #94a3b8;
}
.app-dark .form-field input, 
.app-dark .form-field textarea {
  background: #151d30;
  border-color: #23304c;
  color: #f1f5f9;
}

.header-right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 12px;
}
.customer-link {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #f8fafc;
  color: var(--ink);
  text-decoration: none;
  font-weight: 800;
  border: 1px solid #d9d9d2;
}
.customer-menu {
  position: relative;
}
.customer-avatar {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  background: var(--teal);
  color: white;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 10px 24px rgb(15 118 110 / 24%);
}
.customer-avatar.large {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
}
.customer-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 40;
  width: min(580px, calc(100vw - 28px));
  max-height: 75vh;
  overflow: auto;
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: white;
  box-shadow: 0 24px 70px rgb(15 23 42 / 18%);
}
.customer-panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5e7eb;
}
.customer-panel-head strong,
.customer-order-line strong {
  display: block;
  color: var(--ink);
}
.customer-panel-head small,
.customer-order-line small,
.customer-panel-muted,
.customer-info p,
.customer-tier-card span {
  color: #64748b;
}
.customer-tier-card {
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  background: #f0fdfa;
  display: grid;
  gap: 4px;
}
.customer-tier-card small,
.customer-history-title {
  font-weight: 800;
  color: var(--teal);
}
.customer-tier-card strong {
  color: #0f172a;
  font-size: 20px;
}
.customer-info {
  margin: 14px 0;
}
.customer-info p {
  margin: 6px 0;
}
.customer-history-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.customer-history-title button {
  border: 0;
  border-radius: 999px;
  padding: 6px 10px;
  background: #e0f2fe;
  color: #0369a1;
  font-weight: 800;
  cursor: pointer;
}
.customer-order-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid #e5e7eb;
}
.customer-order-line span {
  color: #dc2626;
  font-weight: 900;
  white-space: nowrap;
}
.customer-panel-error {
  color: #dc2626;
}
.logout-customer {
  width: 100%;
  margin-top: 14px;
  border: 0;
  border-radius: 12px;
  padding: 12px;
  background: #ef4444;
  color: white;
  font-weight: 900;
  cursor: pointer;
}
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #d9d9d2;
  background: transparent;
  color: var(--ink);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s;
}
.theme-toggle:hover {
  background: rgba(0, 0, 0, 0.05);
}
.app-dark .theme-toggle {
  border-color: #23304c;
  color: #f1f5f9;
}
.app-dark .theme-toggle:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* Stock status sizes and colors */
.in-stock-text {
  color: #16a34a !important;
  font-weight: 700;
  font-size: 13px !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.in-stock-text i {
  color: #16a34a !important;
}
.low-stock-text {
  color: #d97706 !important;
  font-weight: 700;
  font-size: 13px !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.low-stock-text i {
  color: #d97706 !important;
}

/* Dark mode panel overrides for text visibility */
.app-dark .cart-panel,
.app-dark .checkout-modal,
.app-dark .checkout-modal h2,
.app-dark .form-field span {
  color: #f1f5f9 !important;
}
.app-dark .modal-summary {
  background: #23304c;
  color: #cbd5e1;
}
.app-dark .product-card:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
}
.app-dark .product-labels small {
  color: var(--muted);
}
.app-dark .product-footer strong {
  color: var(--ink);
}

.payment-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgb(15 23 42 / 62%);
  backdrop-filter: blur(6px);
}
.payment-confirm-modal {
  position: fixed;
  z-index: 81;
  top: 50%;
  left: 50%;
  width: min(430px, calc(100vw - 32px));
  transform: translate(-50%, -50%);
  padding: 30px;
  border-radius: 18px;
  background: white;
  color: #0f172a;
  text-align: center;
  box-shadow: 0 24px 80px rgb(15 23 42 / 30%);
}
.confirm-icon {
  display: inline-grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 50%;
  background: #ccfbf1;
  color: #0f766e;
  font-size: 28px;
}
.payment-confirm-modal h2 {
  margin: 18px 0 8px;
  font-size: 22px;
}
.payment-confirm-modal > p {
  margin: 0 0 22px;
  color: #64748b;
  line-height: 1.5;
}
.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 20px;
}
.confirm-actions button {
  min-height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: white;
  color: #334155;
  font-weight: 750;
  cursor: pointer;
}
.confirm-actions .pay-button {
  border-color: #0f766e;
  background: #0f766e;
  color: white;
}
.confirm-actions button:disabled {
  opacity: .65;
  cursor: not-allowed;
}
.app-dark .payment-confirm-modal {
  background: #151d30;
  color: #f1f5f9;
}
.app-dark .confirm-actions button {
  border-color: #334155;
  background: #23304c;
  color: #f1f5f9;
}
.app-dark .confirm-actions .pay-button {
  background: #0284c7;
}

/* Storefront Dark Mode Customer Dropdown & Header overrides */
.app-dark .customer-panel {
  background: #151d30;
  border-color: #23304c;
  box-shadow: 0 24px 70px rgb(0 0 0 / 50%);
}
.app-dark .customer-panel-head {
  border-bottom-color: #23304c;
}
.app-dark .customer-panel-head strong,
.app-dark .customer-order-line strong {
  color: #f1f5f9;
}
.app-dark .customer-panel-head small,
.app-dark .customer-order-line small,
.app-dark .customer-panel-muted,
.app-dark .customer-info p,
.app-dark .customer-tier-card span {
  color: #94a3b8;
}
.app-dark .customer-tier-card {
  background: rgba(2, 132, 199, 0.15);
}
.app-dark .customer-tier-card strong {
  color: #38bdf8;
}
.app-dark .customer-history-title {
  color: #38bdf8;
}
.app-dark .customer-history-title button {
  background: transparent;
  color: #38bdf8;
  border-color: #23304c;
}
.app-dark .customer-history-title button:hover {
  background: rgba(255, 255, 255, 0.05);
}
.app-dark .customer-order-line {
  border-bottom-color: #23304c;
}
.app-dark .logout-customer {
  background: #23304c;
  color: #fca5a5;
  border-color: transparent;
}
.app-dark .logout-customer:hover {
  background: #b91c1c;
  color: white;
}
.app-dark .customer-link {
  background: transparent;
  border-color: #23304c;
  color: #f1f5f9;
}
.app-dark .customer-link:hover {
  background: rgba(255, 255, 255, 0.05);
}
.app-dark .brand-mark {
  background: transparent;
  border: 1.5px solid var(--teal);
  color: var(--teal);
}

/* Promo Flash Banner Slider Styles */
.promo-flash-banner-slider {
  margin: 30px 0;
  border-radius: 18px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
  height: 180px;
  transition: all 0.3s ease;
}
.promo-flash-banner-slider:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
}
.promo-track {
  width: 100%;
  height: 100%;
  position: relative;
}
.promo-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(135deg, #be123c, #881337);
  background-size: cover;
  background-position: center;
  padding: 24px 32px;
  display: flex;
  align-items: center;
  transition: opacity 0.8s ease-in-out;
  cursor: pointer;
}
.promo-slide.active {
  opacity: 1;
  pointer-events: auto;
}
.promo-dots {
  position: absolute;
  bottom: 12px;
  left: 32px;
  display: flex;
  gap: 6px;
  z-index: 10;
}
.promo-dot {
  width: 18px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.2s;
}
.promo-dot.active {
  background: white;
  width: 28px;
}
.promo-flash-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
  width: 100%;
}
.promo-flash-text {
  flex: 1;
  min-width: 280px;
  text-align: left;
}
.promo-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fef2f2;
  color: #be123c;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}
.promo-flash-text h2 {
  font-family: sans-serif;
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 6px;
  color: white;
  letter-spacing: -0.02em;
}
.promo-flash-text p {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
}
.promo-flash-timer-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.promo-flash-timer-wrapper > span {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.7);
}
.countdown-clock {
  background: rgba(0, 0, 0, 0.25);
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-family: monospace;
  font-size: 22px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.05em;
}

/* Discount Badge Square */
.discount-badge-square {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  background-color: #ef4444; /* bright red */
  color: white;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

/* Detail modal styles */
.detail-discount-percent-badge {
  background-color: #fee2e2;
  color: #ef4444;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}
.app-dark .detail-discount-percent-badge {
  background-color: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}
.detail-deal-countdown {
  margin-top: 15px;
  padding: 12px;
  border-radius: 8px;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  color: #d97706;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.app-dark .detail-deal-countdown {
  background: rgba(217, 119, 6, 0.1);
  border-color: rgba(217, 119, 6, 0.2);
  color: #fbbf24;
}
.detail-deal-countdown strong {
  font-size: 15px;
  font-family: monospace;
}

/* Dark mode banner adjustment */
.app-dark .promo-slide {
  background: linear-gradient(135deg, #9f1239, #4c0519);
}
.app-dark .promo-badge {
  background: #4c0519;
  color: #fca5a5;
}

/* Header Lang switch styles */
.lang-toggle-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(15, 23, 42, 0.1);
  color: var(--ink);
  font-weight: 700;
  font-size: 11px;
  padding: 8px 12px;
  border-radius: 99px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.lang-toggle-btn:hover {
  background: rgba(15, 23, 42, 0.05);
}
.app-dark .lang-toggle-btn {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: white;
}
.app-dark .lang-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.customer-link.icon-only {
  padding: 8px;
  min-width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
}
.customer-link.icon-only i {
  margin-right: 0;
  font-size: 1.25rem;
}
</style>
