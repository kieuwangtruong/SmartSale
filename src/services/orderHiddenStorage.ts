const STORAGE_KEY = 'sales-inventory-hidden-orders'

function loadIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as number[]) : []
  } catch {
    return []
  }
}

function saveIds(ids: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]))
}

export function isOrderHiddenLocally(id: number) {
  return loadIds().includes(id)
}

export function hideOrderLocally(id: number) {
  saveIds([...loadIds(), id])
}

export function unhideOrderLocally(id: number) {
  saveIds(loadIds().filter((x) => x !== id))
}

export function filterVisibleOrders<T extends { id: number }>(orders: T[]) {
  const hidden = new Set(loadIds())
  return orders.filter((o) => !hidden.has(o.id))
}
