const ORDER_STATUS_LABELS: Record<string, string> = {
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

const EXACT_MESSAGES: Record<string, string> = {
  'Unauthorized': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'Forbidden': 'Bạn không có quyền thực hiện thao tác này.',
  'Not Found': 'Không tìm thấy dữ liệu.',
  'Bad Request': 'Yêu cầu không hợp lệ.',
  'Internal Server Error': 'Lỗi máy chủ. Vui lòng thử lại sau.',
}

const PARTIAL_PATTERNS: Array<{ test: RegExp; format: (match: RegExpMatchArray) => string }> = [
  {
    test: /cannot change status from ['"]?(\w+)['"]? to ['"]?(\w+)['"]?/i,
    format: (m) =>
      `Không thể chuyển trạng thái từ "${labelStatus(m[1]!)}" sang "${labelStatus(m[2]!)}".`,
  },
  {
    test: /không thể chuyển trạng thái từ ['"]?(\w+)['"]? sang ['"]?(\w+)['"]?/i,
    format: (m) =>
      `Không thể chuyển trạng thái từ "${labelStatus(m[1]!)}" sang "${labelStatus(m[2]!)}".`,
  },
  {
    test: /chỉ có thể xóa đơn hàng ở trạng thái (\w+)/i,
    format: (m) => `Chỉ có thể xóa đơn hàng ở trạng thái "${labelStatus(m[1]!)}".`,
  },
  {
    test: /only.*delete.*(?:orders?|order).*status ['"]?(\w+)['"]?/i,
    format: (m) => `Chỉ có thể xóa đơn hàng ở trạng thái "${labelStatus(m[1]!)}".`,
  },
  {
    test: /order.*not found/i,
    format: () => 'Không tìm thấy đơn hàng.',
  },
  {
    test: /invalid status/i,
    format: () => 'Trạng thái đơn hàng không hợp lệ.',
  },
]

function labelStatus(status?: string) {
  if (!status) return status ?? ''
  return ORDER_STATUS_LABELS[status] ?? status
}

function replaceStatusTokens(message: string) {
  let result = message
  for (const [code, label] of Object.entries(ORDER_STATUS_LABELS)) {
    result = result.replace(new RegExp(`'${code}'`, 'g'), `"${label}"`)
    result = result.replace(new RegExp(`"${code}"`, 'g'), `"${label}"`)
    result = result.replace(new RegExp(`\\b${code}\\b`, 'g'), label)
  }
  return result
}

export function translateApiMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed) return trimmed

  const exact = EXACT_MESSAGES[trimmed]
  if (exact) return exact

  for (const { test, format } of PARTIAL_PATTERNS) {
    const match = trimmed.match(test)
    if (match) return format(match)
  }

  if (/^HTTP \d+$/.test(trimmed)) {
    const code = trimmed.replace('HTTP ', '')
    return `Lỗi kết nối máy chủ (mã ${code}).`
  }

  return replaceStatusTokens(trimmed)
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return translateApiMessage(error.message)
  }
  return fallback
}
