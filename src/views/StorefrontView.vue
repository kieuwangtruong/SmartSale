<script setup lang="ts">
import { computed, onMounted, ref, watch, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createPaymentLink, formatCurrency, getMyPurchases, getOrderStatusLabel, getPaymentMethodLabel, type Order, type OrderStatus } from "../services/orderApi";
import { getProducts, type Product } from "../services/productApi";
import { getMyProfile, updateUser, type UserDto } from "../services/userApi";
import { saveSession } from "../services/apiClient";
import { endChatSession, getChatSession, sendChatMessage, type ChatAction, type ChatMessage } from "../services/chatbotApi";
import { useAuthStore } from "../stores/authStore";
import { useLanguage } from "../services/i18n";
import { translateProductName } from "../services/productTranslations";

const { t, currentLanguage, setLanguage } = useLanguage();
function toggleLang() {
  setLanguage(currentLanguage.value === 'vi' ? 'en' : 'vi');
}

const CATEGORY_LABELS: Record<string, { vi: string; en: string }> = {
  "Gia dụng": { vi: "Gia dụng", en: "Home & Living" },
  "Phụ kiện": { vi: "Phụ kiện", en: "Accessories" },
  "Văn phòng": { vi: "Văn phòng", en: "Office Supplies" },
  "Điện tử": { vi: "Điện tử", en: "Electronics" },
};

function translateCategory(cat: string): string {
  if (!cat) return cat;
  const normalized = cat.trim();
  for (const [key, labels] of Object.entries(CATEGORY_LABELS)) {
    if (normalized === key || normalized.toLowerCase().includes(key.toLowerCase())) {
      return t(labels.vi, labels.en);
    }
  }
  return cat;
}

function productMatchesSearch(product: Product, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const categoryName = product.categoryName || "";
  return (
    product.name.toLowerCase().includes(q) ||
    translateProductName(product).toLowerCase().includes(q) ||
    String(product.id).includes(q) ||
    categoryName.toLowerCase().includes(q) ||
    translateCategory(categoryName).toLowerCase().includes(q)
  );
}

// Product detail specification accordion state flags
const isDetailOverviewOpen = ref(true);
const isDetailSpecsOpen = ref(false);
const isDetailUsageOpen = ref(false);
const isDetailWarrantyOpen = ref(false);

function prevImage(images: string[]) {
  if (images.length === 0) return;
  selectedImageIndex.value = (selectedImageIndex.value - 1 + images.length) % images.length;
}

function nextImage(images: string[]) {
  if (images.length === 0) return;
  selectedImageIndex.value = (selectedImageIndex.value + 1) % images.length;
}

function getEnrichedProductImages(product: Product): string[] {
  const baseImages = [product.imageUrl, ...(product.imageUrls ?? [])]
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url))
    .filter((url, index, urls) => urls.findIndex((item) => item.toLowerCase() === url.toLowerCase()) === index);
    
  const cat = product.categoryName || '';
  
  let filler: string[] = [];
  if (cat === 'Gia dụng' || cat.toLowerCase().includes('gia dụng')) {
    filler = [
      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1522336572468-97b06eca219b?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600'
    ];
  } else if (cat === 'Phụ kiện' || cat.toLowerCase().includes('phụ kiện')) {
    filler = [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=600'
    ];
  } else if (cat === 'Văn phòng' || cat.toLowerCase().includes('văn phòng')) {
    filler = [
      'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&q=80&w=600'
    ];
  } else {
    filler = [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&q=80&w=600'
    ];
  }
  
  const finalImages = [...baseImages];
  for (const img of filler) {
    if (finalImages.length >= 4) break;
    if (!finalImages.includes(img)) {
      finalImages.push(img);
    }
  }
  
  while (finalImages.length < 4) {
    finalImages.push((filler[finalImages.length] || filler[0]) as string);
  }
  
  return finalImages.slice(0, 4);
}

function getEnrichedProductImageItems(product: Product) {
  const productVersion = product.productVersion?.trim()
    || product.imageItems?.find((item) => item.version?.trim())?.version?.trim()
    || '';

  return getEnrichedProductImages(product).map((imageUrl) => ({
    imageUrl,
    version: productVersion,
  }));
}

const enrichedProductDetails = computed(() => {
  if (!selectedProduct.value) return null;
  const p = selectedProduct.value;
  const cat = p.categoryName || '';
  const enName = translateProductName(p);
  
  let specs = {
    dimensions: t('30 x 30 x 40 cm', '30 x 30 x 40 cm'),
    material: t('Nhựa ABS cao cấp & Thép không gỉ', 'Premium ABS & Stainless Steel'),
    weight: t('1.5 kg', '1.5 kg'),
    origin: t('Nhật Bản', 'Japan'),
    warranty: t('12 tháng chính hãng', '12 months official warranty'),
    code: `SS-${p.id}`
  };
  
  let overview = t(
    `Sản phẩm ${p.name} sở hữu thiết kế thông minh, hiện đại mang lại sự tiện ích và thoải mái cho không gian của bạn. Được làm từ chất liệu cao cấp bền bỉ, sản phẩm đáp ứng đầy đủ tiêu chuẩn chất lượng nghiêm ngặt nhất.`,
    `The ${enName} features a smart, modern design that brings convenience and comfort to your space. Crafted from premium durable materials, it fully meets the most rigorous quality standards.`
  );
  
  const usage = t(
    'Đọc kỹ hướng dẫn sử dụng đi kèm trước khi dùng. Tránh va đập mạnh và tiếp xúc với nhiệt độ cao quá mức cho phép. Vệ sinh nhẹ nhàng bằng khăn mềm sạch.',
    'Read the included user manual carefully before use. Avoid strong impacts and exposure to excessive heat. Clean gently with a soft, clean cloth.'
  );
  
  const commitment = t(
    'Cam kết 100% hàng chính hãng, đổi trả miễn phí trong vòng 7 ngày nếu phát hiện lỗi từ nhà sản xuất. Hỗ trợ kỹ thuật 24/7.',
    '100% genuine products commitment, free exchange within 7 days in case of manufacturer defects. 24/7 technical support.'
  );

  if (cat === 'Gia dụng' || cat.toLowerCase().includes('gia dụng')) {
    specs = {
      dimensions: t('32 x 28 x 45 cm', '32 x 28 x 45 cm'),
      material: t('Nhựa PP nguyên sinh & Inox 304 cao cấp', 'Premium PP Plastic & 304 Stainless Steel'),
      weight: t('2.1 kg', '2.1 kg'),
      origin: t('Nhật Bản', 'Japan'),
      warranty: t('12 tháng chính hãng', '12 months official warranty'),
      code: `GD-${p.id}`
    };
    overview = t(
      `Thiết bị gia dụng hiện đại ${p.name} là giải pháp hoàn hảo tối ưu hóa không gian sống của bạn. Công nghệ tiết kiệm điện tối tân cùng kiểu dáng tối giản sang trọng sẽ nâng tầm tiện nghi cho gia đình bạn.`,
      `The modern home appliance ${enName} is the perfect solution to optimize your living space. State-of-the-art power saving technology and elegant minimalist styling will elevate your family convenience.`
    );
  } else if (cat === 'Phụ kiện' || cat.toLowerCase().includes('phụ kiện')) {
    specs = {
      dimensions: t('12.5 x 6.5 x 1.8 cm', '12.5 x 6.5 x 1.8 cm'),
      material: t('Hợp kim nhôm siêu nhẹ & Kính cường lực Gorilla', 'Ultralight Aluminum Alloy & Gorilla Tempered Glass'),
      weight: t('180g', '180g'),
      origin: t('Hàn Quốc', 'South Korea'),
      warranty: t('6 tháng 1 đổi 1', '6 months 1-to-1 warranty'),
      code: `PK-${p.id}`
    };
    overview = t(
      `Phụ kiện cao cấp ${p.name} với công nghệ thông minh tích hợp, mang lại phong cách sống hiện đại và năng động. Thiết kế ôm khít tinh tế, bảo vệ tối ưu và tạo điểm nhấn đẳng cấp cho người sở hữu.`,
      `The premium accessory ${enName} features integrated smart technology, bringing a modern and active lifestyle. Delicate, form-fitting design provides optimal protection and creates a high-class highlight for the owner.`
    );
  } else if (cat === 'Văn phòng' || cat.toLowerCase().includes('văn phòng')) {
    specs = {
      dimensions: t('21 x 14.8 x 1.5 cm (Khổ A5)', '21 x 14.8 x 1.5 cm (A5 size)'),
      material: t('Giấy chống lóa Nhật Bản & Bìa da PU tự nhiên', 'Japanese Anti-glare Paper & Natural PU Leather Cover'),
      weight: t('320g', '320g'),
      origin: t('Việt Nam', 'Vietnam'),
      warranty: t('Hỗ trợ đổi trả trong 7 ngày', '7 days exchange support'),
      code: `VP-${p.id}`
    };
    overview = t(
      `Văn phòng phẩm tinh tế ${p.name} là nguồn cảm hứng chuyên nghiệp cho ngày làm việc năng suất của bạn. Chất liệu giấy cao cấp chống lóa mắt và vỏ bìa sang trọng mang đến trải nghiệm ghi chép tuyệt vời.`,
      `The exquisite office stationery ${enName} is a professional source of inspiration for your productive workday. Anti-glare premium paper and luxurious cover provide a wonderful writing experience.`
    );
  }

  return {
    overview,
    specs,
    usage,
    commitment
  };
});

