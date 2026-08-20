import type { Order } from '../../../services/orderApi'
import type { Product } from '../../../services/productApi'
import type { MonetizationMetrics, ProductAffinityPair } from '../types'

export function calculateMonetizationMetrics(
  orders: Order[],
  products: Product[] = [],
): MonetizationMetrics {
  const totalOrders = orders.length
  const cancelledOrders = orders.filter(
    (o) => o.status === 'Cancelled' || o.status === 'PaymentCancelled',
  ).length

  const validOrders = orders.filter(
    (o) => o.status !== 'Cancelled' && o.status !== 'PaymentCancelled',
  )
  const validOrderCount = validOrders.length

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const netRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalDiscountAmount = validOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0)
  const totalSubtotal = validOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0)

  const aov = validOrderCount > 0 ? Math.round(netRevenue / validOrderCount) : 0
  const discountRate = totalSubtotal > 0 ? Number(((totalDiscountAmount / totalSubtotal) * 100).toFixed(1)) : 0

  const uniqueCustomers = new Set(validOrders.map((o) => o.customerId || o.userId)).size
  const revenuePerPayingCustomer = uniqueCustomers > 0 ? Math.round(netRevenue / uniqueCustomers) : 0
  const revenuePerActiveUser = uniqueCustomers > 0 ? Math.round(netRevenue / (uniqueCustomers * 1.25)) : 0

  // Calculate COGS based on order item quantities & product importPrice
  const productPriceMap = new Map<number, { importPrice: number; sellingPrice: number; categoryName: string }>()
  products.forEach((p) => {
    productPriceMap.set(p.id, {
      importPrice: p.importPrice || Math.round(p.sellingPrice * 0.65),
      sellingPrice: p.sellingPrice,
      categoryName: p.categoryName || 'Tổng hợp',
    })
  })

  let estimatedCOGS = 0
  const productSalesMap: Map<
    number,
    { productId: number; productName: string; categoryName: string; quantitySold: number; revenue: number }
  > = new Map()

  validOrders.forEach((o) => {
    ;(o.orderItems || []).forEach((item) => {
      const pInfo = productPriceMap.get(item.productId) || {
        importPrice: Math.round(item.price * 0.65),
        sellingPrice: item.price,
        categoryName: 'Tổng hợp',
      }
      const cogsItem = (item.quantity || 1) * pInfo.importPrice
      estimatedCOGS += cogsItem

      if (!productSalesMap.has(item.productId)) {
        productSalesMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName || `Sản phẩm #${item.productId}`,
          categoryName: pInfo.categoryName,
          quantitySold: 0,
          revenue: 0,
        })
      }

      const pStat = productSalesMap.get(item.productId)!
      pStat.quantitySold += item.quantity || 1
      pStat.revenue += item.subTotal || item.price * item.quantity || 0
    })
  })

  // If no detailed order items, estimate COGS as 65% of net revenue
  if (estimatedCOGS === 0 && netRevenue > 0) {
    estimatedCOGS = Math.round(netRevenue * 0.65)
  }

  const grossProfit = netRevenue - estimatedCOGS - totalDiscountAmount
  const grossMarginPercent = netRevenue > 0 ? Number(((grossProfit / netRevenue) * 100).toFixed(1)) : 0

  // Pareto Revenue Concentration (Top 1%, 5%, 10%, 20% Customers)
  const custRevenueMap: Map<number, number> = new Map()
  validOrders.forEach((o) => {
    const cId = o.customerId || o.userId
    if (!cId) return
    custRevenueMap.set(cId, (custRevenueMap.get(cId) || 0) + (o.total || 0))
  })

  const sortedCustRevenues = Array.from(custRevenueMap.values()).sort((a, b) => b - a)
  const totalCusts = Math.max(1, sortedCustRevenues.length)

  const calcShare = (topPct: number) => {
    const count = Math.max(1, Math.ceil(totalCusts * (topPct / 100)))
    const topSum = sortedCustRevenues.slice(0, count).reduce((a, b) => a + b, 0)
    return netRevenue > 0 ? Number(((topSum / netRevenue) * 100).toFixed(1)) : 0
  }

  const paretoConcentration = {
    top1PercentRevenueShare: calcShare(1),
    top5PercentRevenueShare: calcShare(5),
    top10PercentRevenueShare: calcShare(10),
    top20PercentRevenueShare: calcShare(20),
  }

  // Top Revenue Products
  const topRevenueProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => {
      const pInfo = productPriceMap.get(p.productId)
      const cogs = pInfo ? pInfo.importPrice * p.quantitySold : p.revenue * 0.65
      return {
        ...p,
        estimatedProfit: Math.round(p.revenue - cogs),
      }
    })

  // Product Affinity Co-occurrence Analysis (Pairing products bought together in same order)
  const pairCounts: Map<string, { productAId: number; productAName: string; productBId: number; productBName: string; count: number }> = new Map()

  validOrders.forEach((o) => {
    const items = o.orderItems || []
    if (items.length < 2) return

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const itemA = items[i]
        const itemB = items[j]
        if (!itemA || !itemB) continue

        const [p1, p2] = itemA.productId < itemB.productId ? [itemA, itemB] : [itemB, itemA]
        if (!p1 || !p2) continue

        const key = `${p1.productId}_${p2.productId}`

        if (!pairCounts.has(key)) {
          pairCounts.set(key, {
            productAId: p1.productId,
            productAName: p1.productName,
            productBId: p2.productId,
            productBName: p2.productName,
            count: 0,
          })
        }
        pairCounts.get(key)!.count++
      }
    }
  })

  const affinityPairs: ProductAffinityPair[] = Array.from(pairCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((p) => ({
      ...p,
      coOccurrenceCount: p.count,
      affinityScore: Number(((p.count / Math.max(1, validOrderCount)) * 100).toFixed(1)),
    }))

  return {
    totalRevenue,
    netRevenue,
    totalOrders,
    validOrders: validOrderCount,
    cancelledOrders,
    aov,
    revenuePerActiveUser,
    revenuePerPayingCustomer,
    totalDiscountAmount,
    discountRate,
    estimatedCOGS,
    grossProfit,
    grossMarginPercent,
    paretoConcentration,
    topRevenueProducts,
    affinityPairs,
  }
}
