import { useLanguage } from './i18n'

const ORDER_STATUS_LABELS_VI: Record<string, string> = {
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

const ORDER_STATUS_LABELS_EN: Record<string, string> = {
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

const EXACT_MESSAGES_VI: Record<string, string> = {
  'Unauthorized': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'Forbidden': 'Bạn không có quyền thực hiện thao tác này.',
  'Not Found': 'Không tìm thấy dữ liệu.',
  'Bad Request': 'Yêu cầu không hợp lệ.',
  'Internal Server Error': 'Lỗi máy chủ. Vui lòng thử lại sau.',
}

const EXACT_MESSAGES_EN: Record<string, string> = {
  'Unauthorized': 'Session expired. Please log in again.',
  'Forbidden': 'You do not have permission to perform this action.',
  'Not Found': 'Data not found.',
  'Bad Request': 'Invalid request.',
  'Internal Server Error': 'Server error. Please try again later.',
}

export function translateApiMessage(message: string): string {
  const { currentLanguage } = useLanguage()
  const isEn = currentLanguage.value === 'en'
  const trimmed = message.trim()
  if (!trimmed) return trimmed

  const exact = isEn ? EXACT_MESSAGES_EN[trimmed] : EXACT_MESSAGES_VI[trimmed]
  if (exact) return exact

  const orderStatusLabels = isEn ? ORDER_STATUS_LABELS_EN : ORDER_STATUS_LABELS_VI

  const labelStatus = (status?: string) => {
    if (!status) return status ?? ''
    return orderStatusLabels[status] ?? status
  }

  const PARTIAL_PATTERNS = [
    {
      test: /cannot change status from ['"]?(\w+)['"]? to ['"]?(\w+)['"]?/i,
      format: (m: RegExpMatchArray) =>
        isEn
          ? `Cannot change status from "${labelStatus(m[1])}" to "${labelStatus(m[2])}".`
          : `Không thể chuyển trạng thái từ "${labelStatus(m[1])}" sang "${labelStatus(m[2])}".`,
    },
    {
      test: /không thể chuyển trạng thái từ ['"]?(\w+)['"]? sang ['"]?(\w+)['"]?/i,
      format: (m: RegExpMatchArray) =>
        isEn
          ? `Cannot change status from "${labelStatus(m[1])}" to "${labelStatus(m[2])}".`
          : `Không thể chuyển trạng thái từ "${labelStatus(m[1])}" sang "${labelStatus(m[2])}".`,
    },
    {
      test: /chỉ có thể xóa đơn hàng ở trạng thái (\w+)/i,
      format: (m: RegExpMatchArray) =>
        isEn
          ? `Only orders in "${labelStatus(m[1])}" status can be deleted.`
          : `Chỉ có thể xóa đơn hàng ở trạng thái "${labelStatus(m[1])}".`,
    },
    {
      test: /only.*delete.*(?:orders?|order).*status ['"]?(\w+)['"]?/i,
      format: (m: RegExpMatchArray) =>
        isEn
          ? `Only orders in "${labelStatus(m[1])}" status can be deleted.`
          : `Chỉ có thể xóa đơn hàng ở trạng thái "${labelStatus(m[1])}".`,
    },
    {
      test: /order.*not found/i,
      format: () => (isEn ? 'Order not found.' : 'Không tìm thấy đơn hàng.'),
    },
    {
      test: /invalid status/i,
      format: () => (isEn ? 'Invalid order status.' : 'Trạng thái đơn hàng không hợp lệ.'),
    },
  ]

  for (const { test, format } of PARTIAL_PATTERNS) {
    const match = trimmed.match(test)
    if (match) return format(match)
  }

  if (/^HTTP \d+$/.test(trimmed)) {
    const code = trimmed.replace('HTTP ', '')
    return isEn ? `Server connection error (code ${code}).` : `Lỗi kết nối máy chủ (mã ${code}).`
  }

  let result = trimmed
  for (const [code, label] of Object.entries(orderStatusLabels)) {
    result = result.replace(new RegExp(`'${code}'`, 'g'), `"${label}"`)
    result = result.replace(new RegExp(`"${code}"`, 'g'), `"${label}"`)
    result = result.replace(new RegExp(`\\b${code}\\b`, 'g'), label)
  }
  return result
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return translateApiMessage(error.message)
  }
  return fallback
}
