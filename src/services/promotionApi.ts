import { apiRequest } from './apiClient'
import { API_URLS, ENABLE_MOCK_FALLBACK } from './config'

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

// ============================================================================
// LOCAL STORAGE & MOCK FALLBACK DATA
// ============================================================================

const PROMO_STORAGE_KEY = 'smartsale_promotions_local'
const COUPON_STORAGE_KEY = 'smartsale_coupons_local'

const DEFAULT_MOCK_PROMOTIONS: Promotion[] = [
  {
    id: 1,
    name: 'Đại Tiệc Mùa Hè 2026',
    description: 'Giảm 10% cho toàn bộ đơn hàng từ 500.000₫',
    discountType: 'percent',
    discountValue: 10,
    minOrderAmount: 500000,
    maxDiscountAmount: 500000,
    appliesTo: 'all',
    startDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    isActive: true,
    createdById: 1,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastModifiedAt: null,
    items: [],
    couponCount: 1,
    totalCouponsUsed: 18,
  },
  {
    id: 2,
    name: 'Flash Sale Đồ Công Nghệ & Phụ Kiện',
    description: 'Giảm ngay 200.000₫ cho đơn hàng Thiết bị Điện tử từ 2 triệu',
    discountType: 'fixed',
    discountValue: 200000,
    minOrderAmount: 2000000,
    maxDiscountAmount: null,
    appliesTo: 'category',
    startDate: new Date(Date.now() - 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 15).toISOString(),
    isActive: true,
    createdById: 1,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lastModifiedAt: null,
    items: [{ id: 1, categoryId: 1, categoryName: 'Điện tử & Gia dụng' }],
    couponCount: 1,
    totalCouponsUsed: 7,
  },
  {
    id: 3,
    name: 'Tuần Lễ Gia Dụng Thông Minh',
    description: 'Giảm 15% khi mua Robot CleanBot hoặc Máy lọc không khí',
    discountType: 'percent',
    discountValue: 15,
    minOrderAmount: 1000000,
    maxDiscountAmount: 1000000,
    appliesTo: 'product',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 20).toISOString(),
    isActive: true,
    createdById: 1,
    createdAt: new Date().toISOString(),
    lastModifiedAt: null,
    items: [{ id: 2, productId: 1, productName: 'Robot Hút Bụi CleanBot Pro' }],
    couponCount: 0,
    totalCouponsUsed: 0,
  },
]

const DEFAULT_MOCK_COUPONS: Coupon[] = [
  {
    id: 1,
    promotionId: 1,
    promotionName: 'Đại Tiệc Mùa Hè 2026',
    code: 'SUMMER10',
    name: 'Mã Giảm 10% Hè',
    description: 'Giảm 10% tối đa 500k cho đơn từ 500k',
    discountType: 'percent',
    discountValue: 10,
    minOrderAmount: 500000,
    maxDiscountAmount: 500000,
    maxUses: 200,
    usedCount: 18,
    maxUsesPerCustomer: 2,
    appliesTo: 'all',
    startDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastModifiedAt: null,
    items: [],
  },
  {
    id: 2,
    promotionId: 2,
    promotionName: 'Flash Sale Đồ Công Nghệ & Phụ Kiện',
    code: 'TECH200K',
    name: 'Voucher Công Nghệ 200k',
    description: 'Giảm 200.000₫ cho đơn công nghệ từ 2 triệu',
    discountType: 'fixed',
    discountValue: 200000,
    minOrderAmount: 2000000,
    maxDiscountAmount: null,
    maxUses: 100,
    usedCount: 7,
    maxUsesPerCustomer: 1,
    appliesTo: 'category',
    startDate: new Date(Date.now() - 86400000).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 15).toISOString(),
    isActive: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lastModifiedAt: null,
    items: [{ id: 1, categoryId: 1, categoryName: 'Điện tử & Gia dụng' }],
  },
  {
    id: 3,
    promotionId: null,
    promotionName: null,
    code: 'WELCOME50K',
    name: 'Mã Chào Mừng Khách Hàng Mới',
    description: 'Giảm ngay 50.000₫ cho đơn hàng từ 300.000₫',
    discountType: 'fixed',
    discountValue: 50000,
    minOrderAmount: 300000,
    maxDiscountAmount: null,
    maxUses: 500,
    usedCount: 42,
    maxUsesPerCustomer: 1,
    appliesTo: 'all',
    startDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 60).toISOString(),
    isActive: true,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    lastModifiedAt: null,
    items: [],
  },
  {
    id: 4,
    promotionId: null,
    promotionName: null,
    code: 'VIP15',
    name: 'Mã Đặc Quyền VIP 15%',
    description: 'Giảm 15% tối đa 1.000.000₫ cho đơn từ 1.5 triệu',
    discountType: 'percent',
    discountValue: 15,
    minOrderAmount: 1500000,
    maxDiscountAmount: 1000000,
    maxUses: 50,
    usedCount: 9,
    maxUsesPerCustomer: 1,
    appliesTo: 'all',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    lastModifiedAt: null,
    items: [],
  },
]