interface CartLine {
  product: Product;
  quantity: number;
}

type SortOption = "featured" | "price-asc" | "price-desc" | "name";

const products = ref<Product[]>([]);
const cart = ref<CartLine[]>([]);
const search = ref("");
const showSearchDropdown = ref(false);
const heroSearchRef = ref<HTMLElement | null>(null);
const category = ref("");
const sort = ref<SortOption>("featured");
const loading = ref(true);
const error = ref("");
const showCart = ref(false);
const animateCart = ref(false);
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const CART_STORAGE_KEY = "storefront-cart";
const showCustomerPanel = ref(false);
const customerProfile = ref<UserDto | null>(auth.user);
const customerOrders = ref<Order[]>([]);
const customerPanelLoading = ref(false);
const customerPanelError = ref("");
const customerPanelLoaded = ref(false);
const showChatbot = ref(false);
const chatbotLoaded = ref(false);
const chatbotLoading = ref(false);
const chatbotSending = ref(false);
const chatbotError = ref("");
const chatbotInput = ref("");
const chatbotMessages = ref<ChatMessage[]>([]);
const chatbotActions = ref<ChatAction[]>([]);
const chatbotSuggestions = computed(() => [
  t("Sản phẩm nào đang khuyến mãi?", "Which products are on sale?"),
  t("Tôi có đơn hàng nào đang xử lý?", "Do I have any orders being processed?"),
  t("Hạng thành viên của tôi là gì?", "What is my membership tier?"),
  t("Gợi ý sản phẩm còn hàng dưới 500.000đ", "Suggest in-stock products under 500,000đ"),
]);

const showProfileModal = ref(false);
const showOrdersModal = ref(false);
const editingAddress = ref("");
const savingAddress = ref(false);
const saveAddressError = ref("");
const saveAddressSuccess = ref(false);
const ordersSearchQuery = ref("");

type OrderTab = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
const activeOrderTab = ref<OrderTab>('pending');

function openProfileModal() {
  editingAddress.value = customerProfile.value?.address || auth.user?.address || "";
  saveAddressError.value = "";
  saveAddressSuccess.value = false;
  showProfileModal.value = true;
  showCustomerPanel.value = false;
}

function closeProfileModal() {
  showProfileModal.value = false;
}

async function handleSaveAddress() {
  if (savingAddress.value) return;
  savingAddress.value = true;
  saveAddressError.value = "";
  saveAddressSuccess.value = false;
  try {
    const userId = customerProfile.value?.id || auth.user?.id;
    if (!userId) {
      throw new Error(t("Không tìm thấy thông tin người dùng.", "User information not found."));
    }
    try {
      const updated = await updateUser({
        id: userId,
        address: editingAddress.value,
      });
      customerProfile.value = updated;
      if (auth.session) {
        auth.session.user = updated;
        saveSession(auth.session);
      }
    } catch (apiError) {
      // Backend returned 403 Forbidden because Customer cannot modify profile.
      // Fallback to storing the address locally and updating active session.
      localStorage.setItem(`customer-address-${userId}`, editingAddress.value);
      if (customerProfile.value) {
        customerProfile.value.address = editingAddress.value;
      }
      if (auth.session) {
        auth.session.user.address = editingAddress.value;
        saveSession(auth.session);
      }
    }
    saveAddressSuccess.value = true;
    setTimeout(() => {
      saveAddressSuccess.value = false;
    }, 3000);
  } catch (error: any) {
    saveAddressError.value = error instanceof Error ? error.message : String(error);
  } finally {
    savingAddress.value = false;
  }
}

const selectedOrderId = ref<number | null>(null);

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  done: boolean;
  active: boolean;
}

function statusRank(status: OrderStatus) {
  const ranks: Record<OrderStatus, number> = {
    Pending: 1,
    PendingPayment: 1,
    ProcessingPayment: 1,
    PaymentFailed: 1,
    PaymentCancelled: 1,
    PaymentExpired: 1,
    Paid: 2,
    Processing: 3,
    Shipped: 4,
    Completed: 5,
    Cancelled: 0,
  };
  return ranks[status] ?? 0;
}

function getOrderTimeline(order: Order): TimelineStep[] {
  const cancelled = ['Cancelled', 'PaymentCancelled', 'PaymentExpired', 'PaymentFailed'].includes(order.status);
  const isPayOs = (order.paymentMethod || '').toLowerCase() === 'payos';
  const rank = statusRank(order.status);
  const cashConfirmed = !isPayOs && rank >= 2 && !cancelled;

  if (cancelled) {
    return [{
      key: 'cancelled',
      label: getOrderStatusLabel(order.status),
      description: t('Đơn hàng không tiếp tục xử lý ở trạng thái này.', 'The order will not continue processing in this status.'),
      done: true,
      active: true,
    }];
  }

  const steps: TimelineStep[] = [
    {
      key: 'created',
      label: t('Đã đặt hàng', 'Order placed'),
      description: t('Hệ thống đã ghi nhận đơn hàng của bạn.', 'The system has received your order.'),
      done: rank >= 1,
      active: rank === 1 && !cancelled,
    },
    {
      key: 'confirmed',
      label: isPayOs
        ? t('Đã thanh toán', 'Paid')
        : cashConfirmed
          ? t('Đã xác nhận tiền mặt', 'Cash confirmed')
          : t('Chờ nhân viên xác nhận', 'Waiting for staff confirmation'),
      description: isPayOs
        ? t('Đơn chuyển khoản đã thanh toán, không cần xác nhận tiền mặt.', 'Online payment is completed; no cash confirmation is needed.')
        : cashConfirmed
          ? t('Nhân viên bán hàng đã xác nhận khách thanh toán tiền mặt.', 'Sales staff confirmed the cash payment.')
          : t('Nhân viên bán hàng sẽ gọi xác nhận đơn tiền mặt.', 'Sales staff will confirm the cash order.'),
      done: rank >= 2,
      active: rank === 2 && !cancelled,
    },
    {
      key: 'processing',
      label: t('Đang chuẩn bị hàng', 'Preparing order'),
      description: t('Cửa hàng đang đóng gói và chuẩn bị giao hàng.', 'The store is packing and preparing shipment.'),
      done: rank >= 3,
      active: rank === 3 && !cancelled,
    },
    {
      key: 'shipping',
      label: t('Đang giao hàng', 'Shipping'),
      description: t('Đơn hàng đang trên đường giao đến bạn.', 'The order is on its way to you.'),
      done: rank >= 4,
      active: rank === 4 && !cancelled,
    },
    {
      key: 'completed',
      label: t('Hoàn tất', 'Completed'),
      description: t('Đơn hàng đã hoàn tất.', 'The order is completed.'),
      done: rank >= 5,
      active: rank === 5 && !cancelled,
    },
  ];

  return steps;
}

function openOrdersModal() {
  ordersSearchQuery.value = "";
  selectedOrderId.value = null;
  activeOrderTab.value = 'pending';
  showOrdersModal.value = true;
  showCustomerPanel.value = false;
  if (!customerPanelLoaded.value) {
    loadCustomerPanel();
  }
}

function closeOrdersModal() {
  showOrdersModal.value = false;
}

const filteredCustomerOrders = computed(() => {
  const query = ordersSearchQuery.value.trim().toLowerCase();
  
  let list = customerOrders.value;
  if (activeOrderTab.value === 'pending') {
    list = list.filter((order) => ['Pending', 'PendingPayment', 'ProcessingPayment', 'Processing'].includes(order.status));
  } else if (activeOrderTab.value === 'paid') {
    list = list.filter((order) => order.status === 'Paid');
  } else if (activeOrderTab.value === 'shipped') {
    list = list.filter((order) => order.status === 'Shipped');
  } else if (activeOrderTab.value === 'completed') {
    list = list.filter((order) => order.status === 'Completed');
  } else if (activeOrderTab.value === 'cancelled') {
    list = list.filter((order) => ['Cancelled', 'PaymentCancelled', 'PaymentExpired', 'PaymentFailed'].includes(order.status));
  }

  if (query) {
    list = list.filter((order) => {
      const matchesId = String(order.id).toLowerCase().includes(query);
      const matchesProducts = order.orderItems.some((item) =>
        item.productName.toLowerCase().includes(query)
      );
      const statusLabel = getOrderStatusLabel(order.status).toLowerCase();
      const matchesStatus = statusLabel.includes(query);
      return matchesId || matchesProducts || matchesStatus;
    });
  }

  return list;
});

const selectedCustomerOrder = computed(() => {
  if (selectedOrderId.value !== null) {
    const found = customerOrders.value.find((o) => o.id === selectedOrderId.value);
    if (found && filteredCustomerOrders.value.some((o) => o.id === found.id)) return found;
  }
  return filteredCustomerOrders.value[0] || null;
});

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

const searchSuggestions = computed(() => {
  const query = search.value.trim();
  if (!query) return [];
  return products.value
    .filter((product) => productMatchesSearch(product, query))
    .slice(0, 8);
});

