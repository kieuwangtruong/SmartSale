import { apiRequest, type AuthSession, type AuthUser, type UserRole } from './apiClient'
import { API_URLS } from './config'

export type UserDto = AuthUser

export interface CreateUserPayload {
  userName: string
  fullName: string
  email: string
  passwordHash: string
  dateOfBirth: string
  role: UserRole | number
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

export function loginUser(payload: { email: string; password: string }) {
  return apiRequest<AuthSession>(API_URLS.user, '/api/User/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logoutUser(payload: { refreshToken: string }) {
  return apiRequest<unknown>(API_URLS.user, '/api/User/logout', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function getUsers() {
  return apiRequest<UserDto[]>(API_URLS.user, '/api/User', { auth: true })
}

export function createUser(payload: CreateUserPayload) {
  return apiRequest<UserDto>(API_URLS.user, '/api/User', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function updateUser(payload: UpdateUserPayload) {
  return apiRequest<UserDto>(API_URLS.user, `/api/User/${payload.id}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  })
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
