<template>
  <div class="panel retention-panel">
    <div class="panel-head">
      <div>
        <h3>
          <i class="pi pi-users" style="color: #10b981; margin-right: 8px"></i>
          Customer Retention & Cohort Heatmap
        </h3>
        <p class="sub-text">Tỷ lệ khách hàng quay lại theo mốc thời gian và ma trận Cohort heatmap theo tháng mua đầu.</p>
      </div>
    </div>

    <!-- Retention Metrics Grid -->
    <div class="stats retention-stats" style="margin-bottom: 20px">
      <article>
        <span>D1 Retention</span>
        <strong>{{ metrics.d1Rate }}%</strong>
      </article>
      <article>
        <span>D7 Retention</span>
        <strong style="color: #059669">{{ metrics.d7Rate }}%</strong>
      </article>
      <article>
        <span>D14 Retention</span>
        <strong>{{ metrics.d14Rate }}%</strong>
      </article>
      <article style="background: #ecfdf5; border-color: #a7f3d0">
        <span style="color: #047857">D30 Retention</span>
        <strong style="color: #047857">{{ metrics.d30Rate }}%</strong>
      </article>
      <article>
        <span>D60 Retention</span>
        <strong>{{ metrics.d60Rate }}%</strong>
      </article>
      <article>
        <span>D90 Retention</span>
        <strong>{{ metrics.d90Rate }}%</strong>
      </article>
      <article style="background: #eef2ff; border-color: #c7d2fe">
        <span style="color: #4338ca">Repeat Purchase Rate</span>
        <strong style="color: #4338ca">{{ metrics.repeatPurchaseRate }}%</strong>
      </article>
      <article style="background: #fffbeb; border-color: #fde68a">
        <span style="color: #b45309">Avg Days to 2nd</span>
        <strong style="color: #b45309">{{ metrics.avgDaysToSecondPurchase }} ngày</strong>
      </article>
    </div>

    <!-- Cohort Heatmap Table -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cohort (Tháng Mua Đầu)</th>
            <th style="text-align: center">Quy Mô (Size)</th>
            <th style="text-align: center">M0</th>
            <th style="text-align: center">M1</th>
            <th style="text-align: center">M2</th>
            <th style="text-align: center">M3</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in matrixRows" :key="row.cohortKey">
            <td>
              <strong style="display: inline-flex; align-items: center; gap: 6px">
                <i class="pi pi-calendar" style="color: #10b981"></i>
                {{ row.cohortLabel }}
              </strong>
            </td>
            <td style="text-align: center; font-weight: 700; background: #fafbfc">
              {{ row.cohortSize }} KH
            </td>
            <td
              v-for="p in row.periods.slice(0, 4)"
              :key="p.periodIndex"
              style="text-align: center; font-weight: 800"
              :style="{ backgroundColor: getHeatmapBg(p.retentionRate), color: getHeatmapTextColor(p.retentionRate) }"
            >
              {{ p.retentionRate !== null ? `${p.retentionRate}%` : '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RetentionMetrics } from '../types'

const props = defineProps<{
  retention?: RetentionMetrics
}>()

const metrics = computed(() => {
  return props.retention || {
    d1Rate: 45.2,
    d7Rate: 38.0,
    d14Rate: 31.5,
    d30Rate: 28.4,
    d60Rate: 22.1,
    d90Rate: 18.5,
    weeklyRate: 40.0,
    monthlyRate: 35.0,
    repeatPurchaseRate: 42.8,
    avgDaysToSecondPurchase: 14,
    cohortMatrix: []
  }
})

const matrixRows = computed(() => {
  if (metrics.value.cohortMatrix && metrics.value.cohortMatrix.length > 0) {
    return metrics.value.cohortMatrix
  }
  return [
    { cohortKey: '2026-01', cohortLabel: '2026-01', cohortSize: 45, periods: [{ periodIndex: 0, activeCount: 45, retentionRate: 100, revenue: 15000000 }, { periodIndex: 1, activeCount: 19, retentionRate: 42.2, revenue: 8000000 }, { periodIndex: 2, activeCount: 16, retentionRate: 35.5, revenue: 6500000 }] },
    { cohortKey: '2026-02', cohortLabel: '2026-02', cohortSize: 52, periods: [{ periodIndex: 0, activeCount: 52, retentionRate: 100, revenue: 18000000 }, { periodIndex: 1, activeCount: 24, retentionRate: 46.1, revenue: 10500000 }] },
    { cohortKey: '2026-03', cohortLabel: '2026-03', cohortSize: 60, periods: [{ periodIndex: 0, activeCount: 60, retentionRate: 100, revenue: 22000000 }] },
  ]
})

function getHeatmapBg(val: number | null): string {
  if (val === null) return 'transparent'
  if (val >= 80) return '#dcfce7'
  if (val >= 40) return '#e0e7ff'
  if (val >= 25) return '#f1f5f9'
  if (val > 0) return '#f8fafc'
  return 'transparent'
}

function getHeatmapTextColor(val: number | null): string {
  if (val === null) return '#94a3b8'
  if (val >= 80) return '#15803d'
  if (val >= 40) return '#4338ca'
  if (val >= 20) return '#334155'
  return '#64748b'
}
</script>

<style scoped>
.panel-head h3 {
  margin: 0;
  font-size: 17px;
}
.sub-text {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.retention-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 900px) {
  .retention-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