const visibleProducts = computed(() => {
  const query = search.value.trim();
  const filtered = products.value.filter((product) => {
    const matchesCategory =
      !category.value || product.categoryName === category.value;
    const matchesSearch = productMatchesSearch(product, query);
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
const isCustomerLoggedIn = computed(() => auth.isAuthenticated && auth.user?.role === "Customer");
const purchasedCustomerOrders = computed(() =>
  customerOrders.value.filter((order) => {
    const isPayOs = (order.paymentMethod || "Cash").toLowerCase() === "payos";
    return isPayOs
      ? ["Paid", "Processing", "Shipped", "Completed"].includes(order.status)
      : order.status === "Completed";
  }),
);
const totalPurchasedOrderCount = computed(() => purchasedCustomerOrders.value.length);
const displayedCustomerTierLabel = computed(() => {
  const count = totalPurchasedOrderCount.value;
  if (count >= 100) return t("Thành viên Kim cương", "Diamond Member");
  if (count >= 60) return t("Thành viên Vàng", "Gold Member");
  if (count >= 30) return t("Thành viên Bạc", "Silver Member");
  return t("Thành viên thường", "Standard Member");
});

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
    const savedAddress = localStorage.getItem(`customer-address-${profile.id}`);
    if (savedAddress) {
      profile.address = savedAddress;
      if (auth.session) {
        auth.session.user.address = savedAddress;
        saveSession(auth.session);
      }
    }
    customerProfile.value = profile;
    customerOrders.value = orders;
    customerPanelLoaded.value = true;
  } catch (exception) {
    if (isAuthExpiredError(exception)) {
      handleExpiredCustomerSession();
      return;
    }
    customerPanelError.value =
      exception instanceof Error ? exception.message : t("Không thể tải thông tin tài khoản.", "Unable to load account information.");
  } finally {
    customerPanelLoading.value = false;
  }
}

async function logoutCustomer() {
  await resetChatbotSession();
  await auth.logout();
  customerProfile.value = null;
  customerOrders.value = [];
  customerPanelLoaded.value = false;
  showCustomerPanel.value = false;
}

async function openChatbot() {
  if (!isCustomerLoggedIn.value) {
    router.push({ name: "customer-login", query: { redirect: "/" } });
    return;
  }
  showChatbot.value = true;
  if (!chatbotLoaded.value) {
    await loadChatbotSession();
  }
}

async function loadChatbotSession() {
  if (!isCustomerLoggedIn.value) return;
  chatbotLoading.value = true;
  chatbotError.value = "";
  try {
    const session = await getChatSession();
    chatbotMessages.value = session.messages;
    if (!chatbotMessages.value.length) {
      chatbotMessages.value = [{
        role: "assistant",
        content: t("Chào bạn, mình có thể giúp xem sản phẩm, tồn kho, khuyến mãi, hạng thành viên và đơn hàng của bạn.", "Hi, I can help with products, stock, promotions, membership and your orders."),
        createdAt: new Date().toISOString(),
      }];
    }
    chatbotLoaded.value = true;
  } catch (exception) {
    if (isAuthExpiredError(exception)) {
      handleExpiredCustomerSession();
      chatbotError.value = t("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để dùng chatbot.", "Your session has expired. Please sign in again to use the chatbot.");
      return;
    }
    chatbotError.value = exception instanceof Error ? exception.message : t("Không thể mở chatbot.", "Unable to open chatbot.");
  } finally {
    chatbotLoading.value = false;
  }
}

async function sendChatbotText(text = chatbotInput.value) {
  const message = text.trim();
  if (!message || chatbotSending.value) return;
  if (!isCustomerLoggedIn.value) {
    router.push({ name: "customer-login", query: { redirect: "/" } });
    return;
  }

  chatbotInput.value = "";
  chatbotError.value = "";
  chatbotSending.value = true;
  chatbotMessages.value.push({
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  });

  try {
    const response = await sendChatMessage(message);
    chatbotMessages.value = response.messages.length ? response.messages : chatbotMessages.value;
    chatbotActions.value = response.actions;
  } catch (exception) {
    if (isAuthExpiredError(exception)) {
      handleExpiredCustomerSession();
      chatbotError.value = t("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục chat.", "Your session has expired. Please sign in again to continue chatting.");
      return;
    }
    chatbotError.value = exception instanceof Error ? exception.message : t("Chatbot chưa phản hồi được.", "The chatbot could not respond.");
  } finally {
    chatbotSending.value = false;
  }
}

function isAuthExpiredError(exception: unknown) {
  if (!(exception instanceof Error)) return false;
  return /401|unauthorized|hết hạn|đăng nhập/i.test(exception.message);
}

function handleExpiredCustomerSession() {
  auth.sync();
  customerProfile.value = null;
  customerOrders.value = [];
  customerPanelLoaded.value = false;
  showCustomerPanel.value = false;
  showChatbot.value = false;
  chatbotLoaded.value = false;
  chatbotActions.value = [];
}

async function resetChatbotSession() {
  showChatbot.value = false;
  chatbotLoaded.value = false;
  chatbotLoading.value = false;
  chatbotSending.value = false;
  chatbotError.value = "";
  chatbotInput.value = "";
  chatbotMessages.value = [];
  chatbotActions.value = [];
  if (auth.isAuthenticated && auth.role === "Customer") {
    try {
      await endChatSession();
    } catch {
      // Logout must continue even if the chatbot session endpoint is temporarily unavailable.
    }
  }
}

function handleChatAction(action: ChatAction) {
  const product = products.value.find((item) => item.id === action.productId);
  if (!product) {
    chatbotError.value = t("Sản phẩm này chưa có trong danh sách hiện tại.", "This product is not in the current list.");
    return;
  }
  if (action.type === "add-to-cart") {
    quickAddToCart(product);
    showCart.value = true;
    return;
  }
  openProductDetail(product);
}

// Open product detail modal for quick view
function openProductDetail(product: Product) {
  selectedProduct.value = product;
  selectedImageIndex.value = 0;
  productDetailQuantity.value = 1;
  isDetailOverviewOpen.value = true;
  isDetailSpecsOpen.value = false;
  isDetailUsageOpen.value = false;
  isDetailWarrantyOpen.value = false;
  if (product.salePrice && product.salePrice < product.originalPrice) {
    startProductCountdown();
  }
}

// Close product detail modal
function closeProductDetail() {
  selectedProduct.value = null;
  selectedImageIndex.value = 0;
  productDetailQuantity.value = 1;
  isDetailOverviewOpen.value = true;
  isDetailSpecsOpen.value = false;
  isDetailUsageOpen.value = false;
  isDetailWarrantyOpen.value = false;
  if (productTimerId) {
    clearInterval(productTimerId);
    productTimerId = null;
  }
}

function selectSearchResult(product: Product) {
  search.value = "";
  showSearchDropdown.value = false;
  openProductDetail(product);
}

function handleHeroSearchClickOutside(event: MouseEvent) {
  if (heroSearchRef.value && !heroSearchRef.value.contains(event.target as Node)) {
    showSearchDropdown.value = false;
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
const storewideCountdownDiff = ref(0);

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
  storewideCountdownDiff.value = target.getTime() - Date.now();
};

const storewideCountdownText = computed(() => {
  const diff = storewideCountdownDiff.value;
  if (diff <= 0) return t("Đã kết thúc", "Ended");

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  const dayLabel =
    days > 0
      ? days === 1
        ? t("1 ngày ", "1 day ")
        : t(`${days} ngày `, `${days} days `)
      : "";
  const hStr = String(hours).padStart(2, "0");
  const mStr = String(minutes).padStart(2, "0");
  const sStr = String(seconds).padStart(2, "0");

  return `${dayLabel}${hStr}:${mStr}:${sStr}`;
});

function promoBadgeLabel(product: Product | null): string {
  if (product?.salePrice && product?.originalPrice) {
    const percent = Math.round((1 - product.salePrice / product.originalPrice) * 100);
    return t(`GIẢM SỐC ${percent}%`, `HOT DEAL -${percent}%`);
  }
  return t("GIẢM SỐC 50%", "FLASH SALE 50%");
}

function promoTitleLabel(product: Product | null): string {
  if (!product) {
    return t(
      "SIÊU KHUYẾN MÃI MÙA HÈ - SĂN SALE TOÀN SÀN",
      "SUMMER MEGA SALE - STOREWIDE SAVINGS",
    );
  }
  const displayName = translateProductName(product).toUpperCase();
  return t(
    `SIÊU KHUYẾN MÃI: ${displayName}`,
    `MEGA DEAL: ${displayName}`,
  );
}

function promoDescriptionLabel(product: Product | null): string {
  if (product?.salePrice) {
    const displayName = translateProductName(product);
    return t(
      `Sở hữu ngay ${displayName} với giá ưu đãi chỉ còn ${formatCurrency(product.salePrice)}. Số lượng có hạn!`,
      `Get ${displayName} now for only ${formatCurrency(product.salePrice)}. Limited stock!`,
    );
  }
  return t(
    "Cơ hội tốt nhất để sở hữu sản phẩm cao cấp với giá ưu đãi cực hấp dẫn toàn sàn!",
    "Your best chance to own premium products at unbeatable storewide prices!",
  );
}

const productCountdownText = ref("");
let productTimerId: ReturnType<typeof setInterval> | null = null;

const startProductCountdown = () => {
  if (productTimerId) clearInterval(productTimerId);

  // Set detailed deal target time: e.g. 5 hours from now
  const targetTime = Date.now() + 5.5 * 60 * 60 * 1000;

  const updateText = () => {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      productCountdownText.value = "00:00:00";
      if (productTimerId) {
        clearInterval(productTimerId);
        productTimerId = null;
      }
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
  if (!cart.value.length) return;
  if (!auth.isAuthenticated || auth.role !== "Customer") {
    router.push({ name: "customer-login", query: { redirect: "/checkout" } });
    return;
  }
  showCart.value = false;
  router.push({ name: "checkout" });
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
    categoryKey: "Văn phòng",
  },
  {
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200",
    title: t("Phụ kiện thông minh", "Smart Accessories"),
    subtitle: t("Thiết bị công nghệ chính xác, đồng bộ hóa phong cách sống hiện đại.", "High precision tech devices, synchronizing with your modern lifestyle."),
    categoryKey: "Phụ kiện",
  },
  {
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=1200",
    title: t("Gia dụng tinh tế", "Minimalist Home Appliances"),
    subtitle: t("Không gian sống ấm cúng với các thiết bị gia dụng tối giản, hiện đại.", "Warm cozy living spaces with minimalist, modern home appliances."),
    categoryKey: "Gia dụng",
  }
]);

const activePromoSlide = ref(0);
const promoProducts = computed(() => {
  return products.value.filter((p) => p.salePrice && p.salePrice < p.originalPrice).slice(0, 4);
});

let promoSlideInterval: ReturnType<typeof setInterval> | null = null;
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

let slideInterval: ReturnType<typeof setInterval> | null = null;
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
      title: t("Văn phòng phẩm", "Office Supplies"),
      desc: t("Khơi nguồn cảm hứng làm việc chuyên nghiệp mỗi ngày.", "Inspiring professional work every day."),
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200"
    };
  }
  if (cat === "Điện tử" || cat.toLowerCase().includes("điện tử")) {
    return {
      title: t("Thiết bị Điện tử", "Electronics"),
      desc: t("Công nghệ hiện đại, chất lượng cao cho cuộc sống số.", "Modern technology and premium quality for your digital life."),
      image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=1200"
    };
  }
  return {
    title: translateCategory(cat) || t("Cửa hàng bán lẻ", "Retail Store"),
    desc: t("Khám phá bộ sưu tập sản phẩm chất lượng cao trong danh mục này.", "Explore our high-quality product collection in this category."),
    image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=1200"
  };
});

