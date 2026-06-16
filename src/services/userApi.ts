import {
  apiRequest,
  getRoleApiValue,
  normalizeRole,
  type AuthSession,
  type AuthUser,
  type UserRole,
} from './apiClient'
import { API_URLS } from './config'

export type UserDto = AuthUser

export interface CreateUserPayload {
  userName: string
  fullName: string
  email: string
  passwordHash: string
  dateOfBirth: string
  role: UserRole
  sex: number
  address: string
}

export interface UpdateUserPayload extends Partial<CreateUserPayload> {
  id: number
}

export interface DashboardReport {
  revenueToday: number
  revenueThisWeek: number
  revenueThisMonth: number
  orderCount: number
  topProducts: Array<{
    productId: number
    productName: string
    quantitySold: number
    revenue: number
  }>
  topCustomers: Array<{
    customerId?: number | null
    customerName: string
    orderCount: number
    revenue: number
    debt: number
  }>
}

export interface RevenueChart {
  groupBy: string
  from: string
  to: string
  labels: string[]
  revenue: number[]
  orderCount: number[]
}

function normalizeUser(user: UserDto): UserDto {
  return { ...user, role: normalizeRole(user.role) }
}

function toApiPayload<T extends Partial<CreateUserPayload>>(payload: T) {
  return {
    ...payload,
    ...(payload.role ? { role: getRoleApiValue(payload.role) } : {}),
  }
}

export function loginUser(payload: { email: string; password: string }) {
  return apiRequest<AuthSession>(API_URLS.user, '/api/User/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function registerCustomer(payload: {
  userName: string
  fullName: string
  email: string
  password: string
  dateOfBirth: string
  sex: number
  address: string
}) {
  return apiRequest<UserDto>(API_URLS.user, '/api/User/register-customer', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(normalizeUser)
}

export function getMyProfile() {
  return apiRequest<UserDto>(API_URLS.user, '/api/User/me', { auth: true }).then(normalizeUser)
}

export function logoutUser(payload: { refreshToken: string }) {
  return apiRequest<unknown>(API_URLS.user, '/api/User/logout', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export async function getUsers() {
  const users = await apiRequest<UserDto[]>(API_URLS.user, '/api/User', { auth: true })
  return users.map(normalizeUser)
}

export async function createUser(payload: CreateUserPayload) {
  const user = await apiRequest<UserDto>(API_URLS.user, '/api/User', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(toApiPayload(payload)),
  })
  return normalizeUser(user)
}

export async function updateUser(payload: UpdateUserPayload) {
  const user = await apiRequest<UserDto>(API_URLS.user, `/api/User/${payload.id}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(toApiPayload(payload)),
  })
  return normalizeUser(user)
}

export function deleteUser(id: number) {
  return apiRequest<unknown>(API_URLS.user, `/api/User/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function getDashboardReport() {
  return apiRequest<DashboardReport>(API_URLS.user, '/api/reports/dashboard', {
    auth: true,
  })
}

export function getRevenueChart(groupBy: 'day' | 'month' = 'day') {
  return apiRequest<RevenueChart>(
    API_URLS.user,
    `/api/reports/revenue-chart?groupBy=${groupBy}`,
    { auth: true },
  )
}

export interface AttendanceRecord {
  id: number
  userId: number
  workDate: string
  checkIn?: string | null
  checkOut?: string | null
  status: string
  hoursWorked: number
  note?: string | null
}

export function getEmployees(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  return apiRequest<UserDto[]>(API_URLS.user, `/api/hr/employees${query}`, { auth: true }).then((users) =>
    users.map(normalizeUser),
  )
}

export function getEmployee(id: number) {
  return apiRequest<UserDto>(API_URLS.user, `/api/hr/employees/${id}`, { auth: true }).then(normalizeUser)
}

export function getEmployeeAttendance(id: number) {
  return apiRequest<AttendanceRecord[]>(API_URLS.user, `/api/hr/employees/${id}/attendance`, { auth: true })
}

export function upsertAttendance(payload: {
  userId: number
  workDate: string
  checkIn?: string | null
  checkOut?: string | null
  status: string
  note?: string | null
}) {
  return apiRequest<AttendanceRecord>(API_URLS.user, '/api/hr/attendance', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}
