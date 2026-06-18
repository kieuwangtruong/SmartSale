<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getEmployeeAttendance,
  getEmployees,
  upsertAttendance,
  type AttendanceRecord,
  type UserDto,
} from '../services/userApi'
import { useLanguage } from '../services/i18n'
import { useToast } from 'primevue/usetoast'

const { t } = useLanguage()
const toast = useToast()

function showError(msg: string) {
  toast.add({
    severity: 'error',
    summary: t('Lỗi', 'Error'),
    detail: msg,
    life: 5000,
  })
}

const employees = ref<UserDto[]>([])
const selected = ref<UserDto | null>(null)
const attendance = ref<AttendanceRecord[]>([])
const search = ref('')
const form = ref({
  workDate: new Date().toISOString().slice(0, 10),
  checkIn: '08:00',
  checkOut: '17:00',
  status: 'Present',
  note: '',
})

async function loadEmployees() {
  const all = await getEmployees(search.value)
  // Filter out registered customer accounts from employee attendance
  employees.value = all.filter((e) => e.role !== 'Customer')
  const firstEmployee = employees.value[0]
  if (!selected.value && firstEmployee) {
    await selectEmployee(firstEmployee)
  } else if (selected.value) {
    // Refresh selected employee
    const found = employees.value.find((e) => e.id === selected.value?.id)
    if (found) await selectEmployee(found)
  }
}

async function selectEmployee(employee: UserDto) {
  selected.value = employee
  attendance.value = await getEmployeeAttendance(employee.id)
}

async function saveAttendance() {
  if (!selected.value) return
  try {
    await upsertAttendance({
      userId: selected.value.id,
      workDate: form.value.workDate,
      checkIn: form.value.checkIn,
      checkOut: form.value.checkOut,
      status: form.value.status,
      note: form.value.note,
    })
    await selectEmployee(selected.value)
  } catch (exception) {
    showError(exception instanceof Error ? exception.message : t('Không thể lưu chấm công.', 'Failed to save attendance.'))
  }
}

onMounted(loadEmployees)
</script>

<template>
  <section class="hr-grid">
    <aside class="panel">
      <div class="heading">
        <h2>{{ t('Nhân sự', 'Staff Members') }}</h2>
        <input v-model="search" :placeholder="t('Tìm tên/email...', 'Search name/email...')" @keyup.enter="loadEmployees" />
      </div>
      <button type="button" @click="loadEmployees">{{ t('Tìm kiếm', 'Search') }}</button>
      <div class="employee-list">
        <button
          v-for="employee in employees"
          :key="employee.id"
          type="button"
          :class="{ active: selected?.id === employee.id }"
          @click="selectEmployee(employee)"
        >
          <strong>{{ employee.fullName }}</strong>
          <span>{{ employee.email }} - {{ employee.workStatus || 'Active' }}</span>
        </button>
      </div>
    </aside>

    <main class="panel">
      <div class="heading">
        <div>
          <h2>{{ selected?.fullName || t('Chọn nhân sự', 'Select Staff') }}</h2>
          <p>{{ selected?.email }}</p>
        </div>
      </div>

      <div v-if="selected" class="attendance-form">
        <input v-model="form.workDate" type="date" />
        <input v-model="form.checkIn" type="time" />
        <input v-model="form.checkOut" type="time" />
        <select v-model="form.status">
          <option value="Present">{{ t('Có mặt', 'Present') }}</option>
          <option value="Absent">{{ t('Vắng mặt', 'Absent') }}</option>
          <option value="Late">{{ t('Đi muộn', 'Late') }}</option>
          <option value="Leave">{{ t('Nghỉ phép', 'Leave') }}</option>
        </select>
        <input v-model="form.note" :placeholder="t('Ghi chú', 'Note')" />
        <button type="button" @click="saveAttendance">{{ t('Lưu chấm công', 'Save Attendance') }}</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>{{ t('Ngày', 'Date') }}</th>
            <th>{{ t('Giờ vào', 'Check In') }}</th>
            <th>{{ t('Giờ ra', 'Check Out') }}</th>
            <th>{{ t('Trạng thái', 'Status') }}</th>
            <th>{{ t('Giờ làm', 'Hours') }}</th>
            <th>{{ t('Ghi chú', 'Note') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in attendance" :key="record.id">
            <td>{{ new Date(record.workDate).toLocaleDateString(t('vi-VN', 'en-US')) }}</td>
            <td>{{ record.checkIn || '-' }}</td>
            <td>{{ record.checkOut || '-' }}</td>
            <td>{{ record.status }}</td>
            <td>{{ record.hoursWorked }}</td>
            <td>{{ record.note || '-' }}</td>
          </tr>
          <tr v-if="!attendance.length">
            <td colspan="6">{{ t('Chưa có dữ liệu chấm công.', 'No attendance logs found.') }}</td>
          </tr>
        </tbody>
      </table>
    </main>
  </section>
</template>

<style scoped>
.hr-grid { display: grid; grid-template-columns: 320px 1fr; gap: 18px; }
.panel { background: white; border-radius: 18px; padding: 22px; box-shadow: 0 18px 50px rgb(15 23 42 / 8%); }
.heading { display: flex; justify-content: space-between; gap: 14px; align-items: center; margin-bottom: 16px; }
h2, p { margin: 0; }
input, select { border: 1px solid #dbe3ef; border-radius: 10px; padding: 10px 12px; }
button { border: 0; border-radius: 10px; padding: 10px 14px; background: #0f766e; color: white; font-weight: 700; cursor: pointer; }
.employee-list { display: grid; gap: 10px; margin-top: 16px; }
.employee-list button { text-align: left; background: #f8fafc; color: #0f172a; border: 1px solid #e2e8f0; }
.employee-list button.active { background: #ccfbf1; border-color: #0f766e; }
.employee-list span { display: block; margin-top: 4px; color: #64748b; font-size: 12px; }
.attendance-form { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
th { color: #475569; font-size: 12px; text-transform: uppercase; }
.error { color: #dc2626; margin-bottom: 12px; }
@media (max-width: 1000px) { .hr-grid, .attendance-form { grid-template-columns: 1fr; } }

.app-dark .panel { background: #1e293b; border: 1px solid #334155; }
.app-dark h2 { color: #f8fafc; }
.app-dark p { color: #cbd5e1; }
.app-dark input, .app-dark select { background: #0f172a; border-color: #334155; color: #f8fafc; }
.app-dark button { background: #0d9488; }
.app-dark .employee-list button { background: #0f172a; color: #f8fafc; border-color: #334155; }
.app-dark .employee-list button.active { background: #115e59; border-color: #0d9488; }
.app-dark .employee-list span { color: #94a3b8; }
.app-dark th { color: #94a3b8; }
.app-dark td { color: #cbd5e1; border-bottom-color: #334155; }
</style>