let storewideTimerId: ReturnType<typeof setInterval> | null = null;

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
  document.addEventListener("click", handleHeroSearchClickOutside);

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
  document.removeEventListener("click", handleHeroSearchClickOutside);
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
        <span class="brand-copy"><strong>Smart Sale Store</strong><small>{{ t('Cửa hàng thông minh', 'Smart Store') }}</small></span>
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
          {{ translateCategory(cat) }}
        </a>
      </nav>

      <div class="header-right">
        <!-- Language Switcher -->
        <button
          class="lang-toggle-btn"
          type="button"
          @click="toggleLang"
          :title="t('Đang dùng Tiếng Việt — bấm để đổi sang English', 'Using English — click to switch to Vietnamese')"
        >
          <i class="pi pi-globe" />
          <span>{{ currentLanguage === 'vi' ? 'VI' : 'EN' }}</span>
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
                <strong>{{ displayedCustomerTierLabel }}</strong>
                <span>{{ totalPurchasedOrderCount }} {{ t('đơn đã mua', 'purchased orders') }}</span>
              </div>
              <div class="customer-panel-buttons">
                <button class="panel-btn" type="button" @click="openProfileModal">
                  <i class="pi pi-id-card" />
                  <span>{{ t('Thông tin cá nhân', 'Personal Information') }}</span>
                </button>
                <button class="panel-btn" type="button" @click="openOrdersModal">
                  <i class="pi pi-shopping-bag" />
                  <span>{{ t('Đơn hàng của tôi', 'My Orders') }}</span>
                </button>
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

          <div ref="heroSearchRef" class="hero-search-wrap">
            <div class="hero-search-box">
              <i class="pi pi-search" />
              <input
                v-model="search"
                type="search"
                :placeholder="t('Tìm sản phẩm theo tên, mã hoặc danh mục...', 'Search by name, ID or category...')"
                autocomplete="off"
                @focus="showSearchDropdown = true"
                @input="showSearchDropdown = true"
              />
              <button
                v-if="search"
                type="button"
                class="hero-search-clear"
                :aria-label="t('Xóa tìm kiếm', 'Clear search')"
                @click="search = ''; showSearchDropdown = false"
              >
                <i class="pi pi-times" />
              </button>
            </div>
            <div v-if="showSearchDropdown && search.trim()" class="hero-search-dropdown">
              <template v-if="searchSuggestions.length">
                <button
                  v-for="product in searchSuggestions"
                  :key="product.id"
                  type="button"
                  class="hero-search-result"
                  @click="selectSearchResult(product)"
                >
                  <div class="search-result-thumb">
                    <img v-if="product.imageUrl" :src="product.imageUrl" :alt="translateProductName(product)" />
                    <i v-else class="pi pi-box" />
                  </div>
                  <div class="search-result-info">
                    <strong>{{ translateProductName(product) }}</strong>
                    <small>{{ translateCategory(product.categoryName || '') }} · {{ formatCurrency(product.sellingPrice) }}</small>
                  </div>
                  <i class="pi pi-arrow-right search-result-arrow" />
                </button>
              </template>
              <div v-else class="hero-search-empty">
                <i class="pi pi-search" />
                <span>{{ t('Không tìm thấy sản phẩm phù hợp', 'No matching products found') }}</span>
              </div>
            </div>
          </div>

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
            <span><strong>{{ t('Thời gian thực', 'Real-time') }}</strong><small>{{ t('Đồng bộ tồn kho', 'Stock synchronized') }}</small></span>
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
              <span class="slide-badge">{{ translateCategory(slide.categoryKey) }}</span>
              <h2>{{ slide.title }}</h2>
              <p>{{ slide.subtitle }}</p>
              <button class="slide-btn" type="button" @click="category = slide.categoryKey; showAllProducts = false;">
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
                  {{ promoBadgeLabel(product) }}
                </span>
                <h2>{{ promoTitleLabel(product) }}</h2>
                <p>{{ promoDescriptionLabel(product) }}</p>
              </div>
              <div class="promo-flash-timer-wrapper" @click.stop>
                <span>{{ t('Thời gian còn lại', 'Time remaining') }}</span>
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
                <img v-if="product.imageUrl" :src="product.imageUrl" :alt="translateProductName(product)" />
                <div v-else class="image-placeholder">
                  <i class="pi pi-box" />
                  <small>ID #{{ product.id }}</small>
                </div>
              </div>
              <div class="product-content">
                <div class="product-labels">
                  <span>{{ translateCategory(product.categoryName || '') || t('Sản phẩm', 'Product') }}</span>
                  <small>ID #{{ product.id }}</small>
                </div>
                <h3>{{ translateProductName(product) }}</h3>
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
              <h2>{{ category ? translateCategory(category) : t('Tất cả sản phẩm', 'All Products') }}</h2>
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
                  <img v-if="product.imageUrl" :src="product.imageUrl" :alt="translateProductName(product)" />
                  <div v-else class="image-placeholder">
                    <i class="pi pi-box" />
                    <small>ID #{{ product.id }}</small>
                  </div>
                </div>
                <div class="product-content">
                  <div class="product-labels">
                    <span>{{ translateCategory(product.categoryName || '') || t('Sản phẩm', 'Product') }}</span>
                    <small>ID #{{ product.id }}</small>
                  </div>
                  <h3>{{ translateProductName(product) }}</h3>
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

    <!-- Personal Profile Modal -->
    <div v-if="showProfileModal" class="profile-modal-overlay" @click.self="closeProfileModal" />
    <div v-if="showProfileModal" class="profile-modal" aria-modal="true" role="dialog">
      <button type="button" class="modal-close-btn" @click="closeProfileModal" :aria-label="t('Đóng', 'Close')">
        <i class="pi pi-times" />
      </button>
      <div class="modal-header">
        <h2>{{ t('Thông tin cá nhân', 'Personal Information') }}</h2>
      </div>
      <div class="modal-body">
        <div class="profile-details-grid">
          <div class="profile-detail-row">
            <strong>{{ t('Họ và tên:', 'Full Name:') }}</strong>
            <span>{{ customerProfile?.fullName || auth.user?.fullName }}</span>
          </div>
          <div class="profile-detail-row">
            <strong>{{ t('Tên tài khoản:', 'Username:') }}</strong>
            <span>{{ customerProfile?.userName || auth.user?.userName }}</span>
          </div>
          <div class="profile-detail-row">
            <strong>{{ t('Email:', 'Email:') }}</strong>
            <span>{{ customerProfile?.email || auth.user?.email }}</span>
          </div>
          <div class="profile-detail-row">
            <strong>{{ t('Hạng thành viên:', 'Membership Tier:') }}</strong>
            <span class="badge-tier">{{ displayedCustomerTierLabel }}</span>
          </div>
        </div>

        <div class="address-edit-section">
          <h3>{{ t('Địa chỉ đặt hàng', 'Shipping Address') }}</h3>
          <textarea 
            v-model="editingAddress" 
            class="address-textarea"
            :placeholder="t('Nhập địa chỉ đặt hàng của bạn...', 'Enter your shipping address...')"
          ></textarea>
          <div v-if="saveAddressError" class="address-error-msg">
            <i class="pi pi-exclamation-circle" /> {{ saveAddressError }}
          </div>
          <div v-if="saveAddressSuccess" class="address-success-msg">
            <i class="pi pi-check-circle" /> {{ t('Cập nhật địa chỉ thành công!', 'Address updated successfully!') }}
          </div>
          <button 
            type="button" 
            class="save-address-btn" 
            :disabled="savingAddress"
            @click="handleSaveAddress"
          >
            <i v-if="savingAddress" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-save" />
            <span>{{ savingAddress ? t('Đang lưu...', 'Saving...') : t('Cập nhật địa chỉ', 'Update Address') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- My Orders Modal -->
    <div v-if="showOrdersModal" class="orders-modal-overlay" @click.self="closeOrdersModal" />
    <div v-if="showOrdersModal" class="orders-modal" aria-modal="true" role="dialog">
      <button type="button" class="modal-close-btn" @click="closeOrdersModal" :aria-label="t('Đóng', 'Close')">
        <i class="pi pi-times" />
      </button>
      <div class="modal-header-section">
        <h2>{{ t('Đơn hàng của tôi', 'My Orders') }}</h2>
        <div class="modal-search-box">
          <i class="pi pi-search" />
          <input 
            v-model="ordersSearchQuery" 
            type="search" 
            :placeholder="t('Tìm theo mã đơn hoặc sản phẩm...', 'Search by order ID or product name...')" 
          />
        </div>
        <div class="modal-order-tabs">
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'pending' }" 
            @click="activeOrderTab = 'pending'"
          >
            {{ t('Chờ xử lý', 'Pending') }}
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'paid' }" 
            @click="activeOrderTab = 'paid'"
          >
            {{ t('Đã thanh toán', 'Paid') }}
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'shipped' }" 
            @click="activeOrderTab = 'shipped'"
          >
            {{ t('Đã giao', 'Shipped') }}
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'completed' }" 
            @click="activeOrderTab = 'completed'"
          >
            {{ t('Hoàn thành', 'Completed') }}
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: activeOrderTab === 'cancelled' }" 
            @click="activeOrderTab = 'cancelled'"
          >
            {{ t('Đã hủy', 'Cancelled') }}
          </button>
        </div>
      </div>
      <div class="modal-body orders-modal-grid">
        <!-- Left: Orders List -->
        <div class="orders-list-column">
          <div v-if="customerPanelLoading" class="orders-loading">
            <i class="pi pi-spin pi-spinner" />
            <p>{{ t('Đang tải danh sách đơn hàng...', 'Loading order list...') }}</p>
          </div>
          <div v-else-if="filteredCustomerOrders.length === 0" class="orders-empty">
            <i class="pi pi-inbox" />
            <p>{{ t('Không tìm thấy đơn hàng nào.', 'No orders found.') }}</p>
          </div>
          <div v-else class="orders-list">
            <div 
              v-for="order in filteredCustomerOrders" 
              :key="order.id" 
              class="order-card-item"
              :class="{ active: selectedCustomerOrder?.id === order.id }"
              @click="selectedOrderId = order.id"
            >
              <div class="order-card-header">
                <strong>#{{ order.id }}</strong>
                <span :class="['status-badge', order.status.toLowerCase()]">
                  {{ getOrderStatusLabel(order.status) }}
                </span>
              </div>
              <div class="order-payment-line">
                <i class="pi pi-credit-card" />
                <span>{{ getPaymentMethodLabel(order.paymentMethod) }}</span>
              </div>
              <div class="order-card-body">
                <div v-for="item in order.orderItems" :key="item.id" class="order-card-product">
                  <span>{{ item.productName }} <small class="text-muted">x{{ item.quantity }}</small></span>
                  <span>{{ formatCurrency(item.price * item.quantity) }}</span>
                </div>
              </div>
              <div class="order-card-footer">
                <span class="text-muted">{{ new Date(order.createdAt).toLocaleDateString('vi-VN') }}</span>
                <strong class="order-total-price">{{ formatCurrency(order.total) }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Order detailed journey timeline -->
        <div class="orders-timeline-column">
          <div v-if="selectedCustomerOrder" class="order-timeline-card">
            <div class="timeline-header-block">
              <span class="timeline-eyebrow">{{ t('Lộ trình đơn hàng', 'Order Journey') }}</span>
              <strong class="timeline-order-id">#{{ selectedCustomerOrder.id }}</strong>
              <div class="timeline-status">
                <span :class="['status-badge', selectedCustomerOrder.status.toLowerCase()]">
                  {{ getOrderStatusLabel(selectedCustomerOrder.status) }}
                </span>
              </div>
              <div class="order-payment-line timeline-payment-line">
                <i class="pi pi-credit-card" />
                <span>{{ getPaymentMethodLabel(selectedCustomerOrder.paymentMethod) }}</span>
              </div>
            </div>
            <div class="timeline-stepper">
              <article
                v-for="step in getOrderTimeline(selectedCustomerOrder)"
                :key="step.key"
                :class="{ done: step.done, active: step.active, cancelled: step.key === 'cancelled' }"
                class="timeline-step"
              >
                <div class="step-indicator">
                  <i :class="step.key === 'cancelled' ? 'pi pi-times' : step.done ? 'pi pi-check' : 'pi pi-circle'" />
                </div>
                <div class="step-body">
                  <strong>{{ step.label }}</strong>
                  <p>{{ step.description }}</p>
                </div>
              </article>
            </div>
          </div>
          <div v-else class="timeline-placeholder">
            <i class="pi pi-info-circle" />
            <p>{{ t('Chọn một đơn hàng để xem lộ trình chi tiết.', 'Select an order to view detailed journey.') }}</p>
          </div>
        </div>
      </div>
    </div>

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
            <button 
              type="button" 
              class="carousel-nav-btn prev-btn" 
              @click="prevImage(getEnrichedProductImages(selectedProduct))"
              :aria-label="t('Ảnh trước', 'Previous image')"
            >
              <i class="pi pi-chevron-left" />
            </button>
            
            <img 
              v-if="getEnrichedProductImages(selectedProduct)[selectedImageIndex]" 
              :src="getEnrichedProductImages(selectedProduct)[selectedImageIndex]" 
              :alt="translateProductName(selectedProduct)"
              class="main-image-img"
            />
            <button 
              type="button" 
              class="carousel-nav-btn next-btn" 
              @click="nextImage(getEnrichedProductImages(selectedProduct))"
              :aria-label="t('Ảnh sau', 'Next image')"
            >
              <i class="pi pi-chevron-right" />
            </button>
          </div>
          
          <!-- Thumbnails -->
          <div class="thumbnails">
            <button 
              v-for="(image, idx) in getEnrichedProductImageItems(selectedProduct)" 
              :key="idx"
              type="button"
              :class="{ active: idx === selectedImageIndex }"
              @click="selectedImageIndex = idx"
              :aria-label="`Image ${idx + 1}`"
            >
              <img :src="image.imageUrl" :alt="`Product image ${idx + 1}`" />
            </button>
          </div>
        </div>

        <!-- Right column: Product Info & Actions -->
        <div class="detail-info">
          <div class="detail-header">
            <span class="detail-category">{{ translateCategory(selectedProduct.categoryName || '') || t('Sản phẩm', 'Product') }}</span>
            <div class="detail-title-row">
              <h1 class="detail-title">{{ translateProductName(selectedProduct) }}</h1>
              <span
                v-if="selectedProduct.productVersion || getEnrichedProductImageItems(selectedProduct)[0]?.version"
                class="product-version-badge"
              >
                {{ selectedProduct.productVersion || getEnrichedProductImageItems(selectedProduct)[0]?.version }}
              </span>
            </div>

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
            <i class="pi pi-bolt" /> <span>{{ t('Ưu đãi kết thúc sau', 'Deal ends in') }}</span>
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

          <!-- Product Specifications Accordion (Moved below Add to Cart) -->
          <div v-if="enrichedProductDetails" class="detail-specs-accordion">
            <!-- Overview Tab -->
            <div class="accordion-item" :class="{ open: isDetailOverviewOpen }">
              <button type="button" class="accordion-trigger" @click="isDetailOverviewOpen = !isDetailOverviewOpen">
                <span>{{ t('Mô tả tổng quan', 'Overview') }}</span>
                <i class="pi" :class="isDetailOverviewOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
              </button>
              <Transition name="accordion-slide">
                <div v-if="isDetailOverviewOpen" class="accordion-content">
                  <p>{{ enrichedProductDetails.overview }}</p>
                </div>
              </Transition>
            </div>

            <!-- Specs Tab -->
            <div class="accordion-item" :class="{ open: isDetailSpecsOpen }">
              <button type="button" class="accordion-trigger" @click="isDetailSpecsOpen = !isDetailSpecsOpen">
                <span>{{ t('Thông số kỹ thuật', 'Specifications') }}</span>
                <i class="pi" :class="isDetailSpecsOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
              </button>
              <Transition name="accordion-slide">
                <div v-if="isDetailSpecsOpen" class="accordion-content">
                  <table class="specs-table">
                    <tbody>
                      <tr>
                        <td><strong>{{ t('Mã sản phẩm', 'Product Code') }}</strong></td>
                        <td>{{ enrichedProductDetails.specs.code }}</td>
                      </tr>
                      <tr>
                        <td><strong>{{ t('Kích thước', 'Dimensions') }}</strong></td>
                        <td>{{ enrichedProductDetails.specs.dimensions }}</td>
                      </tr>
                      <tr>
                        <td><strong>{{ t('Chất liệu', 'Material') }}</strong></td>
                        <td>{{ enrichedProductDetails.specs.material }}</td>
                      </tr>
                      <tr>
                        <td><strong>{{ t('Trọng lượng', 'Weight') }}</strong></td>
                        <td>{{ enrichedProductDetails.specs.weight }}</td>
                      </tr>
                      <tr>
                        <td><strong>{{ t('Xuất xứ', 'Origin') }}</strong></td>
                        <td>{{ enrichedProductDetails.specs.origin }}</td>
                      </tr>
                      <tr>
                        <td><strong>{{ t('Bảo hành', 'Warranty') }}</strong></td>
                        <td>{{ enrichedProductDetails.specs.warranty }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Transition>
            </div>

            <!-- Usage Tab -->
            <div class="accordion-item" :class="{ open: isDetailUsageOpen }">
              <button type="button" class="accordion-trigger" @click="isDetailUsageOpen = !isDetailUsageOpen">
                <span>{{ t('Hướng dẫn sử dụng', 'Usage & Care') }}</span>
                <i class="pi" :class="isDetailUsageOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
              </button>
              <Transition name="accordion-slide">
                <div v-if="isDetailUsageOpen" class="accordion-content">
                  <p>{{ enrichedProductDetails.usage }}</p>
                </div>
              </Transition>
            </div>

            <!-- Warranty Tab -->
            <div class="accordion-item" :class="{ open: isDetailWarrantyOpen }">
              <button type="button" class="accordion-trigger" @click="isDetailWarrantyOpen = !isDetailWarrantyOpen">
                <span>{{ t('Cam kết & Bảo hành', 'Commitment & Warranty') }}</span>
                <i class="pi" :class="isDetailWarrantyOpen ? 'pi-chevron-up' : 'pi-chevron-down'" />
              </button>
              <Transition name="accordion-slide">
                <div v-if="isDetailWarrantyOpen" class="accordion-content">
                  <p>{{ enrichedProductDetails.commitment }}</p>
                </div>
              </Transition>
            </div>
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
            <img v-if="line.product.imageUrl" :src="line.product.imageUrl" :alt="translateProductName(line.product)" />
            <i v-else class="pi pi-box" />
          </div>
          <div class="cart-info">
            <small>{{ translateCategory(line.product.categoryName || '') }}</small>
            <strong>{{ translateProductName(line.product) }}</strong>
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
        <p><i class="pi pi-info-circle" /> {{ t('Bạn sẽ xác nhận thông tin giao hàng trước khi đặt đơn.', 'You will confirm shipping details before placing the order.') }}</p>
        <button type="button" class="cart-checkout-btn" @click="openCheckoutModal">
          {{ t('Mua hàng', 'Buy Now') }} <i class="pi pi-arrow-right" />
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

    <section class="chatbot-widget" :class="{ open: showChatbot }">
      <button class="chatbot-fab" type="button" @click="openChatbot" :title="t('Trợ lý mua hàng', 'Shopping assistant')">
        <i class="pi pi-comments" />
      </button>

      <aside v-if="showChatbot" class="chatbot-panel">
        <header class="chatbot-head">
          <div>
            <small>{{ ('Smart Store AI') }}</small>
          </div>
          <button type="button" @click="showChatbot = false" :aria-label="t('Đóng', 'Close')">
            <i class="pi pi-times" />
          </button>
        </header>

        <div class="chatbot-suggestions" v-if="!chatbotSending">
          <button
            v-for="suggestion in chatbotSuggestions"
            :key="suggestion"
            type="button"
            @click="sendChatbotText(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>

        <div class="chatbot-body">
          <div v-if="chatbotLoading" class="chatbot-state">
            <i class="pi pi-spin pi-spinner" />
            <span>{{ t('Đang tải phiên chat...', 'Loading chat session...') }}</span>
          </div>
          <template v-else>
            <article
              v-for="(message, index) in chatbotMessages"
              :key="`${message.createdAt}-${index}`"
              class="chat-message"
              :class="message.role === 'user' ? 'from-user' : 'from-bot'"
            >
              <p>{{ message.content }}</p>
            </article>
            <div v-if="chatbotSending" class="chat-message from-bot loading-message">
              <i class="pi pi-spin pi-spinner" />
              <span>{{ t('Đang suy nghĩ...', 'Thinking...') }}</span>
            </div>
          </template>
        </div>

        <div v-if="chatbotActions.length" class="chatbot-actions">
          <button
            v-for="(action, index) in chatbotActions"
            :key="`${action.type}-${action.productId}-${index}`"
            type="button"
            @click="handleChatAction(action)"
          >
            <i :class="action.type === 'add-to-cart' ? 'pi pi-shopping-bag' : 'pi pi-eye'" />
            {{ action.label }}
          </button>
        </div>

        <p v-if="chatbotError" class="chatbot-error">
          <i class="pi pi-exclamation-circle" /> {{ chatbotError }}
        </p>

        <form class="chatbot-input" @submit.prevent="sendChatbotText()">
          <input
            v-model="chatbotInput"
            type="text"
            :placeholder="t('Hỏi về sản phẩm, đơn hàng, tồn kho...', 'Ask about products, orders, stock...')"
            :disabled="chatbotSending"
          />
          <button type="submit" :disabled="chatbotSending || !chatbotInput.trim()">
            <i class="pi pi-send" />
          </button>
        </form>
      </aside>
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
/* Override global admin button styles inside storefront */
.store button:not(.p-button):not(.sidebar-backdrop) {
  border: unset;
  border-radius: unset;
  background: unset;
  color: unset;
  font-weight: unset;
  min-height: unset;
  padding: unset;
  box-shadow: unset;
}
.store button:not(.p-button):not(.sidebar-backdrop):hover {
  border-color: unset;
  background: unset;
}
.store .cart-footer > button,
.store .cart-checkout-btn,
.store .btn-add-to-cart,
.store .submit-btn,
.store .pay-button {
  min-height: 62px;
  padding: 0 32px;
  border-radius: 12px;
  font-size: 16px;
  color: #fff !important;
  background: var(--teal) !important;
  border: 0 !important;
  font-weight: 750;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
}
.store .cart-footer > button:hover,
.store .cart-checkout-btn:hover,
.store .btn-add-to-cart:hover:not(:disabled) {
  background: var(--teal-dark) !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgb(15 118 110 / 28%);
}
.store .btn-add-to-cart {
  min-height: 64px;
  padding: 0 32px;
  font-size: 16px;
}
.store .btn-back-to-store {
  min-height: 64px;
  padding: 0 32px;
  border-radius: 12px;
  font-size: 16px;
  color: var(--ink) !important;
  background: #fff !important;
  border: 2px solid var(--line) !important;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.store .btn-back-to-store:hover {
  color: #fff !important;
  background: var(--ink) !important;
  border-color: var(--ink) !important;
  transform: translateY(-1px);
}
.store .empty-cart button {
  min-height: 58px;
  min-width: 240px;
  margin-top: 22px;
  padding: 16px 40px !important;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 750;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff !important;
  background: var(--teal) !important;
  border: 0 !important;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}
.store .empty-cart button:hover {
  background: var(--teal-dark) !important;
  transform: translateY(-1px);
}
.store .state-card button {
  color: var(--ink) !important;
  background: transparent !important;
  border: 1px solid var(--ink) !important;
}
.store .primary-cta {
  color: #fff !important;
  background: var(--ink) !important;
}
.store .primary-cta:hover {
  color: #fff !important;
  background: var(--teal) !important;
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
  font-family: var(--font-heading);
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
.hero-search-wrap {
  position: relative;
  width: min(520px, 100%);
  margin: 28px 0 0;
  z-index: 5;
}
.hero-search-box {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 0 18px;
  border: 1px solid #c5ccc9;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 10px 30px rgb(20 33 61 / 8%);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.hero-search-box:focus-within {
  border-color: var(--teal);
  box-shadow: 0 10px 30px rgb(15 118 110 / 14%);
}
.hero-search-box > i {
  color: var(--muted);
  font-size: 16px;
}
.hero-search-box input {
  flex: 1;
  min-height: 52px;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 14px;
}
.hero-search-box input:focus {
  outline: 0;
}
.hero-search-clear {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--muted);
  background: #eef2f0;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.hero-search-clear:hover {
  color: var(--ink);
  background: #e2e8e6;
}
.hero-search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 380px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 40px rgb(20 33 61 / 14%);
}
.hero-search-result {
  width: 100%;
  padding: 12px 16px;
  border: 0;
  border-bottom: 1px solid #f0f0ec;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.hero-search-result:last-child {
  border-bottom: 0;
}
.hero-search-result:hover {
  background: #f4faf8;
}
.search-result-thumb {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f4f2;
  display: grid;
  place-items: center;
}
.search-result-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.search-result-thumb i {
  color: var(--muted);
  font-size: 18px;
}
.search-result-info {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 4px;
}
.search-result-info strong {
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.search-result-info small {
  color: var(--muted);
  font-size: 12px;
}
.search-result-arrow {
  color: var(--teal);
  font-size: 12px;
}
.hero-search-empty {
  padding: 28px 20px;
  color: var(--muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.hero-search-empty i {
  font-size: 22px;
  color: #c5ccc9;
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
  font-family: var(--font-heading);
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
  font-family: var(--font-heading);
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
  font-family: var(--font-heading);
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
  font-family: var(--font-heading);
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
  font-family: var(--font-heading);
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
  min-height: 48px;
  min-width: 96px;
  padding: 0 18px;
  border: 1px solid #c5ccc9;
  border-radius: 10px;
  color: var(--ink);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
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
  position: relative;
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
  position: relative;
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

.detail-description-section {
  margin-top: 8px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.detail-description-title {
  margin: 0 0 12px;
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
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
  font-family: var(--font-heading);
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  color: var(--ink);
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-title-row .detail-title {
  margin: 0;
}

.product-version-badge {
  display: inline-flex;
  align-items: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid rgba(4, 120, 87, 0.18);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1;
}

.app-dark .product-version-badge {
  background: rgba(16, 185, 129, 0.16);
  color: #6ee7b7;
  border-color: rgba(110, 231, 183, 0.22);
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
  font-family: var(--font-heading);
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
  gap: 14px;
  padding-top: 20px;
}

.btn-add-to-cart {
  min-height: 64px;
  padding: 0 32px;
  border: 0;
  border-radius: 12px;
  background: var(--teal);
  color: white;
  font-weight: 700;
  font-size: 16px;
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
  min-height: 64px;
  padding: 0 32px;
  border: 2px solid var(--line);
  border-radius: 12px;
  background: white;
  color: var(--ink);
  font-weight: 700;
  font-size: 16px;
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
  font-family: var(--font-heading);
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
  font-family: var(--font-heading);
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
  font-family: var(--font-heading);
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
  font-family: var(--font-heading);
  font-size: 25px;
  font-weight: 500;
}
.empty-cart p {
  color: var(--muted);
  font-size: 12px;
}
.empty-cart button {
  min-height: 52px;
  min-width: 220px;
  margin-top: 22px;
  padding: 14px 36px;
  border: 0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 750;
  color: white;
  background: var(--teal);
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  font-family: var(--font-heading);
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
  font-family: var(--font-heading);
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
.cart-footer > button,
.cart-checkout-btn {
  width: 100%;
  min-height: 62px;
  border: 0;
  border-radius: 12px;
  color: white;
  background: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 16px;
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
  font-family: var(--font-heading);
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
  color: #fff !important;
  background: var(--teal) !important;
}
.app-dark .primary-cta:hover {
  color: #fff !important;
  background: var(--teal-dark) !important;
}
.app-dark .hero-search-box {
  background: #151d30;
  border-color: #23304c;
}
.app-dark .hero-search-dropdown {
  background: #151d30;
  border-color: #23304c;
}
.app-dark .hero-search-result {
  background: #151d30;
  border-bottom-color: #23304c;
}
.app-dark .hero-search-result:hover {
  background: #1c2740;
}
.app-dark .search-result-info strong {
  color: #f1f5f9;
}
.app-dark .btn-back-to-store {
  color: #f1f5f9 !important;
  background: #151d30 !important;
  border-color: #23304c !important;
}
.app-dark .btn-back-to-store:hover {
  color: #0b0f19 !important;
  background: #f1f5f9 !important;
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
  font-family: var(--font-heading);
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

/* Custom Styles for Customer Profile Detailed View Link in Customer Panel */
.view-profile-page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  border-radius: 12px;
  padding: 12px;
  color: #0f766e;
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  margin-top: 15px;
  transition: all 0.2s ease;
  width: 100%;
}
.view-profile-page-btn:hover {
  background: #ccfbf1;
  color: #0d5c56;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.08);
}
.app-dark .view-profile-page-btn {
  background: rgba(15, 118, 110, 0.15);
  border-color: rgba(45, 212, 191, 0.3);
  color: #2dd4bf;
}
.app-dark .view-profile-page-btn:hover {
  background: rgba(15, 118, 110, 0.25);
  color: #5eead4;
}
.customer-info p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}
.customer-info i {
  font-size: 14px;
}
.text-teal {
  color: #0f766e;
}
.app-dark .text-teal {
  color: #2dd4bf;
}

/* Image Carousel Navigation Styles */
.main-image {
  position: relative;
}
.carousel-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  color: #334155;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.carousel-nav-btn:hover {
  background: white;
  transform: translateY(-50%) scale(1.05);
  color: #0f172a;
}
.carousel-nav-btn.prev-btn {
  left: 12px;
}
.carousel-nav-btn.next-btn {
  right: 12px;
}
.app-dark .carousel-nav-btn {
  background: rgba(15, 23, 42, 0.7);
  border-color: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}
.app-dark .carousel-nav-btn:hover {
  background: rgba(30, 41, 59, 0.85);
  color: white;
}

/* Product Specifications Accordion Styles */
.detail-specs-accordion {
  margin-top: 30px;
  border-top: 1px solid var(--line);
  padding-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}
.detail-specs-accordion .accordion-item {
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  background: white;
  transition: border-color 0.2s;
}
.app-dark .detail-specs-accordion .accordion-item {
  background: #1e293b;
}
.detail-specs-accordion .accordion-item.open {
  border-color: var(--teal);
}
.detail-specs-accordion .accordion-trigger {
  width: 100%;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-weight: 700;
  font-size: 16px; /* Increased size by 2-3px */
  color: var(--ink);
  transition: background 0.2s;
  font-family: inherit;
}
.detail-specs-accordion .accordion-trigger:hover {
  background: rgba(15, 23, 42, 0.02);
}
.app-dark .detail-specs-accordion .accordion-trigger:hover {
  background: rgba(255, 255, 255, 0.02);
}
.detail-specs-accordion .accordion-content {
  padding: 0 16px 16px 16px;
  font-size: 15px; /* Increased size by 2px */
  color: var(--muted);
  line-height: 1.5;
  border-top: 1px solid var(--line);
  padding-top: 12px;
}
.detail-specs-accordion .accordion-content p {
  margin: 0;
}
.specs-table {
  width: 100%;
  border-collapse: collapse;
}
.specs-table td {
  padding: 8px 0;
  border-bottom: 1px dashed var(--line);
  font-size: 15px; /* Increased size by 2px */
}
.specs-table tr:last-child td {
  border-bottom: 0;
}
.specs-table td strong {
  color: var(--ink);
}

/* Accordion Transition */
.accordion-slide-enter-active,
.accordion-slide-leave-active {
  transition: all 0.2s ease-out;
  max-height: 350px;
  opacity: 1;
}
.accordion-slide-enter-from,
.accordion-slide-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  padding-top: 0;
  padding-bottom: 0;
}

/* Customer Panel Buttons in Dropdown */
.customer-panel-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
}
.panel-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px 16px;
  color: #334155;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}
.panel-btn i {
  font-size: 16px;
  color: #0f766e;
}
.panel-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

/* Modals Overlay & Layout */
.profile-modal-overlay,
.orders-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgb(15 23 42 / 45%);
  backdrop-filter: blur(8px);
}
.profile-modal,
.orders-modal {
  position: fixed;
  z-index: 101;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(540px, calc(100vw - 32px));
  max-height: calc(100vh - 64px);
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 25%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #1e293b;
}

.orders-modal {
  width: min(900px, calc(100vw - 32px));
}

.modal-close-btn {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
  z-index: 5;
}
.modal-close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-header,
.modal-header-section {
  padding: 24px 28px 16px;
  border-bottom: 1px solid #f1f5f9;
}
.modal-header h2,
.modal-header-section h2 {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  flex: 1;
}
.modal-body.scrollable {
  max-height: 480px;
}

/* Personal Profile Modal styles */
.profile-details-grid {
  background: #f8fafc;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.profile-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}
.profile-detail-row strong {
  color: #64748b;
}
.profile-detail-row span {
  color: #0f172a;
  font-weight: 600;
}
.badge-tier {
  background: #ccfbf1;
  color: #0f766e;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
}

/* Address Edit */
.address-edit-section {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.address-edit-section h3 {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.address-textarea {
  width: 100%;
  min-height: 80px;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  resize: vertical;
  background: white;
  transition: border-color 0.2s;
}
.address-textarea:focus {
  outline: none;
  border-color: #0f766e;
}
.save-address-btn {
  background: #0f766e;
  color: white;
  border: 0;
  border-radius: 10px;
  padding: 12px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
}
.save-address-btn:hover:not(:disabled) {
  background: #0d5c56;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
}
.save-address-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.address-error-msg {
  color: #dc2626;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fef2f2;
  padding: 8px 12px;
  border-radius: 6px;
}
.address-success-msg {
  color: #16a34a;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f0fdf4;
  padding: 8px 12px;
  border-radius: 6px;
}

/* Orders Modal Search Box */
.modal-header-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 24px 28px 16px;
  border-bottom: 1px solid #f1f5f9;
}
.modal-search-box {
  position: relative;
}
.modal-search-box i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
}
.modal-search-box input {
  width: 100%;
  padding: 12px 14px 12px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  background: #f8fafc;
  transition: all 0.2s;
}
.modal-search-box input:focus {
  background: white;
  border-color: #cbd5e1;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.08);
}

/* Orders loading & empty */
.orders-loading,
.orders-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
}
.orders-loading i,
.orders-empty i {
  font-size: 32px;
  margin-bottom: 12px;
  color: #94a3b8;
}

/* Orders list and cards */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.order-card-item {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;
}
.order-card-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}
.order-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.order-card-header strong {
  font-size: 15px;
  color: #0f172a;
}
.order-payment-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  margin-top: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: 12px;
  font-weight: 700;
}
.timeline-payment-line {
  margin-top: 8px;
}
.order-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #f8fafc;
  padding: 10px 14px;
  border-radius: 10px;
}
.order-card-product {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #334155;
}
.order-card-product small {
  margin-left: 4px;
}
.order-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px dashed #f1f5f9;
}
.order-total-price {
  color: #be123c;
  font-size: 16px;
  font-weight: 800;
}

