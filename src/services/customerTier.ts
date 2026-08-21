export type CustomerTier = 'Standard' | 'Silver' | 'Gold' | 'Platinum'

export interface TierThreshold {
  tier: CustomerTier
  minSpent: number
  labelVi: string
  labelEn: string
  badgeClass: string
  color: string
  gradient: string
  glowColor: string
  bgLight: string
  borderColor: string
  icon: string
  logoEmoji: string
  discountPercent: number
  taglineVi: string
  taglineEn: string
  descriptionVi: string
  descriptionEn: string
}

export const TIER_CONFIG: Record<CustomerTier, TierThreshold> = {
  Platinum: {
    tier: 'Platinum',
    minSpent: 20_000_000,
    labelVi: 'Kim Cương',
    labelEn: 'Diamond',
    badgeClass: 'platinum',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    bgLight: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    icon: 'pi pi-star-fill',
    logoEmoji: '💎',
    discountPercent: 10,
    taglineVi: 'Đặc quyền Kim Cương VIP — Giảm 10% đơn hàng',
    taglineEn: 'Diamond VIP Tier — 10% Discount on orders',
    descriptionVi: 'Chi tiêu từ 20.000.000 ₫ — Hạng thành viên tối cao, đặc quyền VIP cao nhất',
    descriptionEn: 'Spent from 20,000,000 ₫ — Highest VIP tier with exclusive benefits',
  },
  Gold: {
    tier: 'Gold',
    minSpent: 8_000_000,
    labelVi: 'Vàng',
    labelEn: 'Gold',
    badgeClass: 'gold',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    bgLight: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    icon: 'pi pi-shield',
    logoEmoji: '👑',
    discountPercent: 5,
    taglineVi: 'Đặc quyền Vàng VIP — Giảm 5% đơn hàng',
    taglineEn: 'Gold VIP Tier — 5% Discount on orders',
    descriptionVi: 'Chi tiêu từ 8.000.000 ₫ — Khách hàng VIP thân thiết, ưu đãi đặc biệt',
    descriptionEn: 'Spent from 8,000,000 ₫ — Valued VIP customer with special perks',
  },
  Silver: {
    tier: 'Silver',
    minSpent: 2_000_000,
    labelVi: 'Bạc',
    labelEn: 'Silver',
    badgeClass: 'silver',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #93c5fd 0%, #38bdf8 50%, #64748b 100%)',
    glowColor: 'rgba(14, 165, 233, 0.35)',
    bgLight: 'rgba(14, 165, 233, 0.12)',
    borderColor: 'rgba(14, 165, 233, 0.4)',
    icon: 'pi pi-ticket',
    logoEmoji: '🥈',
    discountPercent: 2,
    taglineVi: 'Đặc quyền Bạc VIP — Giảm 2% đơn hàng',
    taglineEn: 'Silver VIP Tier — 2% Discount on orders',
    descriptionVi: 'Chi tiêu từ 2.000.000 ₫ — Khách hàng thân thiết tích cực',
    descriptionEn: 'Spent from 2,000,000 ₫ — Active loyal customer',
  },
  Standard: {
    tier: 'Standard',
    minSpent: 0,
    labelVi: 'Thường',
    labelEn: 'Standard',
    badgeClass: 'standard',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    glowColor: 'rgba(100, 116, 139, 0.2)',
    bgLight: 'rgba(100, 116, 139, 0.12)',
    borderColor: 'rgba(100, 116, 139, 0.3)',
    icon: 'pi pi-user',
    logoEmoji: '👤',
    discountPercent: 0,
    taglineVi: 'Thành viên tiêu chuẩn',
    taglineEn: 'Standard member',
    descriptionVi: 'Dưới 2.000.000 ₫ — Thành viên tiêu chuẩn',
    descriptionEn: 'Under 2,000,000 ₫ — Standard member',
  },
}

export function normalizeTierKey(tierStr?: string | null): CustomerTier {
  if (!tierStr) return 'Standard'
  const clean = tierStr.toLowerCase().trim()
  if (clean === 'platinum' || clean === 'diamond' || clean === 'kim cương' || clean === 'kim cuong') return 'Platinum'
  if (clean === 'gold' || clean === 'vàng' || clean === 'vang') return 'Gold'
  if (clean === 'silver' || clean === 'bạc' || clean === 'bac') return 'Silver'
  return 'Standard'
}

