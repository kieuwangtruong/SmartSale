<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import InputNumber from 'primevue/inputnumber'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'
import Calendar from 'primevue/calendar'
import InputSwitch from 'primevue/inputswitch'
import Badge from 'primevue/badge'
import Tag from 'primevue/tag'
import {
  createCoupon,
  createPromotion,
  deleteCoupon,
  deletePromotion,
  getCoupons,
  getPromotions,
  updateCoupon,
  updatePromotion,
  type Coupon,
  type CouponPayload,
  type Promotion,
  type PromotionPayload,
  type TierBenefit,
  getTierBenefits,
} from '../services/promotionApi'
import { getCategories, getProducts, type Category, type Product } from '../services/productApi'
import { formatCurrency } from '../services/orderApi'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'
import { TIER_CONFIG } from '../services/customerTier'
import CustomerTierBadge from '../components/CustomerTierBadge.vue'

const auth = useAuthStore()
const { t } = useLanguage()
const toast = useToast()

const activeTab = ref(0)
const loading = ref(false)
const promotions = ref<Promotion[]>([])
const coupons = ref<Coupon[]>([])
const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const tierBenefits = ref<TierBenefit[]>([])

const searchPromo = ref('')
const searchCoupon = ref('')

// Promotion Dialog State
const showPromoDialog = ref(false)
const editingPromoId = ref<number | null>(null)
const promoForm = reactive<{
  name: string
  description: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount: number | null
  appliesTo: 'all' | 'category' | 'product'
  startDate: Date | null
  endDate: Date | null
  isActive: boolean
  productIds: number[]
  categoryIds: number[]
}>({
  name: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: null,
  appliesTo: 'all',
  startDate: new Date(),
  endDate: null,
  isActive: true,
  productIds: [],
  categoryIds: [],
})

// Coupon Dialog State
const showCouponDialog = ref(false)
const editingCouponId = ref<number | null>(null)
const couponForm = reactive<{
  promotionId: number | null
  code: string
  name: string
  description: string
  discountType: 'percent' | 'fixed'
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount: number | null
  maxUses: number | null
  maxUsesPerCustomer: number
  appliesTo: 'all' | 'category' | 'product'
  startDate: Date | null
  endDate: Date | null
  isActive: boolean
  productIds: number[]
  categoryIds: number[]
}>({
  promotionId: null,
  code: '',
  name: '',
  description: '',
  discountType: 'percent',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: null,
  maxUses: 100,
  maxUsesPerCustomer: 1,
  appliesTo: 'all',
  startDate: new Date(),
  endDate: null,
  isActive: true,
  productIds: [],
  categoryIds: [],
})

const discountTypeOptions = [
  { label: 'Phần trăm (%)', value: 'percent' },
  { label: 'Số tiền cố định (₫)', value: 'fixed' },
]

const appliesToOptions = [
  { label: 'Toàn bộ cửa hàng (Tất cả sản phẩm)', value: 'all' },
  { label: 'Theo danh mục sản phẩm chỉ định', value: 'category' },
  { label: 'Theo sản phẩm cụ thể', value: 'product' },
]

async function loadData() {
  loading.value = true
  try {
    const [pList, cList, catList, prodList, tiers] = await Promise.all([
      getPromotions(),
      getCoupons(),
      getCategories(),
      getProducts(),
      getTierBenefits(),
    ])
    promotions.value = pList
    coupons.value = cList
    categories.value = catList
    products.value = prodList
    tierBenefits.value = tiers
  } catch (err: any) {
    toast.add({ severity: 'error', summary: t('Lỗi', 'Error'), detail: err.message, life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

// Metrics
const activePromoCount = computed(() => promotions.value.filter((p) => p.isActive).length)
const activeCouponCount = computed(() => coupons.value.filter((c) => c.isActive).length)
const totalCouponsUsed = computed(() => coupons.value.reduce((sum, c) => sum + (c.usedCount || 0), 0))

// Filtered Lists
const filteredPromotions = computed(() => {
  if (!searchPromo.value.trim()) return promotions.value
  const q = searchPromo.value.toLowerCase().trim()
  return promotions.value.filter(
    (p) => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)),
  )
})

const filteredCoupons = computed(() => {
  if (!searchCoupon.value.trim()) return coupons.value
  const q = searchCoupon.value.toLowerCase().trim()
  return coupons.value.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)),
  )
})

// Promo Actions
function openCreatePromo() {
  editingPromoId.value = null
  promoForm.name = ''
  promoForm.description = ''
  promoForm.discountType = 'percent'
  promoForm.discountValue = 10
  promoForm.minOrderAmount = 0
  promoForm.maxDiscountAmount = null
  promoForm.appliesTo = 'all'
  promoForm.startDate = new Date()
  promoForm.endDate = null
  promoForm.isActive = true
  promoForm.productIds = []
  promoForm.categoryIds = []
  showPromoDialog.value = true
}

