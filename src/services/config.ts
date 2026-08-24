function normalizeUrl(value?: string) {
  if (!value) return ''
  return value.replace(/\/+$/, '')
}

export const ENABLE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false'
const defaultApi = import.meta.env.PROD ? 'https://smartsale-api.onrender.com' : 'http://localhost:3001'
const rawApiUrl = import.meta.env.VITE_API_URL
const sharedApiUrl = normalizeUrl(rawApiUrl && rawApiUrl !== 'http://localhost:3001' ? rawApiUrl : (import.meta.env.PROD ? defaultApi : (rawApiUrl || defaultApi)))

export const API_URLS = {
  // Production Render setup uses a single SmartSale API. The three explicit values
  // remain supported only for a staged migration from older services.
  user: normalizeUrl(import.meta.env.VITE_USER_API_URL || sharedApiUrl),
  order: normalizeUrl(import.meta.env.VITE_ORDER_API_URL || sharedApiUrl),
  product: normalizeUrl(import.meta.env.VITE_PRODUCT_API_URL || sharedApiUrl),
}
