import { apiRequest } from './apiClient'
import { API_URLS } from './config'

export type OrderStatus =
  | 'Pending'
  | 'PendingPayment'
  | 'ProcessingPayment'
  | 'Paid'
  | 'PaymentCancelled'
  | 'PaymentExpired'
  | 'PaymentFailed'
  | 'Processing'
  | 'Shipped'
  | 'Completed'
  | 'Cancelled'

export interface OrderItem {
  id: number
  productId: number
  productName: string
  quantity: number
  price: number
  subTotal: number
}

export interface Order {
  id: number
  userId: number
  customerId?: number | null
  customerName?: string | null
  status: OrderStatus
  subtotal: number
  discountAmount: number
  total: number
  amountPaid: number
  debtAmount: number
  createdAt: string
  lastModifiedAt?: string | null
  orderItems: OrderItem[]
}

export interface Customer {
  id: number
  fullName: string
  phone: string
  email?: string | null
  address?: string | null
  totalSpent: number
  currentDebt: number
  orderCount: number
  createdAt: string
  lastModifiedAt?: string | null
}

export interface Supplier {
  id: number
  name: string
  contactName: string
  phone: string
  email?: string | null
  address?: string | null
  notes?: string | null
  createdAt: string
  lastModifiedAt?: string | null
}

export interface CreateOrderPayload {
  userId: number
  customerId?: number | null
  discountAmount: number
  amountPaid: number
  orderItems: Array<{ productId: number; quantity: number }>
}

export interface PaymentLink {
  orderId: number
  orderCode: number
  checkoutUrl: string
  expiresAt: string
}

export interface PaymentStatus {
  orderId: number
  orderCode: number
  status: OrderStatus
  expiresAt: string
}

export const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Processing',
  'Shipped',
  'Completed',
  'Cancelled',
]

export function getOrders() {
  return apiRequest<Order[]>(API_URLS.order, '/api/Order', { auth: true })
}

export function createOrder(payload: CreateOrderPayload) {
  return apiRequest<Order>(API_URLS.order, '/api/Order', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function createPaymentLink(payload: {
  fullName: string
  phone: string
  email?: string | null
  address: string
  orderItems: Array<{ productId: number; quantity: number }>
}) {
  return apiRequest<PaymentLink>(API_URLS.order, '/api/payments/links', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getPaymentStatus(orderCode: string | number) {
  return apiRequest<PaymentStatus>(API_URLS.order, `/api/payments/${orderCode}`)
}

export function updateOrderStatus(id: number, status: OrderStatus) {
  return apiRequest<Order>(API_URLS.order, `/api/Order/${id}/status`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ id, status }),
  })
}

export function deleteOrder(id: number) {
  return apiRequest<unknown>(API_URLS.order, `/api/Order/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function getCustomers() {
  return apiRequest<Customer[]>(API_URLS.order, '/api/customers', { auth: true })
}

export function createCustomer(payload: Omit<Customer, 'id' | 'totalSpent' | 'currentDebt' | 'orderCount' | 'createdAt'>) {
  return apiRequest<Customer>(API_URLS.order, '/api/customers', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function updateCustomer(payload: Customer) {
  return apiRequest<Customer>(API_URLS.order, `/api/customers/${payload.id}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function deleteCustomer(id: number) {
  return apiRequest<unknown>(API_URLS.order, `/api/customers/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function getSuppliers() {
  return apiRequest<Supplier[]>(API_URLS.order, '/api/suppliers', { auth: true })
}

export function createSupplier(payload: Omit<Supplier, 'id' | 'createdAt'>) {
  return apiRequest<Supplier>(API_URLS.order, '/api/suppliers', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function updateSupplier(payload: Supplier) {
  return apiRequest<Supplier>(API_URLS.order, `/api/suppliers/${payload.id}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function deleteSupplier(id: number) {
  return apiRequest<unknown>(API_URLS.order, `/api/suppliers/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0)
}