function editPromo(p: Promotion) {
  editingPromoId.value = p.id
  promoForm.name = p.name
  promoForm.description = p.description || ''
  promoForm.discountType = p.discountType
  promoForm.discountValue = p.discountValue
  promoForm.minOrderAmount = p.minOrderAmount
  promoForm.maxDiscountAmount = p.maxDiscountAmount || null
  promoForm.appliesTo = p.appliesTo
  promoForm.startDate = p.startDate ? new Date(p.startDate) : null
  promoForm.endDate = p.endDate ? new Date(p.endDate) : null
  promoForm.isActive = p.isActive
  promoForm.productIds = p.items.filter((i) => i.productId).map((i) => i.productId as number)
  promoForm.categoryIds = p.items.filter((i) => i.categoryId).map((i) => i.categoryId as number)
  showPromoDialog.value = true
}

async function savePromo() {
  if (!promoForm.name.trim()) {
    toast.add({ severity: 'warn', summary: t('Thiếu thông tin', 'Required'), detail: 'Vui lòng nhập tên đợt khuyến mãi', life: 3000 })
    return
  }
  try {
    const payload: PromotionPayload = {
      name: promoForm.name,
      description: promoForm.description || null,
      discountType: promoForm.discountType,
      discountValue: promoForm.discountValue,
      minOrderAmount: promoForm.minOrderAmount,
      maxDiscountAmount: promoForm.maxDiscountAmount,
      appliesTo: promoForm.appliesTo,
      startDate: promoForm.startDate ? promoForm.startDate.toISOString() : null,
      endDate: promoForm.endDate ? promoForm.endDate.toISOString() : null,
      isActive: promoForm.isActive,
      productIds: promoForm.productIds,
      categoryIds: promoForm.categoryIds,
    }
    if (editingPromoId.value) {
      await updatePromotion(editingPromoId.value, payload)
      toast.add({ severity: 'success', summary: t('Thành công', 'Success'), detail: 'Đã cập nhật đợt khuyến mãi', life: 3000 })
    } else {
      await createPromotion(payload)
      toast.add({ severity: 'success', summary: t('Thành công', 'Success'), detail: 'Đã tạo đợt khuyến mãi mới', life: 3000 })
    }
    showPromoDialog.value = false
    await loadData()
  } catch (err: any) {
    toast.add({ severity: 'error', summary: t('Lỗi', 'Error'), detail: err.message, life: 4000 })
  }
}

async function removePromo(p: Promotion) {
  if (!confirm(`Bạn có chắc chắn muốn xóa đợt khuyến mãi "${p.name}"?`)) return
  try {
    await deletePromotion(p.id)
    toast.add({ severity: 'success', summary: t('Thành công', 'Success'), detail: 'Đã xóa đợt khuyến mãi', life: 3000 })
    await loadData()
  } catch (err: any) {
    toast.add({ severity: 'error', summary: t('Lỗi', 'Error'), detail: err.message, life: 4000 })
  }
}

// Coupon Actions
function openCreateCoupon(promotionId?: number) {
  editingCouponId.value = null
  couponForm.promotionId = promotionId || null
  couponForm.code = generateRandomCode()
  couponForm.name = ''
  couponForm.description = ''
  couponForm.discountType = 'percent'
  couponForm.discountValue = 10
  couponForm.minOrderAmount = 0
  couponForm.maxDiscountAmount = null
  couponForm.maxUses = 100
  couponForm.maxUsesPerCustomer = 1
  couponForm.appliesTo = 'all'
  couponForm.startDate = new Date()
  couponForm.endDate = null
  couponForm.isActive = true
  couponForm.productIds = []
  couponForm.categoryIds = []
  showCouponDialog.value = true
}

function editCoupon(c: Coupon) {
  editingCouponId.value = c.id
  couponForm.promotionId = c.promotionId || null
  couponForm.code = c.code
  couponForm.name = c.name
  couponForm.description = c.description || ''
  couponForm.discountType = c.discountType
  couponForm.discountValue = c.discountValue
  couponForm.minOrderAmount = c.minOrderAmount
  couponForm.maxDiscountAmount = c.maxDiscountAmount || null
  couponForm.maxUses = c.maxUses || null
  couponForm.maxUsesPerCustomer = c.maxUsesPerCustomer || 1
  couponForm.appliesTo = c.appliesTo
  couponForm.startDate = c.startDate ? new Date(c.startDate) : null
  couponForm.endDate = c.endDate ? new Date(c.endDate) : null
  couponForm.isActive = c.isActive
  couponForm.productIds = c.items.filter((i) => i.productId).map((i) => i.productId as number)
  couponForm.categoryIds = c.items.filter((i) => i.categoryId).map((i) => i.categoryId as number)
  showCouponDialog.value = true
}

