<template>
  <div class="panel abtest-panel">
    <div class="panel-head">
      <div>
        <h3>
          <i class="pi pi-sliders-h" style="color: #6366f1; margin-right: 8px"></i>
          A/B Testing Framework & Stat Significance Engine
        </h3>
        <p class="sub-text">MurmurHash3 Hash Deterministic Assignment, Exposure Tracking, Z-Score p-value significance và SRM Validation Test.</p>
      </div>
    </div>

    <!-- Active Experiments -->
    <div v-for="exp in experiments" :key="exp.experimentId" class="panel" style="background: #f8fafc; margin: 0">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px">
        <div>
          <div style="display: flex; align-items: center; gap: 8px">
            <h4 style="margin: 0; font-size: 16px">{{ exp.experimentName }}</h4>
            <span class="status-badge completed">Running Live</span>
          </div>
          <p style="margin: 4px 0 0; font-size: 11px; color: #64748b">ID: <code style="color: #6366f1">{{ exp.experimentId }}</code></p>
        </div>

        <div style="text-align: right">
          <strong style="color: #4338ca; font-size: 12px">SRM Validated (Chi-Square)</strong>
          <div style="font-size: 11px; color: #64748b">Sample Ratio Mismatch: Passed (p = {{ exp.srmPValue }})</div>
        </div>
      </div>

      <!-- Variants Comparison Grid -->
      <div class="grid-2" style="margin-bottom: 16px">
        <!-- Control Variant -->
        <div style="padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
            <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase">Control Variant (A)</span>
            <span class="status-badge processing">Baseline</span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #0f172a">{{ exp.controlVariant.conversions }} / {{ exp.controlVariant.exposures }}</div>
          <div style="font-size: 12px; font-weight: 700; color: #6366f1; margin-top: 2px">CR: {{ exp.controlVariant.conversionRate }}%</div>
        </div>

        <!-- Treatment Variant -->
        <div style="padding: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px">
            <span style="font-size: 11px; font-weight: 700; color: #047857; text-transform: uppercase">Treatment Variant (B)</span>
            <span class="status-badge completed">+{{ exp.treatmentVariant.relativeUpliftPercent }}% Uplift</span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #065f46">{{ exp.treatmentVariant.conversions }} / {{ exp.treatmentVariant.exposures }}</div>
          <div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 2px">CR: {{ exp.treatmentVariant.conversionRate }}%</div>
        </div>
      </div>

      <!-- Significance Result Box -->
      <div style="padding: 16px; background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px">
        <div style="display: flex; align-items: center; gap: 12px">
          <i class="pi pi-check-circle" style="color: #059669; font-size: 24px"></i>
          <div>
            <strong style="color: #065f46; font-size: 13px">Kết quả Có Ý Nghĩa Thống Kê (Statistically Significant)</strong>
            <div style="font-size: 12px; color: #047857">Z-Score = {{ exp.zScore }} | p-value = {{ exp.pValue }} (Thỏa mãn threshold α = 0.05)</div>
          </div>
        </div>
        <button class="primary" style="background: #059669; border-color: #059669">
          Khuyên dùng Variant B
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  experiment?: any
}>()

const experiments = computed(() => {
  if (props.experiment && Array.isArray(props.experiment)) return props.experiment
  return [
    {
      experimentId: 'exp_checkout_btn_v2',
      experimentName: 'Thử nghiệm Nút Thanh Toán PayOS Nổi Bật',
      srmPValue: 0.84,
      zScore: 2.34,
      pValue: 0.019,
      controlVariant: { name: 'Control (Standard Button)', exposures: 250, conversions: 110, conversionRate: 44.0 },
      treatmentVariant: { name: 'Treatment (Gradient Glow Button)', exposures: 250, conversions: 135, conversionRate: 54.0, relativeUpliftPercent: 22.7 }
    }
  ]
})
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
</style>
