import { computed, onMounted, ref, watch, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { formatCurrency, createPaymentLink } from "../services/orderApi";
import { getProducts } from "../services/productApi";
const products = ref([]);
const cart = ref([]);
const search = ref("");
const category = ref("");
const sort = ref("featured");
const loading = ref(true);
const error = ref("");
const showCart = ref(false);
const animateCart = ref(false);
const route = useRoute();
const CART_STORAGE_KEY = "storefront-cart";
// Product Detail Modal state
const selectedProduct = ref(null);
const selectedImageIndex = ref(0);
const productDetailQuantity = ref(1);
const categories = computed(() => [
    ...new Set(products.value.map((product) => product.categoryName).filter(Boolean)),
].sort());
const availableProducts = computed(() => products.value.filter((product) => product.quantity > 0).length);
const visibleProducts = computed(() => {
    const query = search.value.trim().toLowerCase();
    const filtered = products.value.filter((product) => {
        const matchesCategory = !category.value || product.categoryName === category.value;
        const matchesSearch = !query ||
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
        return 0;
    });
});
const cartCount = computed(() => cart.value.reduce((sum, line) => sum + line.quantity, 0));
const cartTotal = computed(() => cart.value.reduce((sum, line) => sum + line.product.sellingPrice * line.quantity, 0));
async function loadProducts() {
    loading.value = true;
    error.value = "";
    try {
        products.value = await getProducts();
    }
    catch (exception) {
        error.value =
            exception instanceof Error
                ? exception.message
                : "Không thể tải danh sách sản phẩm.";
    }
    finally {
        loading.value = false;
    }
}
// Open product detail modal for quick view
function openProductDetail(product) {
    selectedProduct.value = product;
    selectedImageIndex.value = 0;
    productDetailQuantity.value = 1;
}
// Close product detail modal
function closeProductDetail() {
    selectedProduct.value = null;
    selectedImageIndex.value = 0;
    productDetailQuantity.value = 1;
}
// Add to cart from product detail modal
function addToCartFromDetail() {
    if (!selectedProduct.value)
        return;
    const line = cart.value.find((item) => item.product.id === selectedProduct.value.id);
    const quantity = productDetailQuantity.value;
    if (line) {
        if (line.quantity + quantity <= selectedProduct.value.quantity) {
            line.quantity += quantity;
        }
    }
    else {
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
function getProductImages(product) {
    const images = [product.imageUrl || ""];
    // Add mock alternative images for demo
    if (images[0]) {
        images.push(`${images[0]}?alt=1`, `${images[0]}?alt=2`, `${images[0]}?alt=3`);
    }
    return images.filter(Boolean);
}
// Direct add to cart (triggered from add button, not modal)
function quickAddToCart(product) {
    if (product.quantity <= 0)
        return;
    const line = cart.value.find((item) => item.product.id === product.id);
    if (line) {
        if (line.quantity + 1 <= product.quantity) {
            line.quantity += 1;
        }
    }
    else {
        cart.value.push({ product, quantity: 1 });
    }
    // Animate cart button
    animateCart.value = true;
    setTimeout(() => {
        animateCart.value = false;
    }, 600);
}
function changeQuantity(line, quantity) {
    line.quantity = Math.max(1, Math.min(quantity || 1, line.product.quantity));
}
function removeLine(productId) {
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
function openCheckoutModal() {
    checkoutError.value = "";
    showCheckout.value = true;
}
async function submitOrder() {
    if (checkoutLoading.value)
        return;
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
        window.location.assign(payment.checkoutUrl);
    }
    catch (e) {
        checkoutError.value = e instanceof Error ? e.message : "Không thể tạo liên kết thanh toán.";
    }
    finally {
        checkoutLoading.value = false;
    }
}
function requestPaymentConfirmation() {
    checkoutError.value = "";
    showPaymentConfirm.value = true;
}
const isDark = ref(false);
function toggleDarkMode() {
    isDark.value = !isDark.value;
    if (isDark.value) {
        document.documentElement.classList.add("app-dark");
        localStorage.setItem("theme-dark", "true");
    }
    else {
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
const slides = [
    {
        image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
        title: "Văn phòng phẩm cao cấp",
        subtitle: "Nâng tầm hiệu suất làm việc với bộ sưu tập sổ tay và bút ký tinh tế.",
        category: "Văn phòng"
    },
    {
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200",
        title: "Phụ kiện thông minh",
        subtitle: "Thiết bị công nghệ chính xác, đồng bộ hóa phong cách sống hiện đại.",
        category: "Phụ kiện"
    },
    {
        image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=1200",
        title: "Gia dụng tinh tế",
        subtitle: "Không gian sống ấm cúng với các thiết bị gia dụng tối giản, hiện đại.",
        category: "Gia dụng"
    }
];
let slideInterval = null;
function startSlideTimer() {
    slideInterval = setInterval(() => {
        activeSlide.value = (activeSlide.value + 1) % slides.length;
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
            title: "Tất cả sản phẩm",
            desc: "Khám phá toàn bộ danh mục sản phẩm chất lượng cao của chúng tôi.",
            image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200"
        };
    }
    const cat = category.value;
    if (cat === "Gia dụng" || cat.toLowerCase().includes("gia dụng")) {
        return {
            title: "Thiết bị Gia dụng",
            desc: "Thiết bị tiện nghi, hiện đại kiến tạo không gian sống lý tưởng.",
            image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200"
        };
    }
    if (cat === "Phụ kiện" || cat.toLowerCase().includes("phụ kiện")) {
        return {
            title: "Phụ kiện công nghệ",
            desc: "Đồng hành cùng phong cách sống hiện đại và năng động.",
            image: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=1200"
        };
    }
    if (cat === "Văn phòng" || cat.toLowerCase().includes("văn phòng")) {
        return {
            title: "Văn phòng phẩm",
            desc: "Khơi nguồn cảm hứng làm việc chuyên nghiệp mỗi ngày.",
            image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200"
        };
    }
    return {
        title: cat || "Cửa hàng bán lẻ",
        desc: `Bộ sưu tập sản phẩm ${cat || 'chất lượng cao'}.`,
        image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=1200"
    };
});
onMounted(() => {
    isDark.value = localStorage.getItem("theme-dark") === "true";
    if (isDark.value) {
        document.documentElement.classList.add("app-dark");
    }
    else {
        document.documentElement.classList.remove("app-dark");
    }
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
        try {
            cart.value = JSON.parse(savedCart);
        }
        catch {
            localStorage.removeItem(CART_STORAGE_KEY);
        }
    }
    showCart.value = route.query.cart === "open";
    loadProducts();
    startSlideTimer();
});
watch(cart, (value) => localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(value)), { deep: true });
onUnmounted(() => {
    stopSlideTimer();
});
const __VLS_ctx = (({}));
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['announcement']} */ ;
/** @type {__VLS_StyleScopedClasses['announcement']} */ ;
/** @type {__VLS_StyleScopedClasses['announcement']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['main-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['main-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['main-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['main-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['main-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-button']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-cta']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-product']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-product']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-product']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['carousel-slide']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['slide-content']} */ ;
/** @type {__VLS_StyleScopedClasses['slide-content']} */ ;
/** @type {__VLS_StyleScopedClasses['slide-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['carousel-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['carousel-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['category-banner-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['card-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['category-banner-content']} */ ;
/** @type {__VLS_StyleScopedClasses['category-banner-content']} */ ;
/** @type {__VLS_StyleScopedClasses['pag-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pag-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pag-info']} */ ;
/** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['category-list']} */ ;
/** @type {__VLS_StyleScopedClasses['category-list']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['sort-control']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['product-image']} */ ;
/** @type {__VLS_StyleScopedClasses['product-image']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['product-image']} */ ;
/** @type {__VLS_StyleScopedClasses['image-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['image-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-add']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-add']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-add']} */ ;
/** @type {__VLS_StyleScopedClasses['product-labels']} */ ;
/** @type {__VLS_StyleScopedClasses['product-labels']} */ ;
/** @type {__VLS_StyleScopedClasses['product-content']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['ribbon']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['main-image']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['image-placeholder-large']} */ ;
/** @type {__VLS_StyleScopedClasses['thumbnails']} */ ;
/** @type {__VLS_StyleScopedClasses['thumbnails']} */ ;
/** @type {__VLS_StyleScopedClasses['thumbnails']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['thumbnails']} */ ;
/** @type {__VLS_StyleScopedClasses['product-id']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-status']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-status']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-status']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['qty-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-add-to-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-add-to-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-back-to-store']} */ ;
/** @type {__VLS_StyleScopedClasses['state-card']} */ ;
/** @type {__VLS_StyleScopedClasses['state-card']} */ ;
/** @type {__VLS_StyleScopedClasses['state-card']} */ ;
/** @type {__VLS_StyleScopedClasses['state-card']} */ ;
/** @type {__VLS_StyleScopedClasses['state-card']} */ ;
/** @type {__VLS_StyleScopedClasses['line']} */ ;
/** @type {__VLS_StyleScopedClasses['line']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-head']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-head']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-head']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-head']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-line']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-image']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-info']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-info']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-info']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-control']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-control']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-control']} */ ;
/** @type {__VLS_StyleScopedClasses['remove-line']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['social-links']} */ ;
/** @type {__VLS_StyleScopedClasses['social-links']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-links']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-links']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-links']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-links']} */ ;
/** @type {__VLS_StyleScopedClasses['staff-login-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['system-status']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-visual']} */ ;
/** @type {__VLS_StyleScopedClasses['top-card']} */ ;
/** @type {__VLS_StyleScopedClasses['bottom-card']} */ ;
/** @type {__VLS_StyleScopedClasses['product-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['announcement']} */ ;
/** @type {__VLS_StyleScopedClasses['announcement']} */ ;
/** @type {__VLS_StyleScopedClasses['store-header']} */ ;
/** @type {__VLS_StyleScopedClasses['main-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-visual']} */ ;
/** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['search-box']} */ ;
/** @type {__VLS_StyleScopedClasses['catalog-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['sort-control']} */ ;
/** @type {__VLS_StyleScopedClasses['product-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-add']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-container']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-title']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-content']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-content']} */ ;
/** @type {__VLS_StyleScopedClasses['announcement']} */ ;
/** @type {__VLS_StyleScopedClasses['store-header']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-button']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-button']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-button']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-cta']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-visual']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-product']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-product']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['top-card']} */ ;
/** @type {__VLS_StyleScopedClasses['bottom-card']} */ ;
/** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['product-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['product-image']} */ ;
/** @type {__VLS_StyleScopedClasses['product-content']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['product-detail-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-container']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-title']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['thumbnails']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['state-card']} */ ;
/** @type {__VLS_StyleScopedClasses['state-card']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['closing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-content']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-content']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-bottom']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['store']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['store-header']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['state-card']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['store-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['main-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-button']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-control']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['quantity-control']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['announcement']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-visual']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['visual-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-product']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['floating-card']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['service-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['catalog-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['category-list']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['category-list']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['sort-control']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-line']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-cta']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-bottom']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['in-stock-text']} */ ;
/** @type {__VLS_StyleScopedClasses['low-stock-text']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['checkout-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['form-field']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['product-labels']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-confirm-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-confirm-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-confirm-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['pay-button']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'store' }));
/** @type {__VLS_StyleScopedClasses['store']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'announcement' }));
/** @type {__VLS_StyleScopedClasses['announcement']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-sparkles' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-sparkles']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    to: "/admin",
}));
const __VLS_2 = __VLS_1({
    to: "/admin",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-arrow-up-right' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-arrow-up-right']} */ ;
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)(({ class: 'store-header' }));
/** @type {__VLS_StyleScopedClasses['store-header']} */ ;
let __VLS_6;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6(({
	class: 'store-brand',
	to: '/'
})));
const __VLS_8 = __VLS_7(({
	class: 'store-brand',
	to: '/'
}), ...__VLS_functionalComponentArgsRest(__VLS_7));
/** @type {__VLS_StyleScopedClasses['store-brand']} */ ;
const { default: __VLS_11 } = __VLS_9.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'brand-mark' }));
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shopping-bag' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'brand-copy' }));
/** @type {__VLS_StyleScopedClasses['brand-copy']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
var __VLS_9;
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)(({ class: 'main-nav' }));
/** @type {__VLS_StyleScopedClasses['main-nav']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)((({
	onClick: (...[$event]) => {
		__VLS_ctx.category = '';
		__VLS_ctx.showAllProducts = false;
		;
		[category, showAllProducts];
	},
	href: '#',
	class: { active: !__VLS_ctx.category && !__VLS_ctx.showAllProducts }
})));
/** @type {__VLS_StyleScopedClasses['active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)((({
	onClick: (...[$event]) => {
		__VLS_ctx.category = '';
		__VLS_ctx.showAllProducts = true;
		;
		[
			category,
			category,
			showAllProducts,
			showAllProducts
		];
	},
	href: '#',
	class: { active: !__VLS_ctx.category && __VLS_ctx.showAllProducts }
})));
/** @type {__VLS_StyleScopedClasses['active']} */ ;
for (const [cat] of __VLS_vFor((__VLS_ctx.categories))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)((({
	onClick: (...[$event]) => {
		__VLS_ctx.category = cat;
		__VLS_ctx.showAllProducts = false;
		;
		[
			category,
			category,
			showAllProducts,
			showAllProducts,
			categories
		];
	},
	key: cat,
	href: '#',
	class: { active: __VLS_ctx.category === cat }
})));
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    (cat);
    // @ts-ignore
    [category,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'header-right' }));