/* Dark Mode Overrides for Profile & Orders Modals */
.app-dark .profile-modal,
.app-dark .orders-modal {
  background: #151d30;
  border: 1px solid #23304c;
  color: #f1f5f9;
}
.app-dark .modal-close-btn {
  background: #23304c;
  border-color: #334155;
  color: #94a3b8;
}
.app-dark .modal-close-btn:hover {
  background: #1e293b;
  color: white;
}
.app-dark .modal-header,
.app-dark .modal-header-section {
  border-bottom-color: #23304c;
}
.app-dark .modal-header h2,
.app-dark .modal-header-section h2 {
  color: #f1f5f9;
}
.app-dark .panel-btn {
  background: #1e293b;
  border-color: #23304c;
  color: #f1f5f9;
}
.app-dark .panel-btn i {
  color: #38bdf8;
}
.app-dark .panel-btn:hover {
  background: #23304c;
}
.app-dark .profile-details-grid {
  background: #0b0f19;
  border-color: #23304c;
}
.app-dark .profile-detail-row strong {
  color: #94a3b8;
}
.app-dark .profile-detail-row span {
  color: #f1f5f9;
}
.app-dark .badge-tier {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}
.app-dark .address-edit-section h3 {
  color: #f1f5f9;
}
.app-dark .address-textarea {
  background: #0b0f19;
  border-color: #23304c;
  color: #f1f5f9;
}
.app-dark .address-textarea:focus {
  border-color: #38bdf8;
}
.app-dark .save-address-btn {
  background: #0284c7;
}
.app-dark .save-address-btn:hover:not(:disabled) {
  background: #0369a1;
}
.app-dark .address-error-msg {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}
.app-dark .address-success-msg {
  background: rgba(22, 163, 74, 0.15);
  color: #86efac;
}
.app-dark .modal-search-box input {
  background: #0b0f19;
  border-color: #23304c;
  color: #f1f5f9;
}
.app-dark .modal-search-box input:focus {
  background: #151d30;
  border-color: #334155;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.08);
}
.app-dark .order-card-item {
  border-color: #23304c;
}
.app-dark .order-card-item:hover {
  border-color: #334155;
}
.app-dark .order-card-header strong {
  color: #f1f5f9;
}
.app-dark .order-payment-line {
  background: rgba(16, 185, 129, 0.16);
  color: #6ee7b7;
}
.app-dark .order-card-body {
  background: #0b0f19;
}
.app-dark .order-card-product {
  color: #cbd5e1;
}
.app-dark .order-card-footer {
  border-top-color: #23304c;
}
.app-dark .order-total-price {
  color: #fb7185;
}

