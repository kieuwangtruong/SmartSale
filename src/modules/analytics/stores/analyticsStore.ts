import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchFullAnalytics, type FullAnalyticsPayload } from '../services/analyticsApi'

export const useAnalyticsStore = defineStore('analytics', () => {
  const data = ref<FullAnalyticsPayload | null>(null)
  const isLoading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const dateRangeDays = ref<number>(0)
  const funnelMode = ref<'transaction' | 'behavioral'>('transaction')
  const includeSyntheticData = ref<boolean>(true)

  async function loadAnalytics() {
    isLoading.value = true
    errorMessage.value = null

    try {
      data.value = await fetchFullAnalytics({
        dateRangeDays: dateRangeDays.value,
        funnelMode: funnelMode.value,
        includeSyntheticData: includeSyntheticData.value,
      })
    } catch (err: any) {
      errorMessage.value = err?.message || 'Không thể tải dữ liệu analytics'
    } finally {
      isLoading.value = false
    }
  }

  function setDateRange(days: number) {
    dateRangeDays.value = days
    loadAnalytics()
  }

  function setFunnelMode(mode: 'transaction' | 'behavioral') {
    funnelMode.value = mode
    loadAnalytics()
  }

  function toggleSyntheticData() {
    includeSyntheticData.value = !includeSyntheticData.value
    loadAnalytics()
  }

  return {
    data,
    isLoading,
    errorMessage,
    dateRangeDays,
    funnelMode,
    includeSyntheticData,
    loadAnalytics,
    setDateRange,
    setFunnelMode,
    toggleSyntheticData,
  }
})
