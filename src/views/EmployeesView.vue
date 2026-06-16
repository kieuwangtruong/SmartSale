<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  getEmployeeAttendance,
  getEmployees,
  upsertAttendance,
  type AttendanceRecord,
  type UserDto,
} from '../services/userApi'

const employees = ref<UserDto[]>([])
const selected = ref<UserDto | null>(null)
const attendance = ref<AttendanceRecord[]>([])
const search = ref('')
const error = ref('')
const form = ref({
  workDate: new Date().toISOString().slice(0, 10),
  checkIn: '08:00',
  checkOut: '17:00',
  status: 'Present',
  note: '',
})

async function loadEmployees() {
  employees.value = await getEmployees(search.value)
  const firstEmployee = employees.value[0]
  if (!selected.value && firstEmployee) await selectEmployee(firstEmployee)
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
    error.value = exception instanceof Error ? exception.message : 'Không thể lưu chấm công.'
  }
}

onMounted(loadEmployees)
</script>

<template>
  <section class="hr-grid">
    <aside class="panel">
      <div class="heading">
        <h2>Nhân sự</h2>
        <input v-model="search" placeholder="Tim ten/email..." @keyup.enter="loadEmployees" />
      </div>
      <button type="button" @click="loadEmployees">Tim kiem</button>
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
          <h2>{{ selected?.fullName || 'Chon nhan su' }}</h2>
          <p>{{ selected?.email }}</p>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <div v-if="selected" class="attendance-form">
        <input v-model="form.workDate" type="date" />
        <input v-model="form.checkIn" type="time" />
        <input v-model="form.checkOut" type="time" />
        <select v-model="form.status">
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
          <option value="Late">Late</option>
          <option value="Leave">Leave</option>
        </select>
        <input v-model="form.note" placeholder="Ghi chú" />
        <button type="button" @click="saveAttendance">Lưu chấm công</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Ngay</th>
            <th>Gio vao</th>
            <th>Gio ra</th>
            <th>Trang thai</th>
            <th>Gio lam</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in attendance" :key="record.id">
            <td>{{ new Date(record.workDate).toLocaleDateString('vi-VN') }}</td>
            <td>{{ record.checkIn || '-' }}</td>
            <td>{{ record.checkOut || '-' }}</td>
            <td>{{ record.status }}</td>
            <td>{{ record.hoursWorked }}</td>
            <td>{{ record.note || '-' }}</td>
          </tr>
          <tr v-if="!attendance.length">
            <td colspan="6">Chưa có dữ liệu chấm công.</td>
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
</style>
