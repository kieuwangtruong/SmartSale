import {
  apiRequest,
  getRoleApiValue,
  normalizeRole,
  getSession,
  ApiError,
  type AuthSession,
  type AuthUser,
  type UserRole,
} from './apiClient'
import { API_URLS, ENABLE_MOCK_FALLBACK } from './config'

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
  {
    id: 5,
    userName: 'cust_diamond',
    fullName: 'Phạm Quốc Việt (VIP Kim Cương)',
    email: 'diamond@smartsale.com',
    role: 'Customer',
    customerTier: 'Platinum',
    customerTierLabel: 'Kim Cương',
    totalSpent: 27520000,
    dateOfBirth: '1994-06-15',
    sex: 0,
    address: 'Số 45 Lê Duẩn, Quận 1, TP. HCM',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 6,
    userName: 'cust_gold',
    fullName: 'Nguyễn Thị Tuyết Mai (VIP Vàng)',
    email: 'gold@smartsale.com',
    role: 'Customer',
    customerTier: 'Gold',
    customerTierLabel: 'Vàng',
    totalSpent: 12930000,
    dateOfBirth: '1998-09-20',
    sex: 1,
    address: 'Số 18 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 7,
    userName: 'cust_silver',
    fullName: 'Lê Thu Hương (VIP Bạc)',
    email: 'silver@smartsale.com',
    role: 'Customer',
    customerTier: 'Silver',
    customerTierLabel: 'Bạc',
    totalSpent: 4230000,
    dateOfBirth: '1996-03-12',
    sex: 1,
    address: 'Số 88 Hoàng Hoa Thám, Tây Hồ, Hà Nội',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 8,
    userName: 'cust_bronze',
    fullName: 'Lê Hải Đăng (VIP Đồng)',
    email: 'bronze@smartsale.com',
    role: 'Customer',
    customerTier: 'Bronze',
    customerTierLabel: 'Đồng',
    totalSpent: 1500000,
    dateOfBirth: '1999-11-05',
    sex: 0,
    address: 'Số 12 Quang Trung, Hà Đông, Hà Nội',
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

export async function checkEmailExists(email: string): Promise<{ exists: boolean; email: string; role?: string; fullName?: string }> {
  const emailClean = email.trim().toLowerCase()
  if (API_URLS.user) {
    try {
      return await apiRequest<{ exists: boolean; email: string; role?: string; fullName?: string }>(
        API_URLS.user,
        '/api/User/check-email',
        {
          method: 'POST',
          body: JSON.stringify({ email: emailClean }),
        },
      )
    } catch {
      // ignore and fallback
    }
  }
  const knownEmails = ['admin@smartsale.vn', 'nv.thuan@smartsale.vn', 'tk.khanh@smartsale.vn', 'viet.diamond@gmail.com', 'mai.gold@gmail.com', 'huong.silver@gmail.com', 'dang.bronze@gmail.com', 'minhquan.customer@gmail.com']
  const exists = knownEmails.includes(emailClean)
  return { exists, email: emailClean }
}

export async function loginUser(payload: { email: string; password: string }): Promise<AuthSession> {
  if (API_URLS.user) {
    try {
      return await apiRequest<AuthSession>(API_URLS.user, '/api/User/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    } catch (err: any) {
      // If server responded with a business error (401 wrong password, 404 email not found, 400 bad request),
      // re-throw it so the UI can display exact and helpful messages!
      if (err instanceof ApiError && err.status) {
        throw err
      }
      if (!ENABLE_MOCK_FALLBACK) {
        throw err
      }
      console.warn('[UserApi] Remote server unreachable, using local demo authentication fallback:', err)
    }
  }

  // Standalone / Vercel demo fallback authentication
  const emailLower = payload.email.toLowerCase().trim()
  const knownDemoEmails: Record<string, { role: UserRole; fullName: string; tier?: string; tierLabel?: string; totalSpent?: number }> = {
    'admin@smartsale.vn': { role: 'Admin', fullName: 'Quản trị viên (Demo Admin)' },
    'quantri@smartsale.vn': { role: 'Admin', fullName: 'Quản trị viên' },
    'tk.khanh@smartsale.vn': { role: 'WarehouseKeeper', fullName: 'Khánh (Thủ kho)' },
    'nv.thuan@smartsale.vn': { role: 'SalesStaff', fullName: 'Thuận (Nhân viên Sales)' },
    'viet.diamond@gmail.com': { role: 'Customer', fullName: 'Phạm Quốc Việt (VIP Kim Cương)', tier: 'Platinum', tierLabel: 'Kim Cương', totalSpent: 27520000 },
    'mai.gold@gmail.com': { role: 'Customer', fullName: 'Nguyễn Thị Tuyết Mai (VIP Vàng)', tier: 'Gold', tierLabel: 'Vàng', totalSpent: 12930000 },
    'huong.silver@gmail.com': { role: 'Customer', fullName: 'Lê Thu Hương (VIP Bạc)', tier: 'Silver', tierLabel: 'Bạc', totalSpent: 4230000 },
    'dang.bronze@gmail.com': { role: 'Customer', fullName: 'Lê Hải Đăng (VIP Đồng)', tier: 'Bronze', tierLabel: 'Đồng', totalSpent: 1500000 },
    'minhquan.customer@gmail.com': { role: 'Customer', fullName: 'Minh Quân (Khách hàng)' },
  }

  // Check demo known accounts
  const match = knownDemoEmails[emailLower]
  if (!match) {
    // If not matching any keyword in mock either, raise EMAIL_NOT_FOUND
    const isKeywordMatch = emailLower.includes('admin') || emailLower.includes('staff') || emailLower.includes('thukho') || emailLower.includes('diamond') || emailLower.includes('gold') || emailLower.includes('silver') || emailLower.includes('bronze') || emailLower.includes('minhquan')
    if (!isKeywordMatch) {
      throw new ApiError(
        'Email này chưa được đăng ký tài khoản trong hệ thống. Vui lòng đăng ký tài khoản mới.',
        404,
        'EMAIL_NOT_FOUND',
      )
    }
  }

  let role: UserRole = match?.role || 'Customer'
  let fullName = match?.fullName || 'Khách hàng Thành viên'
  let customerTier = match?.tier
  let customerTierLabel = match?.tierLabel
  let totalSpent = match?.totalSpent

  if (!match) {
    if (emailLower.includes('admin')) {
      role = 'Admin'
      fullName = 'Quản trị viên (Demo Admin)'
    } else if (emailLower.includes('thukho')) {
      role = 'WarehouseKeeper'
      fullName = 'Khánh (Thủ kho)'
    } else if (emailLower.includes('staff') || emailLower.includes('thuan')) {
      role = 'SalesStaff'
      fullName = 'Thuận (Nhân viên Sales)'
    }
  }

  const mockUser: AuthUser = {
    id: 1,
    userName: emailLower.split('@')[0] || 'customer',
    fullName: fullName,
    email: payload.email,
    role: role,
    dateOfBirth: '1998-01-01',
    sex: 1,
    address: 'Hà Nội, Việt Nam',
    customerTier,
    customerTierLabel,
    totalSpent,
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
      console.warn('[UserApi] Remote getMyProfile failed, using session/local fallback:', err)
    }
  }

  const currentSession = getSession()
  if (currentSession?.user) {
    return normalizeUser({
      id: currentSession.user.id,
      userName: currentSession.user.userName,
      fullName: currentSession.user.fullName,
      email: currentSession.user.email,
      role: currentSession.user.role,
      dateOfBirth: currentSession.user.dateOfBirth,
      sex: currentSession.user.sex,
      address: currentSession.user.address,
      workStatus: currentSession.user.workStatus,
      paidOrderCount: currentSession.user.paidOrderCount,
      totalSpent: currentSession.user.totalSpent,
      customerTier: currentSession.user.customerTier,
      customerTierLabel: currentSession.user.customerTierLabel,
      createdAt: currentSession.user.createdAt,
      lastModified: currentSession.user.lastModified,
    })
  }

  return normalizeUser(DEFAULT_MOCK_USERS[0]!)
}

export async function logoutUser(_payload?: { refreshToken?: string }): Promise<unknown> {
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
