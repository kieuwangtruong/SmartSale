import { API_URLS } from './config'
import { getErrorMessage, translateApiMessage } from './apiMessages'

export type UserRole = 'SalesStaff' | 'Admin' | 'WarehouseKeeper' | 'Customer'

export const USER_ROLES: Array<{ value: UserRole; label: string; apiValue: number }> = [
  { value: 'SalesStaff', label: 'Nhan vien ban hang', apiValue: 0 },
  { value: 'Admin', label: 'Quan tri vien', apiValue: 1 },
  { value: 'WarehouseKeeper', label: 'Thu kho', apiValue: 2 },
  { value: 'Customer', label: 'Khach hang', apiValue: 3 },
]

export interface AuthUser {
  id: number
  userName: string
  fullName: string
  email: string
  role: UserRole
  dateOfBirth: string
  sex: number
  address: string
  paidOrderCount?: number
  customerTier?: string
  customerTierLabel?: string
  workStatus?: string
  createdAt: string
  lastModified?: string | null
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

interface ApiEnvelope<T> {
  success?: boolean
  data?: T
  message?: string
}

interface RequestOptions extends RequestInit {
  auth?: boolean
  retry?: boolean
}

const AUTH_KEY = 'sales-inventory-auth'
let session = loadSession()
let refreshPromise: Promise<string | null> | null = null

export function normalizeRole(role: unknown): UserRole {
  if (role === 1 || role === '1' || role === 'Admin') return 'Admin'
  if (role === 2 || role === '2' || role === 'WarehouseKeeper') return 'WarehouseKeeper'
  if (role === 3 || role === '3' || role === 'Customer') return 'Customer'
  return 'SalesStaff'
}

export function getRoleLabel(role: unknown) {
  const normalizedRole = normalizeRole(role)
  return USER_ROLES.find((item) => item.value === normalizedRole)?.label ?? normalizedRole
}

export function getRoleApiValue(role: UserRole) {
  return USER_ROLES.find((item) => item.value === role)?.apiValue ?? 0
}

function loadSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null
    parsed.user.role = normalizeRole(parsed.user.role)
    return parsed
  } catch {
    localStorage.removeItem(AUTH_KEY)
    return null
  }
}

export function getSession() {
  return session
}

export function saveSession(nextSession: AuthSession) {
  nextSession.user.role = normalizeRole(nextSession.user.role)
  session = nextSession
  localStorage.setItem(AUTH_KEY, JSON.stringify(nextSession))
  window.dispatchEvent(new Event('auth-changed'))
}

export function clearSession() {
  session = null
  localStorage.removeItem(AUTH_KEY)
  window.dispatchEvent(new Event('auth-changed'))
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  let payload: ApiEnvelope<T> | T | null = null

  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T> | T
    } catch {
      throw new Error(translateApiMessage(text))
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as ApiEnvelope<T>).message || response.statusText)
        : response.statusText
    throw new Error(translateApiMessage(message || `HTTP ${response.status}`))
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data as T
  }

  return payload as T
}

async function refreshAccessToken(): Promise<string | null> {
  if (!session?.refreshToken) return null
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URLS.user}/api/User/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session?.refreshToken }),
      })
      const result = await parseResponse<{ accessToken: string }>(response)
      if (!session) return null
      session.accessToken = result.accessToken
      saveSession(session)
      return result.accessToken
    } catch {
      clearSession()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export { getErrorMessage, translateApiMessage } from './apiMessages'

export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (options.auth && session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers })

  if (response.status === 401 && options.auth && options.retry !== false) {
    const accessToken = await refreshAccessToken()
    if (accessToken) {
      return apiRequest<T>(baseUrl, path, { ...options, retry: false })
    }
  }

  return await parseResponse<T>(response)
}
