import type { Customer, Order } from '../../../services/orderApi'
import type { CustomerSegmentSummary, CustomerSegmentType, LtvMetrics } from '../types'

function parseDate(dStr: string): Date {
  return new Date(dStr)
}

function diffInDays(d1: Date, d2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((d2.getTime() - d1.getTime()) / msPerDay)
}

export function classifyCustomerSegment(
  orderCount: number,
  totalSpent: number,
  firstOrderDate: Date,
  lastOrderDate: Date,
  now: Date = new Date(),
): CustomerSegmentType {
  const daysSinceFirst = diffInDays(firstOrderDate, now)
  const daysSinceLast = diffInDays(lastOrderDate, now)

  if (orderCount >= 5 || totalSpent >= 10000000) {
    return 'High-value Customer'
  }
  if (daysSinceLast > 120) {
    return 'Dormant Customer'
  }
  if (orderCount >= 2 && daysSinceLast >= 60 && daysSinceLast <= 120) {
    return 'At-risk Customer'
  }
  if (orderCount >= 2) {
    return 'Repeat Customer'
  }
  if (daysSinceFirst <= 30) {
    return 'New Customer'
  }
  return 'One-time Customer'
}

export function calculateLtvMetrics(
  customers: Customer[],
  orders: Order[],
): LtvMetrics {
  const validOrders = orders.filter(
    (o) => o.status !== 'Cancelled' && o.status !== 'PaymentCancelled',
  )

  // Map customerId -> customer stats
  interface CustAgg {
    customerId: number
    name: string
    orders: Order[]
    totalSpent: number
    discountSpent: number
    firstOrderDate: Date
    lastOrderDate: Date
    ltv30d: number
    ltv60d: number
    ltv90d: number
    ltv180d: number
  }

  const custMap: Map<number, CustAgg> = new Map()

  // Initialize from customer list
  customers.forEach((c) => {
    custMap.set(c.id, {
      customerId: c.id,
      name: c.fullName,
      orders: [],
      totalSpent: c.totalSpent || 0,
      discountSpent: 0,
      firstOrderDate: new Date(),
      lastOrderDate: new Date(0),
      ltv30d: 0,
      ltv60d: 0,
      ltv90d: 0,
      ltv180d: 0,
    })
  })

  // Aggregate valid orders
  validOrders.forEach((o) => {
    const cId = o.customerId || o.userId
    if (!cId) return
    const orderDate = parseDate(o.createdAt)
    if (isNaN(orderDate.getTime())) return

    if (!custMap.has(cId)) {
      custMap.set(cId, {
        customerId: cId,
        name: o.customerName || `Khách hàng #${cId}`,
        orders: [],
        totalSpent: 0,
        discountSpent: 0,
        firstOrderDate: orderDate,
        lastOrderDate: orderDate,
        ltv30d: 0,
        ltv60d: 0,
        ltv90d: 0,
        ltv180d: 0,
      })
    }

    const agg = custMap.get(cId)!
    agg.orders.push(o)
    agg.totalSpent += o.total || 0
    agg.discountSpent += o.discountAmount || 0

    if (orderDate < agg.firstOrderDate) agg.firstOrderDate = orderDate
    if (orderDate > agg.lastOrderDate) agg.lastOrderDate = orderDate
  })

  // Calculate time-window LTVs per customer
  custMap.forEach((agg) => {
    agg.orders.forEach((o) => {
      const oDate = parseDate(o.createdAt)
      const gap = diffInDays(agg.firstOrderDate, oDate)
      const val = o.total || 0

      if (gap <= 30) agg.ltv30d += val
      if (gap <= 60) agg.ltv60d += val
      if (gap <= 90) agg.ltv90d += val
      if (gap <= 180) agg.ltv180d += val
    })
  })

  const customerList = Array.from(custMap.values()).filter((c) => c.orders.length > 0)
  const totalCustCount = Math.max(1, customerList.length)

  const sumTotalRevenue = customerList.reduce((acc, c) => acc + c.totalSpent, 0)
  const sum30d = customerList.reduce((acc, c) => acc + c.ltv30d, 0)
  const sum60d = customerList.reduce((acc, c) => acc + c.ltv60d, 0)
  const sum90d = customerList.reduce((acc, c) => acc + c.ltv90d, 0)
  const sum180d = customerList.reduce((acc, c) => acc + c.ltv180d, 0)
  const sumDiscount = customerList.reduce((acc, c) => acc + c.discountSpent, 0)

  // Estimated COGS (~65% of subtotal)
  const estimatedCogs = sumTotalRevenue * 0.65
  const sumContributionLtv = sumTotalRevenue - estimatedCogs - sumDiscount

  // Customer Segmentation
  const now = new Date()
  const segmentCounts: Record<CustomerSegmentType, { count: number; revenue: number; orderCount: number }> = {
    'New Customer': { count: 0, revenue: 0, orderCount: 0 },
    'One-time Customer': { count: 0, revenue: 0, orderCount: 0 },
    'Repeat Customer': { count: 0, revenue: 0, orderCount: 0 },
    'High-value Customer': { count: 0, revenue: 0, orderCount: 0 },
    'At-risk Customer': { count: 0, revenue: 0, orderCount: 0 },
    'Dormant Customer': { count: 0, revenue: 0, orderCount: 0 },
  }

  const segmentDescriptions: Record<CustomerSegmentType, string> = {
    'New Customer': 'Khách hàng mới tạo đơn trong 30 ngày gần nhất',
    'One-time Customer': 'Khách mới mua 1 đơn duy nhất và quá 60 ngày chưa mua lại',
    'Repeat Customer': 'Khách trung thành đã mua từ 2-4 đơn',
    'High-value Customer': 'Khách VIP đã mua >= 5 đơn hoặc chi tiêu >= 10.000.000 VNĐ',
    'At-risk Customer': 'Khách đã từng mua nhiều lần nhưng không mua lại trong 60-120 ngày',
    'Dormant Customer': 'Khách hàng không phát sinh đơn trong hơn 120 ngày',
  }

  customerList.forEach((c) => {
    const seg = classifyCustomerSegment(c.orders.length, c.totalSpent, c.firstOrderDate, c.lastOrderDate, now)
    segmentCounts[seg].count++
    segmentCounts[seg].revenue += c.totalSpent
    segmentCounts[seg].orderCount += c.orders.length
  })

  const segments: CustomerSegmentSummary[] = (Object.keys(segmentCounts) as CustomerSegmentType[]).map((segKey) => {
    const data = segmentCounts[segKey]
    return {
      segment: segKey,
      customerCount: data.count,
      percentage: Number(((data.count / totalCustCount) * 100).toFixed(1)),
      totalRevenue: data.revenue,
      aov: data.orderCount > 0 ? Math.round(data.revenue / data.orderCount) : 0,
      avgOrderCount: data.count > 0 ? Number((data.orderCount / data.count).toFixed(1)) : 0,
      description: segmentDescriptions[segKey],
    }
  })

  // Top Customers by LTV / Total Spent
  const topCustomers = customerList
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10)
    .map((c) => ({
      customerId: c.customerId,
      customerName: c.name,
      orderCount: c.orders.length,
      totalSpent: c.totalSpent,
      ltv90d: c.ltv90d,
      segment: classifyCustomerSegment(c.orders.length, c.totalSpent, c.firstOrderDate, c.lastOrderDate, now),
      firstOrderDate: c.firstOrderDate.toLocaleDateString('vi-VN'),
      lastOrderDate: c.lastOrderDate.toLocaleDateString('vi-VN'),
    }))

  return {
    revenueLtvAverage: Math.round(sumTotalRevenue / totalCustCount),
    ltv30DaysAverage: Math.round(sum30d / totalCustCount),
    ltv60DaysAverage: Math.round(sum60d / totalCustCount),
    ltv90DaysAverage: Math.round(sum90d / totalCustCount),
    ltv180DaysAverage: Math.round(sum180d / totalCustCount),
    contributionLtvAverage: Math.round(sumContributionLtv / totalCustCount),
    segments,
    topCustomers,
  }
}
