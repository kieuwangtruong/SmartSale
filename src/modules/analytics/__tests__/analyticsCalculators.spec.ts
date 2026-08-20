import { calculateTransactionFunnel, calculateBehavioralFunnel } from '../services/funnelCalculator'
import { calculateRetentionMetrics } from '../services/retentionCohortCalculator'
import { calculateLtvMetrics, classifyCustomerSegment } from '../services/ltvCalculator'
import { calculateMonetizationMetrics } from '../services/monetizationCalculator'
import { assignVariant, evaluateExperiment } from '../services/abTestingEngine'
import type { Order, Customer } from '../../../services/orderApi'
import type { Product } from '../../../services/productApi'
import type { ExperimentDefinition } from '../types'

// Mock Data
const mockOrders: Order[] = [
  {
    id: 101,
    userId: 1,
    customerId: 1,
    customerName: 'Nguyễn Văn A',
    status: 'Completed',
    paymentMethod: 'Cash',
    subtotal: 1000000,
    discountAmount: 100000,
    total: 900000,
    amountPaid: 900000,
    debtAmount: 0,
    createdAt: '2026-01-10T10:00:00Z',
    orderItems: [
      { id: 1, productId: 10, productName: 'Sản phẩm 1', quantity: 2, price: 500000, subTotal: 1000000 },
    ],
  },
  {
    id: 102,
    userId: 1,
    customerId: 1,
    customerName: 'Nguyễn Văn A',
    status: 'Completed',
    paymentMethod: 'PayOS',
    subtotal: 2000000,
    discountAmount: 200000,
    total: 1800000,
    amountPaid: 1800000,
    debtAmount: 0,
    createdAt: '2026-02-15T14:30:00Z',
    orderItems: [
      { id: 2, productId: 10, productName: 'Sản phẩm 1', quantity: 1, price: 500000, subTotal: 500000 },
      { id: 3, productId: 20, productName: 'Sản phẩm 2', quantity: 1, price: 1500000, subTotal: 1500000 },
    ],
  },
  {
    id: 103,
    userId: 2,
    customerId: 2,
    customerName: 'Trần Thị B',
    status: 'Paid',
    paymentMethod: 'PayOS',
    subtotal: 500000,
    discountAmount: 0,
    total: 500000,
    amountPaid: 500000,
    debtAmount: 0,
    createdAt: '2026-02-20T09:15:00Z',
    orderItems: [
      { id: 4, productId: 20, productName: 'Sản phẩm 2', quantity: 1, price: 500000, subTotal: 500000 },
    ],
  },
  {
    id: 104,
    userId: 3,
    customerId: 3,
    customerName: 'Lê Văn C',
    status: 'Cancelled',
    paymentMethod: 'Cash',
    subtotal: 1200000,
    discountAmount: 0,
    total: 1200000,
    amountPaid: 0,
    debtAmount: 0,
    createdAt: '2026-03-01T11:00:00Z',
    orderItems: [],
  },
]

const mockCustomers: Customer[] = [
  {
    id: 1,
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    totalSpent: 2700000,
    currentDebt: 0,
    orderCount: 2,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    fullName: 'Trần Thị B',
    phone: '0909876543',
    totalSpent: 500000,
    currentDebt: 0,
    orderCount: 1,
    createdAt: '2026-02-01T00:00:00Z',
  },
]

const mockProducts: Product[] = [
  {
    id: 10,
    name: 'Sản phẩm 1',
    importPrice: 300000,
    sellingPrice: 500000,
    originalPrice: 500000,
    categoryId: 1,
    categoryName: 'Gia dụng',
    supplierId: 1,
    supplierName: 'NCC 1',
    quantity: 100,
    reserveStock: 10,
    variants: [],
  },
  {
    id: 20,
    name: 'Sản phẩm 2',
    importPrice: 900000,
    sellingPrice: 1500000,
    originalPrice: 1500000,
    categoryId: 2,
    categoryName: 'Điện tử',
    supplierId: 2,
    supplierName: 'NCC 2',
    quantity: 50,
    reserveStock: 5,
    variants: [],
  },
]

export function runAnalyticsUnitTestSuite(): { passed: boolean; details: string[] } {
  const details: string[] = []

  // Test 1: Transaction Funnel
  const transactionFunnel = calculateTransactionFunnel(mockOrders)
  details.push(`[Funnel Test] Step 1 Orders: ${transactionFunnel.steps[0].uniqueOrders} (expected 4)`)
  details.push(`[Funnel Test] Step 2 Paid Orders: ${transactionFunnel.steps[1].uniqueOrders} (expected 3)`)
  details.push(`[Funnel Test] Step 3 Completed Orders: ${transactionFunnel.steps[2].uniqueOrders} (expected 2)`)
  const funnelPass = transactionFunnel.steps[0].count === 4 && transactionFunnel.steps[1].count === 3

  // Test 2: Retention & Cohort
  const retention = calculateRetentionMetrics(mockCustomers, mockOrders)
  details.push(`[Retention Test] Repeat Purchase Rate: ${retention.repeatPurchaseRate}%`)
  details.push(`[Retention Test] Cohort Count: ${retention.cohortMatrix.length} cohorts`)

  // Test 3: Customer Segmentation
  const segRepeat = classifyCustomerSegment(2, 2700000, new Date('2026-01-10'), new Date('2026-02-15'))
  details.push(`[Segmentation Test] Customer 1 Segment: ${segRepeat} (expected Repeat Customer)`)

  // Test 4: Monetization & Net Revenue
  const monetization = calculateMonetizationMetrics(mockOrders, mockProducts)
  details.push(`[Monetization Test] Net Revenue: ${monetization.netRevenue} (expected 3,200,000)`)
  details.push(`[Monetization Test] Cancelled Orders Excluded: ${monetization.cancelledOrders} (expected 1)`)

  // Test 5: A/B Testing Deterministic Hashing
  const variant1 = assignVariant(1, 'EXPERIMENT_PERSONALIZED_BANNER')
  const variant1Repeat = assignVariant(1, 'EXPERIMENT_PERSONALIZED_BANNER')
  details.push(`[A/B Test] Deterministic Hash Consistency: ${variant1 === variant1Repeat ? 'MATCH' : 'MISMATCH'}`)

  const expDef: ExperimentDefinition = {
    experimentId: 'EXPERIMENT_PERSONALIZED_BANNER',
    experimentName: 'Personalized Banner',
    hypothesis: 'Test uplift',
    controlVariant: 'A',
    treatmentVariant: 'B',
    startTime: new Date().toISOString(),
    status: 'running',
    primaryMetric: 'Conversion',
    secondaryMetrics: [],
    guardrailMetrics: [],
  }
  const expResult = evaluateExperiment(expDef, mockOrders, [], true)
  details.push(`[A/B Test] Stat Significance Recommendation: ${expResult.recommendation}`)

  const allPassed = funnelPass && variant1 === variant1Repeat && monetization.netRevenue === 3200000
  return { passed: allPassed, details }
}