/** @type {__VLS_StyleScopedClasses['header-right']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: __VLS_ctx.toggleDarkMode,
	class: 'theme-toggle',
	type: 'button',
	'aria-label': 'Đổi giao diện'
})));
/** @type {__VLS_StyleScopedClasses['theme-toggle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: __VLS_ctx.isDark ? 'pi pi-sun' : 'pi pi-moon' }));
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(((({
	onClick: (...[$event]) => {
		__VLS_ctx.showCart = true;
		[
			toggleDarkMode,
			isDark,
			showCart
		];
	},
	class: 'cart-button',
	class: { 'cart-pop': __VLS_ctx.animateCart },
	type: 'button'
}))));
/** @type {__VLS_StyleScopedClasses['cart-button']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-pop']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shopping-bag' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)({});
(__VLS_ctx.cartCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({});
if (!__VLS_ctx.category && !__VLS_ctx.showAllProducts) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)(({ class: 'hero' }));
    /** @type {__VLS_StyleScopedClasses['hero']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'hero-copy' }));
    /** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'eyebrow' }));
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.br)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.em, __VLS_intrinsics.em)(({ class: 'fs-6' }));
    /** @type {__VLS_StyleScopedClasses['fs-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'hero-actions' }));
    /** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)((({
	onClick: (...[$event]) => {
		if (!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		__VLS_ctx.showAllProducts = true;
		__VLS_ctx.category = '';
		;
		[
			category,
			category,
			showAllProducts,
			showAllProducts,
			animateCart,
			cartCount
		];
	},
	class: 'primary-cta',
	href: '#products'
})));
    /** @type {__VLS_StyleScopedClasses['primary-cta']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-arrow-right' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-arrow-right']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-check-circle' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-check-circle']} */ ;
    (__VLS_ctx.availableProducts);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'hero-visual' }));
    /** @type {__VLS_StyleScopedClasses['hero-visual']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'visual-grid' }));
    /** @type {__VLS_StyleScopedClasses['visual-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'hero-orbit orbit-one' }));
    /** @type {__VLS_StyleScopedClasses['hero-orbit']} */ ;
    /** @type {__VLS_StyleScopedClasses['orbit-one']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'hero-orbit orbit-two' }));
    /** @type {__VLS_StyleScopedClasses['hero-orbit']} */ ;
    /** @type {__VLS_StyleScopedClasses['orbit-two']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'hero-product' }));
    /** @type {__VLS_StyleScopedClasses['hero-product']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'hero-icon' }));
    /** @type {__VLS_StyleScopedClasses['hero-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-box' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-box']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.products.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'floating-card top-card' }));
    /** @type {__VLS_StyleScopedClasses['floating-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-sync' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-sync']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'floating-card bottom-card' }));
    /** @type {__VLS_StyleScopedClasses['floating-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['bottom-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shield' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-shield']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
if (!__VLS_ctx.category && !__VLS_ctx.showAllProducts) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)(({ class: 'home-carousel' }));
    /** @type {__VLS_StyleScopedClasses['home-carousel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'carousel-track' }));
    /** @type {__VLS_StyleScopedClasses['carousel-track']} */ ;
    for (const [slide, index] of __VLS_vFor((__VLS_ctx.slides))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(((({
	key: index,
	class: 'carousel-slide',
	class: { active: __VLS_ctx.activeSlide === index },
	style: { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.45)), url(${slide.image})` }
}))));
        /** @type {__VLS_StyleScopedClasses['carousel-slide']} */ ;
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'slide-content' }));
        /** @type {__VLS_StyleScopedClasses['slide-content']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'slide-badge' }));
        /** @type {__VLS_StyleScopedClasses['slide-badge']} */ ;
        (slide.category);
        __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
        (slide.title);
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (slide.subtitle);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		__VLS_ctx.category = slide.category;
		__VLS_ctx.showAllProducts = false;
		;
		[
			category,
			category,
			showAllProducts,
			showAllProducts,
			availableProducts,
			products,
			slides,
			activeSlide
		];
	},
	class: 'slide-btn',
	type: 'button'
})));
        /** @type {__VLS_StyleScopedClasses['slide-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-arrow-right' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-arrow-right']} */ ;
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'carousel-dots' }));
    /** @type {__VLS_StyleScopedClasses['carousel-dots']} */ ;
    for (const [slide, index] of __VLS_vFor((__VLS_ctx.slides))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span)(((({
	onClick: (...[$event]) => {
		if (!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		__VLS_ctx.activeSlide = index;
		[slides, activeSlide];
	},
	key: index,
	class: 'dot',
	class: { active: __VLS_ctx.activeSlide === index }
}))));
        /** @type {__VLS_StyleScopedClasses['dot']} */ ;
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        // @ts-ignore
        [activeSlide,];
    }
}
if (!__VLS_ctx.category && !__VLS_ctx.showAllProducts) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)(({ class: 'category-strip' }));
    /** @type {__VLS_StyleScopedClasses['category-strip']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(((({
	onClick: (...[$event]) => {
		if (!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		__VLS_ctx.category = 'Gia dụng';
		__VLS_ctx.showAllProducts = false;
		;
		[
			category,
			category,
			showAllProducts,
			showAllProducts
		];
	},
	class: 'category-banner-card',
	style: { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=600)` }
}))));
    /** @type {__VLS_StyleScopedClasses['category-banner-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'card-inner' }));
    /** @type {__VLS_StyleScopedClasses['card-inner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(((({
	onClick: (...[$event]) => {
		if (!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		__VLS_ctx.category = 'Phụ kiện';
		__VLS_ctx.showAllProducts = false;
		;
		[category, showAllProducts];
	},
	class: 'category-banner-card',
	style: { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=600)` }
}))));
    /** @type {__VLS_StyleScopedClasses['category-banner-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'card-inner' }));
    /** @type {__VLS_StyleScopedClasses['card-inner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(((({
	onClick: (...[$event]) => {
		if (!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		__VLS_ctx.category = 'Văn phòng';
		__VLS_ctx.showAllProducts = false;
		;
		[category, showAllProducts];
	},
	class: 'category-banner-card',
	style: { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.5)), url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600)` }
}))));
    /** @type {__VLS_StyleScopedClasses['category-banner-card']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'card-inner' }));
    /** @type {__VLS_StyleScopedClasses['card-inner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
if (__VLS_ctx.category || __VLS_ctx.showAllProducts) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)((({
	class: 'category-hero-banner',
	style: { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.6)), url(${__VLS_ctx.categoryBanner.image})` }
})));
    /** @type {__VLS_StyleScopedClasses['category-hero-banner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'category-banner-content' }));
    /** @type {__VLS_StyleScopedClasses['category-banner-content']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
    (__VLS_ctx.categoryBanner.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.categoryBanner.desc);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)(({
	id: 'products',
	class: 'catalog'
}));
/** @type {__VLS_StyleScopedClasses['catalog']} */ ;
if (!__VLS_ctx.category && !__VLS_ctx.showAllProducts) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'section-heading' }));
    /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'eyebrow' }));
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)((({
	class: 'product-grid',
	style: {}
})));
        /** @type {__VLS_StyleScopedClasses['product-grid']} */ ;
        for (const [item] of __VLS_vFor((8))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(({
	key: item,
	class: 'product-card skeleton-card'
}));
            /** @type {__VLS_StyleScopedClasses['product-card']} */ ;
            /** @type {__VLS_StyleScopedClasses['skeleton-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'skeleton image-skeleton' }));
            /** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
            /** @type {__VLS_StyleScopedClasses['image-skeleton']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'skeleton line short' }));
            /** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
            /** @type {__VLS_StyleScopedClasses['line']} */ ;
            /** @type {__VLS_StyleScopedClasses['short']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'skeleton line' }));
            /** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
            /** @type {__VLS_StyleScopedClasses['line']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'skeleton line medium' }));
            /** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
            /** @type {__VLS_StyleScopedClasses['line']} */ ;
            /** @type {__VLS_StyleScopedClasses['medium']} */ ;
            // @ts-ignore
            [category, category, showAllProducts, showAllProducts, categoryBanner, categoryBanner, categoryBanner, loading,];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)((({
	class: 'product-grid',
	style: {}
})));
        /** @type {__VLS_StyleScopedClasses['product-grid']} */ ;
        for (const [product] of __VLS_vFor((__VLS_ctx.featuredProducts))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)((({
	onClick: (...[$event]) => {
		if (!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		if (!!__VLS_ctx.loading) return;
		__VLS_ctx.openProductDetail(product);
		[featuredProducts, openProductDetail];
	},
	key: product.id,
	class: 'product-card'
})));
            /** @type {__VLS_StyleScopedClasses['product-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-image' }));
            /** @type {__VLS_StyleScopedClasses['product-image']} */ ;
            if (product.quantity > 0 && product.quantity <= product.reserveStock) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'ribbon-wrapper' }));
                /** @type {__VLS_StyleScopedClasses['ribbon-wrapper']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'ribbon low-stock' }));
                /** @type {__VLS_StyleScopedClasses['ribbon']} */ ;
                /** @type {__VLS_StyleScopedClasses['low-stock']} */ ;
            }
            if (product.quantity <= 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'stock-badge sold-out' }));
                /** @type {__VLS_StyleScopedClasses['stock-badge']} */ ;
                /** @type {__VLS_StyleScopedClasses['sold-out']} */ ;
            }
            if (product.imageUrl) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                    src: (product.imageUrl),
                    alt: (product.name),
                });
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'image-placeholder' }));
                /** @type {__VLS_StyleScopedClasses['image-placeholder']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-box' }));
                /** @type {__VLS_StyleScopedClasses['pi']} */ ;
                /** @type {__VLS_StyleScopedClasses['pi-box']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
                (product.id);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-content' }));
            /** @type {__VLS_StyleScopedClasses['product-content']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-labels' }));
            /** @type {__VLS_StyleScopedClasses['product-labels']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (product.categoryName || "Sản phẩm");
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            (product.id);
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
            (product.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-footer' }));
            /** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (__VLS_ctx.formatCurrency(product.sellingPrice));
            if (product.quantity > 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)(({ class: product.quantity <= product.reserveStock ? 'low-stock-text' : 'in-stock-text' }));
                __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-check-circle' }));
                /** @type {__VLS_StyleScopedClasses['pi']} */ ;
                /** @type {__VLS_StyleScopedClasses['pi-check-circle']} */ ;
                (product.quantity <= product.reserveStock ? `Sắp hết (Còn ${product.quantity})` : `Còn hàng (${product.quantity})`);
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)(({ class: 'unavailable' }));
                /** @type {__VLS_StyleScopedClasses['unavailable']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		if (!!__VLS_ctx.loading) return;
		__VLS_ctx.quickAddToCart(product);
		[formatCurrency, quickAddToCart];
	},
	type: 'button',
	disabled: product.quantity <= 0
}));
            __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shopping-bag' }));
            /** @type {__VLS_StyleScopedClasses['pi']} */ ;
            /** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            // @ts-ignore
            [];
        }
    }
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'section-heading' }));
    /** @type {__VLS_StyleScopedClasses['section-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'eyebrow' }));
    /** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    (__VLS_ctx.category || 'Tất cả sản phẩm');
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.visibleProducts.length);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'search-box' }));
    /** @type {__VLS_StyleScopedClasses['search-box']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-search' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-search']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "search",
        placeholder: "Tìm tên, mã hoặc danh mục...",
    });
    (__VLS_ctx.search);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'catalog-toolbar' }));
    /** @type {__VLS_StyleScopedClasses['catalog-toolbar']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'active-filters' }));
    /** @type {__VLS_StyleScopedClasses['active-filters']} */ ;
    if (__VLS_ctx.search) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'filter-tag' }));
        /** @type {__VLS_StyleScopedClasses['filter-tag']} */ ;
        (__VLS_ctx.search);
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(((({
	onClick: (...[$event]) => {
		if (!!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		if (!__VLS_ctx.search) return;
		__VLS_ctx.search = '';
		[
			category,
			visibleProducts,
			search,
			search,
			search,
			search
		];
	},
	class: 'pi pi-times',
	style: {}
}))));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)(({ class: 'sort-control' }));
    /** @type {__VLS_StyleScopedClasses['sort-control']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.sort),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "featured",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "price-asc",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "price-desc",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: "name",
    });
    if (__VLS_ctx.error) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'state-card error-state' }));
        /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['error-state']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-wifi' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-wifi']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        (__VLS_ctx.error);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: __VLS_ctx.loadProducts,
	type: 'button'
}));
    }
    else if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-grid' }));
        /** @type {__VLS_StyleScopedClasses['product-grid']} */ ;
        for (const [item] of __VLS_vFor((8))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(({
	key: item,
	class: 'product-card skeleton-card'
}));
            /** @type {__VLS_StyleScopedClasses['product-card']} */ ;
            /** @type {__VLS_StyleScopedClasses['skeleton-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'skeleton image-skeleton' }));
            /** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
            /** @type {__VLS_StyleScopedClasses['image-skeleton']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'skeleton line short' }));
            /** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
            /** @type {__VLS_StyleScopedClasses['line']} */ ;
            /** @type {__VLS_StyleScopedClasses['short']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'skeleton line' }));
            /** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
            /** @type {__VLS_StyleScopedClasses['line']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'skeleton line medium' }));
            /** @type {__VLS_StyleScopedClasses['skeleton']} */ ;
            /** @type {__VLS_StyleScopedClasses['line']} */ ;
            /** @type {__VLS_StyleScopedClasses['medium']} */ ;
            // @ts-ignore
            [loading, sort, error, error, loadProducts,];
        }
    }
    else if (!__VLS_ctx.visibleProducts.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'state-card empty-state' }));
        /** @type {__VLS_StyleScopedClasses['state-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-search' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-search']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: __VLS_ctx.clearFilters,
	type: 'button'
}));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-grid' }));
        /** @type {__VLS_StyleScopedClasses['product-grid']} */ ;
        for (const [product] of __VLS_vFor((__VLS_ctx.paginatedProducts))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)((({
	onClick: (...[$event]) => {
		if (!!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		if (!!__VLS_ctx.error) return;
		if (!!__VLS_ctx.loading) return;
		if (!!!__VLS_ctx.visibleProducts.length) return;
		__VLS_ctx.openProductDetail(product);
		[
			openProductDetail,
			visibleProducts,
			clearFilters,
			paginatedProducts
		];
	},
	key: product.id,
	class: 'product-card'
})));
            /** @type {__VLS_StyleScopedClasses['product-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-image' }));
            /** @type {__VLS_StyleScopedClasses['product-image']} */ ;
            if (product.quantity > 0 && product.quantity <= product.reserveStock) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'ribbon-wrapper' }));
                /** @type {__VLS_StyleScopedClasses['ribbon-wrapper']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'ribbon low-stock' }));
                /** @type {__VLS_StyleScopedClasses['ribbon']} */ ;
                /** @type {__VLS_StyleScopedClasses['low-stock']} */ ;
            }
            if (product.quantity <= 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'stock-badge sold-out' }));
                /** @type {__VLS_StyleScopedClasses['stock-badge']} */ ;
                /** @type {__VLS_StyleScopedClasses['sold-out']} */ ;
            }
            if (product.imageUrl) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                    src: (product.imageUrl),
                    alt: (product.name),
                });
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'image-placeholder' }));
                /** @type {__VLS_StyleScopedClasses['image-placeholder']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-box' }));
                /** @type {__VLS_StyleScopedClasses['pi']} */ ;
                /** @type {__VLS_StyleScopedClasses['pi-box']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
                (product.id);
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-content' }));
            /** @type {__VLS_StyleScopedClasses['product-content']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-labels' }));
            /** @type {__VLS_StyleScopedClasses['product-labels']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            (product.categoryName || "Sản phẩm");
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            (product.id);
            __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
            (product.name);
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'product-footer' }));
            /** @type {__VLS_StyleScopedClasses['product-footer']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (__VLS_ctx.formatCurrency(product.sellingPrice));
            if (product.quantity > 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)(({ class: product.quantity <= product.reserveStock ? 'low-stock-text' : 'in-stock-text' }));
                __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-check-circle' }));
                /** @type {__VLS_StyleScopedClasses['pi']} */ ;
                /** @type {__VLS_StyleScopedClasses['pi-check-circle']} */ ;
                (product.quantity <= product.reserveStock ? `Sắp hết (Còn ${product.quantity})` : `Còn hàng (${product.quantity})`);
            }
            else {
                __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)(({ class: 'unavailable' }));
                /** @type {__VLS_StyleScopedClasses['unavailable']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		if (!!__VLS_ctx.error) return;
		if (!!__VLS_ctx.loading) return;
		if (!!!__VLS_ctx.visibleProducts.length) return;
		__VLS_ctx.quickAddToCart(product);
		[formatCurrency, quickAddToCart];
	},
	type: 'button',
	disabled: product.quantity <= 0
}));
            __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shopping-bag' }));
            /** @type {__VLS_StyleScopedClasses['pi']} */ ;
            /** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
            // @ts-ignore
            [];
        }
        if (__VLS_ctx.totalPages > 1) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'pagination-container' }));
            /** @type {__VLS_StyleScopedClasses['pagination-container']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		if (!!__VLS_ctx.error) return;
		if (!!__VLS_ctx.loading) return;
		if (!!!__VLS_ctx.visibleProducts.length) return;
		if (!(__VLS_ctx.totalPages > 1)) return;
		__VLS_ctx.currentPage--;
		[totalPages, currentPage];
	},
	class: 'pag-btn',
	disabled: __VLS_ctx.currentPage === 1,
	'aria-label': 'Trang trước'
})));
            /** @type {__VLS_StyleScopedClasses['pag-btn']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-chevron-left' }));
            /** @type {__VLS_StyleScopedClasses['pi']} */ ;
            /** @type {__VLS_StyleScopedClasses['pi-chevron-left']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'pag-info' }));
            /** @type {__VLS_StyleScopedClasses['pag-info']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (__VLS_ctx.currentPage);
            (__VLS_ctx.totalPages);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!!(!__VLS_ctx.category && !__VLS_ctx.showAllProducts)) return;
		if (!!__VLS_ctx.error) return;
		if (!!__VLS_ctx.loading) return;
		if (!!!__VLS_ctx.visibleProducts.length) return;
		if (!(__VLS_ctx.totalPages > 1)) return;
		__VLS_ctx.currentPage++;
		[
			totalPages,
			currentPage,
			currentPage,
			currentPage
		];
	},
	class: 'pag-btn',
	disabled: __VLS_ctx.currentPage === __VLS_ctx.totalPages,
	'aria-label': 'Trang sau'
})));
            /** @type {__VLS_StyleScopedClasses['pag-btn']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-chevron-right' }));
            /** @type {__VLS_StyleScopedClasses['pi']} */ ;
            /** @type {__VLS_StyleScopedClasses['pi-chevron-right']} */ ;
        }
    }
}
if (__VLS_ctx.selectedProduct) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)((({
	onClick: __VLS_ctx.closeProductDetail,
	class: 'product-detail-overlay'
})));
    /** @type {__VLS_StyleScopedClasses['product-detail-overlay']} */ ;
}
if (__VLS_ctx.selectedProduct) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({
	class: 'product-detail-modal',
	'aria-modal': 'true',
	role: 'dialog'
}));
    /** @type {__VLS_StyleScopedClasses['product-detail-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: __VLS_ctx.closeProductDetail,
	type: 'button',
	class: 'detail-close-btn',
	'aria-label': 'Đóng'
})));
    /** @type {__VLS_StyleScopedClasses['detail-close-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-times' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'detail-container' }));
    /** @type {__VLS_StyleScopedClasses['detail-container']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'detail-gallery' }));
    /** @type {__VLS_StyleScopedClasses['detail-gallery']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'main-image' }));
    /** @type {__VLS_StyleScopedClasses['main-image']} */ ;
    if (__VLS_ctx.getProductImages(__VLS_ctx.selectedProduct)[__VLS_ctx.selectedImageIndex]) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
            src: (__VLS_ctx.getProductImages(__VLS_ctx.selectedProduct)[__VLS_ctx.selectedImageIndex]),
            alt: (__VLS_ctx.selectedProduct.name),
        });
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'image-placeholder-large' }));
        /** @type {__VLS_StyleScopedClasses['image-placeholder-large']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-box' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-box']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (__VLS_ctx.selectedProduct.id);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'thumbnails' }));
    /** @type {__VLS_StyleScopedClasses['thumbnails']} */ ;
    for (const [image, idx] of __VLS_vFor((__VLS_ctx.getProductImages(__VLS_ctx.selectedProduct)))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!__VLS_ctx.selectedProduct) return;
		__VLS_ctx.selectedImageIndex = idx;
		[
			totalPages,
			currentPage,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			closeProductDetail,
			closeProductDetail,
			getProductImages,
			getProductImages,
			getProductImages,
			selectedImageIndex,
			selectedImageIndex,
			selectedImageIndex
		];
	},
	key: idx,
	type: 'button',
	class: { active: idx === __VLS_ctx.selectedImageIndex },
	'aria-label': `Image ${idx + 1}`
})));
        /** @type {__VLS_StyleScopedClasses['active']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
            src: (image),
            alt: (`Product image ${idx + 1}`),
        });
        // @ts-ignore
        [selectedImageIndex,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'detail-info' }));
    /** @type {__VLS_StyleScopedClasses['detail-info']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'detail-header' }));
    /** @type {__VLS_StyleScopedClasses['detail-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'detail-category' }));
    /** @type {__VLS_StyleScopedClasses['detail-category']} */ ;
    (__VLS_ctx.selectedProduct.categoryName || "Sản phẩm");
    __VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)(({ class: 'detail-title' }));
    /** @type {__VLS_StyleScopedClasses['detail-title']} */ ;
    (__VLS_ctx.selectedProduct.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'detail-meta' }));
    /** @type {__VLS_StyleScopedClasses['detail-meta']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'product-id' }));
    /** @type {__VLS_StyleScopedClasses['product-id']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.selectedProduct.id);
    if (__VLS_ctx.selectedProduct.quantity > 0) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'stock-status in-stock' }));
        /** @type {__VLS_StyleScopedClasses['stock-status']} */ ;
        /** @type {__VLS_StyleScopedClasses['in-stock']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-check-circle' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-check-circle']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.selectedProduct.quantity <= __VLS_ctx.selectedProduct.reserveStock ? `Sắp hết (Còn ${__VLS_ctx.selectedProduct.quantity})` : `Còn hàng (${__VLS_ctx.selectedProduct.quantity} sản phẩm)`);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'stock-status out-of-stock' }));
        /** @type {__VLS_StyleScopedClasses['stock-status']} */ ;
        /** @type {__VLS_StyleScopedClasses['out-of-stock']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-times-circle' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-times-circle']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'detail-price' }));
    /** @type {__VLS_StyleScopedClasses['detail-price']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'price-label' }));
    /** @type {__VLS_StyleScopedClasses['price-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)(({ class: 'price-value' }));
    /** @type {__VLS_StyleScopedClasses['price-value']} */ ;
    (__VLS_ctx.formatCurrency(__VLS_ctx.selectedProduct.sellingPrice));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'quantity-picker' }));
    /** @type {__VLS_StyleScopedClasses['quantity-picker']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
        for: "qty",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'qty-controls' }));
    /** @type {__VLS_StyleScopedClasses['qty-controls']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!__VLS_ctx.selectedProduct) return;
		__VLS_ctx.productDetailQuantity = Math.max(1, __VLS_ctx.productDetailQuantity - 1);
		[
			formatCurrency,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			selectedProduct,
			productDetailQuantity,
			productDetailQuantity
		];
	},
	type: 'button',
	'aria-label': 'Giảm số lượng'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-minus' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-minus']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        id: "qty",
        type: "number",
        min: "1",
        max: (__VLS_ctx.selectedProduct.quantity),
    });
    (__VLS_ctx.productDetailQuantity);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!__VLS_ctx.selectedProduct) return;
		__VLS_ctx.productDetailQuantity = Math.min(__VLS_ctx.selectedProduct.quantity, __VLS_ctx.productDetailQuantity + 1);
		[
			selectedProduct,
			selectedProduct,
			productDetailQuantity,
			productDetailQuantity,
			productDetailQuantity
		];
	},
	type: 'button',
	'aria-label': 'Tăng số lượng'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-plus' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-plus']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'detail-actions' }));
    /** @type {__VLS_StyleScopedClasses['detail-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: __VLS_ctx.addToCartFromDetail,
	type: 'button',
	class: 'btn-add-to-cart',
	disabled: __VLS_ctx.selectedProduct.quantity <= 0
})));
    /** @type {__VLS_StyleScopedClasses['btn-add-to-cart']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shopping-bag' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: __VLS_ctx.closeProductDetail,
	type: 'button',
	class: 'btn-back-to-store'
})));
    /** @type {__VLS_StyleScopedClasses['btn-back-to-store']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-arrow-left' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-arrow-left']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)((({
	class: 'cart-panel',
	class: { open: __VLS_ctx.showCart },
	'aria-label': 'Giỏ hàng'
})));
/** @type {__VLS_StyleScopedClasses['cart-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['open']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'cart-head' }));
/** @type {__VLS_StyleScopedClasses['cart-head']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
(__VLS_ctx.cartCount);
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		__VLS_ctx.showCart = false;
		[
			showCart,
			showCart,
			cartCount,
			selectedProduct,
			closeProductDetail,
			addToCartFromDetail
		];
	},
	type: 'button',
	'aria-label': 'Đóng'
}));
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-times' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
if (!__VLS_ctx.cart.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'empty-cart' }));
    /** @type {__VLS_StyleScopedClasses['empty-cart']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shopping-bag' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!!__VLS_ctx.cart.length) return;
		__VLS_ctx.showCart = false;
		[showCart, cart];
	},
	type: 'button'
}));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'cart-body' }));
    /** @type {__VLS_StyleScopedClasses['cart-body']} */ ;
    for (const [line] of __VLS_vFor((__VLS_ctx.cart))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({
	key: line.product.id,
	class: 'cart-line'
}));
        /** @type {__VLS_StyleScopedClasses['cart-line']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'cart-image' }));
        /** @type {__VLS_StyleScopedClasses['cart-image']} */ ;
        if (line.product.imageUrl) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.img)({
                src: (line.product.imageUrl),
                alt: (line.product.name),
            });
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-box' }));
            /** @type {__VLS_StyleScopedClasses['pi']} */ ;
            /** @type {__VLS_StyleScopedClasses['pi-box']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'cart-info' }));
        /** @type {__VLS_StyleScopedClasses['cart-info']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (line.product.categoryName);
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (line.product.name);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.formatCurrency(line.product.sellingPrice));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'quantity-control' }));
        /** @type {__VLS_StyleScopedClasses['quantity-control']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!!!__VLS_ctx.cart.length) return;
		__VLS_ctx.changeQuantity(line, line.quantity - 1);
		[
			formatCurrency,
			cart,
			changeQuantity
		];
	},
	type: 'button',
	'aria-label': 'Giảm số lượng'
}));
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-minus' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-minus']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)(({
	onInput: (...[$event]) => {
		if (!!!__VLS_ctx.cart.length) return;
		__VLS_ctx.changeQuantity(line, Number($event.target.value));
		[changeQuantity];
	},
	value: line.quantity,
	type: 'number',
	min: '1',
	max: line.product.quantity
}));
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!!!__VLS_ctx.cart.length) return;
		__VLS_ctx.changeQuantity(line, line.quantity + 1);
		[changeQuantity];
	},
	type: 'button',
	'aria-label': 'Tăng số lượng'
}));
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-plus' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-plus']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!!!__VLS_ctx.cart.length) return;
		__VLS_ctx.removeLine(line.product.id);
		[removeLine];
	},
	class: 'remove-line',
	type: 'button',
	'aria-label': 'Xóa sản phẩm'
})));
        /** @type {__VLS_StyleScopedClasses['remove-line']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-trash' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-trash']} */ ;
        // @ts-ignore
        [];
    }
}
if (__VLS_ctx.cart.length) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'cart-footer' }));
    /** @type {__VLS_StyleScopedClasses['cart-footer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatCurrency(__VLS_ctx.cartTotal));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-info-circle' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-info-circle']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: __VLS_ctx.openCheckoutModal,
	type: 'button'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-arrow-right' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-arrow-right']} */ ;
}
if (__VLS_ctx.showCheckout) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)((({
	onClick: (...[$event]) => {
		if (!__VLS_ctx.showCheckout) return;
		__VLS_ctx.showCheckout = false;
		[
			formatCurrency,
			cart,
			cartTotal,
			openCheckoutModal,
			showCheckout,
			showCheckout
		];
	},
	class: 'modal-backdrop'
})));
    /** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
}
if (__VLS_ctx.showCheckout) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)(({
	class: 'checkout-modal',
	'aria-label': 'Thông tin đặt hàng'
}));
    /** @type {__VLS_StyleScopedClasses['checkout-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'modal-head' }));
    /** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!__VLS_ctx.showCheckout) return;
		__VLS_ctx.showCheckout = false;
		[showCheckout, showCheckout];
	},
	type: 'button',
	'aria-label': 'Đóng'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-times' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)((({
	onSubmit: __VLS_ctx.requestPaymentConfirmation,
	class: 'modal-body'
})));
    /** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)(({ class: 'modal-summary' }));
    /** @type {__VLS_StyleScopedClasses['modal-summary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.cartCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatCurrency(__VLS_ctx.cartTotal));
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)(({ class: 'form-field' }));
    /** @type {__VLS_StyleScopedClasses['form-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)(({ class: 'required' }));
    /** @type {__VLS_StyleScopedClasses['required']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        required: true,
        placeholder: "Nhập họ và tên",
    });
    (__VLS_ctx.customerForm.fullName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)(({ class: 'form-field' }));
    /** @type {__VLS_StyleScopedClasses['form-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)(({ class: 'required' }));
    /** @type {__VLS_StyleScopedClasses['required']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "tel",
        required: true,
        placeholder: "Nhập số điện thoại",
    });
    (__VLS_ctx.customerForm.phone);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)(({ class: 'form-field' }));
    /** @type {__VLS_StyleScopedClasses['form-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "email",
        placeholder: "Nhập địa chỉ email",
    });
    (__VLS_ctx.customerForm.email);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)(({ class: 'form-field' }));
    /** @type {__VLS_StyleScopedClasses['form-field']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.b, __VLS_intrinsics.b)(({ class: 'required' }));
    /** @type {__VLS_StyleScopedClasses['required']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.textarea)({
        value: (__VLS_ctx.customerForm.address),
        required: true,
        placeholder: "Số nhà, tên đường, quận/huyện...",
    });
    if (__VLS_ctx.checkoutError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'checkout-error' }));
        /** @type {__VLS_StyleScopedClasses['checkout-error']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-exclamation-circle' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-exclamation-circle']} */ ;
        (__VLS_ctx.checkoutError);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	type: 'submit',
	class: 'submit-btn',
	disabled: __VLS_ctx.checkoutLoading
}));
    /** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
if (__VLS_ctx.showPaymentConfirm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)((({
	onClick: (...[$event]) => {
		if (!__VLS_ctx.showPaymentConfirm) return;
		!__VLS_ctx.checkoutLoading && (__VLS_ctx.showPaymentConfirm = false);
		[
			cartCount,
			formatCurrency,
			cartTotal,
			requestPaymentConfirmation,
			customerForm,
			customerForm,
			customerForm,
			customerForm,
			checkoutError,
			checkoutError,
			checkoutLoading,
			checkoutLoading,
			showPaymentConfirm,
			showPaymentConfirm
		];
	},
	class: 'payment-confirm-overlay'
})));
    /** @type {__VLS_StyleScopedClasses['payment-confirm-overlay']} */ ;
}
if (__VLS_ctx.showPaymentConfirm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)(({
	class: 'payment-confirm-modal',
	role: 'dialog',
	'aria-modal': 'true',
	'aria-label': 'Xác nhận thanh toán'
}));
    /** @type {__VLS_StyleScopedClasses['payment-confirm-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'confirm-icon' }));
    /** @type {__VLS_StyleScopedClasses['confirm-icon']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-question-circle' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-question-circle']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    if (__VLS_ctx.checkoutError) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'checkout-error' }));
        /** @type {__VLS_StyleScopedClasses['checkout-error']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-exclamation-circle' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-exclamation-circle']} */ ;
        (__VLS_ctx.checkoutError);
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'confirm-actions' }));
    /** @type {__VLS_StyleScopedClasses['confirm-actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!__VLS_ctx.showPaymentConfirm) return;
		__VLS_ctx.showPaymentConfirm = false;
		[
			checkoutError,
			checkoutError,
			showPaymentConfirm,
			showPaymentConfirm
		];
	},
	type: 'button',
	disabled: __VLS_ctx.checkoutLoading
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: __VLS_ctx.submitOrder,
	type: 'button',
	class: 'pay-button',
	disabled: __VLS_ctx.checkoutLoading
})));
    /** @type {__VLS_StyleScopedClasses['pay-button']} */ ;
    if (__VLS_ctx.checkoutLoading) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-spin pi-spinner' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-spin']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-spinner']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (__VLS_ctx.checkoutLoading ? 'Đang tạo liên kết...' : 'Thanh toán');
}
__VLS_asFunctionalElement1(__VLS_intrinsics.footer, __VLS_intrinsics.footer)({
    id: "footer",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'footer-content' }));
