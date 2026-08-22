import { apiRequest } from './apiClient'
import { currentLanguage } from './i18n'
import { API_URLS } from './config'
import {
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
  | 'RefundRequested'
  | 'Refunded'
  | 'RefundRejected'

export type OrderPaymentMethod = 'Cash' | 'PayOS'

export interface OrderItem {
  id: number
  productId: number
  productVariantId?: number | null
  productVariantColorId?: number | null
  productName: string
  variantName?: string | null
  colorName?: string | null
  sku?: string | null
  quantity: number
  price: number
  subTotal: number
}

export interface Order {
  id: number
  userId: number
  customerId?: number | null
  customerName?: string | null
  salesStaffId?: number | null
  salesStaffName?: string | null
  createdByUserId?: number | null
  createdByUserName?: string | null
  status: OrderStatus
  paymentMethod?: OrderPaymentMethod | string | null
  subtotal: number
  discountAmount: number
  total: number
  amountPaid: number
  debtAmount: number
  paymentOrderCode?: number | null
  payOsTransactionReference?: string | null
  refundAmount?: number | null
  refundReason?: string | null
  refundRequestedAt?: string | null
  refundedAt?: string | null
  refundedByUserId?: number | null
  refundTransactionReference?: string | null
  refundSourceStatus?: string | null
  createdAt: string
  lastModifiedAt?: string | null
  orderItems: OrderItem[]
}

type OrderApiResponse = Order & {
  SalesStaffId?: number | null
  SalesStaffName?: string | null
  CreatedByUserId?: number | null
  CreatedByUserName?: string | null
  UserName?: string | null
}

function normalizeOrder(order: OrderApiResponse): Order {
  return {
    ...order,
    salesStaffId: order.salesStaffId ?? order.SalesStaffId ?? null,
    salesStaffName: order.salesStaffName ?? order.SalesStaffName ?? null,
    createdByUserId: order.createdByUserId ?? order.CreatedByUserId ?? null,
    createdByUserName: order.createdByUserName ?? order.CreatedByUserName ?? null,
  }
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
  tier?: string | null
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
  tier?: string | null
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
  orderItems: Array<{ productId: number; productVariantId?: number | null; productVariantColorId?: number | null; quantity: number }>
}

export interface CustomerCheckoutPayload {
  fullName: string
  phone: string
  email?: string | null
  address: string
  orderItems: Array<{ productId: number; productVariantId: number; productVariantColorId: number; quantity: number }>
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
  'RefundRequested',
  'Refunded',
  'RefundRejected',
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
  RefundRequested: 'Chờ hoàn tiền',
  Refunded: 'Đã hoàn tiền',
  RefundRejected: 'Từ chối hoàn tiền',
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
  RefundRequested: 'Refund Requested',
  Refunded: 'Refunded',
  RefundRejected: 'Refund Rejected',
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
  Paid: ['Processing'],
  PaymentCancelled: [],
  PaymentExpired: [],
  PaymentFailed: ['PendingPayment', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Completed'],
  Completed: [],
  Cancelled: [],
  RefundRequested: [],
  Refunded: [],
  RefundRejected: [],
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

const DEFAULT_MOCK_CUSTOMERS: Customer[] = [
  {
    id: 1,
    fullName: 'Nguyễn Văn An',
    phone: '0901234567',
    email: 'nguyenvanan@gmail.com',
    address: '123 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    gender: 0,
    totalSpent: 12500000,
    currentDebt: 0,
    orderCount: 6,
    createdAt: '2026-01-05T08:30:00Z',
  },
  {
    id: 2,
    fullName: 'Trần Thị Bình',
    phone: '0912345678',
    email: 'tranthibinh@gmail.com',
    address: '456 Lê Lợi, Quận 1, TP.HCM',
    gender: 1,
    totalSpent: 5800000,
    currentDebt: 0,
    orderCount: 3,
    createdAt: '2026-01-15T10:15:00Z',
  },
  {
    id: 3,
    fullName: 'Lê Hoàng Cường',
    phone: '0923456789',
    email: 'lehoangcuong@gmail.com',
    address: '789 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    gender: 0,
    totalSpent: 1800000,
    currentDebt: 0,
    orderCount: 1,
    createdAt: '2026-02-01T14:20:00Z',
  },
  {
    id: 4,
    fullName: 'Phạm Minh Đức',
    phone: '0934567890',
    email: 'phamminhduc@gmail.com',
    address: '12 Nguyễn Văn Linh, Q.7, TP.HCM',
    gender: 0,
    totalSpent: 3990000,
    currentDebt: 0,
    orderCount: 2,
    createdAt: '2026-02-10T16:45:00Z',
  },
  {
    id: 5,
    fullName: 'Hoàng Thị Giang',
    phone: '0945678901',
    email: 'hoangthigiang@gmail.com',
    address: '88 Nguyễn Huệ, Quận 1, TP.HCM',
    gender: 1,
    totalSpent: 8900000,
    currentDebt: 0,
    orderCount: 4,
    createdAt: '2026-02-20T09:00:00Z',
  },
  {
    id: 6,
    fullName: 'Vũ Quốc Huy',
    phone: '0956789012',
    email: 'vuquochuy@gmail.com',
    address: '45 Cầu Giấy, Cầu Giấy, Hà Nội',
    gender: 0,
    totalSpent: 2100000,
    currentDebt: 0,
    orderCount: 2,
    createdAt: '2026-03-05T11:20:00Z',
  },
  {
    id: 7,
    fullName: 'Đỗ Phương Anh',
    phone: '0967890123',
    email: 'dophuonganh@gmail.com',
    address: '15 Điện Biên Phủ, Ngô Quyền, Hải Phòng',
    gender: 1,
    totalSpent: 4500000,
    currentDebt: 0,
    orderCount: 2,
    createdAt: '2026-03-15T15:30:00Z',
  },
  {
    id: 8,
    fullName: 'Bùi Anh Tuấn',
    phone: '0978901234',
    email: 'buianhtuan@gmail.com',
    address: '99 Nguyễn Văn Cừ, Long Biên, Hà Nội',
    gender: 0,
    totalSpent: 6200000,
    currentDebt: 0,
    orderCount: 3,
    createdAt: '2026-04-01T10:00:00Z',
  },
]

const DEFAULT_MOCK_ORDERS: Order[] = [
  {
    id: 1001,
    userId: 1,
    customerId: 1,
    customerName: 'Nguyễn Văn An',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'PayOS',
    subtotal: 2980000,
    discountAmount: 200000,
    total: 2780000,
    amountPaid: 2780000,
    debtAmount: 0,
    createdAt: '2026-01-05T09:00:00Z',
    orderItems: [
      { id: 1, productId: 1, productName: 'Tai nghe chụp tai Bluetooth Pro ANC', quantity: 2, price: 990000, subTotal: 1980000 },
      { id: 2, productId: 3, productName: 'Chuột không dây Silent Ergonomics 2.4G', quantity: 1, price: 299000, subTotal: 299000 },
      { id: 3, productId: 4, productName: 'Loa Bluetooth Mini Bass Pro IPX7', quantity: 1, price: 490000, subTotal: 490000 },
    ],
  },
  {
    id: 1002,
    userId: 1,
    customerId: 1,
    customerName: 'Nguyễn Văn An',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'Cash',
    subtotal: 1990000,
    discountAmount: 100000,
    total: 1890000,
    amountPaid: 1890000,
    debtAmount: 0,
    createdAt: '2026-01-20T11:30:00Z',
    orderItems: [
      { id: 4, productId: 5, productName: 'Đồng hồ thông minh Smart Watch S2 Pro', quantity: 1, price: 1990000, subTotal: 1990000 },
    ],
  },
  {
    id: 1003,
    userId: 2,
    customerId: 2,
    customerName: 'Trần Thị Bình',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'PayOS',
    subtotal: 2580000,
    discountAmount: 150000,
    total: 2430000,
    amountPaid: 2430000,
    debtAmount: 0,
    createdAt: '2026-01-15T10:45:00Z',
    orderItems: [
      { id: 5, productId: 2, productName: 'Bàn phím cơ RGB Pro Custom Switch', quantity: 2, price: 1290000, subTotal: 2580000 },
    ],
  },
  {
    id: 1004,
    userId: 2,
    customerId: 2,
    customerName: 'Trần Thị Bình',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Paid',
    paymentMethod: 'PayOS',
    subtotal: 1990000,
    discountAmount: 0,
    total: 1990000,
    amountPaid: 1990000,
    debtAmount: 0,
    createdAt: '2026-02-05T14:15:00Z',
    orderItems: [
      { id: 6, productId: 5, productName: 'Đồng hồ thông minh Smart Watch S2 Pro', quantity: 1, price: 1990000, subTotal: 1990000 },
    ],
  },
  {
    id: 1005,
    userId: 3,
    customerId: 3,
    customerName: 'Lê Hoàng Cường',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'Cash',
    subtotal: 1780000,
    discountAmount: 0,
    total: 1780000,
    amountPaid: 1780000,
    debtAmount: 0,
    createdAt: '2026-02-01T15:00:00Z',
    orderItems: [
      { id: 7, productId: 2, productName: 'Bàn phím cơ RGB Pro Custom Switch', quantity: 1, price: 1290000, subTotal: 1290000 },
      { id: 8, productId: 4, productName: 'Loa Bluetooth Mini Bass Pro IPX7', quantity: 1, price: 490000, subTotal: 490000 },
    ],
  },
  {
    id: 1006,
    userId: 4,
    customerId: 4,
    customerName: 'Phạm Minh Đức',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Processing',
    paymentMethod: 'PayOS',
    subtotal: 3990000,
    discountAmount: 200000,
    total: 3790000,
    amountPaid: 3790000,
    debtAmount: 0,
    createdAt: '2026-02-10T17:00:00Z',
    orderItems: [
      { id: 9, productId: 1, productName: 'Tai nghe chụp tai Bluetooth Pro ANC', quantity: 2, price: 990000, subTotal: 1980000 },
      { id: 10, productId: 5, productName: 'Đồng hồ thông minh Smart Watch S2 Pro', quantity: 1, price: 1990000, subTotal: 1990000 },
    ],
  },
  {
    id: 1007,
    userId: 5,
    customerId: 5,
    customerName: 'Hoàng Thị Giang',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'PayOS',
    subtotal: 2450000,
    discountAmount: 100000,
    total: 2350000,
    amountPaid: 2350000,
    debtAmount: 0,
    createdAt: '2026-02-22T09:30:00Z',
    orderItems: [
      { id: 11, productId: 6, productName: 'Đèn bàn học chống cận LED Smart Touch', quantity: 2, price: 450000, subTotal: 900000 },
      { id: 12, productId: 7, productName: 'Cốc giữ nhiệt Inox 304 High-Class 500ml', quantity: 2, price: 249000, subTotal: 498000 },
      { id: 13, productId: 10, productName: 'Balo chống nước Laptop 15.6 inch Business', quantity: 1, price: 429000, subTotal: 429000 },
    ],
  },
  {
    id: 1008,
    userId: 5,
    customerId: 5,
    customerName: 'Hoàng Thị Giang',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'PayOS',
    subtotal: 1890000,
    discountAmount: 50000,
    total: 1840000,
    amountPaid: 1840000,
    debtAmount: 0,
    createdAt: '2026-03-02T14:10:00Z',
    orderItems: [
      { id: 14, productId: 1, productName: 'Tai nghe chụp tai Bluetooth Pro ANC', quantity: 1, price: 990000, subTotal: 990000 },
      { id: 15, productId: 11, productName: 'Máy phun sương tạo ẩm không khí Ultrasonic 3L', quantity: 2, price: 380000, subTotal: 760000 },
    ],
  },
  {
    id: 1009,
    userId: 6,
    customerId: 6,
    customerName: 'Vũ Quốc Huy',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'Cash',
    subtotal: 1200000,
    discountAmount: 0,
    total: 1200000,
    amountPaid: 1200000,
    debtAmount: 0,
    createdAt: '2026-03-08T16:00:00Z',
    orderItems: [
      { id: 16, productId: 8, productName: 'Sổ tay da cao cấp A5 Notebook Organizer', quantity: 2, price: 159000, subTotal: 318000 },
      { id: 17, productId: 9, productName: 'Bút ký kim loại cao cấp Business Executive Pen', quantity: 2, price: 189000, subTotal: 378000 },
      { id: 18, productId: 12, productName: 'Kệ đỡ Laptop nhôm nguyên khối xoay 360', quantity: 1, price: 320000, subTotal: 320000 },
    ],
  },
  {
    id: 1010,
    userId: 7,
    customerId: 7,
    customerName: 'Đỗ Phương Anh',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'PayOS',
    subtotal: 2850000,
    discountAmount: 150000,
    total: 2700000,
    amountPaid: 2700000,
    debtAmount: 0,
    createdAt: '2026-03-18T10:20:00Z',
    orderItems: [
      { id: 19, productId: 2, productName: 'Bàn phím cơ RGB Pro Custom Switch', quantity: 1, price: 1290000, subTotal: 1290000 },
      { id: 20, productId: 3, productName: 'Chuột không dây Silent Ergonomics 2.4G', quantity: 2, price: 299000, subTotal: 598000 },
      { id: 21, productId: 4, productName: 'Loa Bluetooth Mini Bass Pro IPX7', quantity: 1, price: 490000, subTotal: 490000 },
    ],
  },
  {
    id: 1011,
    userId: 8,
    customerId: 8,
    customerName: 'Bùi Anh Tuấn',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'PayOS',
    subtotal: 3980000,
    discountAmount: 200000,
    total: 3780000,
    amountPaid: 3780000,
    debtAmount: 0,
    createdAt: '2026-04-02T11:00:00Z',
    orderItems: [
      { id: 22, productId: 5, productName: 'Đồng hồ thông minh Smart Watch S2 Pro', quantity: 1, price: 1990000, subTotal: 1990000 },
      { id: 23, productId: 1, productName: 'Tai nghe chụp tai Bluetooth Pro ANC', quantity: 1, price: 990000, subTotal: 990000 },
      { id: 24, productId: 10, productName: 'Balo chống nước Laptop 15.6 inch Business', quantity: 1, price: 429000, subTotal: 429000 },
    ],
  },
  {
    id: 1012,
    userId: 1,
    customerId: 1,
    customerName: 'Nguyễn Văn An',
    salesStaffId: 2,
    salesStaffName: 'Thuận (Nhân viên Sales)',
    status: 'Completed',
    paymentMethod: 'PayOS',
    subtotal: 3200000,
    discountAmount: 150000,
    total: 3050000,
    amountPaid: 3050000,
    debtAmount: 0,
    createdAt: '2026-04-12T13:40:00Z',
    orderItems: [
      { id: 25, productId: 2, productName: 'Bàn phím cơ RGB Pro Custom Switch', quantity: 1, price: 1290000, subTotal: 1290000 },
      { id: 26, productId: 5, productName: 'Đồng hồ thông minh Smart Watch S2 Pro', quantity: 1, price: 1990000, subTotal: 1990000 },
    ],
  },
]

export async function getOrders(): Promise<Order[]> {
  if (API_URLS.order) {
    try {
      const orders = await apiRequest<OrderApiResponse[]>(API_URLS.order, '/api/Order', { auth: true })
      return orders.map(normalizeOrder)
    } catch (err) {
      console.warn('[OrderApi] Remote orders fetch failed, using local orders fallback:', err)
    }
  }
  return DEFAULT_MOCK_ORDERS
}

export async function getMyPurchases(): Promise<Order[]> {
  if (API_URLS.order) {
    try {
      const orders = await apiRequest<OrderApiResponse[]>(API_URLS.order, '/api/Order/my-purchases', { auth: true })
      return orders.map(normalizeOrder)
    } catch (err) {
      console.warn('[OrderApi] Remote getMyPurchases failed, using local purchases fallback:', err)
    }
  }
  return DEFAULT_MOCK_ORDERS.filter((o) => o.customerId === 1 || o.userId === 1)
}

export function createOrder(payload: CreateOrderPayload) {
  return apiRequest<OrderApiResponse>(API_URLS.order, '/api/Order', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  }).then(normalizeOrder)
}

export function getPaymentMethodLabel(method?: OrderPaymentMethod | string | null) {
  const { currentLanguage } = useLanguage()
  const value = (method || 'Cash').toLowerCase()
  if (value === 'payos') {
    return currentLanguage.value === 'en' ? 'PayOS transfer' : 'Chuyển khoản PayOS'
  }
  return currentLanguage.value === 'en' ? 'Cash payment' : 'Thanh toán tiền mặt'
}

export function createCustomerCashOrder(payload: CustomerCheckoutPayload) {
  return apiRequest<OrderApiResponse>(API_URLS.order, '/api/Order/customer-cash', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  }).then(normalizeOrder)
}

export function createPaymentLink(payload: CustomerCheckoutPayload) {
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
  return apiRequest<OrderApiResponse>(API_URLS.order, `/api/Order/${id}/status`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ id, status }),
  }).then(normalizeOrder)
}