const DEFAULT_TIER_BENEFITS: TierBenefit[] = [
  {
    tier: 'Platinum',
    label: 'Kim Cương',
    discountPercent: 10,
    minSpent: 20000000,
    description: 'Chi tiêu từ 20.000.000 ₫ — Hạng thành viên tối cao, đặc quyền VIP cao nhất',
  },
  {
    tier: 'Gold',
    label: 'Vàng',
    discountPercent: 5,
    minSpent: 8000000,
    description: 'Chi tiêu từ 8.000.000 ₫ — Khách hàng VIP thân thiết, ưu đãi 5% trên mọi đơn',
  },
  {
    tier: 'Silver',
    label: 'Bạc',
    discountPercent: 2,
    minSpent: 3000000,
    description: 'Chi tiêu từ 3.000.000 ₫ — Khách hàng Bạc VIP, ưu đãi 2% trên mọi đơn',
  },
  {
    tier: 'Standard',
    label: 'Đồng',
    discountPercent: 0,
    minSpent: 0,
    description: 'Hạng khởi đầu dành cho khách hàng mới',
  },
]

function getLocalPromotions(): Promotion[] {
  try {
    const raw = localStorage.getItem(PROMO_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_MOCK_PROMOTIONS
}

function saveLocalPromotions(items: Promotion[]) {
  try {
    localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

function getLocalCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(COUPON_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_MOCK_COUPONS
}

function saveLocalCoupons(items: Coupon[]) {
  try {
    localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

// ============================================================================
// API CALLS WITH GRACEFUL FALLBACK
// ============================================================================

export async function getPromotions(): Promise<Promotion[]> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Promotion[]>(API_URLS.order, '/api/promotions', { auth: true })
    } catch (err) {
      console.warn('[PromotionApi] Remote getPromotions failed, using fallback:', err)
    }
  }
  return getLocalPromotions()
}

export async function getPromotion(id: number): Promise<Promotion> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Promotion>(API_URLS.order, `/api/promotions/${id}`, { auth: true })
    } catch (err) {
      console.warn('[PromotionApi] Remote getPromotion failed, using fallback:', err)
    }
  }
  const found = getLocalPromotions().find((p) => p.id === id)
  if (!found) throw new Error('Không tìm thấy chương trình khuyến mãi')
  return found
}

export async function createPromotion(payload: PromotionPayload): Promise<Promotion> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Promotion>(API_URLS.order, '/api/promotions', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.warn('[PromotionApi] Remote createPromotion failed, using fallback:', err)
      if (!ENABLE_MOCK_FALLBACK) throw err
    }
  }

  const list = getLocalPromotions()
  const newPromo: Promotion = {
    id: Date.now(),
    name: payload.name,
    description: payload.description || null,
    discountType: payload.discountType,
    discountValue: Number(payload.discountValue),
    minOrderAmount: Number(payload.minOrderAmount || 0),
    maxDiscountAmount: payload.maxDiscountAmount != null ? Number(payload.maxDiscountAmount) : null,
    appliesTo: payload.appliesTo,
    startDate: payload.startDate || new Date().toISOString(),
    endDate: payload.endDate || null,
    isActive: payload.isActive !== false,
    createdById: 1,
    createdAt: new Date().toISOString(),
    lastModifiedAt: null,
    items: [],
    couponCount: 0,
    totalCouponsUsed: 0,
  }
  list.unshift(newPromo)
  saveLocalPromotions(list)
  return newPromo
}

