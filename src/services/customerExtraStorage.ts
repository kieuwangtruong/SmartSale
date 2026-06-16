const STORAGE_KEY = 'sales-inventory-customer-extras'
const META_PATTERN = /^\[\[KH:g=(\d+);c=([^;]*);a=([^\]]*)\]\](.*)$/s

export interface CustomerExtras {
  gender?: number | null
  cccd?: string | null
  age?: number | null
}

type ExtraStore = Record<string, CustomerExtras>

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function loadStore(): ExtraStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ExtraStore) : {}
  } catch {
    return {}
  }
}

function saveStore(store: ExtraStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function storeKey(id: number) {
  return `id:${id}`
}

function phoneKey(phone: string) {
  const normalized = normalizePhone(phone)
  return normalized ? `phone:${normalized}` : ''
}

export function encodeAddressWithExtras(
  address: string | null | undefined,
  extras: CustomerExtras,
): string {
  const plain = decodeAddressWithExtras(address).plainAddress
  const gender = extras.gender ?? 0
  const cccd = (extras.cccd ?? '').replace(/;/g, '')
  const age = extras.age ?? ''
  return `[[KH:g=${gender};c=${cccd};a=${age}]]${plain}`
}

export function decodeAddressWithExtras(address: string | null | undefined): {
  plainAddress: string
  extras: CustomerExtras
} {
  if (!address) return { plainAddress: '', extras: {} }
  const match = address.match(META_PATTERN)
  if (!match) return { plainAddress: address, extras: {} }
  const ageRaw = match[3]
  return {
    plainAddress: match[4] ?? '',
    extras: {
      gender: Number(match[1]),
      cccd: match[2] || null,
      age: ageRaw ? Number(ageRaw) : null,
    },
  }
}

export function getCustomerExtras(customerId: number, phone?: string): CustomerExtras {
  const store = loadStore()
  const byId = store[storeKey(customerId)]
  if (byId) return byId
  if (phone) {
    const byPhone = store[phoneKey(phone)]
    if (byPhone) return byPhone
  }
  return {}
}

export function setCustomerExtras(customerId: number, phone: string, extras: CustomerExtras) {
  const store = loadStore()
  store[storeKey(customerId)] = extras
  const pKey = phoneKey(phone)
  if (pKey) store[pKey] = extras
  saveStore(store)
}

export function removeCustomerExtras(customerId: number, phone?: string) {
  const store = loadStore()
  delete store[storeKey(customerId)]
  if (phone) delete store[phoneKey(phone)]
  saveStore(store)
}

export function normalizeCustomerFormExtras(form: {
  gender?: number | null
  cccd?: string | null
  age?: number | null
}): CustomerExtras {
  return {
    gender: form.gender ?? 0,
    cccd: form.cccd?.trim() || null,
    age: form.age && form.age > 0 ? form.age : null,
  }
}

export function mergeCustomerExtras<T extends { id: number; phone: string; address?: string | null }>(
  customer: T,
): T & CustomerExtras & { address?: string | null } {
  const decoded = decodeAddressWithExtras(customer.address)
  const stored = getCustomerExtras(customer.id, customer.phone)
  return {
    ...customer,
    address: decoded.plainAddress || null,
    gender: stored.gender ?? decoded.extras.gender ?? 0,
    cccd: stored.cccd ?? decoded.extras.cccd ?? null,
    age: stored.age ?? decoded.extras.age ?? null,
  }
}
