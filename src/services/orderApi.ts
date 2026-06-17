import { apiRequest } from './apiClient'
import { API_URLS } from './config'
import {
  encodeAddressWithExtras,
  mergeCustomerExtras,
  normalizeCustomerFormExtras,
  removeCustomerExtras,
  setCustomerExtras,
  type CustomerExtras,
} from './customerExtraStorage'
import { hideOrderLocally } from './orderHiddenStorage'

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
  gender?: number | null
  cccd?: string | null
  age?: number | null
  totalSpent: number
  currentDebt: number
  orderCount: number
  createdAt: string
  lastModifiedAt?: string | null
}

export interface CustomerFormPayload {
  fullName: string
  phone: string
  email?: string | null
  address?: string | null
  gender?: number | null
  cccd?: string | null
  age?: number | null
}

export const GENDER_OPTIONS = [
  { label: 'Nam', value: 0 },
  { label: 'Nữ', value: 1 },
  { label: 'Khác', value: 2 },
] as const

export function getGenderLabel(gender?: number | null) {
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? '—'
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
  'PendingPayment',
  'ProcessingPayment',
  'Paid',
  'PaymentCancelled',
  'PaymentExpired',
  'PaymentFailed',
  'Processing',
  'Shipped',
  'Completed',
  'Cancelled',
]

import { useLanguage } from './i18n'

export const ORDER_STATUS_LABELS_VI: Record<OrderStatus, string> = {
  Pending: 'Chờ xử lý',
  PendingPayment: 'Chờ thanh toán',
  ProcessingPayment: 'Đang thanh toán',
  Paid: 'Đã thanh toán',
  PaymentCancelled: 'Khách hủy thanh toán',
  PaymentExpired: 'Hết hạn thanh toán',
  PaymentFailed: 'Thanh toán thất bại',
  Processing: 'Đang xử lý đơn',
  Shipped: 'Đã giao hàng',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
}

export const ORDER_STATUS_LABELS_EN: Record<OrderStatus, string> = {
  Pending: 'Pending',
  PendingPayment: 'Pending Payment',
  ProcessingPayment: 'Processing Payment',
  Paid: 'Paid',
  PaymentCancelled: 'Payment Cancelled',
  PaymentExpired: 'Payment Expired',
  PaymentFailed: 'Payment Failed',
  Processing: 'Processing',
  Shipped: 'Shipped',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
}

// Keep this for backward compatibility or direct imports if any
export const ORDER_STATUS_LABELS = ORDER_STATUS_LABELS_VI

export function getOrderStatusLabel(status: OrderStatus | string) {
  const { currentLanguage } = useLanguage()
  const labels = currentLanguage.value === 'en' ? ORDER_STATUS_LABELS_EN : ORDER_STATUS_LABELS_VI
  return labels[status as OrderStatus] ?? status
}

/** Chuyển trạng thái hợp lệ theo backend */
export const ORDER_STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  Pending: ['PendingPayment', 'Processing', 'Cancelled'],
  PendingPayment: ['ProcessingPayment', 'Paid', 'PaymentCancelled', 'PaymentExpired', 'PaymentFailed', 'Cancelled'],
  ProcessingPayment: ['Paid', 'PaymentFailed', 'Cancelled'],
  Paid: ['Processing', 'Cancelled'],
  PaymentCancelled: [],
  PaymentExpired: [],
  PaymentFailed: ['PendingPayment', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
}

export function getAllowedOrderStatuses(current: OrderStatus): OrderStatus[] {
  const next = ORDER_STATUS_TRANSITIONS[current] ?? []
  return [current, ...next.filter((status) => status !== current)]
}

export function getOrderStatusOptions(current: OrderStatus) {
  return getAllowedOrderStatuses(current).map((status) => ({
    label: getOrderStatusLabel(status),
    value: status,
  }))
}

/** Có thể chuyển sang trạng thái khác (không chỉ giữ nguyên) */
export function canChangeOrderStatus(current: OrderStatus) {
  return (ORDER_STATUS_TRANSITIONS[current]?.length ?? 0) > 0
}

export const PAYMENT_DELETABLE_STATUSES: OrderStatus[] = ['PaymentCancelled', 'PaymentExpired']

export function isPaymentDeletableStatus(status: OrderStatus) {
  return PAYMENT_DELETABLE_STATUSES.includes(status)
}

export function getOrders() {
  return apiRequest<Order[]>(API_URLS.order, '/api/Order', { auth: true })
}

export function getMyPurchases() {
  return apiRequest<Order[]>(API_URLS.order, '/api/Order/my-purchases', { auth: true })
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
    auth: true,
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

/** Tất cả trạng thái — dùng cho bộ lọc */
export function getAllOrderStatusOptions() {
  return ORDER_STATUSES.map((status) => ({
    label: getOrderStatusLabel(status),
    value: status,
  }))
}

export function deleteOrder(id: number) {
  return apiRequest<unknown>(API_URLS.order, `/api/Order/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

/** Xóa đơn: thử API trực tiếp, chuyển Pending rồi xóa, cuối cùng ẩn khỏi danh sách nếu backend từ chối */
export async function deleteOrderAnyStatus(id: number, currentStatus: OrderStatus) {
  const tryDelete = () => deleteOrder(id)

  try {
    await tryDelete()
    return
  } catch {
    /* thử chuyển trạng thái rồi xóa */
  }

  const statusAttempts: OrderStatus[] = ['Pending', 'Cancelled']
  for (const target of statusAttempts) {
    if (target === currentStatus) continue
    try {
      await updateOrderStatus(id, target)
      await tryDelete()
      return
    } catch {
      /* thử bước tiếp */
    }
  }

  if (currentStatus !== 'Pending') {
    try {
      await updateOrderStatus(id, 'Cancelled')
      await updateOrderStatus(id, 'Pending')
      await tryDelete()
      return
    } catch {
      /* fallback ẩn local */
    }
  }

  hideOrderLocally(id)
}

export function getCustomers() {
  return apiRequest<Customer[]>(API_URLS.order, '/api/customers', { auth: true }).then((list) =>
    list
      .map((customer) => mergeCustomerExtras(customer))
      .sort((a, b) => b.id - a.id),
  )
}

export function createCustomer(payload: CustomerFormPayload) {
  const extras = normalizeCustomerFormExtras(payload)
  const body = {
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email ?? null,
    address: encodeAddressWithExtras(payload.address, extras),
  }
  return apiRequest<Customer>(API_URLS.order, '/api/customers', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(body),
  }).then((created) => {
    setCustomerExtras(created.id, created.phone, extras)
    return mergeCustomerExtras(created)
  })
}

export function updateCustomer(payload: Customer) {
  const extras: CustomerExtras = {
    gender: payload.gender ?? 0,
    cccd: payload.cccd ?? null,
    age: payload.age ?? null,
  }
  const body = {
    id: payload.id,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email ?? null,
    address: encodeAddressWithExtras(payload.address, extras),
    totalSpent: payload.totalSpent,
    currentDebt: payload.currentDebt,
    orderCount: payload.orderCount,
    createdAt: payload.createdAt,
    lastModifiedAt: payload.lastModifiedAt,
  }
  return apiRequest<Customer>(API_URLS.order, `/api/customers/${payload.id}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(body),
  }).then((updated) => {
    setCustomerExtras(updated.id, updated.phone, extras)
    return mergeCustomerExtras(updated)
  })
}

export function deleteCustomer(id: number, phone?: string) {
  return apiRequest<unknown>(API_URLS.order, `/api/customers/${id}`, {
    method: 'DELETE',
    auth: true,
  }).then(() => {
    removeCustomerExtras(id, phone)
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
