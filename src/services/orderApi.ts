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

const DEFAULT_BASE_URL = 'http://localhost:5000'

function normalizeBaseUrl(value: string) {
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
      ...(init?.headers ?? {}),
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

export function getOrders() {
  return request<OrderResponseDto[]>('/api/Order')
}

export function getOrderById(id: number) {
  return request<OrderResponseDto>(`/api/Order/${id}`)
}

export function getOrdersByUserId(userId: number) {
  return request<OrderResponseDto[]>(`/api/Order/user/${userId}`)
}

export function getUsers() {
  return request<UserDto[]>('/api/users')
}

export function getProducts() {
  return request<ProductDto[]>('/api/products')
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
