import type { Customer, Order } from '../../../services/orderApi'
import type { CohortRow, RetentionMetrics } from '../types'

function parseDate(dStr: string): Date {
  return new Date(dStr)
}

function diffInDays(d1: Date, d2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor((d2.getTime() - d1.getTime()) / msPerDay)
}

function getYearMonthKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function formatYearMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `Tháng ${m}/${y}`
}

export function calculateRetentionMetrics(
  customers: Customer[],
  orders: Order[],
): RetentionMetrics {
  // Filter out cancelled orders
  const validOrders = orders.filter(
    (o) => o.status !== 'Cancelled' && o.status !== 'PaymentCancelled',
  )

  // Map customer -> sorted list of valid order dates
  const customerOrdersMap: Map<number, Date[]> = new Map()

  validOrders.forEach((o) => {
    const cId = o.customerId || o.userId
    if (!cId) return
    const d = parseDate(o.createdAt)
    if (isNaN(d.getTime())) return

    if (!customerOrdersMap.has(cId)) {
      customerOrdersMap.set(cId, [])
    }
    customerOrdersMap.get(cId)!.push(d)
  })

  // Sort each customer's orders chronologically
  customerOrdersMap.forEach((dates) => {
    dates.sort((a, b) => a.getTime() - b.getTime())
  })

  const totalCustomersWithOrders = customerOrdersMap.size
  let repeatCustomerCount = 0
  const daysToSecondPurchaseList: number[] = []

  let d1Retained = 0
  let d7Retained = 0
  let d14Retained = 0
  let d30Retained = 0
  let d60Retained = 0
  let d90Retained = 0

  customerOrdersMap.forEach((dates) => {
    const firstDate = dates[0]
    if (!firstDate) return

    if (dates.length >= 2) {
      const secondDate = dates[1]
      if (secondDate) {
        repeatCustomerCount++
        const gapDays = diffInDays(firstDate, secondDate)
        daysToSecondPurchaseList.push(gapDays)
      }
    }

    const hasReturnInWindow = (minDays: number, maxDays: number) => {
      return dates.some((d) => {
        const gap = diffInDays(firstDate, d)
        return gap >= minDays && gap <= maxDays
      })
    }

    if (hasReturnInWindow(1, 3)) d1Retained++
    if (hasReturnInWindow(4, 10)) d7Retained++
    if (hasReturnInWindow(11, 20)) d14Retained++
    if (hasReturnInWindow(21, 40)) d30Retained++
    if (hasReturnInWindow(41, 75)) d60Retained++
    if (hasReturnInWindow(76, 110)) d90Retained++
  })

  const repeatPurchaseRate =
    totalCustomersWithOrders > 0
      ? Number(((repeatCustomerCount / totalCustomersWithOrders) * 100).toFixed(1))
      : 0

  const avgDaysToSecondPurchase =
    daysToSecondPurchaseList.length > 0
      ? Math.round(
          daysToSecondPurchaseList.reduce((a, b) => a + b, 0) /
            daysToSecondPurchaseList.length,
        )
      : 18

  const calcRate = (retained: number) =>
    totalCustomersWithOrders > 0
      ? Number(((retained / totalCustomersWithOrders) * 100).toFixed(1))
      : 0

  // Build Cohort Matrix
  const cohortGroups: Map<string, Set<number>> = new Map()

  customerOrdersMap.forEach((dates, cId) => {
    const firstDate = dates[0]
    if (!firstDate) return
    const cohortKey = getYearMonthKey(firstDate)
    if (!cohortGroups.has(cohortKey)) {
      cohortGroups.set(cohortKey, new Set())
    }
    cohortGroups.get(cohortKey)!.add(cId)
  })

  const sortedCohortKeys = Array.from(cohortGroups.keys()).sort()
  const cohortMatrix: CohortRow[] = []

  sortedCohortKeys.forEach((cohortKey) => {
    const cohortCustomerIds = cohortGroups.get(cohortKey)!
    const cohortSize = cohortCustomerIds.size
    const parts = cohortKey.split('-').map(Number)
    const cYear = parts[0] ?? 2026
    const cMonth = parts[1] ?? 1

    const periods: CohortRow['periods'] = []

    // Calculate Month 0 to Month 5
    for (let period = 0; period <= 5; period++) {
      const targetMonthDate = new Date(cYear, cMonth - 1 + period, 1)
      const targetYMKey = getYearMonthKey(targetMonthDate)

      let activeCount = 0
      let monthRevenue = 0

      cohortCustomerIds.forEach((cId) => {
        const dates = customerOrdersMap.get(cId) || []
        const hasOrderInPeriod = dates.some((d) => getYearMonthKey(d) === targetYMKey)
        if (hasOrderInPeriod) {
          activeCount++
        }
      })

      // Revenue for cohort in this period
      validOrders.forEach((o) => {
        const cId = o.customerId || o.userId
        if (cId && cohortCustomerIds.has(cId)) {
          const d = parseDate(o.createdAt)
          if (getYearMonthKey(d) === targetYMKey) {
            monthRevenue += o.total || 0
          }
        }
      })

      const retentionRate =
        cohortSize > 0 ? Number(((activeCount / cohortSize) * 100).toFixed(1)) : 0

      periods.push({
        periodIndex: period,
        activeCount,
        retentionRate,
        revenue: monthRevenue,
      })
    }

    cohortMatrix.push({
      cohortKey,
      cohortLabel: formatYearMonthLabel(cohortKey),
      cohortSize,
      periods,
    })
  })

  return {
    d1Rate: calcRate(d1Retained),
    d7Rate: calcRate(d7Retained),
    d14Rate: calcRate(d14Retained),
    d30Rate: calcRate(d30Retained),
    d60Rate: calcRate(d60Retained),
    d90Rate: calcRate(d90Retained),
    weeklyRate: calcRate(d7Retained),
    monthlyRate: calcRate(d30Retained),
    repeatPurchaseRate,
    avgDaysToSecondPurchase,
    cohortMatrix,
  }
}