.orders-modal-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
  max-height: 520px;
  overflow: hidden;
  padding: 24px 28px;
}
.orders-list-column {
  overflow-y: auto;
  max-height: 470px;
  padding-right: 8px;
}
.orders-timeline-column {
  overflow-y: auto;
  max-height: 470px;
  border-left: 1px solid #e2e8f0;
  padding-left: 24px;
}
.order-card-item {
  cursor: pointer;
}
.order-card-item.active {
  border-color: #0f766e;
  box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.15);
  background: #f0fdfa;
}
.app-dark .order-card-item.active {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.15);
  background: rgba(2, 132, 199, 0.1);
}

/* Timeline/Journey details */
.order-timeline-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}
.timeline-header-block {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
.timeline-eyebrow {
  color: #0f766e;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.timeline-order-id {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
}
.timeline-stepper {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 12px;
}
.timeline-stepper::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 23px;
  bottom: 8px;
  width: 2px;
  background: #e2e8f0;
}
.timeline-step {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 16px;
  position: relative;
  padding-bottom: 24px;
}
.timeline-step:last-child {
  padding-bottom: 0;
}
.step-indicator {
  position: relative;
  z-index: 2;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  border: 2px solid #cbd5e1;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  transition: all 0.3s;
}
.timeline-step.done .step-indicator {
  border-color: #0f766e;
  background: #0f766e;
  color: white;
}
.timeline-step.active .step-indicator {
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.2);
}
.timeline-step.cancelled .step-indicator {
  border-color: #dc2626;
  background: #dc2626;
  color: #fff;
}
.timeline-step.cancelled.active .step-indicator {
  border-color: #dc2626;
  box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.16);
}
.step-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}
.step-body strong {
  font-size: 14px;
  color: #1e293b;
  font-weight: 700;
}
.step-body p {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}
.timeline-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #94a3b8;
}
.timeline-placeholder i {
  font-size: 32px;
  margin-bottom: 12px;
}