async function saveCoupon() {
  if (!couponForm.code.trim() || !couponForm.name.trim()) {
    toast.add({ severity: 'warn', summary: t('Thiếu thông tin', 'Required'), detail: 'Vui lòng nhập mã và tên mã giảm giá', life: 3000 })
    return
  }
  try {
    const payload: CouponPayload = {
      promotionId: couponForm.promotionId,
      code: couponForm.code.trim().toUpperCase(),
      name: couponForm.name,
      description: couponForm.description || null,
      discountType: couponForm.discountType,
      discountValue: couponForm.discountValue,
      minOrderAmount: couponForm.minOrderAmount,
      maxDiscountAmount: couponForm.maxDiscountAmount,
      maxUses: couponForm.maxUses,
      maxUsesPerCustomer: couponForm.maxUsesPerCustomer,
      appliesTo: couponForm.appliesTo,
      startDate: couponForm.startDate ? couponForm.startDate.toISOString() : null,
      endDate: couponForm.endDate ? couponForm.endDate.toISOString() : null,
      isActive: couponForm.isActive,
      productIds: couponForm.productIds,
      categoryIds: couponForm.categoryIds,
    }
    if (editingCouponId.value) {
      await updateCoupon(editingCouponId.value, payload)
      toast.add({ severity: 'success', summary: t('Thành công', 'Success'), detail: 'Đã cập nhật mã giảm giá', life: 3000 })
    } else {
      await createCoupon(payload)
      toast.add({ severity: 'success', summary: t('Thành công', 'Success'), detail: 'Đã tạo mã giảm giá mới', life: 3000 })
    }
    showCouponDialog.value = false
    await loadData()
  } catch (err: any) {
    toast.add({ severity: 'error', summary: t('Lỗi', 'Error'), detail: err.message, life: 4000 })
  }
}

async function removeCoupon(c: Coupon) {
  if (!confirm(`Bạn có chắc chắn muốn xóa mã "${c.code}"?`)) return
  try {
    await deleteCoupon(c.id)
    toast.add({ severity: 'success', summary: t('Thành công', 'Success'), detail: 'Đã xóa mã giảm giá', life: 3000 })
    await loadData()
  } catch (err: any) {
    toast.add({ severity: 'error', summary: t('Lỗi', 'Error'), detail: err.message, life: 4000 })
  }
}

function generateRandomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'SALE'
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code)
  toast.add({ severity: 'info', summary: 'Đã sao chép', detail: `Đã chép mã: ${code}`, life: 2000 })
}

function getAppliesToLabel(type: string, items?: any[]) {
  if (type === 'all') return 'Toàn cửa hàng'
  if (type === 'category') {
    const names = items?.filter((i) => i.categoryName).map((i) => i.categoryName).join(', ')
    return `Danh mục: ${names || 'Chỉ định'}`
  }
  if (type === 'product') {
    const count = items?.length || 0
    return `${count} sản phẩm chỉ định`
  }
  return type
}

function getStatusSeverity(isActive: boolean, endDate?: string | null) {
  if (!isActive) return 'danger'
  if (endDate && new Date(endDate) < new Date()) return 'warning'
  return 'success'
}

function getStatusText(isActive: boolean, endDate?: string | null) {
  if (!isActive) return 'Đang tắt'
  if (endDate && new Date(endDate) < new Date()) return 'Hết hạn'
  return 'Đang hoạt động'
}
</script>

