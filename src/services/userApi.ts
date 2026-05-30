export interface ApiResponse<T> {
  success?: boolean
  data?: T
  message?: string
}

export interface UserDto {
  id: number
  userName: string
  fullName: string
  email: string
  role: string
  dateOfBirth: string
  sex: number
  address: string
  createdAt: string
  lastModified?: string | null
}

export interface CreateUserPayload {
  userName?: string | null
  fullName?: string | null
  email?: string | null
  passwordHash?: string | null
  dateOfBirth?: string | null
  sex?: number | null
  address?: string | null
}

export interface UpdateUserPayload extends CreateUserPayload {
  id: number
}

export interface LoginRequestPayload {
  email?: string | null
  password?: string | null
}

export interface RefreshRequestPayload {
  refreshToken?: string | null
}

export interface LogoutRequestPayload {
  refreshToken?: string | null
  deviceId?: string | null
}

export interface LoginResponsePayload {
  accessToken: string
  refreshToken: string
  user: UserDto
}

export interface RefreshResponsePayload {
  accessToken: string
}

interface StoredAuthState {
  accessToken: string
  refreshToken: string
}

const DEFAULT_BASE_URL = 'https://nhom3-sales-and-inventory-management.onrender.com'
const AUTH_STORAGE_KEY = 'front-end-sales-and-inventory-user-auth'

let authState = readStoredAuth()

function normalizeBaseUrl(value: string) {
  try {
    return new URL(value).origin
  } catch {
    return value.replace(/\/$/, '')
  }
}

const baseUrl = normalizeBaseUrl(import.meta.env.VITE_USER_API_URL ?? DEFAULT_BASE_URL)

function readStoredAuth(): StoredAuthState | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthState>
    if (!parsed.accessToken || !parsed.refreshToken) {
      return null
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    }
  } catch {
    return null
  }
}

function persistAuthState(nextState: StoredAuthState | null) {
  authState = nextState

  if (typeof window === 'undefined') {
    return
  }

  if (!nextState) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState))
}

export function getStoredUserAuth() {
  return authState
}

export function setStoredUserAuth(nextState: StoredAuthState) {
  persistAuthState(nextState)
}

export function clearStoredUserAuth() {
  persistAuthState(null)
}

interface RequestOptions extends RequestInit {
  auth?: boolean
}

async function request<T>(path: string, init?: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }

  if (init?.auth && authState?.accessToken) {
    headers.Authorization = `Bearer ${authState.accessToken}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers,
    ...init,
  })

  const text = await response.text()
  let payload: ApiResponse<T> | T | string | null = null

  if (text) {
    try {
      payload = JSON.parse(text) as ApiResponse<T> | T
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as ApiResponse<T>).message ?? response.statusText)
        : response.statusText

    throw new Error(message || 'Không thể kết nối tới user service')
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiResponse<T>).data as T
  }

  return payload as T
}

export function getUserApiBaseUrl() {
  return baseUrl
}

export function getUsers() {
  return request<UserDto[]>('/api/User')
}

export function getUserById(id: number) {
  return request<UserDto>(`/api/User/${id}`)
}

export function getUserByUsername(userName: string) {
  return request<UserDto | UserDto[] | null>(`/api/User/by-username?userName=${encodeURIComponent(userName)}`, {
    auth: true,
  })
}

export function getUserByEmail(email: string) {
  return request<UserDto | UserDto[] | null>(`/api/User/by-email?email=${encodeURIComponent(email)}`, {
    auth: true,
  })
}

export function createUser(payload: CreateUserPayload) {
  return request<UserDto>('/api/User', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateUser(payload: UpdateUserPayload) {
  return request<UserDto>(`/api/User/${payload.id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
      auth: true,
  })
}

export function deleteUser(id: number) {
  return request<{ success?: boolean; message?: string }>(`/api/User/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function login(payload: LoginRequestPayload) {
  return request<LoginResponsePayload>('/api/User/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function refresh(payload: RefreshRequestPayload) {
  return request<RefreshResponsePayload>('/api/User/refresh', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function logout(payload: LogoutRequestPayload) {
  return request<unknown>('/api/User/logout', {
    method: 'POST',
    body: JSON.stringify(payload),
    auth: true,
  })
}