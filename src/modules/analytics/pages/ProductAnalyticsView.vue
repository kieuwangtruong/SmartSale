<template>
  <section class="page">
    <!-- Page Head (Matching standard Admin pages like AdminDashboard.vue & ProductsView.vue) -->
    <div class="page-head">
      <div>
        <h2>Product Analytics & BI</h2>
        <p>Báo cáo phễu chuyển đổi, Retention Cohort, LTV & A/B testing</p>
      </div>

      <div class="page-head-actions">
        <!-- Date Selector -->
        <div class="date-filter-group">
          <button
            v-for="days in [0, 7, 30, 90]"
            :key="days"
            @click="store.setDateRange(days)"
            :class="['filter-btn', { active: store.dateRangeDays === days }]"
          >
            {{ days === 0 ? 'Tất cả' : `${days}d` }}
          </button>
        </div>

        <button
          @click="store.loadAnalytics()"
          :disabled="store.isLoading"
          class="primary"
        >
          <i :class="['pi', store.isLoading ? 'pi-spin pi-spinner' : 'pi-refresh']"></i>
          Làm mới
        </button>
      </div>
    </div>

    <!-- Error Alert -->
    <p v-if="store.errorMessage" class="alert error">
      <i class="pi pi-exclamation-triangle"></i>
      {{ store.errorMessage }}
      <button @click="store.loadAnalytics()" class="retry-link">Thử lại</button>
    </p>

    <!-- Loading State -->
    <p v-if="store.isLoading && !store.data" class="empty">
      <i class="pi pi-spin pi-spinner" style="font-size: 1.8rem"></i>
      <span style="display: block; margin-top: 8px">Đang tải dữ liệu báo cáo Analytics...</span>
    </p>

    <template v-else-if="store.data">
      <!-- 5 Key Metric Cards (Using standard system stats layout) -->
      <div class="stats">
        <article>
          <i class="pi pi-wallet stat-icon purple"></i>
          <span>Doanh thu thuần</span>
          <strong>{{ formatVND(store.data.monetization.netRevenue) }}</strong>
        </article>

        <article>
          <i class="pi pi-shopping-bag stat-icon blue"></i>
          <span>Giá trị đơn (AOV)</span>
          <strong>{{ formatVND(store.data.monetization.aov) }}</strong>
        </article>

        <article>
          <i class="pi pi-filter stat-icon orange"></i>
          <span>Chuyển đổi phễu</span>
          <strong style="color: #d97706">{{ store.data.funnel.overallConversionRate }}%</strong>
        </article>

        <article>
          <i class="pi pi-sync stat-icon green"></i>
          <span>Tỷ lệ mua lại</span>
          <strong style="color: #10b981">{{ store.data.retention.repeatPurchaseRate }}%</strong>
        </article>

        <article>
          <i class="pi pi-users stat-icon teal"></i>
          <span>LTV 90 ngày (TB)</span>
          <strong style="color: #0284c7">{{ formatVND(store.data.ltv.ltv90DaysAverage) }}</strong>
        </article>
      </div>

      <!-- Navigation Tabs Bar -->
      <div class="analytics-nav">
        <button
          v-for="tab in navTabs"
          :key="tab.id"
          @click="activeNav = tab.id"
          :class="['analytics-nav-btn', { active: activeNav === tab.id }]"
        >
          <i :class="['pi', tab.icon]"></i>
          {{ tab.name }}
        </button>
      </div>

      <!-- Focused Tab Section Container -->
      <div class="analytics-tab-content">
        <FunnelChart
          v-if="activeNav === 'funnel'"
          :funnel="store.data.funnel"
          @change-mode="store.setFunnelMode"
        />

        <RetentionCohortMatrix
          v-else-if="activeNav === 'retention'"
          :retention="store.data.retention"
        />

        <LtvTrendChart
          v-else-if="activeNav === 'ltv'"
          :ltv="store.data.ltv"
        />

        <CustomerSegmentationChart
          v-else-if="activeNav === 'segmentation'"
          :ltv="store.data.ltv"
        />

        <MonetizationBreakdown
          v-else-if="activeNav === 'monetization'"
          :monetization="store.data.monetization"
        />

        <ExperimentStatusCard
          v-else-if="activeNav === 'abtest'"
          :experiment="store.data.experimentResult"
        />

        <div v-else-if="activeNav === 'testing'" style="display: grid; gap: 16px">
          <div class="panel testing-bar">
            <div class="testing-bar-head">
              <i class="pi pi-bolt" style="color: #6366f1; font-size: 1.2rem"></i>
              <div>
                <strong>Thanh Công Cụ Giả Lập Event Realtime</strong>
                <p style="margin: 2px 0 0; font-size: 12px; color: var(--text-muted)">Bấm các nút dưới đây để kích hoạt Event giả lập kiểm thử trực tiếp.</p>
              </div>
            </div>
            <div class="testing-btn-group">
              <button @click="simulateEvent('product_viewed')" class="test-btn"><i class="pi pi-eye"></i> + Xem SP</button>
              <button @click="simulateEvent('product_added_to_cart')" class="test-btn"><i class="pi pi-shopping-cart"></i> + Thêm Giỏ</button>
              <button @click="simulateEvent('checkout_started')" class="test-btn warning"><i class="pi pi-credit-card"></i> + Checkout</button>
              <button @click="simulateEvent('order_created')" class="test-btn success"><i class="pi pi-check-circle"></i> + Tạo Đơn</button>
            </div>
          </div>

          <DataQualityHealthBadge :quality="store.data.dataQuality" />
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAnalyticsStore } from '../stores/analyticsStore'
import { eventTracker } from '../services/eventTracker'
import FunnelChart from '../components/FunnelChart.vue'
import RetentionCohortMatrix from '../components/RetentionCohortMatrix.vue'
import LtvTrendChart from '../components/LtvTrendChart.vue'
import CustomerSegmentationChart from '../components/CustomerSegmentationChart.vue'
import MonetizationBreakdown from '../components/MonetizationBreakdown.vue'
import ExperimentStatusCard from '../components/ExperimentStatusCard.vue'
import DataQualityHealthBadge from '../components/DataQualityHealthBadge.vue'
import type { StandardEventName } from '../types'

