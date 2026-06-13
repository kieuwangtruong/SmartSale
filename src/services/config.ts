function normalizeUrl(value: string) {
  return value.replace(/\/+$/, '')
}

export const API_URLS = {
  user: normalizeUrl(
    import.meta.env.VITE_USER_API_URL ??
      'https://nhom3-sales-and-inventory-management.onrender.com',
  ),
  order: normalizeUrl(
    import.meta.env.VITE_ORDER_API_URL ??
      'https://nhom2-sales-and-inventory-management.onrender.com',
  ),
  product: normalizeUrl(
    import.meta.env.VITE_PRODUCT_API_URL ??
      'https://nhom1-sales-and-inventory-management.onrender.com',
  ),
}
