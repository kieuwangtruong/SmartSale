function normalizeUrl(value?: string) {
  if (!value) return ''
  return value.replace(/\/+$/, '')
}

function resolveApiUrl(specificUrl?: string): string {
  const isProd = import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  const defaultProdApi = 'https://smartsale-api.onrender.com'

  if (isProd) {
    if (specificUrl && !specificUrl.includes('localhost') && !specificUrl.includes('127.0.0.1')) {
      return normalizeUrl(specificUrl)
    }
    const raw = import.meta.env.VITE_API_URL
    if (raw && !raw.includes('localhost') && !raw.includes('127.0.0.1')) {
      return normalizeUrl(raw)
    }
    return defaultProdApi
  }

  // Local development
  if (specificUrl) return normalizeUrl(specificUrl)
  if (import.meta.env.VITE_API_URL) return normalizeUrl(import.meta.env.VITE_API_URL)
  return 'http://localhost:3001'
}

export const ENABLE_MOCK_FALLBACK = import.meta.env.VITE_ENABLE_MOCK_FALLBACK !== 'false'

export const API_URLS = {
  user: resolveApiUrl(import.meta.env.VITE_USER_API_URL),
  order: resolveApiUrl(import.meta.env.VITE_ORDER_API_URL),
  product: resolveApiUrl(import.meta.env.VITE_PRODUCT_API_URL),
}
