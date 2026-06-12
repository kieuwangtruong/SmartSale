export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Completed' | 'Cancelled'

export interface ApiResponse<T> {
  success?: boolean
  data?: T
  message?: string
}

export interface UserDto {
  id: number
  fullName: string
  email: string
  role: 'User' | 'Admin'
}

export interface ProductDto {
  id: number
  name: string
  price: number
  stock: number
}

export interface OrderItemResponseDto {
  id: number
  productId: number
  quantity: number
  price: number
  subTotal: number
}

export interface OrderResponseDto {
  id: number
  userId: number
  status: OrderStatus
  total: number
  createdAt: string
  lastModifiedAt?: string | null
  orderItems: OrderItemResponseDto[]
}

export interface OrderItemInput {
  productId: number | null
  quantity: number
  price: number
}

export interface CreateOrderPayload {
  userId: number
  orderItems: Array<{
    productId: number
    quantity: number
    price: number
  }>
}

export interface UpdateOrderPayload extends CreateOrderPayload {
  id: number
}

export interface UpdateOrderStatusPayload {
  id: number
  status: OrderStatus
}

const DEFAULT_BASE_URL = 'https://nhom2-sales-and-inventory-management.onrender.com'

function normalizeBaseUrl(value: string) {
  // If value is a relative path (starts with /), return as-is for proxy support
  if (value.startsWith('/')) {
    return value.replace(/\/$/, '')
  }
  try {
    return new URL(value).origin
  } catch {
    return value.replace(/\/$/, '')
  }
}

const baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL)

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  })

  const text = await response.text()
  let payload: ApiResponse<T> | T | string | null = null

  if (text) {
    try {
      payload = JSON.parse(text) as ApiResponse<T> | T
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as ApiResponse<T>).message ?? response.statusText)
        : response.statusText

    throw new Error(message || 'Không thể kết nối tới backend')
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiResponse<T>).data as T
  }

  return payload as T
}

export function getApiBaseUrl() {
  return baseUrl
}

// Mock data for development/testing
const MOCK_ORDERS: OrderResponseDto[] = [
  {
    id: 17812852880111,
    userId: 1,
    status: 'Processing',
    total: 60000000,
    createdAt: '2026-06-13T02:38:41Z',
    lastModifiedAt: null,
    orderItems: [
      {
        id: 101,
        productId: 1,
        quantity: 2,
        price: 30000000,
        subTotal: 60000000,
      },
    ],
  },
  {
    id: 17812852880112,
    userId: 1,
    status: 'Processing',
    total: 60000000,
    createdAt: '2026-06-13T02:38:25Z',
    lastModifiedAt: null,
    orderItems: [
      {
        id: 102,
        productId: 2,
        quantity: 2,
        price: 30000000,
        subTotal: 60000000,
      },
    ],
  },
  {
    id: 17812852880113,
    userId: 1,
    status: 'Processing',
    total: 60000000,
    createdAt: '2026-06-13T02:37:58Z',
    lastModifiedAt: null,
    orderItems: [
      {
        id: 103,
        productId: 3,
        quantity: 2,
        price: 30000000,
        subTotal: 60000000,
      },
    ],
  },
  {
    id: 17812852880114,
    userId: 1,
    status: 'Processing',
    total: 60000000,
    createdAt: '2026-06-13T02:37:16Z',
    lastModifiedAt: null,
    orderItems: [
      {
        id: 104,
        productId: 1,
        quantity: 2,
        price: 30000000,
        subTotal: 60000000,
      },
    ],
  },
  {
    id: 17812852880115,
    userId: 2,
    status: 'Processing',
    total: 60000000,
    createdAt: '2026-06-13T02:37:04Z',
    lastModifiedAt: null,
    orderItems: [
      {
        id: 105,
        productId: 2,
        quantity: 2,
        price: 30000000,
        subTotal: 60000000,
      },
    ],
  },
  {
    id: 4,
    userId: 6,
    status: 'Shipped',
    total: 58500000,
    createdAt: '2026-06-08T16:20:00Z',
    lastModifiedAt: '2026-06-09T11:00:00Z',
    orderItems: [
      {
        id: 4,
        productId: 2,
        quantity: 2,
        price: 29250000,
        subTotal: 58500000,
      },
    ],
  },
  {
    id: 3,
    userId: 4,
    status: 'Pending',
    total: 28000000,
    createdAt: '2026-06-12T23:45:00Z',
    lastModifiedAt: null,
    orderItems: [
      {
        id: 3,
        productId: 3,
        quantity: 1,
        price: 28000000,
        subTotal: 28000000,
      },
    ],
  },
  {
    id: 2,
    userId: 4,
    status: 'Processing',
    total: 35000000,
    createdAt: '2026-06-12T21:15:00Z',
    lastModifiedAt: null,
    orderItems: [
      {
        id: 2,
        productId: 2,
        quantity: 1,
        price: 35000000,
        subTotal: 35000000,
      },
    ],
  },
  {
    id: 1,
    userId: 6,
    status: 'Completed',
    total: 50000000,
    createdAt: '2026-06-10T17:30:00Z',
    lastModifiedAt: '2026-06-11T15:00:00Z',
    orderItems: [
      {
        id: 1,
        productId: 1,
        quantity: 2,
        price: 25000000,
        subTotal: 50000000,
      },
    ],
  },
]