const store = useAnalyticsStore()
const activeNav = ref<string>('funnel')

const navTabs = [
  { id: 'funnel', name: '1. Phễu chuyển đổi (Funnel)', icon: 'pi-filter' },
  { id: 'retention', name: '2. Retention & Cohort', icon: 'pi-calendar-plus' },
  { id: 'ltv', name: '3. Giá trị LTV', icon: 'pi-chart-line' },
  { id: 'segmentation', name: '4. Phân khúc Khách hàng', icon: 'pi-users' },
  { id: 'monetization', name: '5. Doanh thu & Pareto 80/20', icon: 'pi-dollar' },
  { id: 'abtest', name: '6. A/B Testing Engine', icon: 'pi-sliders-h' },
  { id: 'testing', name: '7. Testing & Quality Monitor', icon: 'pi-shield' },
]

function formatVND(val?: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val || 0)
}

const toast = useToast()

function simulateEvent(eventName: StandardEventName) {
  eventTracker.track(eventName, { simulated: true, timestamp: Date.now() })
  store.funnelMode = 'behavioral'
  store.loadAnalytics()

  toast.add({
    severity: 'success',
    summary: 'Giả Lập Event Thành Công',
    detail: `Đã ghi nhận sự kiện real-time: ${eventName}`,
    life: 3000,
  })
}

onMounted(() => {
  store.loadAnalytics()
})
</script>

<style scoped>
.date-filter-group {
  display: inline-flex;
  gap: 3px;
  background: var(--surface-ground);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
}
.filter-btn {
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all .15s;
}
.filter-btn.active {
  background: var(--surface-card);
  color: var(--primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.stat-icon {
  position: absolute;
  right: 16px;
  top: 16px;
  font-size: 20px;
  opacity: 0.25;
}
.stat-icon.purple { color: #818cf8; }
.stat-icon.blue { color: #3b82f6; }
.stat-icon.orange { color: #f59e0b; }
.stat-icon.green { color: #10b981; }
.stat-icon.teal { color: #06b6d4; }

.retry-link {
  margin-left: 10px;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}

.testing-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: var(--surface-card);
}
.testing-bar-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.testing-btn-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.test-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  border: 1px solid var(--surface-border);
  background: var(--surface-card);
  color: var(--text-main);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.test-btn:hover {
  background: var(--surface-ground);
}
.test-btn.warning {
  border-color: #fcd34d;
  color: #b45309;
  background: #fffbeb;
}
.test-btn.success {
  border-color: #6ee7b7;
  color: #047857;
  background: #ecfdf5;
}
</style>
