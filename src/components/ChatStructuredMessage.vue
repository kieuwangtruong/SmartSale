<script setup lang="ts">
import { computed } from 'vue'
import { useLanguage } from '../services/i18n'
import { renderChatMarkdown } from '../utils/chatMarkdown'

const props = defineProps<{
  content: string
  role: 'user' | 'assistant' | string
  isStorefront?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-product', productId: number): void
  (e: 'add-to-cart', productId: number): void
  (e: 'custom-action', actionType: string, payload?: unknown): void
}>()

const { t } = useLanguage()

// 1. Format Currency Helper
function formatPrice(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val.replace(/[^\d]/g, '')) : val
  if (isNaN(num)) return String(val)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
}

// 2. Structured Section Detection
interface ProductItem {
  id: number
  name: string
  salePrice: number
  originalPrice: number
  stock: number
  badge?: string
}

interface KpiItem {
  label: string
  value: string
  change?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
}

interface CustomerRankItem {
  rank: number
  name: string
  tier: string
  spent: string
  orders?: string
}

interface InventoryAlertItem {
  name: string
  id?: number
  currentStock: number
  minStock?: number
  status: 'out_of_stock' | 'low_stock' | 'normal'
}

interface SupplierItem {
  name: string
  phone?: string
  email?: string
  address?: string
}

