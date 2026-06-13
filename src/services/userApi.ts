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