/* App dark mode overrides */
.app-dark .orders-timeline-column {
  border-left-color: #23304c;
}
.app-dark .timeline-eyebrow {
  color: #38bdf8;
}
.app-dark .timeline-order-id {
  color: #f1f5f9;
}
.app-dark .timeline-stepper::before {
  background: #23304c;
}
.app-dark .step-indicator {
  background: #151d30;
  border-color: #334155;
  color: #334155;
}
.app-dark .timeline-step.done .step-indicator {
  border-color: #38bdf8;
  background: #38bdf8;
  color: #0b0f19;
}
.app-dark .timeline-step.active .step-indicator {
  border-color: #38bdf8;
  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2);
}
.app-dark .timeline-step.cancelled .step-indicator {
  border-color: #f87171;
  background: #f87171;
  color: #0b0f19;
}
.app-dark .timeline-step.cancelled.active .step-indicator {
  border-color: #f87171;
  box-shadow: 0 0 0 4px rgba(248, 113, 113, 0.18);
}
.app-dark .step-body strong {
  color: #f1f5f9;
}
.app-dark .step-body p {
  color: #cbd5e1;
}

/* Tabs inside Orders Modal */
.modal-order-tabs {
  display: flex;
  gap: 30px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  justify-content: center;
}
.modal-order-tabs::-webkit-scrollbar {
  display: none;
}
.tab-btn {
  background: transparent;
  border: 0;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.tab-btn:hover {
  color: #0f172a;
}
.tab-btn.active {
  color: #0f766e;
  border-bottom-color: #0f766e;
}

/* Dark mode tab overrides */
.app-dark .modal-order-tabs {
  border-bottom-color: #23304c;
}
.app-dark .tab-btn {
  color: #94a3b8;
}
.app-dark .tab-btn:hover {
  color: #f1f5f9;
}
.app-dark .tab-btn.active {
  color: #38bdf8;
  border-bottom-color: #38bdf8;
}

.chatbot-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 80;
}

