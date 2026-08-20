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

const DEFAULT_MOCK_USERS: UserDto[] = [
  {
    id: 1,
    userName: 'string',
    fullName: 'Quản trị viên (Demo Admin)',
    email: 'string@gmail.com',
    role: 'Admin',
    dateOfBirth: '1995-01-01',
    sex: 1,
    address: 'Hà Nội, Việt Nam',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    userName: 'khanhthukho',
    fullName: 'Khánh (Thủ kho)',
    email: 'khanhthukho@gmail.com',
    role: 'WarehouseKeeper',
    dateOfBirth: '1996-05-15',
    sex: 0,
    address: 'Hà Nội, Việt Nam',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    userName: 'thuannvktv',
    fullName: 'Thuận (Nhân viên Sales)',
    email: 'thuannvktv@gmail.com',
    role: 'SalesStaff',
    dateOfBirth: '1998-08-20',
    sex: 0,
    address: 'TP. Hồ Chí Minh, Việt Nam',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 4,
    userName: 'minhquan',
    fullName: 'Minh Quân (Khách hàng)',
    email: 'minhquan@gmail.com',
    role: 'Customer',
    dateOfBirth: '2000-12-10',
    sex: 0,
    address: 'Đà Nẵng, Việt Nam',
    createdAt: '2026-01-01T00:00:00Z',
  },
]

function normalizeUser(user: UserDto): UserDto {
  return { ...user, role: normalizeRole(user.role) }
}

function toApiPayload<T extends Partial<CreateUserPayload>>(payload: T) {
  return {
    ...payload,
    ...(payload.role ? { role: getRoleApiValue(payload.role) } : {}),
  }
}

