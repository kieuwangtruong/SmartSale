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
  const originalPrice = product.originalPrice || product.sellingPrice || 0
  const sellingPrice = (product.salePrice && product.salePrice < originalPrice) ? product.salePrice : (product.sellingPrice || originalPrice)
  const quantity = Math.max(0, Number(product.quantity) || 0)
  const reserveStock = Math.max(0, Number(product.reserveStock) || 0)

  let variants = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : []
  if (!variants.length) {
    variants = [
      {
        id: product.id * 100 + 1,
        productId: product.id,
        name: 'Tiêu chuẩn',
        sku: `SKU-${product.id}`,
        originalPrice,
        salePrice: product.salePrice,
        sellingPrice,
        quantity,
        reserveStock,
        isActive: true,
        colors: [
          {
            id: product.id * 1000 + 1,
            name: 'Mặc định',
            hexCode: '#3b82f6',
            quantity,
            isActive: true,
            images: product.imageUrl ? [{ id: 1, imageUrl: product.imageUrl, sortOrder: 1 }] : [],
          },
        ],
      },
    ]
  } else {
    variants = variants.map((v) => {
      const variantQty = Number(v.quantity) || quantity
      let colors = Array.isArray(v.colors) && v.colors.length > 0 ? v.colors : []
      if (!colors.length) {
        colors = [
          {
            id: v.id * 10 + 1,
            name: 'Mặc định',
            hexCode: '#3b82f6',
            quantity: variantQty,
            isActive: true,
            images: [],
          },
        ]
      }
      return {
        ...v,
        quantity: variantQty,
        sellingPrice: v.sellingPrice || (v.salePrice && v.salePrice < v.originalPrice ? v.salePrice : v.originalPrice) || sellingPrice,
        colors,
      }
    })
  }

  const imageUrls = product.imageUrls && product.imageUrls.length > 0
    ? product.imageUrls
    : (product.ImageUrls && product.ImageUrls.length > 0 ? product.ImageUrls : (product.imageUrl ? [product.imageUrl] : []))

  return {
    ...product,
    description: product.description ?? product.Description ?? null,
    imageUrl: product.imageUrl || imageUrls[0] || null,
    imageUrls,
    imageItems: product.imageItems ?? product.ImageItems ?? [],
    variants,
  }
}

