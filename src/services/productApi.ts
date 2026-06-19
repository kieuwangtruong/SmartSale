import { apiRequest } from './apiClient'
import { API_URLS } from './config'

export interface Product {
  id: number
  name: string
  description?: string | null
  importPrice: number
  sellingPrice: number
  originalPrice: number
  salePrice?: number | null
  imageUrl?: string | null
  imageUrls?: string[]
  imageItems?: ProductImageItem[]
  variants: ProductVariant[]
  categoryId: number
  categoryName: string
  supplierId: number
  supplierName: string
  quantity: number
  reserveStock: number
}

export interface ProductImageItem {
  id?: number
  imageUrl: string
  sortOrder?: number
}

export interface ProductVariantColor {
  id: number
  name: string
  hexCode?: string | null
  quantity: number
  isActive: boolean
  images: ProductImageItem[]
}

export interface ProductVariant {
  id: number
  productId: number
  name: string
  sku: string
  originalPrice: number
  salePrice?: number | null
  sellingPrice: number
  quantity: number
  reserveStock: number
  isActive: boolean
  colors: ProductVariantColor[]
}

export interface ProductVariantPayload {
  name: string
  sku: string
  originalPrice: number
  salePrice?: number | null
  quantity: number
  reserveStock: number
  isActive: boolean
}

export interface ProductVariantColorPayload {
  name: string
  hexCode?: string | null
  quantity: number
  isActive: boolean
  imageUrls: string[]
}

type ProductApiResponse = Product & {
  Description?: string | null
  ImageUrls?: string[] | null
  ImageItems?: ProductImageItem[] | null
}

export interface Category {
  id: number
  name: string
  parentCategoryId?: number | null
}

export interface ProductPayload {
  name: string
  description?: string | null
  importPrice: number
  sellingPrice: number
  originalPrice?: number | null
  salePrice?: number | null
  imageUrl?: string | null
  imageUrls?: string[]
  imageItems?: ProductImageItem[]
  categoryId: number
  supplierId: number
  quantity: number
  reserveStock: number
}

export interface StockReceipt {
  id: number
  supplierId: number
  supplierName: string
  note?: string | null
  status: 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Confirmed' | 'Cancelled'
  invoiceNumber: string
  importDate: string
  createdAt: string
  submittedAt?: string | null
  approvedAt?: string | null
  confirmedAt?: string | null
  createdByUserId: number
  approvedByUserId?: number | null
  totalAmount: number
  items: Array<{
    productId: number
    productName: string
    quantity: number
    importPrice: number
  }>
}

function normalizeProduct(product: ProductApiResponse): Product {
  return {
    ...product,
    description: product.description ?? product.Description ?? null,
    imageUrls: product.imageUrls ?? product.ImageUrls ?? [],
    imageItems: product.imageItems ?? product.ImageItems ?? [],
    variants: product.variants ?? [],
  }
}

export function getProducts() {
  return apiRequest<ProductApiResponse[]>(API_URLS.product, '/api/products')
    .then((products) => products.map(normalizeProduct))
}

export function createProduct(payload: ProductPayload) {
  return apiRequest<ProductApiResponse>(API_URLS.product, '/api/products', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  }).then(normalizeProduct)
}

export function updateProduct(id: number, payload: ProductPayload) {
  return apiRequest<ProductApiResponse>(API_URLS.product, `/api/products/${id}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ id, ...payload }),
  }).then(normalizeProduct)
}

export function deleteProduct(id: number) {
  return apiRequest<unknown>(API_URLS.product, `/api/products/${id}`, {
    method: 'DELETE',
    auth: true,
  })
}

export function createProductVariant(productId: number, payload: ProductVariantPayload) {
  return apiRequest<ProductVariant>(API_URLS.product, `/api/product-variants/product/${productId}`, {
    method: 'POST', auth: true, body: JSON.stringify(payload),
  })
}

export function updateProductVariant(id: number, payload: ProductVariantPayload) {
  return apiRequest<ProductVariant>(API_URLS.product, `/api/product-variants/${id}`, {
    method: 'PUT', auth: true, body: JSON.stringify(payload),
  })
}

export function createVariantColor(variantId: number, payload: ProductVariantColorPayload) {
  return apiRequest<ProductVariantColor>(API_URLS.product, `/api/product-variants/${variantId}/colors`, {
    method: 'POST', auth: true, body: JSON.stringify(payload),
  })
}

export function updateVariantColor(id: number, payload: ProductVariantColorPayload) {
  return apiRequest<ProductVariantColor>(API_URLS.product, `/api/product-variants/colors/${id}`, {
    method: 'PUT', auth: true, body: JSON.stringify(payload),
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
  invoiceNumber?: string
  importDate?: string
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
  return apiRequest<StockReceipt>(API_URLS.product, `/api/stock-receipts/${id}/approve`, {
    method: 'POST',
    auth: true,
  })
}

export function submitStockReceipt(id: number) {
  return apiRequest<StockReceipt>(API_URLS.product, `/api/stock-receipts/${id}/submit`, {
    method: 'POST',
    auth: true,
  })
}

export function cancelStockReceipt(id: number) {
  return apiRequest<unknown>(API_URLS.product, `/api/stock-receipts/${id}/reject`, {
    method: 'POST',
    auth: true,
  })
}