const parsedData = computed(() => {
  const text = props.content || ''

  // A. Check for Products List pattern: * Name #ID (giá bán X, giá gốc Y, còn Z sản phẩm)
  // or variations like * [Tên] - #ID - Giá: ...
  const products: ProductItem[] = []
  const productRegex1 = /\*\s*([^#*]+?)\s*#(\d+)\s*\(giá bán\s*([\d.]+),\s*giá gốc\s*([\d.]+),\s*còn\s*(\d+)\s*sản phẩm\)/gi
  let m: RegExpExecArray | null

  while ((m = productRegex1.exec(text)) !== null) {
    const [, rawName, rawId, rawSale, rawOrig, rawStock] = m
    if (rawName && rawId && rawSale) {
      const sale = Number(rawSale.replace(/\./g, ''))
      const orig = Number(rawOrig ? rawOrig.replace(/\./g, '') : sale)
      products.push({
        id: Number(rawId),
        name: rawName.trim(),
        salePrice: sale,
        originalPrice: orig,
        stock: Number(rawStock || 0),
        badge: orig > sale ? `-${Math.round(((orig - sale) / orig) * 100)}%` : undefined,
      })
    }
  }

  // B. Check for KPI metrics summary (e.g. Doanh thu: ..., Đơn hàng: ..., etc.)
  const kpis: KpiItem[] = []
  const kpiRevenueMatch = text.match(/(?:Doanh thu|Tổng doanh thu|Revenue)[:：]\s*([^\n,]+)/i)
  if (kpiRevenueMatch) {
    kpis.push({
      label: t('Tổng doanh thu', 'Total Revenue'),
      value: kpiRevenueMatch[1]?.trim() || '',
      icon: '💰',
      trend: 'up',
    })
  }

  const kpiOrdersMatch = text.match(/(?:Tổng đơn hàng|Số đơn|Đơn hàng hôm nay|Total Orders)[:：]\s*([^\n,]+)/i)
  if (kpiOrdersMatch) {
    kpis.push({
      label: t('Đơn hàng', 'Orders'),
      value: kpiOrdersMatch[1]?.trim() || '',
      icon: '📦',
      trend: 'neutral',
    })
  }

  const kpiPendingMatch = text.match(/(?:Đơn chờ xử lý|Chờ duyệt|Pending Orders)[:：]\s*([^\n,]+)/i)
  if (kpiPendingMatch) {
    kpis.push({
      label: t('Chờ xử lý', 'Pending'),
      value: kpiPendingMatch[1]?.trim() || '',
      icon: '⏳',
      trend: 'down',
    })
  }

  const kpiLowStockMatch = text.match(/(?:Sắp hết hàng|Tồn kho báo động|Low Stock)[:：]\s*([^\n,]+)/i)
  if (kpiLowStockMatch && !products.length) {
    kpis.push({
      label: t('Cảnh báo kho', 'Stock Alert'),
      value: kpiLowStockMatch[1]?.trim() || '',
      icon: '⚠️',
      trend: 'down',
    })
  }

  // C. Check for VIP Customers list: (e.g. 1. Nguyễn Văn A - VIP / Diamond - 50.000.000đ)
  const customers: CustomerRankItem[] = []
  const customerRankRegex = /(\d+)\.\s*([^-\n]+)\s*-\s*([^-,\n]+)\s*(?:-\s*([^\n]+))?/gi
  if (/top\s*\d*\s*khách hàng|khách hàng vip|top spending/i.test(text)) {
    let cm: RegExpExecArray | null
    while ((cm = customerRankRegex.exec(text)) !== null) {
      const [, rank, name, tierOrSpent, extra] = cm
      if (name && tierOrSpent) {
        customers.push({
          rank: Number(rank),
          name: name.trim(),
          tier: extra ? tierOrSpent.trim() : 'VIP',
          spent: extra ? extra.trim() : tierOrSpent.trim(),
        })
      }
    }
  }

  // D. Check for Inventory Alerts list:
  const inventoryAlerts: InventoryAlertItem[] = []
  const invRegex = /(?:[•\-\*]|\d+\.)\s*([^:(#\n]+)(?:#(\d+))?\s*[:：]\s*(?:còn\s*)?(\d+)\s*(?:sản phẩm|cái|chiếc)?/gi
  if (/tồn kho báo động|sắp hết hàng|hết hàng|low stock/i.test(text) && !products.length) {
    let im: RegExpExecArray | null
    while ((im = invRegex.exec(text)) !== null) {
      const [, name, id, stock] = im
      if (name && stock !== undefined) {
        const qty = Number(stock)
        inventoryAlerts.push({
          name: name.trim(),
          id: id ? Number(id) : undefined,
          currentStock: qty,
          status: qty <= 0 ? 'out_of_stock' : qty <= 5 ? 'low_stock' : 'normal',
        })
      }
    }
  }

  // E. Check for Suppliers list:
  const suppliers: SupplierItem[] = []
  const supRegex = /(?:[•\-\*]|\d+\.)\s*([^-(:\n]+)\s*-\s*(?:SĐT|Phone|Hotline)?[:\s]*([\d\s.]+)?\s*(?:-\s*([^\n]+))?/gi
  if (/nhà cung cấp|supplier/i.test(text)) {
    let sm: RegExpExecArray | null
    while ((sm = supRegex.exec(text)) !== null) {
      const [, name, phone, address] = sm
      if (name && (phone || address)) {
        suppliers.push({
          name: name.trim(),
          phone: phone?.trim(),
          address: address?.trim(),
        })
      }
    }
  }

  return {
    products,
    kpis: kpis.length >= 2 ? kpis : [],
    customers,
    inventoryAlerts,
    suppliers,
    hasStructuredData: products.length > 0 || kpis.length >= 2 || customers.length > 0 || inventoryAlerts.length > 0 || suppliers.length > 0,
  }
})
</script>

<template>
  <div class="chat-structured-root" :class="{ 'is-user': role === 'user' }">
    <!-- User Message -->
    <div v-if="role === 'user'" class="user-text">
      {{ content }}
    </div>

    <!-- Assistant Message with Rich Structured Frames -->
    <div v-else class="assistant-content">
      <!-- 1. KPI Dashboard Metrics Frame (if detected) -->
      <div v-if="parsedData.kpis.length" class="frame-card frame-kpi-grid">
        <div class="frame-header">
          <span class="frame-icon">📊</span>
          <strong>{{ t('Chỉ số tổng quan', 'Key Metrics Summary') }}</strong>
        </div>
        <div class="kpi-boxes-row">
          <div
            v-for="(kpi, kIdx) in parsedData.kpis"
            :key="kIdx"
            class="kpi-box"
            :class="`kpi-${kpi.trend || 'neutral'}`"
          >
            <div class="kpi-top">
              <span class="kpi-icon">{{ kpi.icon || '📌' }}</span>
              <span class="kpi-label">{{ kpi.label }}</span>
            </div>
            <div class="kpi-val">{{ kpi.value }}</div>
          </div>
        </div>
      </div>

      <!-- 2. Product Showcase Frame (if detected) -->
      <div v-if="parsedData.products.length" class="frame-card frame-product-showcase">
        <div class="frame-header">
          <span class="frame-icon">🛍️</span>
          <strong>{{ t('Sản phẩm đề xuất', 'Recommended Products') }}</strong>
          <span class="frame-count-badge">{{ parsedData.products.length }} {{ t('mục', 'items') }}</span>
        </div>
        <div class="product-cards-grid">
          <div
            v-for="item in parsedData.products"
            :key="item.id"
            class="product-item-card"
          >
            <div class="prod-card-top">
              <div class="prod-info">
                <span v-if="item.badge" class="prod-discount-pill">{{ item.badge }}</span>
                <strong class="prod-name">{{ item.name }}</strong>
                <span class="prod-sku">#{{ item.id }}</span>
              </div>
            </div>

            <div class="prod-card-meta">
              <div class="prod-pricing">
                <span class="price-sale">{{ formatPrice(item.salePrice) }}</span>
                <span v-if="item.originalPrice > item.salePrice" class="price-orig">
                  {{ formatPrice(item.originalPrice) }}
                </span>
              </div>
              <div class="prod-stock" :class="{ 'is-empty': item.stock <= 0, 'is-low': item.stock > 0 && item.stock <= 5 }">
                <span class="stock-dot"></span>
                <span v-if="item.stock > 0">{{ t(`Còn ${item.stock} cái`, `In stock: ${item.stock}`) }}</span>
                <span v-else>{{ t('Hết hàng', 'Out of stock') }}</span>
              </div>
            </div>

            <div class="prod-card-actions">
              <button
                type="button"
                class="prod-btn btn-view"
                :title="t('Xem chi tiết', 'View details')"
                @click="emit('open-product', item.id)"
              >
                <span>👁️</span> {{ t('Xem', 'View') }}
              </button>
              <button
                v-if="isStorefront && item.stock > 0"
                type="button"
                class="prod-btn btn-cart"
                :title="t('Thêm vào giỏ hàng', 'Add to cart')"
                @click="emit('add-to-cart', item.id)"
              >
                <span>🛒</span> {{ t('Thêm giỏ', 'Add') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. VIP Customer Leaderboard Frame (if detected) -->
      <div v-if="parsedData.customers.length" class="frame-card frame-customer-leaderboard">
        <div class="frame-header">
          <span class="frame-icon">👑</span>
          <strong>{{ t('Bảng xếp hạng khách hàng VIP', 'Top VIP Customers') }}</strong>
        </div>
        <div class="customer-rank-list">
          <div
            v-for="c in parsedData.customers"
            :key="c.rank"
            class="customer-rank-row"
            :class="`rank-${c.rank}`"
          >
            <div class="rank-badge">
              <span v-if="c.rank === 1">🥇</span>
              <span v-else-if="c.rank === 2">🥈</span>
              <span v-else-if="c.rank === 3">🥉</span>
              <span v-else>{{ c.rank }}</span>
            </div>
            <div class="customer-details">
              <strong>{{ c.name }}</strong>
              <span class="tier-pill">{{ c.tier }}</span>
            </div>
            <div class="customer-spent">
              <span class="spent-val">{{ c.spent }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Low Stock Alerts Frame (if detected) -->
      <div v-if="parsedData.inventoryAlerts.length" class="frame-card frame-inventory-alert">
        <div class="frame-header">
          <span class="frame-icon">⚠️</span>
          <strong>{{ t('Cảnh báo tồn kho cần nhập', 'Low Stock Inventory Alerts') }}</strong>
        </div>
        <div class="inventory-alerts-list">
          <div
            v-for="(inv, iIdx) in parsedData.inventoryAlerts"
            :key="iIdx"
            class="inv-alert-row"
            :class="inv.status"
          >
            <div class="inv-info">
              <strong>{{ inv.name }}</strong>
              <span v-if="inv.id" class="inv-sku">#{{ inv.id }}</span>
            </div>
            <div class="inv-status-pill">
              <span class="inv-stock-num">{{ inv.currentStock }} {{ t('sp', 'items') }}</span>
              <span class="inv-label">
                {{ inv.status === 'out_of_stock' ? t('Hết hàng', 'Out of stock') : t('Sắp hết', 'Low stock') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Suppliers Directory Frame (if detected) -->
      <div v-if="parsedData.suppliers.length" class="frame-card frame-suppliers-directory">
        <div class="frame-header">
          <span class="frame-icon">🏭</span>
          <strong>{{ t('Danh sách nhà cung cấp', 'Suppliers List') }}</strong>
        </div>
        <div class="suppliers-list">
          <div
            v-for="(sup, sIdx) in parsedData.suppliers"
            :key="sIdx"
            class="supplier-card"
          >
            <div class="sup-name">
              <span class="sup-icon">🏢</span>
              <strong>{{ sup.name }}</strong>
            </div>
            <div v-if="sup.phone" class="sup-contact-row">
              <span>📞</span> <a :href="`tel:${sup.phone}`">{{ sup.phone }}</a>
            </div>
            <div v-if="sup.address" class="sup-contact-row">
              <span>📍</span> <span>{{ sup.address }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. General Formatted Markdown Content (if not fully replaced or for introductory notes) -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-if="!parsedData.products.length && !parsedData.customers.length && !parsedData.inventoryAlerts.length && !parsedData.suppliers.length"
        class="chat-markdown-body"
        v-html="renderChatMarkdown(content)"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-structured-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.chat-structured-root.is-user {
  align-items: flex-end;
}

.user-text {
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
  color: #ffffff;
  padding: 10px 14px;
  border-radius: 16px 16px 4px 16px;
  font-size: 0.88rem;
  line-height: 1.55;
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
  word-break: break-word;
  max-width: 90%;
}

.assistant-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

/* Base Card Frame */
.frame-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:global(.app-dark) .frame-card {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.frame-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
  color: #0f172a;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}

:global(.app-dark) .frame-header {
  color: #f1f5f9;
  border-bottom-color: #334155;
}

.frame-icon {
  font-size: 1.1rem;
}

.frame-count-badge {
  margin-left: auto;
  font-size: 0.72rem;
  background: #f1f5f9;
  color: #64748b;
  padding: 2px 8px;
  border-radius: 9999px;
  font-weight: 600;
}

:global(.app-dark) .frame-count-badge {
  background: #0f172a;
  color: #94a3b8;
}

/* 1. KPI Grid */
.kpi-boxes-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.kpi-box {
  padding: 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:global(.app-dark) .kpi-box {
  background: #0f172a;
  border-color: #334155;
}

.kpi-top {
  display: flex;
  align-items: center;
  gap: 5px;
}

.kpi-label {
  font-size: 0.74rem;
  color: #64748b;
  font-weight: 500;
}

:global(.app-dark) .kpi-label {
  color: #94a3b8;
}

.kpi-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

:global(.app-dark) .kpi-val {
  color: #38bdf8;
}

.kpi-up .kpi-val {
  color: #059669;
}

.kpi-down .kpi-val {
  color: #d97706;
}

/* 2. Product Showcase Grid */
.product-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-item-card {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
}

.product-item-card:hover {
  border-color: #0d9488;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.1);
}

:global(.app-dark) .product-item-card {
  background: #0f172a;
  border-color: #334155;
}

:global(.app-dark) .product-item-card:hover {
  border-color: #14b8a6;
  background: #111e32;
}

.prod-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.prod-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.prod-name {
  font-size: 0.86rem;
  color: #0f172a;
  font-weight: 600;
}

:global(.app-dark) .prod-name {
  color: #f1f5f9;
}

.prod-sku {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 500;
}

.prod-discount-pill {
  font-size: 0.68rem;
  background: #fee2e2;
  color: #ef4444;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
}

.prod-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.prod-pricing {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.price-sale {
  font-size: 0.92rem;
  font-weight: 700;
  color: #0f766e;
}

:global(.app-dark) .price-sale {
  color: #2dd4bf;
}

.price-orig {
  font-size: 0.76rem;
  color: #94a3b8;
  text-decoration: line-through;
}

.prod-stock {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: #059669;
  font-weight: 500;
}

.stock-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.prod-stock.is-low {
  color: #d97706;
}

.prod-stock.is-low .stock-dot {
  background: #f59e0b;
}

.prod-stock.is-empty {
  color: #ef4444;
}

.prod-stock.is-empty .stock-dot {
  background: #ef4444;
}

.prod-card-actions {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}

.prod-btn {
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-view {
  background: #f1f5f9;
  color: #334155;
  border-color: #cbd5e1;
}

.btn-view:hover {
  background: #e2e8f0;
  color: #0f172a;
}

:global(.app-dark) .btn-view {
  background: #334155;
  color: #f1f5f9;
  border-color: #475569;
}

.btn-cart {
  background: linear-gradient(135deg, #0f766e, #0d9488);
  color: #ffffff;
}

.btn-cart:hover {
  background: linear-gradient(135deg, #115e59, #0f766e);
  transform: translateY(-1px);
}

/* 3. Customer Leaderboard */
.customer-rank-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.customer-rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

:global(.app-dark) .customer-rank-row {
  background: #0f172a;
  border-color: #334155;
}

.rank-badge {
  font-size: 1rem;
  font-weight: bold;
  width: 24px;
  text-align: center;
}

.customer-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.customer-details strong {
  font-size: 0.84rem;
  color: #0f172a;
}

:global(.app-dark) .customer-details strong {
  color: #f1f5f9;
}

.tier-pill {
  font-size: 0.68rem;
  color: #d97706;
  background: rgba(245, 158, 11, 0.12);
  padding: 1px 6px;
  border-radius: 4px;
  width: fit-content;
  font-weight: 600;
}

.customer-spent {
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f766e;
}

:global(.app-dark) .customer-spent {
  color: #2dd4bf;
}

/* 4. Inventory Alerts */
.inventory-alerts-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inv-alert-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.inv-alert-row.out_of_stock {
  background: #fef2f2;
  border-color: #fecaca;
}

:global(.app-dark) .inv-alert-row {
  background: #291807;
  border-color: #78350f;
}

:global(.app-dark) .inv-alert-row.out_of_stock {
  background: #311313;
  border-color: #7f1d1d;
}

.inv-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.inv-info strong {
  font-size: 0.84rem;
  color: #0f172a;
}

:global(.app-dark) .inv-info strong {
  color: #f1f5f9;
}

.inv-sku {
  font-size: 0.72rem;
  color: #94a3b8;
}

.inv-status-pill {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.inv-stock-num {
  font-size: 0.84rem;
  font-weight: 700;
  color: #b45309;
}

.out_of_stock .inv-stock-num {
  color: #dc2626;
}

.inv-label {
  font-size: 0.7rem;
  color: #64748b;
}

/* 5. Suppliers Directory */
.suppliers-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.supplier-card {
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:global(.app-dark) .supplier-card {
  background: #0f172a;
  border-color: #334155;
}

.sup-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.84rem;
}

.sup-contact-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  color: #64748b;
}

.sup-contact-row a {
  color: #0284c7;
  text-decoration: none;
}

.sup-contact-row a:hover {
  text-decoration: underline;
}

/* 6. Markdown Body */
.chat-markdown-body {
  background: #ffffff;
  color: #0f172a;
  padding: 12px 14px;
  border-radius: 16px 16px 16px 4px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  font-size: 0.88rem;
  line-height: 1.55;
  word-break: break-word;
}

:global(.app-dark) .chat-markdown-body {
  background: #1e293b;
  color: #f3f4f6;
  border-color: #334155;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