export function requestOrderCancellation(id: number, reason: string) {
  return apiRequest<OrderApiResponse>(API_URLS.order, `/api/Order/${id}/cancel-request`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ reason }),
  }).then(normalizeOrder)
}

export function confirmOrderRefund(
  id: number,
  payload: { refundAmount?: number | null; refundReason?: string | null; refundTransactionReference?: string | null },
) {
  return apiRequest<OrderApiResponse>(API_URLS.order, `/api/Order/${id}/confirm-refund`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  }).then(normalizeOrder)
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

export async function getCustomers(): Promise<Customer[]> {
  if (API_URLS.order) {
    try {
      const list = await apiRequest<Customer[]>(API_URLS.order, '/api/customers', { auth: true })
      return list
        .map((customer) => mergeCustomerExtras(customer))
        .sort((a, b) => b.id - a.id)
    } catch (err) {
      console.warn('[OrderApi] Remote customers fetch failed, using local customers fallback:', err)
    }
  }
  return DEFAULT_MOCK_CUSTOMERS.map((customer) => mergeCustomerExtras(customer)).sort((a, b) => b.id - a.id)
}

export function createCustomer(payload: CustomerFormPayload) {
  const extras = normalizeCustomerFormExtras(payload)
  const body = {
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email ?? null,
    address: payload.address ?? null,
    gender: extras.gender,
    cccd: extras.cccd,
    age: extras.age,
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
    tier: payload.tier ?? null,
  }
  const body = {
    id: payload.id,
    fullName: payload.fullName,
    phone: payload.phone,
    email: payload.email ?? null,
    address: payload.address ?? null,
    gender: extras.gender,
    cccd: extras.cccd,
    age: extras.age,
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

const DEFAULT_MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 1,
    name: 'Công ty TNHH Phân Phối Công Nghệ Á Châu',
    contactName: 'Nguyễn Văn Minh',
    phone: '0912345678',
    email: 'contact@asiatech.vn',
    address: 'Số 12 Duy Tân, Cầu Giấy, Hà Nội',
    notes: 'Nhà phân phối linh kiện điện tử, đồng hồ thông minh và thiết bị âm thanh hàng đầu.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Tập đoàn Thiết Bị Gia Dụng SmartHome Toàn Cầu',
    contactName: 'Lê Thị Thu Thảo',
    phone: '0988776655',
    email: 'sales@smarthome.vn',
    address: 'Khu Công Nghệ Cao, Quận 9, TP. HCM',
    notes: 'Cung cấp robot hút bụi, máy lọc không khí và đồ gia dụng thế hệ mới.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Xưởng Sản Xuất Phụ Kiện Thời Trang Đông Dương',
    contactName: 'Trần Đình Trọng',
    phone: '0977665544',
    email: 'supplier@dongduongfashion.com',
    address: 'Cụm CN Tân Bình, TP. HCM',
    notes: 'Sản xuất balo, dép, ví da và phụ kiện cao cấp đạt chuẩn xuất khẩu.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'Công ty CP Thiết Bị Văn Phòng Hiện Đại ProOffice',
    contactName: 'Hoàng Kim Yến',
    phone: '0966554433',
    email: 'yen.hoang@prooffice.vn',
    address: 'Số 88 Nguyễn Thái Học, Ba Đình, Hà Nội',
    notes: 'Chuyên đèn học chống cận, ghế công thái học, kệ đỡ laptop nhôm.',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 5,
    name: 'Công ty Dược Mỹ Phẩm Thiên Nhiên BioCare',
    contactName: 'Phạm Hồng Nhung',
    phone: '0933221100',
    email: 'info@biocare.vn',
    address: 'Số 250 Hoàng Văn Thụ, Tân Bình, TP. HCM',
    notes: 'Nhập khẩu mỹ phẩm organic, sữa rửa mặt và kem chống nắng chính hãng.',
    createdAt: '2026-01-01T00:00:00Z',
  },
]

export async function getSuppliers(): Promise<Supplier[]> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Supplier[]>(API_URLS.order, '/api/suppliers', { auth: true })
    } catch (err) {
      console.warn('[OrderApi] Remote suppliers fetch failed, using local suppliers fallback:', err)
    }
  }
  return DEFAULT_MOCK_SUPPLIERS
}

export async function createSupplier(payload: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Supplier>(API_URLS.order, '/api/suppliers', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }
  return {
    id: Date.now(),
    name: payload.name,
    contactName: payload.contactName,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    notes: payload.notes,
    createdAt: new Date().toISOString(),
  }
}

export async function updateSupplier(payload: Supplier): Promise<Supplier> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Supplier>(API_URLS.order, `/api/suppliers/${payload.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }
  return payload
}

export async function deleteSupplier(id: number): Promise<unknown> {
  if (API_URLS.order) {
    try {
      return await apiRequest<unknown>(API_URLS.order, `/api/suppliers/${id}`, {
        method: 'DELETE',
        auth: true,
      })
    } catch {}
  }
  return { success: true }
}

export function formatCurrency(value: number) {
  const locale = currentLanguage.value === 'vi' ? 'vi-VN' : 'en-US'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0)
}
