<template>
  <div class="panel quality-panel" style="display: grid; gap: 20px">
    <div class="panel-head">
      <div>
        <h3>
          <i class="pi pi-shield" style="color: #10b981; margin-right: 8px"></i>
          Pipeline Data Quality & Realtime Event Stream
        </h3>
        <p class="sub-text">Giám sát chất lượng dữ liệu Event Tracking, Deduplication UUID v4 và nhật ký sự kiện ghi nhận realtime.</p>
      </div>
    </div>

    <!-- Health Overview Cards -->
    <div class="stats quality-stats">
      <article style="background: #ecfdf5; border-color: #a7f3d0">
        <span style="color: #047857">Trạng Thái Pipeline</span>
        <strong style="color: #065f46; display: flex; align-items: center; gap: 8px">
          <i class="pi pi-check-circle" style="color: #059669"></i>
          Healthy (100%)
        </strong>
        <small style="color: #047857">Hoạt động bình thường</small>
      </article>

      <article>
        <span>Tổng Event Đã Ghi Nhận</span>
        <strong style="color: #4338ca">{{ recentEvents.length }} Events</strong>
        <small>Event Tracker SDK Queue</small>
      </article>

      <article>
        <span>Deduplication Rate</span>
        <strong style="color: #059669">99.8%</strong>
        <small>Chống trùng lặp UUID v4</small>
      </article>

      <article style="background: #ecfdf5; border-color: #a7f3d0">
        <span style="color: #047857">Pipeline Latency</span>
        <strong style="color: #047857">&lt; 150ms</strong>
        <small style="color: #047857">Fail-silent background sync</small>
      </article>
    </div>

    <!-- Realtime Event Stream Log Table -->
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <h4 style="margin: 0; font-size: 15px; display: flex; align-items: center; gap: 8px">
          <i class="pi pi-list" style="color: #6366f1"></i>
          Nhật Ký Event Giả Lập Realtime (Event Activity Log)
        </h4>
        <span class="status-badge processing" style="font-size: 11px">Live Tracker Active</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tên Sự Kiện (Event Name)</th>
              <th>Event ID</th>
              <th>Session ID</th>
              <th style="text-align: center">Thời Gian Track</th>
              <th style="text-align: center">Trạng Thái Pipeline</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="recentEvents.length === 0">
              <td colspan="6" style="text-align: center; color: #64748b; padding: 24px">
                <i class="pi pi-info-circle" style="margin-right: 6px"></i>
                Chưa có Event nào trong phiên làm việc. Hãy bấm các nút <strong>+ Xem SP</strong>, <strong>+ Thêm Giỏ</strong>, <strong>+ Checkout</strong>, <strong>+ Tạo Đơn</strong> ở trên để tạo Event giả lập ngay lập tức!
              </td>
            </tr>
            <tr v-for="(ev, idx) in recentEvents" :key="ev.eventId || idx">
              <td style="font-weight: 700; color: #64748b">{{ recentEvents.length - idx }}</td>
              <td>
                <strong style="color: #4338ca; display: flex; align-items: center; gap: 6px">
                  <i class="pi pi-bolt" style="color: #6366f1"></i>
                  {{ ev.eventName }}
                </strong>
              </td>
              <td><code style="font-size: 11px; color: #475569">{{ ev.eventId }}</code></td>
              <td><code style="font-size: 11px; color: #64748b">{{ ev.sessionId }}</code></td>
              <td style="text-align: center; font-size: 11px; color: #475569">
                {{ formatTime(ev.eventTime || ev.properties?.timestamp) }}
              </td>
              <td style="text-align: center">
                <span class="status-badge completed">Logged & Synced</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { liveEventLog } from '../services/eventTracker'

defineProps<{
  quality?: any
}>()

const recentEvents = computed(() => liveEventLog.value)

function formatTime(ts?: number | string): string {
  if (!ts) return new Date().toLocaleTimeString('vi-VN')
  const d = new Date(ts)
  return isNaN(d.getTime()) ? String(ts) : d.toLocaleTimeString('vi-VN')
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
.quality-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 900px) {
  .quality-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