<template>
  <div class="promotions-management-view">
    <!-- Header banner -->
    <div class="header-card">
      <div class="header-info">
        <div class="title-row">
          <div class="icon-bubble">
            <i class="pi pi-percentage"></i>
          </div>
          <div>
            <h1 class="page-title">{{ t('Quản lý Ưu đãi & Khuyến mãi', 'Promotions & Loyalty Management') }}</h1>
            <p class="page-subtitle">
              {{ t('Quản lý các đợt sale, mã giảm giá theo sản phẩm/danh mục và chiết khấu thành viên VIP', 'Manage sale campaigns, coupon vouchers by products/categories and VIP tier loyalty discounts') }}
            </p>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <Button
          icon="pi pi-refresh"
          label="Làm mới"
          class="p-button-outlined p-button-secondary"
          :loading="loading"
          @click="loadData"
        />
        <Button
          v-if="activeTab === 0"
          icon="pi pi-plus"
          label="Tạo đợt khuyến mãi"
          class="btn-gradient-primary"
          @click="openCreatePromo"
        />
        <Button
          v-if="activeTab === 1"
          icon="pi pi-ticket"
          label="Tạo mã Coupon"
          class="btn-gradient-primary"
          @click="openCreateCoupon()"
        />
      </div>
    </div>

    <!-- Stat cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon promo-icon">
          <i class="pi pi-megaphone"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ activePromoCount }}</div>
          <div class="stat-label">Đợt khuyến mãi đang chạy</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon coupon-icon">
          <i class="pi pi-ticket"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ activeCouponCount }}</div>
          <div class="stat-label">Mã Coupon đang hiệu lực</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon usage-icon">
          <i class="pi pi-check-circle"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalCouponsUsed }}</div>
          <div class="stat-label">Lượt mã giảm giá đã dùng</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon vip-icon">
          <i class="pi pi-crown"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">4 Hạng VIP</div>
          <div class="stat-label">Chiết khấu tự động 0% - 10%</div>
        </div>
      </div>
    </div>

    <!-- Tabs Container -->
    <div class="content-tabs-card">
      <div class="custom-tab-nav">
        <button
          type="button"
          :class="['tab-btn', { active: activeTab === 0 }]"
          @click="activeTab = 0"
        >
          <i class="pi pi-calendar-plus mr-2"></i>
          <span>{{ t('Đợt Khuyến Mãi (Campaigns)', 'Promotion Campaigns') }}</span>
          <Badge :value="promotions.length" severity="info" class="ml-2" />
        </button>

        <button
          type="button"
          :class="['tab-btn', { active: activeTab === 1 }]"
          @click="activeTab = 1"
        >
          <i class="pi pi-ticket mr-2"></i>
          <span>{{ t('Mã Coupon Giảm Giá', 'Sale Coupons') }}</span>
          <Badge :value="coupons.length" severity="success" class="ml-2" />
        </button>

        <button
          type="button"
          :class="['tab-btn', { active: activeTab === 2 }]"
          @click="activeTab = 2"
        >
          <i class="pi pi-crown mr-2"></i>
          <span>{{ t('Ưu Đãi Hạng Thành Viên', 'Loyalty Tier Benefits') }}</span>
          <Tag value="Tự động" severity="warning" class="ml-2" />
        </button>
      </div>

      <div class="tab-content-area">
        <!-- TAB 1: ĐỢT KHUYẾN MÃI -->
        <div v-if="activeTab === 0">
          <div class="table-toolbar">
            <div class="search-box">
              <i class="pi pi-search"></i>
              <InputText
                v-model="searchPromo"
                placeholder="Tìm theo tên hoặc mô tả đợt khuyến mãi..."
                class="search-input"
              />
            </div>
            <Button
              icon="pi pi-plus"
              label="Tạo đợt mới"
              class="p-button-sm p-button-primary"
              @click="openCreatePromo"
            />
          </div>

          <DataTable
            :value="filteredPromotions"
            :loading="loading"
            responsiveLayout="scroll"
            class="custom-datatable"
            stripedRows
            paginator
            :rows="10"
          >
            <template #empty>
              <div class="p-4 text-center text-muted">Chưa có đợt khuyến mãi nào. Hãy tạo đợt khuyến mãi đầu tiên!</div>
            </template>

            <Column field="name" header="Tên đợt khuyến mãi" style="min-width: 220px">
              <template #body="{ data }">
                <div class="font-bold text-primary">{{ data.name }}</div>
                <div class="text-xs text-muted">{{ data.description || 'Không có mô tả' }}</div>
              </template>
            </Column>

            <Column header="Mức giảm" style="min-width: 140px">
              <template #body="{ data }">
                <Tag
                  :value="data.discountType === 'percent' ? `Giảm ${data.discountValue}%` : `Giảm ${formatCurrency(data.discountValue)}`"
                  severity="warning"
                  class="font-bold"
                />
                <div v-if="data.maxDiscountAmount" class="text-xs text-muted mt-1">
                  Tối đa: {{ formatCurrency(data.maxDiscountAmount) }}
                </div>
              </template>
            </Column>

            <Column header="Áp dụng cho" style="min-width: 180px">
              <template #body="{ data }">
                <span class="applies-badge">{{ getAppliesToLabel(data.appliesTo, data.items) }}</span>
                <div v-if="data.minOrderAmount > 0" class="text-xs text-muted mt-1">
                  Đơn từ: {{ formatCurrency(data.minOrderAmount) }}
                </div>
              </template>
            </Column>

            <Column header="Thời gian" style="min-width: 180px">
              <template #body="{ data }">
                <div class="text-xs">
                  <div><strong>Từ:</strong> {{ data.startDate ? new Date(data.startDate).toLocaleDateString('vi-VN') : '—' }}</div>
                  <div><strong>Đến:</strong> {{ data.endDate ? new Date(data.endDate).toLocaleDateString('vi-VN') : 'Vô thời hạn' }}</div>
                </div>
              </template>
            </Column>

            <Column header="Mã Coupon" style="min-width: 110px">
              <template #body="{ data }">
                <Tag :value="`${data.couponCount || 0} mã`" severity="info" />
              </template>
            </Column>

            <Column header="Trạng thái" style="min-width: 130px">
              <template #body="{ data }">
                <Tag :value="getStatusText(data.isActive, data.endDate)" :severity="getStatusSeverity(data.isActive, data.endDate)" />
              </template>
            </Column>

            <Column header="Thao tác" style="min-width: 160px; text-align: center">
              <template #body="{ data }">
                <div class="action-buttons">
                  <Button
                    icon="pi pi-ticket"
                    class="p-button-text p-button-sm p-button-info"
                    title="Tạo mã coupon cho đợt này"
                    @click="openCreateCoupon(data.id)"
                  />
                  <Button
                    icon="pi pi-pencil"
                    class="p-button-text p-button-sm p-button-warning"
                    title="Chỉnh sửa"
                    @click="editPromo(data)"
                  />
                  <Button
                    icon="pi pi-trash"
                    class="p-button-text p-button-sm p-button-danger"
                    title="Xóa"
                    @click="removePromo(data)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- TAB 2: MÃ GIẢM GIÁ (COUPONS) -->
        <div v-else-if="activeTab === 1">
          <div class="table-toolbar">
            <div class="search-box">
              <i class="pi pi-search"></i>
              <InputText
                v-model="searchCoupon"
                placeholder="Tìm theo mã hoặc tên voucher..."
                class="search-input"
              />
            </div>
            <Button
              icon="pi pi-plus"
              label="Tạo mã Coupon"
              class="p-button-sm p-button-primary"
              @click="openCreateCoupon()"
            />
          </div>

          <DataTable
            :value="filteredCoupons"
            :loading="loading"
            responsiveLayout="scroll"
            class="custom-datatable"
            stripedRows
            paginator
            :rows="10"
          >
            <template #empty>
              <div class="p-4 text-center text-muted">Chưa có mã giảm giá nào. Hãy tạo mã coupon đầu tiên!</div>
            </template>

            <Column field="code" header="Mã Coupon" style="min-width: 160px">
              <template #body="{ data }">
                <div class="coupon-code-pill" @click="copyCode(data.code)" title="Bấm để sao chép">
                  <span class="code-text">{{ data.code }}</span>
                  <i class="pi pi-copy ml-1"></i>
                </div>
                <div class="text-xs font-semibold text-primary mt-1">{{ data.name }}</div>
                <div v-if="data.promotionName" class="text-xs text-muted">Thuộc: {{ data.promotionName }}</div>
              </template>
            </Column>

            <Column header="Mức giảm" style="min-width: 140px">
              <template #body="{ data }">
                <Tag
                  :value="data.discountType === 'percent' ? `Giảm ${data.discountValue}%` : `Giảm ${formatCurrency(data.discountValue)}`"
                  severity="warning"
                  class="font-bold"
                />
                <div v-if="data.maxDiscountAmount" class="text-xs text-muted mt-1">
                  Tối đa: {{ formatCurrency(data.maxDiscountAmount) }}
                </div>
              </template>
            </Column>

            <Column header="Điều kiện" style="min-width: 180px">
              <template #body="{ data }">
                <div class="text-xs">
                  <div><strong>Đơn tối thiểu:</strong> {{ formatCurrency(data.minOrderAmount) }}</div>
                  <div><strong>Phạm vi:</strong> {{ getAppliesToLabel(data.appliesTo, data.items) }}</div>
                  <div><strong>Lượt/khách:</strong> {{ data.maxUsesPerCustomer || 1 }} lần</div>
                </div>
              </template>
            </Column>

            <Column header="Lượt sử dụng" style="min-width: 130px">
              <template #body="{ data }">
                <div class="usage-progress-bar">
                  <div class="usage-numbers">
                    <span class="font-bold">{{ data.usedCount || 0 }}</span>
                    <span>/ {{ data.maxUses ? data.maxUses : '∞' }}</span>
                  </div>
                  <div v-if="data.maxUses" class="progress-track">
                    <div
                      class="progress-fill"
                      :style="{ width: `${Math.min(100, Math.round(((data.usedCount || 0) / data.maxUses) * 100))}%` }"
                    ></div>
                  </div>
                </div>
              </template>
            </Column>

            <Column header="Hiệu lực" style="min-width: 160px">
              <template #body="{ data }">
                <div class="text-xs">
                  <div><strong>Từ:</strong> {{ data.startDate ? new Date(data.startDate).toLocaleDateString('vi-VN') : '—' }}</div>
                  <div><strong>Đến:</strong> {{ data.endDate ? new Date(data.endDate).toLocaleDateString('vi-VN') : 'Vô thời hạn' }}</div>
                </div>
              </template>
            </Column>

            <Column header="Trạng thái" style="min-width: 130px">
              <template #body="{ data }">
                <Tag :value="getStatusText(data.isActive, data.endDate)" :severity="getStatusSeverity(data.isActive, data.endDate)" />
              </template>
            </Column>

            <Column header="Thao tác" style="min-width: 140px; text-align: center">
              <template #body="{ data }">
                <div class="action-buttons">
                  <Button
                    icon="pi pi-pencil"
                    class="p-button-text p-button-sm p-button-warning"
                    title="Chỉnh sửa"
                    @click="editCoupon(data)"
                  />
                  <Button
                    icon="pi pi-trash"
                    class="p-button-text p-button-sm p-button-danger"
                    title="Xóa"
                    @click="removeCoupon(data)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- TAB 3: ĐẶC QUYỀN THÀNH VIÊN VIP (LOYALTY TIERS) -->
        <div v-else-if="activeTab === 2">
          <div class="tier-intro-box">
            <div class="tier-intro-title">
              <i class="pi pi-info-circle mr-2"></i>
              Chính sách chiết khấu tự động theo hạng thành viên SmartSale
            </div>
            <p class="tier-intro-desc">
              Khi khách hàng tạo đơn hàng (online hoặc qua nhân viên quầy thu ngân), hệ thống tự động kiểm tra tổng chi tiêu tích lũy để xác định hạng thành viên và <strong>tự động áp dụng % chiết khấu tương ứng</strong> vào hóa đơn. Khách hàng có thể áp dụng đồng thời mã giảm giá (Coupon Code) hợp lệ!
            </p>
          </div>

          <div class="tiers-cards-grid">
            <!-- Platinum -->
            <div class="tier-card tier-card-platinum">
              <div class="tier-card-header">
                <span class="tier-emoji">💎</span>
                <div>
                  <h3 class="tier-title">Hạng Kim Cương (Platinum)</h3>
                  <div class="tier-condition">Chi tiêu từ 20.000.000 ₫</div>
                </div>
              </div>
              <div class="tier-discount-banner">
                <span class="discount-big">Giảm 10%</span>
                <span class="discount-sub">Tự động cho mọi đơn hàng</span>
              </div>
              <ul class="tier-perks">
                <li><i class="pi pi-check"></i> Chiết khấu trực tiếp 10% mọi sản phẩm</li>
                <li><i class="pi pi-check"></i> Được áp dụng kèm mã Coupon khuyến mãi</li>
                <li><i class="pi pi-check"></i> Ưu tiên xử lý đơn hàng & giao hàng VIP</li>
                <li><i class="pi pi-check"></i> Hỗ trợ kỹ thuật & đổi trả 1-1 chuyên biệt</li>
              </ul>
            </div>

            <!-- Gold -->
            <div class="tier-card tier-card-gold">
              <div class="tier-card-header">
                <span class="tier-emoji">👑</span>
                <div>
                  <h3 class="tier-title">Hạng Vàng (Gold)</h3>
                  <div class="tier-condition">Chi tiêu từ 8.000.000 ₫</div>
                </div>
              </div>
              <div class="tier-discount-banner">
                <span class="discount-big">Giảm 5%</span>
                <span class="discount-sub">Tự động cho mọi đơn hàng</span>
              </div>
              <ul class="tier-perks">
                <li><i class="pi pi-check"></i> Chiết khấu trực tiếp 5% mọi đơn hàng</li>
                <li><i class="pi pi-check"></i> Được áp dụng kèm mã Coupon khuyến mãi</li>
                <li><i class="pi pi-check"></i> Nhận sớm thông tin các đợt Flash Sale</li>
                <li><i class="pi pi-check"></i> Quà tặng sinh nhật thành viên VIP</li>
              </ul>
            </div>

            <!-- Silver -->
            <div class="tier-card tier-card-silver">
              <div class="tier-card-header">
                <span class="tier-emoji">🥈</span>
                <div>
                  <h3 class="tier-title">Hạng Bạc (Silver)</h3>
                  <div class="tier-condition">Chi tiêu từ 2.000.000 ₫</div>
                </div>
              </div>
              <div class="tier-discount-banner">
                <span class="discount-big">Giảm 2%</span>
                <span class="discount-sub">Tự động cho mọi đơn hàng</span>
              </div>
              <ul class="tier-perks">
                <li><i class="pi pi-check"></i> Chiết khấu trực tiếp 2% hóa đơn</li>
                <li><i class="pi pi-check"></i> Được cộng dồn mã giảm giá bổ sung</li>
                <li><i class="pi pi-check"></i> Tích lũy nâng hạng Gold nhanh chóng</li>
              </ul>
            </div>

            <!-- Standard -->
            <div class="tier-card tier-card-standard">
              <div class="tier-card-header">
                <span class="tier-emoji">👤</span>
                <div>
                  <h3 class="tier-title">Hạng Tiêu Chuẩn (Standard)</h3>
                  <div class="tier-condition">Dưới 2.000.000 ₫</div>
                </div>
              </div>
              <div class="tier-discount-banner">
                <span class="discount-big">Giảm 0%</span>
                <span class="discount-sub">Hạng thành viên khởi đầu</span>
              </div>
              <ul class="tier-perks">
                <li><i class="pi pi-check"></i> Sử dụng toàn bộ mã Voucher & Flash Sale</li>
                <li><i class="pi pi-check"></i> Tích điểm chi tiêu để nâng hạng Bạc</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PROMOTION MODAL DIALOG -->
    <Dialog
      v-model:visible="showPromoDialog"
      :header="editingPromoId ? 'Chỉnh sửa đợt khuyến mãi' : 'Tạo đợt khuyến mãi mới'"
      :modal="true"
      :style="{ width: '650px' }"
      class="custom-dialog"
    >
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="form-label required">Tên đợt khuyến mãi</label>
          <InputText v-model="promoForm.name" placeholder="VD: Đại Tiệc Mùa Hè 2026, Siêu Sale Robot..." class="w-full" />
        </div>

        <div class="form-group full-width">
          <label class="form-label">Mô tả chi tiết</label>
          <Textarea v-model="promoForm.description" rows="2" placeholder="Thông tin về chương trình..." class="w-full" />
        </div>

        <div class="form-group">
          <label class="form-label required">Loại giảm giá</label>
          <Dropdown
            v-model="promoForm.discountType"
            :options="discountTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label class="form-label required">
            {{ promoForm.discountType === 'percent' ? 'Giá trị giảm (%)' : 'Số tiền giảm (₫)' }}
          </label>
          <InputNumber
            v-model="promoForm.discountValue"
            :min="1"
            :max="promoForm.discountType === 'percent' ? 100 : 100000000"
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Đơn hàng tối thiểu (₫)</label>
          <InputNumber v-model="promoForm.minOrderAmount" :min="0" class="w-full" />
        </div>

        <div class="form-group" v-if="promoForm.discountType === 'percent'">
          <label class="form-label">Giảm tối đa (₫) (để trống nếu không giới hạn)</label>
          <InputNumber v-model="promoForm.maxDiscountAmount" :min="0" class="w-full" />
        </div>

        <div class="form-group full-width">
          <label class="form-label required">Phạm vi áp dụng</label>
          <Dropdown
            v-model="promoForm.appliesTo"
            :options="appliesToOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <!-- Chọn danh mục nếu appliesTo === 'category' -->
        <div class="form-group full-width" v-if="promoForm.appliesTo === 'category'">
          <label class="form-label required">Chọn các danh mục áp dụng</label>
          <MultiSelect
            v-model="promoForm.categoryIds"
            :options="categories"
            optionLabel="name"
            optionValue="id"
            placeholder="Chọn danh mục áp dụng..."
            class="w-full"
            display="chip"
          />
        </div>

        <!-- Chọn sản phẩm nếu appliesTo === 'product' -->
        <div class="form-group full-width" v-if="promoForm.appliesTo === 'product'">
          <label class="form-label required">Chọn các sản phẩm áp dụng</label>
          <MultiSelect
            v-model="promoForm.productIds"
            :options="products"
            optionLabel="name"
            optionValue="id"
            placeholder="Chọn sản phẩm áp dụng..."
            class="w-full"
            display="chip"
            filter
          />
        </div>

        <div class="form-group">
          <label class="form-label">Ngày bắt đầu</label>
          <Calendar v-model="promoForm.startDate" showTime hourFormat="24" dateFormat="dd/mm/yy" class="w-full" />
        </div>

        <div class="form-group">
          <label class="form-label">Ngày kết thúc (để trống nếu vô hạn)</label>
          <Calendar v-model="promoForm.endDate" showTime hourFormat="24" dateFormat="dd/mm/yy" class="w-full" />
        </div>

        <div class="form-group full-width flex items-center justify-between mt-2">
          <label class="form-label cursor-pointer" for="promoActiveSwitch">Kích hoạt đợt khuyến mãi này</label>
          <InputSwitch id="promoActiveSwitch" v-model="promoForm.isActive" />
        </div>
      </div>

      <template #footer>
        <Button label="Hủy" icon="pi pi-times" class="p-button-text" @click="showPromoDialog = false" />
        <Button label="Lưu đợt khuyến mãi" icon="pi pi-check" class="p-button-primary" @click="savePromo" />
      </template>
    </Dialog>

    <!-- COUPON MODAL DIALOG -->
    <Dialog
      v-model:visible="showCouponDialog"
      :header="editingCouponId ? 'Chỉnh sửa mã Coupon' : 'Tạo mã Coupon mới'"
      :modal="true"
      :style="{ width: '650px' }"
      class="custom-dialog"
    >
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label required">Mã giảm giá (Coupon Code)</label>
          <div class="p-inputgroup">
            <InputText v-model="couponForm.code" placeholder="VD: SUMMER10, SALE200K..." class="uppercase" />
            <Button icon="pi pi-refresh" title="Tự sinh mã" @click="couponForm.code = generateRandomCode()" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">Tên hiển thị mã</label>
          <InputText v-model="couponForm.name" placeholder="VD: Giảm 10% đơn hàng hè..." class="w-full" />
        </div>

        <div class="form-group full-width">
          <label class="form-label">Thuộc đợt khuyến mãi (tùy chọn)</label>
          <Dropdown
            v-model="couponForm.promotionId"
            :options="promotions"
            optionLabel="name"
            optionValue="id"
            placeholder="Không thuộc đợt nào (Mã độc lập)"
            showClear
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label class="form-label required">Loại giảm giá</label>
          <Dropdown
            v-model="couponForm.discountType"
            :options="discountTypeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label class="form-label required">
            {{ couponForm.discountType === 'percent' ? 'Giá trị giảm (%)' : 'Số tiền giảm (₫)' }}
          </label>
          <InputNumber
            v-model="couponForm.discountValue"
            :min="1"
            :max="couponForm.discountType === 'percent' ? 100 : 100000000"
            class="w-full"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Đơn hàng tối thiểu (₫)</label>
          <InputNumber v-model="couponForm.minOrderAmount" :min="0" class="w-full" />
        </div>

        <div class="form-group" v-if="couponForm.discountType === 'percent'">
          <label class="form-label">Giảm tối đa (₫)</label>
          <InputNumber v-model="couponForm.maxDiscountAmount" :min="0" class="w-full" />
        </div>

        <div class="form-group">
          <label class="form-label">Tổng lượt dùng tối đa (để trống = ∞)</label>
          <InputNumber v-model="couponForm.maxUses" :min="1" class="w-full" />
        </div>

        <div class="form-group">
          <label class="form-label">Số lần dùng tối đa / 1 khách hàng</label>
          <InputNumber v-model="couponForm.maxUsesPerCustomer" :min="1" class="w-full" />
        </div>

        <div class="form-group full-width">
          <label class="form-label required">Phạm vi áp dụng</label>
          <Dropdown
            v-model="couponForm.appliesTo"
            :options="appliesToOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <!-- Danh mục nếu appliesTo === 'category' -->
        <div class="form-group full-width" v-if="couponForm.appliesTo === 'category'">
          <label class="form-label required">Chọn các danh mục áp dụng</label>
          <MultiSelect
            v-model="couponForm.categoryIds"
            :options="categories"
            optionLabel="name"
            optionValue="id"
            placeholder="Chọn danh mục áp dụng..."
            class="w-full"
            display="chip"
          />
        </div>

        <!-- Sản phẩm nếu appliesTo === 'product' -->
        <div class="form-group full-width" v-if="couponForm.appliesTo === 'product'">
          <label class="form-label required">Chọn các sản phẩm áp dụng</label>
          <MultiSelect
            v-model="couponForm.productIds"
            :options="products"
            optionLabel="name"
            optionValue="id"
            placeholder="Chọn sản phẩm áp dụng..."
            class="w-full"
            display="chip"
            filter
          />
        </div>

        <div class="form-group">
          <label class="form-label">Ngày bắt đầu</label>
          <Calendar v-model="couponForm.startDate" showTime hourFormat="24" dateFormat="dd/mm/yy" class="w-full" />
        </div>

        <div class="form-group">
          <label class="form-label">Ngày kết thúc</label>
          <Calendar v-model="couponForm.endDate" showTime hourFormat="24" dateFormat="dd/mm/yy" class="w-full" />
        </div>

        <div class="form-group full-width flex items-center justify-between mt-2">
          <label class="form-label cursor-pointer" for="couponActiveSwitch">Kích hoạt mã Coupon này</label>
          <InputSwitch id="couponActiveSwitch" v-model="couponForm.isActive" />
        </div>
      </div>

      <template #footer>
        <Button label="Hủy" icon="pi pi-times" class="p-button-text" @click="showCouponDialog = false" />
        <Button label="Lưu mã Coupon" icon="pi pi-check" class="p-button-primary" @click="saveCoupon" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.promotions-management-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  color: var(--text-color, #f8fafc);
}

