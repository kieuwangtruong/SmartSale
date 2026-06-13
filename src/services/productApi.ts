import { apiRequest } from './apiClient'
import { API_URLS } from './config'

export interface Product {
  id: number
  productCode: string
  name: string
  importPrice: number
  sellingPrice: number
  imageUrl?: string | null
  categoryId: number
  categoryName: string
  quantity: number
  reserveStock: number
}

export interface Category {
  id: number
  name: string
  parentCategoryId?: number | null
}

export interface ProductPayload {
  productCode: string
  name: string
  importPrice: number
  sellingPrice: number
  imageUrl?: string | null
  categoryId: number
  quantity: number
  reserveStock: number
}

export interface StockReceipt {
  id: number
  supplierId: number
  supplierName: string
  note?: string | null
  status: 'Draft' | 'Confirmed' | 'Cancelled'
  createdAt: string
  confirmedAt?: string | null
  createdByUserId: number
  items: Array<{
    productId: number
    productName: string
    quantity: number
    importPrice: number
  }>
}

export function getProducts() {
  return apiRequest<Product[]>(API_URLS.product, '/api/products')
}

export function createProduct(payload: ProductPayload) {
  return apiRequest<Product>(API_URLS.product, '/api/products', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function updateProduct(id: number, payload: ProductPayload) {
  return apiRequest<Product>(API_URLS.product, `/api/products/${id}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ id, ...payload }),
  })
}

export function deleteProduct(id: number) {
  return apiRequest<unknown>(API_URLS.product, `/api/products/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function getCategories() {
  return apiRequest<Category[]>(API_URLS.product, '/api/categories')
}

export function createCategory(payload: Omit<Category, 'id'>) {
  return apiRequest<Category>(API_URLS.product, '/api/categories', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function updateInventory(productId: number, quantity: number, reserveStock: number) {
  return apiRequest<unknown>(API_URLS.product, '/api/inventory', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ productId, quantity, reserveStock }),
  })
}

export function getLowStock() {
  return apiRequest<Array<{ productId: number; productName: string; quantity: number; reserveStock: number }>>(
    API_URLS.product,
    '/api/inventory/low-stock',
    { auth: true },
  )
}

export function getStockReceipts() {
  return apiRequest<StockReceipt[]>(API_URLS.product, '/api/stock-receipts', {
    auth: true,
  })
}

export function createStockReceipt(payload: {
  supplierId: number
  note?: string
  items: Array<{ productId: number; quantity: number; importPrice: number }>
}) {
  return apiRequest<StockReceipt>(API_URLS.product, '/api/stock-receipts', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  })
}

export function confirmStockReceipt(id: number) {
  return apiRequest<StockReceipt>(API_URLS.product, `/api/stock-receipts/${id}/confirm`, {
    method: 'POST',
    auth: true,
  })
}

export function cancelStockReceipt(id: number) {
  return apiRequest<unknown>(API_URLS.product, `/api/stock-receipts/${id}/cancel`, {
    method: 'POST',
    auth: true,
  })
}
