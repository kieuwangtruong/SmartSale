import { apiRequest } from './apiClient'
import { API_URLS } from './config'

export type DiscountType = 'percent' | 'fixed'
export type AppliesToType = 'all' | 'category' | 'product'

export interface PromotionItem {
  id: number
  productId?: number | null
  productName?: string | null
  categoryId?: number | null
  categoryName?: string | null
}

export interface Promotion {
  id: number
  name: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount?: number | null
  appliesTo: AppliesToType
  startDate: string
  endDate?: string | null
  isActive: boolean
  createdById?: number | null
  createdAt: string
  lastModifiedAt?: string | null
  items: PromotionItem[]
  couponCount: number
  totalCouponsUsed: number
}

export interface PromotionPayload {
  name: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount?: number | null
  appliesTo: AppliesToType
  startDate?: string | null
  endDate?: string | null
  isActive?: boolean
  productIds?: number[]
  categoryIds?: number[]
}

export interface CouponItem {
  id: number
  productId?: number | null
  productName?: string | null
  categoryId?: number | null
  categoryName?: string | null
}

export interface Coupon {
  id: number
  promotionId?: number | null
  promotionName?: string | null
  code: string
  name: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount?: number | null
  maxUses?: number | null
  usedCount: number
  maxUsesPerCustomer: number
  appliesTo: AppliesToType
  startDate: string
  endDate?: string | null
  isActive: boolean
  createdAt: string
  lastModifiedAt?: string | null
  items: CouponItem[]
}

export interface CouponPayload {
  promotionId?: number | null
  code: string
  name: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount?: number | null
  maxUses?: number | null
  maxUsesPerCustomer?: number
  appliesTo: AppliesToType
  startDate?: string | null
  endDate?: string | null
  isActive?: boolean
  productIds?: number[]
  categoryIds?: number[]
}

export interface CouponValidationResult {
  valid: boolean
  coupon: {
    couponId: number
    code: string
    name: string
    discountType: DiscountType
    discountValue: number
    discountAmount: number
    appliesTo: AppliesToType
  }
  tier: string
  tierPercent: number
  tierDiscountAmount: number
  subtotal: number
  totalDiscount: number
  finalTotal: number
}

export interface TierBenefit {
  tier: string
  label: string
  discountPercent: number
  minSpent: number
  description: string
}

// API Calls
export async function getPromotions(): Promise<Promotion[]> {
  return apiRequest<Promotion[]>(API_URLS.order, '/api/promotions', { auth: true })
}

export async function getPromotion(id: number): Promise<Promotion> {
  return apiRequest<Promotion>(API_URLS.order, `/api/promotions/${id}`, { auth: true })
}

export async function createPromotion(payload: PromotionPayload): Promise<Promotion> {
  return apiRequest<Promotion>(API_URLS.order, '/api/promotions', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export async function updatePromotion(id: number, payload: PromotionPayload): Promise<Promotion> {
  return apiRequest<Promotion>(API_URLS.order, `/api/promotions/${id}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export async function deletePromotion(id: number): Promise<void> {
  return apiRequest<void>(API_URLS.order, `/api/promotions/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function getCoupons(): Promise<Coupon[]> {
  return apiRequest<Coupon[]>(API_URLS.order, '/api/coupons', { auth: true })
}

export async function getCoupon(id: number): Promise<Coupon> {
  return apiRequest<Coupon>(API_URLS.order, `/api/coupons/${id}`, { auth: true })
}

export async function createCoupon(payload: CouponPayload): Promise<Coupon> {
  return apiRequest<Coupon>(API_URLS.order, '/api/coupons', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export async function updateCoupon(id: number, payload: CouponPayload): Promise<Coupon> {
  return apiRequest<Coupon>(API_URLS.order, `/api/coupons/${id}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export async function deleteCoupon(id: number): Promise<void> {
  return apiRequest<void>(API_URLS.order, `/api/coupons/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function validateCoupon(params: {
  code: string
  items: Array<{ productId: number; quantity: number }>
  customerId?: number | null
  userId?: number | null
}): Promise<CouponValidationResult> {
  return apiRequest<CouponValidationResult>(API_URLS.order, '/api/coupons/validate', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function getTierBenefits(): Promise<TierBenefit[]> {
  return apiRequest<TierBenefit[]>(API_URLS.order, '/api/tier-benefits')
}