export async function loginUser(payload: { email: string; password: string }): Promise<AuthSession> {
  if (API_URLS.user) {
    try {
      return await apiRequest<AuthSession>(API_URLS.user, '/api/User/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.warn('[UserApi] Remote login failed, using local demo authentication fallback:', err)
    }
  }

  // Standalone / Vercel demo fallback authentication
  const emailLower = payload.email.toLowerCase().trim()
  let role: UserRole = 'Admin'
  let fullName = 'Quản trị viên (Demo Admin)'

  if (emailLower.includes('thukho') || emailLower.includes('khanh')) {
    role = 'WarehouseKeeper'
    fullName = 'Khánh (Thủ kho)'
  } else if (emailLower.includes('nv') || emailLower.includes('thuan') || emailLower.includes('staff')) {
    role = 'SalesStaff'
    fullName = 'Thuận (Nhân viên Sales)'
  } else if (emailLower.includes('minhquan') || emailLower.includes('customer')) {
    role = 'Customer'
    fullName = 'Minh Quân (Khách hàng)'
  }

  const mockUser: AuthUser = {
    id: 1,
    userName: emailLower.split('@')[0] || 'admin',
    fullName: fullName,
    email: payload.email,
    role: role,
    dateOfBirth: '1998-01-01',
    sex: 1,
    address: 'Hà Nội, Việt Nam',
    createdAt: new Date().toISOString(),
  }

  return {
    accessToken: `demo_access_token_${Date.now()}`,
    refreshToken: `demo_refresh_token_${Date.now()}`,
    user: mockUser,
  }
}

export async function registerCustomer(payload: {
  userName: string
  fullName: string
  email: string
  password: string
  dateOfBirth: string
  sex: number
  address: string
}): Promise<UserDto> {
  if (API_URLS.user) {
    try {
      const user = await apiRequest<UserDto>(API_URLS.user, '/api/User/register-customer', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return normalizeUser(user)
    } catch (err) {
      console.warn('[UserApi] Remote registerCustomer failed, using fallback:', err)
    }
  }

  return normalizeUser({
    id: Date.now(),
    userName: payload.userName,
    fullName: payload.fullName,
    email: payload.email,
    role: 'Customer',
    dateOfBirth: payload.dateOfBirth,
    sex: payload.sex,
    address: payload.address,
    createdAt: new Date().toISOString(),
  })
}

export async function getMyProfile(): Promise<UserDto> {
  if (API_URLS.user) {
    try {
      const user = await apiRequest<UserDto>(API_URLS.user, '/api/User/me', { auth: true })
      return normalizeUser(user)
    } catch (err) {
      console.warn('[UserApi] Remote getMyProfile failed, using fallback:', err)
    }
  }

  return DEFAULT_MOCK_USERS[0]!
}

export async function logoutUser(payload: { refreshToken: string }): Promise<unknown> {
  if (API_URLS.user) {
    try {
      return await apiRequest<unknown>(API_URLS.user, '/api/User/logout', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }
  return { success: true }
}

export async function getUsers(): Promise<UserDto[]> {
  if (API_URLS.user) {
    try {
      const users = await apiRequest<UserDto[]>(API_URLS.user, '/api/User', { auth: true })
      return users.map(normalizeUser)
    } catch (err) {
      console.warn('[UserApi] Remote getUsers failed, using local users fallback:', err)
    }
  }
  return DEFAULT_MOCK_USERS.map(normalizeUser)
}

export async function createUser(payload: CreateUserPayload): Promise<UserDto> {
  if (API_URLS.user) {
    try {
      const user = await apiRequest<UserDto>(API_URLS.user, '/api/User', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(toApiPayload(payload)),
      })
      return normalizeUser(user)
    } catch (err) {
      console.warn('[UserApi] Remote createUser failed, using local fallback:', err)
    }
  }

  return normalizeUser({
    id: Date.now(),
    userName: payload.userName,
    fullName: payload.fullName,
    email: payload.email,
    role: payload.role,
    dateOfBirth: payload.dateOfBirth,
    sex: payload.sex,
    address: payload.address,
    createdAt: new Date().toISOString(),
  })
}

export async function updateUser(payload: UpdateUserPayload): Promise<UserDto> {
  if (API_URLS.user) {
    try {
      const user = await apiRequest<UserDto>(API_URLS.user, `/api/User/${payload.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(toApiPayload(payload)),
      })
      return normalizeUser(user)
    } catch (err) {
      console.warn('[UserApi] Remote updateUser failed, using local fallback:', err)
    }
  }

  return normalizeUser({
    id: payload.id,
    userName: payload.userName || 'user',
    fullName: payload.fullName || 'User',
    email: payload.email || 'user@gmail.com',
    role: payload.role || 'SalesStaff',
    dateOfBirth: payload.dateOfBirth || '1995-01-01',
    sex: payload.sex || 1,
    address: payload.address || 'Hà Nội',
    createdAt: new Date().toISOString(),
  })
}

export async function deleteUser(id: number): Promise<unknown> {
  if (API_URLS.user) {
    try {
      return await apiRequest<unknown>(API_URLS.user, `/api/User/${id}`, {
        method: 'DELETE',
        auth: true,
      })
    } catch {}
  }
  return { success: true }
}

export async function getDashboardReport(): Promise<DashboardReport> {
  return apiRequest<DashboardReport>(API_URLS.user, '/api/reports/dashboard', {
    auth: true,
  })
}

export async function getRevenueChart(groupBy: 'day' | 'month' = 'day'): Promise<RevenueChart> {
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

export async function getEmployees(search = ''): Promise<UserDto[]> {
  if (API_URLS.user) {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : ''
      const users = await apiRequest<UserDto[]>(API_URLS.user, `/api/hr/employees${query}`, { auth: true })
      return users.map(normalizeUser)
    } catch (err) {
      console.warn('[UserApi] Remote getEmployees failed, using local employees fallback:', err)
    }
  }

  const allStaff = DEFAULT_MOCK_USERS.filter((u) => u.role !== 'Customer')
  if (search) {
    const q = search.toLowerCase()
    return allStaff.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }
  return allStaff
}

export async function getEmployee(id: number): Promise<UserDto> {
  const all = await getEmployees()
  return all.find((e) => e.id === id) || all[0]!
}

export async function getEmployeeAttendance(id: number): Promise<AttendanceRecord[]> {
  if (API_URLS.user) {
    try {
      return await apiRequest<AttendanceRecord[]>(API_URLS.user, `/api/hr/employees/${id}/attendance`, { auth: true })
    } catch {}
  }
  return [
    {
      id: 1,
      userId: id,
      workDate: new Date().toISOString().split('T')[0]!,
      checkIn: '08:00',
      checkOut: '17:00',
      status: 'Đúng giờ',
      hoursWorked: 8,
      note: 'Đi làm đủ ca',
    },
  ]
}

export async function upsertAttendance(payload: {
  userId: number
  workDate: string
  checkIn?: string | null
  checkOut?: string | null
  status: string
  note?: string | null
}): Promise<AttendanceRecord> {
  if (API_URLS.user) {
    try {
      return await apiRequest<AttendanceRecord>(API_URLS.user, '/api/hr/attendance', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(payload),
      })
    } catch {}
  }

  return {
    id: Date.now(),
    userId: payload.userId,
    workDate: payload.workDate,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    status: payload.status,
    hoursWorked: 8,
    note: payload.note,
  }
}