.chatbot-fab {
  width: 58px;
  height: 58px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--teal), #0f766e);
  color: white;
  box-shadow: 0 18px 40px rgba(15, 118, 110, 0.28);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 22px;
}

.chatbot-panel {
  position: absolute;
  right: 0;
  bottom: 72px;
  width: min(380px, calc(100vw - 32px));
  height: min(620px, calc(100vh - 120px));
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 24px;
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chatbot-head {
  padding: 18px 20px;
  background: #0f172a;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chatbot-head small {
  display: block;
  color: #7dd3fc;
  font-size: 15px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.chatbot-head strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
}

.chatbot-head button {
  border: 0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
}

.chatbot-suggestions {
  padding: 12px 14px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  border-bottom: 1px solid #eef2f7;
}

.chatbot-suggestions button,
.chatbot-actions button {
  border: 1px solid #ccfbf1;
  border-radius: 999px;
  background: #f0fdfa;
  color: #0f766e;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;
}

.chatbot-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-message {
  max-width: 86%;
  padding: 11px 13px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}

.chat-message p {
  margin: 0;
  white-space: pre-wrap;
}

.chat-message.from-user {
  align-self: flex-end;
  background: #0f766e;
  color: white;
  border-bottom-right-radius: 5px;
}

.chat-message.from-bot {
  align-self: flex-start;
  background: white;
  color: #1e293b;
  border-bottom-left-radius: 5px;
}

.loading-message {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.chatbot-state {
  margin: auto;
  color: #64748b;
  display: grid;
  gap: 10px;
  place-items: center;
  font-weight: 700;
}

.chatbot-actions {
  padding: 10px 14px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  border-top: 1px solid #eef2f7;
}

.chatbot-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ecfeff;
  color: #155e75;
}

.chatbot-error {
  margin: 0;
  padding: 9px 14px;
  color: #b91c1c;
  background: #fee2e2;
  font-size: 12px;
  font-weight: 700;
}

.chatbot-input {
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr 44px;
  gap: 10px;
  border-top: 1px solid #eef2f7;
  background: white;
}

.chatbot-input input {
  min-height: 44px;
  border: 1px solid #dbe4ef;
  border-radius: 14px;
  padding: 0 14px;
  outline: none;
}

.chatbot-input input:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
}

.chatbot-input button {
  border: 0;
  border-radius: 14px;
  background: #0f766e;
  color: white;
  cursor: pointer;
}

.chatbot-input button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.app-dark .chatbot-panel {
  background: #151d30;
  border-color: #23304c;
}

.app-dark .chatbot-body {
  background: #0b0f19;
}

.app-dark .chat-message.from-bot,
.app-dark .chatbot-input {
  background: #151d30;
  color: #f1f5f9;
}

.app-dark .chatbot-suggestions,
.app-dark .chatbot-actions,
.app-dark .chatbot-input {
  border-color: #23304c;
}

.app-dark .chatbot-input input {
  background: #0b0f19;
  border-color: #334155;
  color: #f1f5f9;
}

@media (max-width: 640px) {
  .chatbot-widget {
    right: 14px;
    bottom: 14px;
  }

  .chatbot-panel {
    position: fixed;
    inset: auto 10px 82px 10px;
    width: auto;
    height: min(580px, calc(100vh - 100px));
  }
}
</style>