const DEFAULT_MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Đồng hồ thông minh Smart Watch Pro X1',
    description: 'Màn hình AMOLED 1.43 inch, đo nhịp tim, oxy SpO2, chống nước 5ATM, pin 14 ngày.',
    importPrice: 1200000,
    sellingPrice: 1890000,
    originalPrice: 2200000,
    salePrice: 1890000,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
    categoryId: 1,
    categoryName: 'Điện tử',
    supplierId: 1,
    supplierName: 'Công ty TNHH Phân Phối Công Nghệ Á Châu',
    quantity: 85,
    reserveStock: 10,
    variants: [
      {
        id: 101,
        productId: 1,
        name: 'Pro X1 Titanium Black',
        sku: 'SW-PRO-X1-BLK',
        originalPrice: 2200000,
        salePrice: 1890000,
        sellingPrice: 1890000,
        quantity: 85,
        reserveStock: 10,
        isActive: true,
        colors: [
          { id: 1001, name: 'Đen Nhám Titan', hexCode: '#18181b', quantity: 50, isActive: true, images: [] },
          { id: 1002, name: 'Bạc Ánh Kim', hexCode: '#e4e4e7', quantity: 35, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Tai nghe không dây Bluetooth ANC Pods 3',
    description: 'Chống ồn chủ động ANC 35dB, âm thanh Hi-Res Spatial Audio, sạc không dây Qi.',
    importPrice: 650000,
    sellingPrice: 990000,
    originalPrice: 1290000,
    salePrice: 990000,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
    categoryId: 1,
    categoryName: 'Điện tử',
    supplierId: 1,
    supplierName: 'Công ty TNHH Phân Phối Công Nghệ Á Châu',
    quantity: 120,
    reserveStock: 15,
    variants: [
      {
        id: 102,
        productId: 2,
        name: 'ANC Pods 3 Pro',
        sku: 'ANC-PODS-3',
        originalPrice: 1290000,
        salePrice: 990000,
        sellingPrice: 990000,
        quantity: 120,
        reserveStock: 15,
        isActive: true,
        colors: [
          { id: 1003, name: 'Trắng Sữa', hexCode: '#ffffff', quantity: 70, isActive: true, images: [] },
          { id: 1004, name: 'Đen Mờ', hexCode: '#09090b', quantity: 50, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Đầu thu âm thanh DAC Bluetooth 5.3 Ultra',
    description: 'Bộ giải mã âm thanh 24-bit 96kHz, truyền tải âm thanh chuẩn studio không suy hao.',
    importPrice: 350000,
    sellingPrice: 520000,
    originalPrice: 650000,
    salePrice: 520000,
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800',
    categoryId: 1,
    categoryName: 'Điện tử',
    supplierId: 1,
    supplierName: 'Công ty TNHH Phân Phối Công Nghệ Á Châu',
    quantity: 45,
    reserveStock: 8,
    variants: [
      {
        id: 103,
        productId: 3,
        name: 'DAC Studio Edition',
        sku: 'DAC-BT-53',
        originalPrice: 650000,
        salePrice: 520000,
        sellingPrice: 520000,
        quantity: 45,
        reserveStock: 8,
        isActive: true,
        colors: [
          { id: 1005, name: 'Xám Kim Loại', hexCode: '#4b5563', quantity: 45, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'Loa Bluetooth di động BassMax SoundBox',
    description: 'Công suất 30W chống nước IPX7, pin phát nhạc liên tục 18 giờ, đèn LED RGB sống động.',
    importPrice: 580000,
    sellingPrice: 890000,
    originalPrice: 1100000,
    salePrice: 890000,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&q=80&w=800',
    categoryId: 1,
    categoryName: 'Điện tử',
    supplierId: 1,
    supplierName: 'Công ty TNHH Phân Phối Công Nghệ Á Châu',
    quantity: 60,
    reserveStock: 12,
    variants: [
      {
        id: 104,
        productId: 4,
        name: 'BassMax SoundBox 30W',
        sku: 'BASS-MAX-30W',
        originalPrice: 1100000,
        salePrice: 890000,
        sellingPrice: 890000,
        quantity: 60,
        reserveStock: 12,
        isActive: true,
        colors: [
          { id: 1006, name: 'Đen Led RGB', hexCode: '#111827', quantity: 60, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'Nồi chiên không dầu điện tử EcoAir 6.5L',
    description: 'Dung tích 6.5L nướng nguyên con gà, công nghệ đối lưu nhiệt 360 giảm 85% dầu mỡ.',
    importPrice: 950000,
    sellingPrice: 1450000,
    originalPrice: 1850000,
    salePrice: 1450000,
    imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=800',
    categoryId: 2,
    categoryName: 'Gia dụng',
    supplierId: 2,
    supplierName: 'Tập đoàn Thiết Bị Gia Dụng SmartHome Toàn Cầu',
    quantity: 50,
    reserveStock: 8,
    variants: [
      {
        id: 105,
        productId: 5,
        name: 'EcoAir Digital 6.5L',
        sku: 'ECO-AIR-65L',
        originalPrice: 1850000,
        salePrice: 1450000,
        sellingPrice: 1450000,
        quantity: 50,
        reserveStock: 8,
        isActive: true,
        colors: [
          { id: 1007, name: 'Đen Bóng Sang Trọng', hexCode: '#000000', quantity: 50, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 6,
    name: 'Robot hút bụi lau nhà thông minh CleanBot Ultra',
    description: 'Lực hút 4000Pa, định vị Laser LiDAR 3D, tự động đổ rác và giặt sấy giẻ lau.',
    importPrice: 4200000,
    sellingPrice: 6500000,
    originalPrice: 7900000,
    salePrice: 6500000,
    imageUrl: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=800',
    categoryId: 2,
    categoryName: 'Gia dụng',
    supplierId: 2,
    supplierName: 'Tập đoàn Thiết Bị Gia Dụng SmartHome Toàn Cầu',
    quantity: 35,
    reserveStock: 5,
    variants: [
      {
        id: 106,
        productId: 6,
        name: 'CleanBot Ultra LiDAR 3D',
        sku: 'CLEAN-BOT-ULTRA',
        originalPrice: 7900000,
        salePrice: 6500000,
        sellingPrice: 6500000,
        quantity: 35,
        reserveStock: 5,
        isActive: true,
        colors: [
          { id: 1008, name: 'Trắng Tinh Tế', hexCode: '#f9fafb', quantity: 35, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 7,
    name: 'Máy lọc không khí thông minh AirPure Pro H13',
    description: 'Màng lọc HEPA H13 khử 99.97% bụi mịn PM2.5, khử mùi than hoạt tính cho phòng 45m2.',
    importPrice: 1600000,
    sellingPrice: 2490000,
    originalPrice: 2990000,
    salePrice: 2490000,
    imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&q=80&w=800',
    categoryId: 2,
    categoryName: 'Gia dụng',
    supplierId: 2,
    supplierName: 'Tập đoàn Thiết Bị Gia Dụng SmartHome Toàn Cầu',
    quantity: 40,
    reserveStock: 6,
    variants: [
      {
        id: 107,
        productId: 7,
        name: 'AirPure Pro HEPA H13',
        sku: 'AIR-PURE-H13',
        originalPrice: 2990000,
        salePrice: 2490000,
        sellingPrice: 2490000,
        quantity: 40,
        reserveStock: 6,
        isActive: true,
        colors: [
          { id: 1009, name: 'Trắng Sạch Sẽ', hexCode: '#ffffff', quantity: 40, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 8,
    name: 'Đôi dép quai ngang thời trang Cloud Slide',
    description: 'Hạt nhựa EVA đúc nguyên khối siêu êm như mây, đế rãnh chống trơn trượt hiệu quả.',
    importPrice: 85000,
    sellingPrice: 165000,
    originalPrice: 220000,
    salePrice: 165000,
    imageUrl: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&q=80&w=800',
    categoryId: 3,
    categoryName: 'Phụ kiện',
    supplierId: 3,
    supplierName: 'Xưởng Sản Xuất Phụ Kiện Thời Trang Đông Dương',
    quantity: 180,
    reserveStock: 25,
    variants: [
      {
        id: 108,
        productId: 8,
        name: 'Cloud Slide EVA 2026',
        sku: 'CLOUD-SLIDE-08',
        originalPrice: 220000,
        salePrice: 165000,
        sellingPrice: 165000,
        quantity: 180,
        reserveStock: 25,
        isActive: true,
        colors: [
          { id: 1010, name: 'Kem Be', hexCode: '#fef3c7', quantity: 90, isActive: true, images: [] },
          { id: 1011, name: 'Đen Tuyền', hexCode: '#1f2937', quantity: 90, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 9,
    name: 'Balo chống nước thời trang Urban Traveler 20L',
    description: 'Vải chống thấm Oxford 900D, ngăn đựng laptop chống sốc 15.6 inch, khóa kéo ẩn an toàn.',
    importPrice: 250000,
    sellingPrice: 390000,
    originalPrice: 480000,
    salePrice: 390000,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800',
    categoryId: 3,
    categoryName: 'Phụ kiện',
    supplierId: 3,
    supplierName: 'Xưởng Sản Xuất Phụ Kiện Thời Trang Đông Dương',
    quantity: 95,
    reserveStock: 15,
    variants: [
      {
        id: 109,
        productId: 9,
        name: 'Urban Traveler Oxford 20L',
        sku: 'BALO-URBAN-20L',
        originalPrice: 480000,
        salePrice: 390000,
        sellingPrice: 390000,
        quantity: 95,
        reserveStock: 15,
        isActive: true,
        colors: [
          { id: 1012, name: 'Xám Đậm', hexCode: '#374151', quantity: 95, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 10,
    name: 'Kính mát phân cực UV400 Aviator Classic',
    description: 'Tròng kính Polycacbonate chống lóa mắt, gọng hợp kim titanium siêu nhẹ và bền bỉ.',
    importPrice: 140000,
    sellingPrice: 250000,
    originalPrice: 320000,
    salePrice: 250000,
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=800',
    categoryId: 3,
    categoryName: 'Phụ kiện',
    supplierId: 3,
    supplierName: 'Xưởng Sản Xuất Phụ Kiện Thời Trang Đông Dương',
    quantity: 110,
    reserveStock: 20,
    variants: [
      {
        id: 110,
        productId: 10,
        name: 'Aviator Classic Titanium',
        sku: 'KINH-AVIATOR-10',
        originalPrice: 320000,
        salePrice: 250000,
        sellingPrice: 250000,
        quantity: 110,
        reserveStock: 20,
        isActive: true,
        colors: [
          { id: 1013, name: 'Gọng Đen Tròng Đen', hexCode: '#111827', quantity: 60, isActive: true, images: [] },
          { id: 1014, name: 'Gọng Vàng Tròng Trà', hexCode: '#d97706', quantity: 50, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 11,
    name: 'Đèn bàn học chống cận LED SmartLight Pro',
    description: 'Chip LED quang phổ mặt trời CRI 95+, cảm ứng 5 chế độ sáng, chống mỏi mắt học tập.',
    importPrice: 220000,
    sellingPrice: 380000,
    originalPrice: 450000,
    salePrice: 380000,
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800',
    categoryId: 4,
    categoryName: 'Văn phòng',
    supplierId: 4,
    supplierName: 'Công ty CP Thiết Bị Văn Phòng Hiện Đại ProOffice',
    quantity: 90,
    reserveStock: 12,
    variants: [
      {
        id: 111,
        productId: 11,
        name: 'SmartLight Pro CRI 95+',
        sku: 'DEN-SMART-PRO',
        originalPrice: 450000,
        salePrice: 380000,
        sellingPrice: 380000,
        quantity: 90,
        reserveStock: 12,
        isActive: true,
        colors: [
          { id: 1015, name: 'Trắng Sứ', hexCode: '#ffffff', quantity: 90, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 12,
    name: 'Kệ đỡ laptop công thái học Aluminum Stand',
    description: 'Hợp kim nhôm nguyên khối 3mm tản nhiệt máy tính, 6 nấc chỉnh độ cao thoải mái cổ vai gáy.',
    importPrice: 180000,
    sellingPrice: 290000,
    originalPrice: 350000,
    salePrice: 290000,
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800',
    categoryId: 4,
    categoryName: 'Văn phòng',
    supplierId: 4,
    supplierName: 'Công ty CP Thiết Bị Văn Phòng Hiện Đại ProOffice',
    quantity: 85,
    reserveStock: 15,
    variants: [
      {
        id: 112,
        productId: 12,
        name: 'Aluminum Ergonomic Stand',
        sku: 'KE-NHOM-LAP',
        originalPrice: 350000,
        salePrice: 290000,
        sellingPrice: 290000,
        quantity: 85,
        reserveStock: 15,
        isActive: true,
        colors: [
          { id: 1016, name: 'Bạc Nhôm', hexCode: '#e5e7eb', quantity: 85, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 13,
    name: 'Bàn phím cơ không dây Bluetooth Dual Mode Pro',
    description: 'Switch cơ quang học gõ êm, pin sạc Type-C 4000mAh, kết nối 3 thiết bị cùng lúc.',
    importPrice: 680000,
    sellingPrice: 1150000,
    originalPrice: 1450000,
    salePrice: 1150000,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=800',
    categoryId: 4,
    categoryName: 'Văn phòng',
    supplierId: 4,
    supplierName: 'Công ty CP Thiết Bị Văn Phòng Hiện Đại ProOffice',
    quantity: 65,
    reserveStock: 10,
    variants: [
      {
        id: 113,
        productId: 13,
        name: 'Dual Mode Wireless Keyboard',
        sku: 'BP-DUAL-MODE',
        originalPrice: 1450000,
        salePrice: 1150000,
        sellingPrice: 1150000,
        quantity: 65,
        reserveStock: 10,
        isActive: true,
        colors: [
          { id: 1017, name: 'Xám Khói RGB', hexCode: '#1f2937', quantity: 65, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 14,
    name: 'Kem chống nắng quang phổ rộng SunShield SPF 50+',
    description: 'Bảo vệ da toàn diện UVA/UVB/HEV, kiềm dầu 8 tiếng, nâng tông nhẹ tự nhiên.',
    importPrice: 160000,
    sellingPrice: 280000,
    originalPrice: 350000,
    salePrice: 280000,
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800',
    categoryId: 5,
    categoryName: 'Mỹ phẩm & Chăm sóc',
    supplierId: 5,
    supplierName: 'Công ty Dược Mỹ Phẩm Thiên Nhiên BioCare',
    quantity: 140,
    reserveStock: 20,
    variants: [
      {
        id: 114,
        productId: 14,
        name: 'SunShield Tone Up 50ml',
        sku: 'KCN-SUNSHIELD-50',
        originalPrice: 350000,
        salePrice: 280000,
        sellingPrice: 280000,
        quantity: 140,
        reserveStock: 20,
        isActive: true,
        colors: [
          { id: 1018, name: 'Tuýp 50ml Nâng Tông', hexCode: '#fed7aa', quantity: 140, isActive: true, images: [] },
        ],
      },
    ],
  },
  {
    id: 15,
    name: 'Serum cấp ẩm phục hồi da Hyaluronic B5 Hydra',
    description: 'Tinh chất HA đa phân tử kết hợp Vitamin B5 phục hồi da căng mọng, mịn màng.',
    importPrice: 210000,
    sellingPrice: 360000,
    originalPrice: 450000,
    salePrice: 360000,
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800',
    categoryId: 5,
    categoryName: 'Mỹ phẩm & Chăm sóc',
    supplierId: 5,
    supplierName: 'Công ty Dược Mỹ Phẩm Thiên Nhiên BioCare',
    quantity: 95,
    reserveStock: 15,
    variants: [
      {
        id: 115,
        productId: 15,
        name: 'Hyaluronic B5 Hydra 30ml',
        sku: 'SERUM-HA-B5',
        originalPrice: 450000,
        salePrice: 360000,
        sellingPrice: 360000,
        quantity: 95,
        reserveStock: 15,
        isActive: true,
        colors: [
          { id: 1019, name: 'Chai Thủy Tinh 30ml', hexCode: '#bfdbfe', quantity: 95, isActive: true, images: [] },
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
  { id: 2, name: 'Gia dụng', parentCategoryId: null },
  { id: 3, name: 'Phụ kiện', parentCategoryId: null },
  { id: 4, name: 'Văn phòng', parentCategoryId: null },
  { id: 5, name: 'Mỹ phẩm & Chăm sóc', parentCategoryId: null },
  { id: 6, name: 'Thời trang & Đời sống', parentCategoryId: null },
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
