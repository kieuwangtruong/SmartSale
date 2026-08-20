import { apiRequest } from './apiClient'
import { API_URLS } from './config'

export interface Product {
  id: number
  name: string
  description?: string | null
  importPrice: number
  sellingPrice: number
  originalPrice: number
  salePrice?: number | null
  imageUrl?: string | null
  imageUrls?: string[]
  imageItems?: ProductImageItem[]
  variants: ProductVariant[]
  categoryId: number
  categoryName: string
  supplierId: number
  supplierName: string
  quantity: number
  reserveStock: number
}

export interface ProductImageItem {
  id?: number
  imageUrl: string
  sortOrder?: number
}

export interface ProductVariantColor {
  id: number
  name: string
  hexCode?: string | null
  quantity: number
  isActive: boolean
  images: ProductImageItem[]
}

export interface ProductVariant {
  id: number
  productId: number
  name: string
  sku: string
  originalPrice: number
  salePrice?: number | null
  sellingPrice: number
  quantity: number
  reserveStock: number
  isActive: boolean
  colors: ProductVariantColor[]
}

export interface ProductVariantPayload {
  name: string
  sku: string
  originalPrice: number
  salePrice?: number | null
  quantity: number
  reserveStock: number
  isActive: boolean
}

export interface ProductVariantColorPayload {
  name: string
  hexCode?: string | null
  quantity: number
  isActive: boolean
  imageUrls: string[]
}

type ProductApiResponse = Product & {
  Description?: string | null
  ImageUrls?: string[] | null
  ImageItems?: ProductImageItem[] | null
}

export interface Category {
  id: number
  name: string
  parentCategoryId?: number | null
}

export interface ProductPayload {
  name: string
  description?: string | null
  importPrice: number
  sellingPrice: number
  originalPrice?: number | null
  salePrice?: number | null
  imageUrl?: string | null
  imageUrls?: string[]
  imageItems?: ProductImageItem[]
  categoryId: number
  supplierId: number
  quantity: number
  reserveStock: number
}

export interface StockReceipt {
  id: number
  supplierId: number
  supplierName: string
  note?: string | null
  status: 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Confirmed' | 'Cancelled'
  invoiceNumber: string
  importDate: string
  createdAt: string
  submittedAt?: string | null
  approvedAt?: string | null
  confirmedAt?: string | null
  createdByUserId: number
  approvedByUserId?: number | null
  totalAmount: number
  items: Array<{
    productId: number
    productName: string
    quantity: number
    importPrice: number
  }>
}

function normalizeProduct(product: ProductApiResponse): Product {
  return {
    ...product,
    description: product.description ?? product.Description ?? null,
    imageUrls: product.imageUrls ?? product.ImageUrls ?? [],
    imageItems: product.imageItems ?? product.ImageItems ?? [],
    variants: product.variants ?? [],
  }
}

