export type AnalyticsSource = 'web' | 'mobile' | 'pos' | 'system'

export type StandardEventName =
  | 'session_started'
  | 'product_list_viewed'
  | 'product_viewed'
  | 'product_searched'
  | 'product_added_to_cart'
  | 'product_removed_from_cart'
  | 'checkout_started'
  | 'order_created'
  | 'payment_started'
  | 'payment_completed'
  | 'payment_failed'
  | 'order_completed'
  | 'order_cancelled'
  | 'promotion_viewed'
  | 'promotion_clicked'
  | 'coupon_applied'
  | 'customer_returned'

export interface AnalyticsEvent {
  id?: string | number
  eventId: string
  eventName: StandardEventName | string
  userId?: number | null
  customerId?: number | null
  sessionId: string
  anonymousId?: string | null
  orderId?: number | null
  productId?: number | null
  categoryId?: number | null
  eventTime: string
  source: AnalyticsSource
  properties: Record<string, any>
  createdAt?: string
}

export interface FunnelStep {
  stepIndex: number
  stepKey: string
  stepName: string
  count: number
  uniqueUsers: number
  uniqueOrders: number
  conversionFromPrevious: number
  dropoffCount: number
  dropoffRate: number
  medianDurationSeconds: number
}

export interface FunnelData {
  funnelType: 'transaction' | 'behavioral'
  totalUsers: number
  overallConversionRate: number
  steps: FunnelStep[]
  byCategory?: Record<string, FunnelStep[]>
  byPaymentMethod?: Record<string, FunnelStep[]>
}

export interface CohortRow {
  cohortKey: string
  cohortLabel: string
  cohortSize: number
  periods: Array<{
    periodIndex: number
    activeCount: number
    retentionRate: number
    revenue: number
  }>
}

export interface RetentionMetrics {
  d1Rate: number
  d7Rate: number
  d14Rate: number
  d30Rate: number
  d60Rate: number
  d90Rate: number
  weeklyRate: number
  monthlyRate: number
  repeatPurchaseRate: number
  avgDaysToSecondPurchase: number
  cohortMatrix: CohortRow[]
}

export type CustomerSegmentType =
  | 'New Customer'
  | 'One-time Customer'
  | 'Repeat Customer'
  | 'High-value Customer'
  | 'At-risk Customer'
  | 'Dormant Customer'

export interface CustomerSegmentSummary {
  segment: CustomerSegmentType
  customerCount: number
  percentage: number
  totalRevenue: number
  aov: number
  avgOrderCount: number
  description: string
}

export interface LtvMetrics {
  revenueLtvAverage: number
  ltv30DaysAverage: number
  ltv60DaysAverage: number
  ltv90DaysAverage: number
  ltv180DaysAverage: number
  contributionLtvAverage: number
  segments: CustomerSegmentSummary[]
  topCustomers: Array<{
    customerId: number
    customerName: string
    orderCount: number
    totalSpent: number
    ltv90d: number
    segment: CustomerSegmentType
    firstOrderDate: string
    lastOrderDate: string
  }>
}

export interface ProductAffinityPair {
  productAId: number
  productAName: string
  productBId: number
  productBName: string
  coOccurrenceCount: number
  affinityScore: number
}

export interface MonetizationMetrics {
  totalRevenue: number
  netRevenue: number
  totalOrders: number
  validOrders: number
  cancelledOrders: number
  aov: number
  revenuePerActiveUser: number
  revenuePerPayingCustomer: number
  totalDiscountAmount: number
  discountRate: number
  estimatedCOGS: number
  grossProfit: number
  grossMarginPercent: number
  paretoConcentration: {
    top1PercentRevenueShare: number
    top5PercentRevenueShare: number
    top10PercentRevenueShare: number
    top20PercentRevenueShare: number
  }
  topRevenueProducts: Array<{
    productId: number
    productName: string
    categoryName: string
    quantitySold: number
    revenue: number
    estimatedProfit: number
  }>
  affinityPairs: ProductAffinityPair[]
}

export interface ExperimentVariant {
  key: 'control' | 'treatment' | string
  name: string
  description: string
  weight: number
}

export interface ExperimentDefinition {
  experimentId: string
  experimentName: string
  hypothesis: string
  controlVariant: string
  treatmentVariant: string
  startTime: string
  endTime?: string | null
  status: 'draft' | 'running' | 'paused' | 'completed'
  primaryMetric: string
  secondaryMetrics: string[]
  guardrailMetrics: string[]
}

export interface ExperimentResult {
  experimentId: string
  experimentName: string
  status: string
  sampleSizeControl: number
  sampleSizeTreatment: number
  baselineConversion: number
  treatmentConversion: number
  absoluteUplift: number
  relativeUpliftPercent: number
  confidenceInterval: [number, number]
  pValue: number
  isStatisticallySignificant: boolean
  srmPassed: boolean
  guardrailOk: boolean
  recommendation: 'SHIP' | 'DO_NOT_SHIP' | 'CONTINUE_TESTING' | 'INSUFFICIENT_DATA'
  isSynthetic: boolean
}

export interface DataQualityHealth {
  status: 'Healthy' | 'Degraded' | 'Critical'
  totalEventsTracked: number
  duplicateEventsDropped: number
  queuePendingCount: number
  failedUploadCount: number
  lastEventTime: string | null
  schemaCompliancePercent: number
  avgEventLatencyMs: number
}