/** @type {__VLS_StyleScopedClasses['footer-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'footer-brand-section' }));
/** @type {__VLS_StyleScopedClasses['footer-brand-section']} */ ;
let __VLS_12;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12(({
	class: 'store-brand footer-brand',
	to: '/'
})));
const __VLS_14 = __VLS_13(({
	class: 'store-brand footer-brand',
	to: '/'
}), ...__VLS_functionalComponentArgsRest(__VLS_13));
/** @type {__VLS_StyleScopedClasses['store-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-brand']} */ ;
const { default: __VLS_17 } = __VLS_15.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'brand-mark' }));
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shopping-bag' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'brand-copy' }));
/** @type {__VLS_StyleScopedClasses['brand-copy']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
// @ts-ignore
[checkoutLoading, checkoutLoading, checkoutLoading, checkoutLoading, submitOrder,];
var __VLS_15;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'social-links' }));
/** @type {__VLS_StyleScopedClasses['social-links']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
    href: "#",
    'aria-label': "Facebook",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-facebook' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-facebook']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
    href: "#",
    'aria-label': "Youtube",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-youtube' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-youtube']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
    href: "#",
    'aria-label': "Twitter",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-twitter' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-twitter']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'footer-links' }));
/** @type {__VLS_StyleScopedClasses['footer-links']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
    href: "#products",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
    href: "#service",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
    href: "#footer",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'footer-links' }));
/** @type {__VLS_StyleScopedClasses['footer-links']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-phone' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-phone']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-envelope' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-envelope']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-map-marker' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-map-marker']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'footer-links' }));
/** @type {__VLS_StyleScopedClasses['footer-links']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
let __VLS_18;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18(({
	class: 'staff-login-btn',
	to: '/admin'
})));
const __VLS_20 = __VLS_19(({
	class: 'staff-login-btn',
	to: '/admin'
}), ...__VLS_functionalComponentArgsRest(__VLS_19));
/** @type {__VLS_StyleScopedClasses['staff-login-btn']} */ ;
const { default: __VLS_23 } = __VLS_21.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-lock' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-lock']} */ ;
// @ts-ignore
[];
var __VLS_21;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'status-indicator' }));
/** @type {__VLS_StyleScopedClasses['status-indicator']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-server' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-server']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'footer-bottom' }));
/** @type {__VLS_StyleScopedClasses['footer-bottom']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'system-status' }));
/** @type {__VLS_StyleScopedClasses['system-status']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-circle-fill' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-circle-fill']} */ ;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