const DEFAULT_MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Tai nghe chụp tai Bluetooth Pro ANC',
    description: 'Chống ồn chủ động ANC tiên tiến, pin 40h, mic HD',
    importPrice: 600000,
    sellingPrice: 990000,
    originalPrice: 1500000,
    salePrice: 990000,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    categoryId: 1,
    categoryName: 'Điện tử',
    supplierId: 1,
    supplierName: 'Công ty Công nghệ Âm thanh Pro',
    quantity: 85,
    reserveStock: 10,
    variants: [
      {
        id: 101,
        productId: 1,
        name: 'ANC Pro Space Gray',
        sku: 'TN-PRO-ANC',
        originalPrice: 1500000,
        salePrice: 990000,
        sellingPrice: 990000,
        quantity: 85,
        reserveStock: 10,
        isActive: true,
        colors: [
          { id: 1001, name: 'Đen nhám', hexCode: '#111827', quantity: 50, isActive: true, images: [] },
          { id: 1002, name: 'Trắng bạc', hexCode: '#F3F4F6', quantity: 35, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Bàn phím cơ RGB Pro Custom Switch',
    description: 'LED RGB 16.8 triệu màu, Red Switch mượt mà, vỏ nhôm',
    importPrice: 800000,
    sellingPrice: 1290000,
    originalPrice: 1800000,
    salePrice: 1290000,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
    categoryId: 1,
    categoryName: 'Điện tử',
    supplierId: 1,
    supplierName: 'Công ty Công nghệ Âm thanh Pro',
    quantity: 45,
    reserveStock: 5,
    variants: [
      {
        id: 102,
        productId: 2,
        name: 'Red Switch Silent Edition',
        sku: 'BP-RGB-RED',
        originalPrice: 1800000,
        salePrice: 1290000,
        sellingPrice: 1290000,
        quantity: 45,
        reserveStock: 5,
        isActive: true,
        colors: [
          { id: 1003, name: 'Đen Led RGB', hexCode: '#1a1a1a', quantity: 45, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Chuột không dây Silent Ergonomics 2.4G',
    description: 'Giảm 90% tiếng ồn click, thiết kế công thái học',
    importPrice: 180000,
    sellingPrice: 299000,
    originalPrice: 450000,
    salePrice: 299000,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
    categoryId: 2,
    categoryName: 'Phụ kiện',
    supplierId: 2,
    supplierName: 'Nhà cung cấp Phụ kiện Việt',
    quantity: 120,
    reserveStock: 15,
    variants: [
      {
        id: 103,
        productId: 3,
        name: 'Silent Wireless 2.4G',
        sku: 'CKD-SILENT-01',
        originalPrice: 450000,
        salePrice: 299000,
        sellingPrice: 299000,
        quantity: 120,
        reserveStock: 15,
        isActive: true,
        colors: [
          { id: 1004, name: 'Xám không gian', hexCode: '#4b5563', quantity: 120, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'Loa Bluetooth Mini Bass Pro IPX7',
    description: 'Chống nước IPX7, pin 15 giờ liên tục, màng loa bass kép',
    importPrice: 300000,
    sellingPrice: 490000,
    originalPrice: 750000,
    salePrice: 490000,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500',
    categoryId: 1,
    categoryName: 'Điện tử',
    supplierId: 1,
    supplierName: 'Công ty Công nghệ Âm thanh Pro',
    quantity: 60,
    reserveStock: 8,
    variants: [
      {
        id: 104,
        productId: 4,
        name: 'Bluetooth IPX7 Sport',
        sku: 'LOA-BT-MINI',
        originalPrice: 750000,
        salePrice: 490000,
        sellingPrice: 490000,
        quantity: 60,
        reserveStock: 8,
        isActive: true,
        colors: [
          { id: 1005, name: 'Xanh Quân đội', hexCode: '#064e3b', quantity: 60, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'Đồng hồ thông minh Smart Watch S2 Pro',
    description: 'Đo SpO2, nhịp tim, màn hình AMOLED Always-on',
    importPrice: 1200000,
    sellingPrice: 1990000,
    originalPrice: 2900000,
    salePrice: 1990000,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    categoryId: 2,
    categoryName: 'Phụ kiện',
    supplierId: 2,
    supplierName: 'Nhà cung cấp Phụ kiện Việt',
    quantity: 30,
    reserveStock: 5,
    variants: [
      {
        id: 105,
        productId: 5,
        name: 'Smart Watch S2 AMOLED',
        sku: 'SW-S2-PRO',
        originalPrice: 2900000,
        salePrice: 1990000,
        sellingPrice: 1990000,
        quantity: 30,
        reserveStock: 5,
        isActive: true,
        colors: [
          { id: 1006, name: 'Đen viền nhôm', hexCode: '#18181b', quantity: 30, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'Đèn bàn học chống cận LED Smart Touch',
    description: 'Bảo vệ thị lực, 5 chế độ ánh sáng, sạc không dây 10W',
    importPrice: 250000,
    sellingPrice: 450000,
    originalPrice: 650000,
    salePrice: 450000,
    imageUrl: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=500',
    categoryId: 3,
    categoryName: 'Gia dụng',
    supplierId: 3,
    supplierName: 'Gia dụng & Thiết bị Thông minh Việt',
    quantity: 75,
    reserveStock: 10,
    variants: [
      {
        id: 106,
        productId: 6,
        name: 'Đèn LED Smart Touch 10W',
        sku: 'DEN-LED-06',
        originalPrice: 650000,
        salePrice: 450000,
        sellingPrice: 450000,
        quantity: 75,
        reserveStock: 10,
        isActive: true,
        colors: [
          { id: 1007, name: 'Trắng Tinh Khôi', hexCode: '#FFFFFF', quantity: 75, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 7,
    name: 'Cốc giữ nhiệt Inox 304 High-Class 500ml',
    description: 'Giữ nóng 12h, giữ lạnh 24h, nắp chống tràn an toàn',
    importPrice: 120000,
    sellingPrice: 249000,
    originalPrice: 350000,
    salePrice: 249000,
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500',
    categoryId: 3,
    categoryName: 'Gia dụng',
    supplierId: 3,
    supplierName: 'Gia dụng & Thiết bị Thông minh Việt',
    quantity: 150,
    reserveStock: 20,
    variants: [
      {
        id: 107,
        productId: 7,
        name: 'Inox 304 Premium 500ml',
        sku: 'COC-GN-500ML',
        originalPrice: 350000,
        salePrice: 249000,
        sellingPrice: 249000,
        quantity: 150,
        reserveStock: 20,
        isActive: true,
        colors: [
          { id: 1008, name: 'Xanh Navy', hexCode: '#1e3a8a', quantity: 150, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 8,
    name: 'Sổ tay da cao cấp A5 Notebook Organizer',
    description: 'Giấy chống lóa 100gsm, kèm kẹp bút kim loại sang trọng',
    importPrice: 80000,
    sellingPrice: 159000,
    originalPrice: 220000,
    salePrice: 159000,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500',
    categoryId: 4,
    categoryName: 'Văn phòng',
    supplierId: 4,
    supplierName: 'Văn phòng phẩm & Quà tặng Văn phòng',
    quantity: 200,
    reserveStock: 25,
    variants: [
      {
        id: 108,
        productId: 8,
        name: 'Sổ bìa da A5 Deluxe',
        sku: 'SO-DA-A5',
        originalPrice: 220000,
        salePrice: 159000,
        sellingPrice: 159000,
        quantity: 200,
        reserveStock: 25,
        isActive: true,
        colors: [
          { id: 1009, name: 'Nâu Cổ Đển', hexCode: '#78350f', quantity: 200, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 9,
    name: 'Bút ký kim loại cao cấp Business Executive Pen',
    description: 'Ngòi dạ bi mượt mà, chất liệu thép không gỉ mạ vàng',
    importPrice: 90000,
    sellingPrice: 189000,
    originalPrice: 280000,
    salePrice: 189000,
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500',
    categoryId: 4,
    categoryName: 'Văn phòng',
    supplierId: 4,
    supplierName: 'Văn phòng phẩm & Quà tặng Văn phòng',
    quantity: 90,
    reserveStock: 10,
    variants: [
      {
        id: 109,
        productId: 9,
        name: 'Pen Executive Gold',
        sku: 'BUT-KY-GOLD',
        originalPrice: 280000,
        salePrice: 189000,
        sellingPrice: 189000,
        quantity: 90,
        reserveStock: 10,
        isActive: true,
        colors: [
          { id: 1010, name: 'Đen Mạ Vàng', hexCode: '#ca8a04', quantity: 90, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 10,
    name: 'Balo chống nước Laptop 15.6 inch Business',
    description: 'Chống sốc 3 lớp, ngăn sạc USB ngoài, vải Oxford kháng nước',
    importPrice: 220000,
    sellingPrice: 429000,
    originalPrice: 650000,
    salePrice: 429000,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
    categoryId: 2,
    categoryName: 'Phụ kiện',
    supplierId: 2,
    supplierName: 'Nhà cung cấp Phụ kiện Việt',
    quantity: 55,
    reserveStock: 8,
    variants: [
      {
        id: 110,
        productId: 10,
        name: 'Balo Laptop Oxford 15.6"',
        sku: 'BALO-LAP-15',
        originalPrice: 650000,
        salePrice: 429000,
        sellingPrice: 429000,
        quantity: 55,
        reserveStock: 8,
        isActive: true,
        colors: [
          { id: 1011, name: 'Xám Ghi', hexCode: '#374151', quantity: 55, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 11,
    name: 'Máy phun sương tạo ẩm không khí Ultrasonic 3L',
    description: 'Hoạt động êm ái <30dB, tự ngắt khi hết nước, khuếch tán tinh dầu',
    importPrice: 190000,
    sellingPrice: 380000,
    originalPrice: 550000,
    salePrice: 380000,
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500',
    categoryId: 3,
    categoryName: 'Gia dụng',
    supplierId: 3,
    supplierName: 'Gia dụng & Thiết bị Thông minh Việt',
    quantity: 40,
    reserveStock: 5,
    variants: [
      {
        id: 111,
        productId: 11,
        name: 'Ultrasonic Humidifier 3L',
        sku: 'MAY-TAO-AM',
        originalPrice: 550000,
        salePrice: 380000,
        sellingPrice: 380000,
        quantity: 40,
        reserveStock: 5,
        isActive: true,
        colors: [
          { id: 1012, name: 'Trắng Tuyết', hexCode: '#FFFFFF', quantity: 40, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 12,
    name: 'Kệ đỡ Laptop nhôm nguyên khối xoay 360',
    description: 'Chịu tải 10kg, tản nhiệt nhôm đỉnh cao, chỉnh độ cao linh hoạt',
    importPrice: 160000,
    sellingPrice: 320000,
    originalPrice: 480000,
    salePrice: 320000,
    imageUrl: 'https://images.unsplash.com/photo-1616440342232-017fb714444f?w=500',
    categoryId: 4,
    categoryName: 'Văn phòng',
    supplierId: 4,
    supplierName: 'Văn phòng phẩm & Quà tặng Văn phòng',
    quantity: 80,
    reserveStock: 10,
    variants: [
      {
        id: 112,
        productId: 12,
        name: 'Kệ nhôm Xoay 360',
        sku: 'KE-LAP-360',
        originalPrice: 480000,
        salePrice: 320000,
        sellingPrice: 320000,
        quantity: 80,
        reserveStock: 10,
        isActive: true,
        colors: [
          { id: 1013, name: 'Bạc Kim Loại', hexCode: '#e5e7eb', quantity: 80, isActive: true, images: [] },
        ],
      },
    ],
  },
]

export async function getProducts(): Promise<Product[]> {
  if (API_URLS.product) {
    try {
      const products = await apiRequest<ProductApiResponse[]>(API_URLS.product, '/api/products')
      if (products && products.length > 0) {
        return products.map(normalizeProduct)
      }
    } catch (err) {
      console.warn('[ProductApi] Remote product fetch failed, using local product mocks fallback:', err)
    }
  }
  return DEFAULT_MOCK_PRODUCTS
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  if (API_URLS.product) {
    try {
      const product = await apiRequest<ProductApiResponse>(API_URLS.product, '/api/products', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
      return normalizeProduct(product)
    } catch {}
  }

  const newP: Product = {
    id: Date.now(),
    name: payload.name,
    description: payload.description,
    importPrice: payload.importPrice,
    sellingPrice: payload.sellingPrice,
    originalPrice: payload.originalPrice || payload.sellingPrice,
    salePrice: payload.salePrice,
    imageUrl: payload.imageUrl,
    categoryId: payload.categoryId,
    categoryName: payload.categoryId === 1 ? 'Điện tử' : payload.categoryId === 2 ? 'Phụ kiện' : 'Gia dụng',
    supplierId: payload.supplierId,
    supplierName: 'Nhà cung cấp Demo',
    quantity: payload.quantity,
    reserveStock: payload.reserveStock,
    variants: [],
  }
  DEFAULT_MOCK_PRODUCTS.unshift(newP)
  return newP
}

export async function updateProduct(id: number, payload: ProductPayload): Promise<Product> {
  if (API_URLS.product) {
    try {
      const product = await apiRequest<ProductApiResponse>(API_URLS.product, `/api/products/${id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ id, ...payload }),
      })
      return normalizeProduct(product)
    } catch {}
  }

  const p = DEFAULT_MOCK_PRODUCTS.find((item) => item.id === id)
  if (p) {
    p.name = payload.name
    p.description = payload.description
    p.importPrice = payload.importPrice
    p.sellingPrice = payload.sellingPrice
    p.quantity = payload.quantity
    p.reserveStock = payload.reserveStock
    return p
  }
  return DEFAULT_MOCK_PRODUCTS[0]!
}

export async function deleteProduct(id: number): Promise<unknown> {
  if (API_URLS.product) {
    try {
      return await apiRequest<unknown>(API_URLS.product, `/api/products/${id}`, {
        method: 'DELETE',
        auth: true,
      })
    } catch {}
  }
  const idx = DEFAULT_MOCK_PRODUCTS.findIndex((item) => item.id === id)
  if (idx !== -1) DEFAULT_MOCK_PRODUCTS.splice(idx, 1)
  return { success: true }
}

export async function createProductVariant(productId: number, payload: ProductVariantPayload): Promise<ProductVariant> {
  if (API_URLS.product) {
    try {
      return await apiRequest<ProductVariant>(API_URLS.product, `/api/product-variants/product/${productId}`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }
  return {
    id: Date.now(),
    productId,
    name: payload.name,
    sku: payload.sku,
    originalPrice: payload.originalPrice,
    salePrice: payload.salePrice,
    sellingPrice: payload.salePrice || payload.originalPrice,
    quantity: payload.quantity,
    reserveStock: payload.reserveStock,
    isActive: payload.isActive,
    colors: [],
  }
}

export async function updateProductVariant(id: number, payload: ProductVariantPayload): Promise<ProductVariant> {
  if (API_URLS.product) {
    try {
      return await apiRequest<ProductVariant>(API_URLS.product, `/api/product-variants/${id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }
  return {
    id,
    productId: 1,
    name: payload.name,
    sku: payload.sku,
    originalPrice: payload.originalPrice,
    salePrice: payload.salePrice,
    sellingPrice: payload.salePrice || payload.originalPrice,
    quantity: payload.quantity,
    reserveStock: payload.reserveStock,
    isActive: payload.isActive,
    colors: [],
  }
}

export async function createVariantColor(variantId: number, payload: ProductVariantColorPayload): Promise<ProductVariantColor> {
  if (API_URLS.product) {
    try {
      return await apiRequest<ProductVariantColor>(API_URLS.product, `/api/product-variants/${variantId}/colors`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }
  return {
    id: Date.now(),
    name: payload.name,
    hexCode: payload.hexCode,
    quantity: payload.quantity,
    isActive: payload.isActive,
    images: payload.imageUrls.map((url, index) => ({ id: index, imageUrl: url, sortOrder: index })),
  }
}

export async function updateVariantColor(id: number, payload: ProductVariantColorPayload): Promise<ProductVariantColor> {
  if (API_URLS.product) {
    try {
      return await apiRequest<ProductVariantColor>(API_URLS.product, `/api/product-variants/colors/${id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }
  return {
    id,
    name: payload.name,
    hexCode: payload.hexCode,
    quantity: payload.quantity,
    isActive: payload.isActive,
    images: payload.imageUrls.map((url, index) => ({ id: index, imageUrl: url, sortOrder: index })),
  }
}

const DEFAULT_MOCK_CATEGORIES: Category[] = [
  { id: 1, name: 'Điện tử', parentCategoryId: null },
  { id: 2, name: 'Phụ kiện', parentCategoryId: null },
  { id: 3, name: 'Gia dụng', parentCategoryId: null },
  { id: 4, name: 'Văn phòng', parentCategoryId: null },
]

const DEFAULT_MOCK_RECEIPTS: StockReceipt[] = [
  {
    id: 1,
    supplierId: 1,
    supplierName: 'Công ty Công nghệ Âm thanh Pro',
    note: 'Nhập lô tai nghe & loa Bluetooth mới',
    status: 'Approved',
    invoiceNumber: 'HD-2026-001',
    importDate: '2026-01-10T08:00:00Z',
    createdAt: '2026-01-10T08:00:00Z',
    submittedAt: '2026-01-10T08:30:00Z',
    approvedAt: '2026-01-10T09:00:00Z',
    confirmedAt: '2026-01-10T09:00:00Z',
    createdByUserId: 2,
    approvedByUserId: 1,
    totalAmount: 15000000,
    items: [
      { productId: 1, productName: 'Tai nghe chụp tai Bluetooth Pro ANC', quantity: 20, importPrice: 600000 },
      { productId: 4, productName: 'Loa Bluetooth Mini Bass Pro IPX7', quantity: 10, importPrice: 300000 },
    ],
  },
]

export async function getCategories(): Promise<Category[]> {
  if (API_URLS.product) {
    try {
      const res = await apiRequest<Category[]>(API_URLS.product, '/api/categories')
      if (res && res.length > 0) return res
    } catch (err) {
      console.warn('[ProductApi] Remote getCategories failed, using local categories fallback:', err)
    }
  }
  return DEFAULT_MOCK_CATEGORIES
}

export async function createCategory(payload: Omit<Category, 'id'>): Promise<Category> {
  if (API_URLS.product) {
    try {
      return await apiRequest<Category>(API_URLS.product, '/api/categories', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }
  const newCat = { id: Date.now(), name: payload.name, parentCategoryId: payload.parentCategoryId }
  DEFAULT_MOCK_CATEGORIES.push(newCat)
  return newCat
}

export async function updateInventory(productId: number, quantity: number, reserveStock: number): Promise<unknown> {
  if (API_URLS.product) {
    try {
      return await apiRequest<unknown>(API_URLS.product, '/api/inventory', {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ productId, quantity, reserveStock }),
      })
    } catch {}
  }
  const p = DEFAULT_MOCK_PRODUCTS.find((item) => item.id === productId)
  if (p) {
    p.quantity = quantity
    p.reserveStock = reserveStock
  }
  return { success: true }
}

export async function getLowStock(): Promise<Array<{ productId: number; productName: string; quantity: number; reserveStock: number }>> {
  if (API_URLS.product) {
    try {
      const res = await apiRequest<Array<{ productId: number; productName: string; quantity: number; reserveStock: number }>>(
        API_URLS.product,
        '/api/inventory/low-stock',
        { auth: true },
      )
      if (res && res.length > 0) return res
    } catch (err) {
      console.warn('[ProductApi] Remote getLowStock failed, using local fallback:', err)
    }
  }
  const products = await getProducts()
  return products
    .filter((p) => p.quantity <= p.reserveStock)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      quantity: p.quantity,
      reserveStock: p.reserveStock,
    }))
}

export async function getStockReceipts(): Promise<StockReceipt[]> {
  if (API_URLS.product) {
    try {
      const res = await apiRequest<StockReceipt[]>(API_URLS.product, '/api/stock-receipts', {
        auth: true,
      })
      if (res && res.length > 0) return res
    } catch (err) {
      console.warn('[ProductApi] Remote getStockReceipts failed, using local receipts fallback:', err)
    }
  }
  return DEFAULT_MOCK_RECEIPTS
}

export async function createStockReceipt(payload: {
  supplierId: number
  invoiceNumber?: string
  importDate?: string
  note?: string
  items: Array<{ productId: number; quantity: number; importPrice: number }>
}): Promise<StockReceipt> {
  if (API_URLS.product) {
    try {
      return await apiRequest<StockReceipt>(API_URLS.product, '/api/stock-receipts', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }

  const total = payload.items.reduce((sum, item) => sum + item.quantity * item.importPrice, 0)
  const newReceipt: StockReceipt = {
    id: Date.now(),
    supplierId: payload.supplierId,
    supplierName: 'Nhà cung cấp Demo',
    note: payload.note || '',
    status: 'Draft',
    invoiceNumber: payload.invoiceNumber || `HD-${Date.now()}`,
    importDate: payload.importDate || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdByUserId: 1,
    totalAmount: total,
    items: payload.items.map((i) => ({ productId: i.productId, productName: `Sản phẩm #${i.productId}`, quantity: i.quantity, importPrice: i.importPrice })),
  }
  DEFAULT_MOCK_RECEIPTS.unshift(newReceipt)
  return newReceipt
}

export async function confirmStockReceipt(id: number): Promise<StockReceipt> {
  if (API_URLS.product) {
    try {
      return await apiRequest<StockReceipt>(API_URLS.product, `/api/stock-receipts/${id}/approve`, {
        method: 'POST',
        auth: true,
      })
    } catch {}
  }
  const list = await getStockReceipts()
  const found = list.find((r) => r.id === id) || list[0]!
  found.status = 'Confirmed'
  found.confirmedAt = new Date().toISOString()
  return found
}

export async function submitStockReceipt(id: number): Promise<StockReceipt> {
  if (API_URLS.product) {
    try {
      return await apiRequest<StockReceipt>(API_URLS.product, `/api/stock-receipts/${id}/submit`, {
        method: 'POST',
        auth: true,
      })
    } catch {}
  }
  const list = await getStockReceipts()
  const found = list.find((r) => r.id === id) || list[0]!
  found.status = 'PendingApproval'
  found.submittedAt = new Date().toISOString()
  return found
}

export async function cancelStockReceipt(id: number): Promise<unknown> {
  if (API_URLS.product) {
    try {
      return await apiRequest<unknown>(API_URLS.product, `/api/stock-receipts/${id}/reject`, {
        method: 'POST',
        auth: true,
      })
    } catch {}
  }
  const list = await getStockReceipts()
  const found = list.find((r) => r.id === id)
  if (found) found.status = 'Cancelled'
  return { success: true }
}