.header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-bubble {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #fff;
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.35);
}

.page-title {
  font-size: 1.45rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0.25rem 0 0 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-gradient-primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%) !important;
  border: none !important;
  color: white !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35) !important;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.875rem;
  padding: 1.25rem;
  backdrop-filter: blur(8px);
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: white;
}

.promo-icon {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}
.coupon-icon {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}
.usage-icon {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}
.vip-icon {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
}

.stat-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: #f8fafc;
}

.stat-label {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Tabs and Tables */
.content-tabs-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.25rem;
  backdrop-filter: blur(10px);
}

.custom-tab-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.75rem;
  overflow-x: auto;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.65rem 1.15rem;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #f8fafc;
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%);
  border-color: rgba(139, 92, 246, 0.5);
  color: #c084fc;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
}

.tab-header-item {
  display: flex;
  align-items: center;
  font-weight: 600;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-box i {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
}

.search-input {
  padding-left: 2.5rem !important;
  width: 100%;
  background: rgba(15, 23, 42, 0.6) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: white !important;
  border-radius: 8px;
}

.coupon-code-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  background: rgba(139, 92, 246, 0.15);
  border: 1px dashed rgba(139, 92, 246, 0.6);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.coupon-code-pill:hover {
  background: rgba(139, 92, 246, 0.3);
  transform: scale(1.03);
}

.code-text {
  font-family: monospace;
  font-weight: 800;
  color: #c084fc;
  font-size: 0.95rem;
  letter-spacing: 0.05em;
}

.applies-badge {
  display: inline-block;
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
}

.usage-progress-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.usage-numbers {
  font-size: 0.8rem;
  color: #cbd5e1;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  border-radius: 3px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
}

/* Tier Intro and Cards */
.tier-intro-box {
  background: rgba(15, 23, 42, 0.7);
  border-left: 4px solid #8b5cf6;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

.tier-intro-title {
  font-weight: 700;
  color: #c084fc;
  margin-bottom: 0.35rem;
  font-size: 0.95rem;
}

.tier-intro-desc {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.tiers-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}

.tier-card {
  background: rgba(15, 23, 42, 0.75);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}

.tier-card:hover {
  transform: translateY(-4px);
}

.tier-card-platinum {
  border: 1px solid rgba(192, 132, 252, 0.4);
  box-shadow: 0 10px 25px -5px rgba(168, 85, 247, 0.2);
}
.tier-card-gold {
  border: 1px solid rgba(245, 158, 11, 0.4);
  box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.2);
}
.tier-card-silver {
  border: 1px solid rgba(56, 189, 248, 0.4);
  box-shadow: 0 10px 25px -5px rgba(56, 189, 248, 0.2);
}
.tier-card-standard {
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.tier-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tier-emoji {
  font-size: 2rem;
}

.tier-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
}

.tier-condition {
  font-size: 0.75rem;
  color: #94a3b8;
}

.tier-discount-banner {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.85rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.tier-card-platinum .discount-big {
  color: #c084fc;
}
.tier-card-gold .discount-big {
  color: #fbbf24;
}
.tier-card-silver .discount-big {
  color: #38bdf8;
}
.tier-card-standard .discount-big {
  color: #94a3b8;
}

.discount-big {
  font-size: 1.5rem;
  font-weight: 800;
}

.discount-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

.tier-perks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.825rem;
  color: #cbd5e1;
}

.tier-perks li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tier-perks li i {
  color: #10b981;
  font-size: 0.8rem;
}

/* Modal Form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group.full-width {
  grid-column: span 2;
}

.form-label {
  font-size: 0.825rem;
  font-weight: 600;
  color: #cbd5e1;
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}
</style>