export async function updatePromotion(id: number, payload: PromotionPayload): Promise<Promotion> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Promotion>(API_URLS.order, `/api/promotions/${id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.warn('[PromotionApi] Remote updatePromotion failed, using fallback:', err)
      if (!ENABLE_MOCK_FALLBACK) throw err
    }
  }

  const list = getLocalPromotions()
  const index = list.findIndex((p) => p.id === id)
  if (index === -1) throw new Error('Không tìm thấy khuyến mãi')
  const updated: Promotion = {
    ...list[index]!,
    name: payload.name,
    description: payload.description || null,
    discountType: payload.discountType,
    discountValue: Number(payload.discountValue),
    minOrderAmount: Number(payload.minOrderAmount || 0),
    maxDiscountAmount: payload.maxDiscountAmount != null ? Number(payload.maxDiscountAmount) : null,
    appliesTo: payload.appliesTo,
    startDate: payload.startDate || list[index]!.startDate,
    endDate: payload.endDate !== undefined ? payload.endDate : list[index]!.endDate,
    isActive: payload.isActive !== undefined ? payload.isActive : list[index]!.isActive,
    lastModifiedAt: new Date().toISOString(),
  }
  list[index] = updated
  saveLocalPromotions(list)
  return updated
}

export async function deletePromotion(id: number): Promise<void> {
  if (API_URLS.order) {
    try {
      return await apiRequest<void>(API_URLS.order, `/api/promotions/${id}`, {
        method: 'DELETE',
        auth: true,
      })
    } catch (err) {
      console.warn('[PromotionApi] Remote deletePromotion failed, using fallback:', err)
      if (!ENABLE_MOCK_FALLBACK) throw err
    }
  }

  const list = getLocalPromotions().filter((p) => p.id !== id)
  saveLocalPromotions(list)
}

export async function getCoupons(): Promise<Coupon[]> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Coupon[]>(API_URLS.order, '/api/coupons', { auth: true })
    } catch (err) {
      console.warn('[PromotionApi] Remote getCoupons failed, using fallback:', err)
    }
  }
  return getLocalCoupons()
}

export async function getCoupon(id: number): Promise<Coupon> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Coupon>(API_URLS.order, `/api/coupons/${id}`, { auth: true })
    } catch (err) {
      console.warn('[PromotionApi] Remote getCoupon failed, using fallback:', err)
    }
  }
  const found = getLocalCoupons().find((c) => c.id === id)
  if (!found) throw new Error('Không tìm thấy mã giảm giá')
  return found
}

export async function createCoupon(payload: CouponPayload): Promise<Coupon> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Coupon>(API_URLS.order, '/api/coupons', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.warn('[PromotionApi] Remote createCoupon failed, using fallback:', err)
      if (!ENABLE_MOCK_FALLBACK) throw err
    }
  }

  const list = getLocalCoupons()
  const newCoupon: Coupon = {
    id: Date.now(),
    promotionId: payload.promotionId || null,
    promotionName: payload.promotionId ? 'Chiến dịch' : null,
    code: String(payload.code).trim().toUpperCase(),
    name: payload.name,
    description: payload.description || null,
    discountType: payload.discountType,
    discountValue: Number(payload.discountValue),
    minOrderAmount: Number(payload.minOrderAmount || 0),
    maxDiscountAmount: payload.maxDiscountAmount != null ? Number(payload.maxDiscountAmount) : null,
    maxUses: payload.maxUses != null ? Number(payload.maxUses) : null,
    usedCount: 0,
    maxUsesPerCustomer: Number(payload.maxUsesPerCustomer || 1),
    appliesTo: payload.appliesTo,
    startDate: payload.startDate || new Date().toISOString(),
    endDate: payload.endDate || null,
    isActive: payload.isActive !== false,
    createdAt: new Date().toISOString(),
    lastModifiedAt: null,
    items: [],
  }
  list.unshift(newCoupon)
  saveLocalCoupons(list)
  return newCoupon
}

export async function updateCoupon(id: number, payload: CouponPayload): Promise<Coupon> {
  if (API_URLS.order) {
    try {
      return await apiRequest<Coupon>(API_URLS.order, `/api/coupons/${id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.warn('[PromotionApi] Remote updateCoupon failed, using fallback:', err)
      if (!ENABLE_MOCK_FALLBACK) throw err
    }
  }

  const list = getLocalCoupons()
  const index = list.findIndex((c) => c.id === id)
  if (index === -1) throw new Error('Không tìm thấy mã giảm giá')
  const updated: Coupon = {
    ...list[index]!,
    promotionId: payload.promotionId !== undefined ? payload.promotionId : list[index]!.promotionId,
    code: payload.code ? String(payload.code).trim().toUpperCase() : list[index]!.code,
    name: payload.name || list[index]!.name,
    description: payload.description !== undefined ? payload.description : list[index]!.description,
    discountType: payload.discountType || list[index]!.discountType,
    discountValue: Number(payload.discountValue || list[index]!.discountValue),
    minOrderAmount: Number(payload.minOrderAmount ?? list[index]!.minOrderAmount),
    maxDiscountAmount: payload.maxDiscountAmount !== undefined ? payload.maxDiscountAmount : list[index]!.maxDiscountAmount,
    maxUses: payload.maxUses !== undefined ? payload.maxUses : list[index]!.maxUses,
    maxUsesPerCustomer: Number(payload.maxUsesPerCustomer ?? list[index]!.maxUsesPerCustomer),
    appliesTo: payload.appliesTo || list[index]!.appliesTo,
    startDate: payload.startDate || list[index]!.startDate,
    endDate: payload.endDate !== undefined ? payload.endDate : list[index]!.endDate,
    isActive: payload.isActive !== undefined ? payload.isActive : list[index]!.isActive,
    lastModifiedAt: new Date().toISOString(),
  }
  list[index] = updated
  saveLocalCoupons(list)
  return updated
}