export async function getOrders() {
  try {
    return await request<OrderResponseDto[]>('/api/Order')
  } catch (error) {
    console.warn('Failed to fetch orders from API, using mock data:', error)
    return MOCK_ORDERS
  }
}

export function getOrderById(id: number) {
  return request<OrderResponseDto>(`/api/Order/${id}`)
}

export function getOrdersByUserId(userId: number) {
  return request<OrderResponseDto[]>(`/api/Order/user/${userId}`)
}

// Mock data for users (for dashboard)
const MOCK_USERS: UserDto[] = [
  {
    id: 1,
    fullName: 'Nguyễn Văn A',
    email: 'admin@gmail.com',
    role: 'Admin',
  },
  {
    id: 2,
    fullName: 'Trần Thị B',
    email: 'sales@gmail.com',
    role: 'User',
  },
  {
    id: 3,
    fullName: 'Phạm Minh C',
    email: 'warehouse@gmail.com',
    role: 'Admin',
  },
  {
    id: 4,
    fullName: 'Đỗ Thị D',
    email: 'user@example.com',
    role: 'User',
  },
  {
    id: 5,
    fullName: 'Lý Văn E',
    email: 'admin2@gmail.com',
    role: 'Admin',
  },
  {
    id: 6,
    fullName: 'Người dùng',
    email: 'user@gmail.com',
    role: 'User',
  },
]

// Mock data for products (for dashboard)
const MOCK_PRODUCTS_DASHBOARD: ProductDto[] = [
  {
    id: 1,
    name: 'Laptop Dell XPS 13',
    price: 25000000,
    stock: 5,
  },
  {
    id: 2,
    name: 'iPhone 15 Pro Max',
    price: 35000000,
    stock: 8,
  },
  {
    id: 3,
    name: 'Samsung Galaxy S24 Ultra',
    price: 28000000,
    stock: 3,
  },
  {
    id: 4,
    name: 'Sony WH-1000XM5',
    price: 8500000,
    stock: 15,
  },
  {
    id: 5,
    name: 'iPad Air 11-inch',
    price: 18500000,
    stock: 7,
  },
]

export async function getUsers() {
  try {
    return await request<UserDto[]>('/api/users')
  } catch (error) {
    console.warn('Failed to fetch users from API, using mock data:', error)
    return MOCK_USERS
  }
}

export async function getProducts() {
  try {
    return await request<ProductDto[]>('/api/products')
  } catch (error) {
    console.warn('Failed to fetch products from API, using mock data:', error)
    return MOCK_PRODUCTS_DASHBOARD
  }
}

export function createOrder(payload: CreateOrderPayload) {
  return request<OrderResponseDto>('/api/Order', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateOrder(payload: UpdateOrderPayload) {
  return request<OrderResponseDto>(`/api/Order/${payload.id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function updateOrderStatus(payload: UpdateOrderStatusPayload) {
  return request<OrderResponseDto>(`/api/Order/${payload.id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteOrder(id: number) {
  return request<{ success?: boolean; message?: string }>(`/api/Order/${id}`, {
    method: 'DELETE',
  })
}

export const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Processing',
  'Shipped',
  'Completed',
  'Cancelled',
]

export function allowedStatusOptions(status: OrderStatus) {
  switch (status) {
    case 'Pending':
      return ['Pending', 'Processing', 'Cancelled'] as OrderStatus[]
    case 'Processing':
      return ['Processing', 'Shipped', 'Cancelled'] as OrderStatus[]
    case 'Shipped':
      return ['Shipped', 'Completed'] as OrderStatus[]
    case 'Completed':
      return ['Completed'] as OrderStatus[]
    case 'Cancelled':
      return ['Cancelled'] as OrderStatus[]
    default:
      return ORDER_STATUSES
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}