export function getTierByTotalSpent(totalSpent: number): CustomerTier {
  const spent = Number(totalSpent) || 0
  if (spent >= TIER_CONFIG.Platinum.minSpent) return 'Platinum'
  if (spent >= TIER_CONFIG.Gold.minSpent) return 'Gold'
  if (spent >= TIER_CONFIG.Silver.minSpent) return 'Silver'
  return 'Standard'
}

export function getTierConfig(tierOrSpent?: string | number | null): TierThreshold {
  if (typeof tierOrSpent === 'number') {
    return TIER_CONFIG[getTierByTotalSpent(tierOrSpent)]
  }
  const tierKey = normalizeTierKey(tierOrSpent)
  return TIER_CONFIG[tierKey]
}

export function getTierLabel(tierOrSpent?: string | number | null, lang: 'vi' | 'en' = 'vi'): string {
  const cfg = getTierConfig(tierOrSpent)
  return lang === 'en' ? cfg.labelEn : cfg.labelVi
}

export interface TierProgress {
  currentTier: CustomerTier
  currentTierConfig: TierThreshold
  nextTier: CustomerTier | null
  nextTierConfig: TierThreshold | null
  progressPercent: number
  amountNeeded: number
  totalSpent: number
}

export function getTierProgress(totalSpent: number): TierProgress {
  const spent = Math.max(0, Number(totalSpent) || 0)
  const currentTier = getTierByTotalSpent(spent)
  const currentTierConfig = TIER_CONFIG[currentTier]

  if (currentTier === 'Platinum') {
    return {
      currentTier,
      currentTierConfig,
      nextTier: null,
      nextTierConfig: null,
      progressPercent: 100,
      amountNeeded: 0,
      totalSpent: spent,
    }
  }

  let nextTier: CustomerTier = 'Silver'
  let prevThreshold = 0
  let nextThreshold = TIER_CONFIG.Silver.minSpent

  if (currentTier === 'Standard') {
    nextTier = 'Silver'
    prevThreshold = 0
    nextThreshold = TIER_CONFIG.Silver.minSpent
  } else if (currentTier === 'Silver') {
    nextTier = 'Gold'
    prevThreshold = TIER_CONFIG.Silver.minSpent
    nextThreshold = TIER_CONFIG.Gold.minSpent
  } else if (currentTier === 'Gold') {
    nextTier = 'Platinum'
    prevThreshold = TIER_CONFIG.Gold.minSpent
    nextThreshold = TIER_CONFIG.Platinum.minSpent
  }

  const nextTierConfig = TIER_CONFIG[nextTier]
  const needed = Math.max(0, nextThreshold - spent)
  const range = nextThreshold - prevThreshold
  const progressInRange = Math.max(0, spent - prevThreshold)
  const progressPercent = Math.min(100, Math.round((progressInRange / range) * 100))

  return {
    currentTier,
    currentTierConfig,
    nextTier,
    nextTierConfig,
    progressPercent,
    amountNeeded: needed,
    totalSpent: spent,
  }
}

export interface CustomerTierBreakdown {
  tier: CustomerTier
  config: TierThreshold
  customerCount: number
  totalRevenue: number
  percentageCount: number
  percentageRevenue: number
}

export function calculateCustomerTierBreakdown(
  customers: Array<{ totalSpent?: number | null; tier?: string | null }>,
): CustomerTierBreakdown[] {
  const list = customers || []
  const totalCust = Math.max(1, list.length)

  const summary: Record<CustomerTier, { count: number; revenue: number }> = {
    Platinum: { count: 0, revenue: 0 },
    Gold: { count: 0, revenue: 0 },
    Silver: { count: 0, revenue: 0 },
    Standard: { count: 0, revenue: 0 },
  }

  let sumAllRevenue = 0

  for (const c of list) {
    const spent = Number(c.totalSpent) || 0
    const tier = getTierByTotalSpent(spent)
    summary[tier].count += 1
    summary[tier].revenue += spent
    sumAllRevenue += spent
  }

  const revenueDenominator = Math.max(1, sumAllRevenue)

  const order: CustomerTier[] = ['Platinum', 'Gold', 'Silver', 'Standard']
  return order.map((tierKey) => {
    const data = summary[tierKey]
    return {
      tier: tierKey,
      config: TIER_CONFIG[tierKey],
      customerCount: data.count,
      totalRevenue: data.revenue,
      percentageCount: Math.round((data.count / totalCust) * 100),
      percentageRevenue: Math.round((data.revenue / revenueDenominator) * 100),
    }
  })
}