export async function deleteCoupon(id: number): Promise<void> {
  if (API_URLS.order) {
    try {
      return await apiRequest<void>(API_URLS.order, `/api/coupons/${id}`, {
        method: 'DELETE',
        auth: true,
      })
    } catch (err) {
      console.warn('[PromotionApi] Remote deleteCoupon failed, using fallback:', err)
      if (!ENABLE_MOCK_FALLBACK) throw err
    }
  }

  const list = getLocalCoupons().filter((c) => c.id !== id)
  saveLocalCoupons(list)
}

export async function validateCoupon(params: {
  code: string
  items: Array<{ productId: number; quantity: number }>
  customerId?: number | null
  userId?: number | null
}): Promise<CouponValidationResult> {
  if (API_URLS.order) {
    try {
      return await apiRequest<CouponValidationResult>(API_URLS.order, '/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify(params),
      })
    } catch (err) {
      console.warn('[PromotionApi] Remote validateCoupon failed, using local validation:', err)
    }
  }

  const codeClean = String(params.code || '').trim().toUpperCase()
  const coupon = getLocalCoupons().find((c) => c.code === codeClean && c.isActive)
  if (!coupon) {
    throw new Error('Mã giảm giá không tồn tại hoặc đã hết hạn.')
  }

  return {
    valid: true,
    coupon: {
      couponId: coupon.id,
      code: coupon.code,
      name: coupon.name,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: coupon.discountValue,
      appliesTo: coupon.appliesTo,
    },
    tier: 'Standard',
    tierPercent: 0,
    tierDiscountAmount: 0,
    subtotal: 1000000,
    totalDiscount: coupon.discountValue,
    finalTotal: 1000000 - coupon.discountValue,
  }
}

export async function getTierBenefits(): Promise<TierBenefit[]> {
  if (API_URLS.order) {
    try {
      return await apiRequest<TierBenefit[]>(API_URLS.order, '/api/tier-benefits')
    } catch (err) {
      console.warn('[PromotionApi] Remote getTierBenefits failed, using fallback:', err)
    }
  }
  return DEFAULT_TIER_BENEFITS
}
