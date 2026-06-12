export interface ApiResponse<T> {
  success?: boolean
  data?: T
  message?: string
}

export interface ProductDto {
  id: number
  productName: string
  description?: string
  price: number
  stock: number
  category?: string
  sku?: string
  status?: string
  createdAt?: string
  lastModified?: string | null
}

export interface CreateProductPayload {
  productName?: string | null
  description?: string | null
  price?: number | null
  stock?: number | null
  category?: string | null
  sku?: string | null
  status?: string | null
}

export interface UpdateProductPayload extends CreateProductPayload {
  id: number
}

const PRODUCT_API_BASE_URL = 'https://nhom1-sales-and-inventory-management.onrender.com/api'

export function getProductApiBaseUrl(): string {
  return PRODUCT_API_BASE_URL
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  const result = await response.json()
  return result.data ?? result
}

// Mock data for testing
const MOCK_PRODUCTS: ProductDto[] = [
  {
    id: 1,
    productName: 'Laptop Dell XPS 13',
    description: 'Máy tính xách tay hiệu năng cao',
    price: 25000000,
    stock: 5,
    category: 'Điện tử',
    sku: 'DELL-XPS-13-001',
    status: 'Active',
    createdAt: '2026-06-01T10:00:00Z',
    lastModified: '2026-06-10T15:30:00Z',
  },
  {
    id: 2,
    productName: 'iPhone 15 Pro Max',
    description: 'Điện thoại thông minh cao cấp',
    price: 35000000,
    stock: 8,
    category: 'Điện thoại',
    sku: 'APPLE-IP15PM-001',
    status: 'Active',
    createdAt: '2026-05-15T09:00:00Z',
    lastModified: '2026-06-11T14:20:00Z',
  },
  {
    id: 3,
    productName: 'Samsung Galaxy S24 Ultra',
    description: 'Điện thoại flagship Samsung',
    price: 28000000,
    stock: 3,
    category: 'Điện thoại',
    sku: 'SAMSUNG-S24U-001',
    status: 'Active',
    createdAt: '2026-04-20T08:30:00Z',
    lastModified: '2026-06-09T11:45:00Z',
  },
  {
    id: 4,
    productName: 'Sony WH-1000XM5',
    description: 'Tai nghe bluetooth chống ồn',
    price: 8500000,
    stock: 15,
    category: 'Audio',
    sku: 'SONY-WH1000XM5',
    status: 'Active',
    createdAt: '2026-03-10T12:00:00Z',
    lastModified: '2026-06-08T16:15:00Z',
  },
  {
    id: 5,
    productName: 'iPad Air 11-inch',
    description: 'Máy tính bảng Apple cao cấp',
    price: 18500000,
    stock: 7,
    category: 'Máy tính bảng',
    sku: 'APPLE-IPAD-AIR11',
    status: 'Active',
    createdAt: '2026-05-05T14:20:00Z',
    lastModified: '2026-06-12T09:00:00Z',
  },
  {
    id: 6,
    productName: 'Apple Watch Series 9',
    description: 'Đồng hồ thông minh Apple',
    price: 12500000,
    stock: 9,
    category: 'Wearable',
    sku: 'APPLE-WATCH-S9',
    status: 'Inactive',
    createdAt: '2026-02-28T11:30:00Z',
    lastModified: '2026-06-07T13:45:00Z',
  },
  {
    id: 7,
    productName: 'Google Pixel 8 Pro',
    description: 'Điện thoại Google cao cấp',
    price: 22000000,
    stock: 4,
    category: 'Điện thoại',
    sku: 'GOOGLE-PIXEL8PRO',
    status: 'Active',
    createdAt: '2026-06-02T10:15:00Z',
    lastModified: '2026-06-11T10:30:00Z',
  },
  {
    id: 8,
    productName: 'Microsoft Surface Pro 10',
    description: 'Máy tính bảng 2-in-1',
    price: 32000000,
    stock: 2,
    category: 'Máy tính',
    sku: 'MSFT-SURFACE-PRO10',
    status: 'Active',
    createdAt: '2026-04-15T09:45:00Z',
    lastModified: '2026-06-10T14:00:00Z',
  },
]

export async function getProducts(): Promise<ProductDto[]> {
  try {
    const response = await fetch(`${PRODUCT_API_BASE_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await handleResponse<ProductDto[] | ProductDto>(response)
    return Array.isArray(result) ? result : [result]
  } catch (error) {
    console.log('API không phản hồi, sử dụng dữ liệu mock:', error)
    // Return mock data if API fails
    return MOCK_PRODUCTS
  }
}

export async function getProductById(id: number): Promise<ProductDto> {
  const response = await fetch(`${PRODUCT_API_BASE_URL}/products/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return handleResponse<ProductDto>(response)
}

export async function createProduct(payload: CreateProductPayload): Promise<ProductDto> {
  const response = await fetch(`${PRODUCT_API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return handleResponse<ProductDto>(response)
}

export async function updateProduct(payload: UpdateProductPayload): Promise<ProductDto> {
  const response = await fetch(`${PRODUCT_API_BASE_URL}/products/${payload.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return handleResponse<ProductDto>(response)
}

export async function deleteProduct(id: number): Promise<{ message: string }> {
  const response = await fetch(`${PRODUCT_API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  return handleResponse<{ message: string }>(response)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

export function getStatusColor(status?: string): string {
  const colors: Record<string, string> = {
    'Active': '#23b987',
    'Inactive': '#8a96a8',
    'Discontinued': '#ef4444',
  }
  return colors[status || ''] || '#8a96a8'
}
