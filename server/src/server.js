import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import OpenAI from 'openai'
import { PayOS } from '@payos/node'
import { query } from './db.js'

const app = express()
const roles = new Set(['Admin', 'SalesStaff', 'WarehouseKeeper', 'Customer'])
const orderStatuses = new Set([
  'Pending', 'PendingPayment', 'ProcessingPayment', 'Paid', 'PaymentCancelled',
  'PaymentExpired', 'PaymentFailed', 'Processing', 'Shipped', 'Completed', 'Cancelled',
  'RefundRequested', 'Refunded', 'RefundRejected',
])
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS || process.env.PUBLIC_WEB_URL || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

app.disable('x-powered-by')
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    return callback(new Error('Origin không được phép gọi API.'))
  },
}))
app.use(express.json({ limit: '256kb' }))

function apiError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function integer(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function text(value, maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function requireValue(value, label) {
  const result = text(value)
  if (!result) throw apiError(400, `${label} là bắt buộc.`)
  return result
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null
}

function userDto(row) {
  return {
    id: Number(row.id),
    userName: row.userName,
    fullName: row.fullName,
    email: row.email,
    role: row.role,
    dateOfBirth: row.dateOfBirth ?? '',
    sex: row.sex ?? 0,
    address: row.address ?? '',
    createdAt: toIso(row.createdAt),
    lastModified: toIso(row.lastModifiedAt),
  }
}

function productDto(row) {
  return {
    id: Number(row.id), name: row.name, description: row.description,
    importPrice: number(row.importPrice), sellingPrice: number(row.sellingPrice),
    originalPrice: number(row.originalPrice), salePrice: row.salePrice === null ? null : number(row.salePrice),
    imageUrl: row.imageUrl, imageUrls: row.imageUrls ?? [], imageItems: row.imageItems ?? [],
    categoryId: row.categoryId === null ? 0 : Number(row.categoryId), categoryName: row.categoryName ?? 'Chưa phân loại',
    supplierId: row.supplierId === null ? 0 : Number(row.supplierId), supplierName: row.supplierName ?? 'Chưa có nhà cung cấp',
    quantity: integer(row.quantity), reserveStock: integer(row.reserveStock), variants: [],
  }
}

function customerDto(row) {
  return {
    id: Number(row.id), fullName: row.fullName, phone: row.phone, email: row.email,
    address: row.address, gender: row.gender, cccd: row.cccd, age: row.age,
    tier: row.tier, totalSpent: number(row.totalSpent), currentDebt: number(row.currentDebt),
    orderCount: integer(row.orderCount), createdAt: toIso(row.createdAt), lastModifiedAt: toIso(row.lastModifiedAt),
  }
}

function supplierDto(row) {
  return {
    id: Number(row.id), name: row.name, contactName: row.contactName, phone: row.phone,
    email: row.email, address: row.address, notes: row.notes,
    createdAt: toIso(row.createdAt), lastModifiedAt: toIso(row.lastModifiedAt),
  }
}

function ensureJwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw apiError(503, 'JWT_SECRET chưa được cấu hình an toàn trên Render.')
  }
  return process.env.JWT_SECRET
}

function signTokens(user) {
  const payload = { sub: String(user.id), role: user.role, email: user.email }
  const secret = ensureJwtSecret()
  return {
    accessToken: jwt.sign(payload, secret, { expiresIn: '8h' }),
    refreshToken: jwt.sign({ ...payload, type: 'refresh' }, secret, { expiresIn: '30d' }),
  }
}

function authenticate(req, _res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw apiError(401, 'Bạn cần đăng nhập.')
    const payload = jwt.verify(token, ensureJwtSecret())
    req.user = { id: Number(payload.sub), role: payload.role, email: payload.email }
    return next()
  } catch (error) {
    return next(error.statusCode ? error : apiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'))
  }
}

function requireRoles(...permitted) {
  return (req, _res, next) => {
    if (!permitted.includes(req.user?.role)) return next(apiError(403, 'Bạn không có quyền thực hiện thao tác này.'))
    return next()
  }
}

async function findUser(id) {
  const [row] = await query(
    `SELECT id, user_name AS "userName", full_name AS "fullName", email, role,
            date_of_birth AS "dateOfBirth", sex, address, created_at AS "createdAt",
            last_modified_at AS "lastModifiedAt"
     FROM users WHERE id = $1`, [id],
  )
  return row ? userDto(row) : null
}

function payos() {
  const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = process.env
  if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) {
    throw apiError(503, 'PayOS chưa được cấu hình trên Render.')
  }
  return new PayOS({ clientId: PAYOS_CLIENT_ID, apiKey: PAYOS_API_KEY, checksumKey: PAYOS_CHECKSUM_KEY })
}

async function listOrderItems(orderId) {
  const rows = await query(
    `SELECT id, product_id AS "productId", product_name AS "productName", quantity, price, sub_total AS "subTotal"
     FROM order_items WHERE order_id = $1 ORDER BY id`, [orderId],
  )
  return rows.map((row) => ({ ...row, id: Number(row.id), productId: Number(row.productId), quantity: integer(row.quantity), price: number(row.price), subTotal: number(row.subTotal) }))
}

async function orderDto(row) {
  return {
    id: Number(row.id), userId: row.userId === null ? 0 : Number(row.userId),
    customerId: row.customerId === null ? null : Number(row.customerId), customerName: row.customerName,
    salesStaffId: row.salesStaffId === null ? null : Number(row.salesStaffId), salesStaffName: row.salesStaffName,
    status: row.status, paymentMethod: row.paymentMethod, subtotal: number(row.subtotal),
    discountAmount: number(row.discountAmount), total: number(row.total), amountPaid: number(row.amountPaid),
    debtAmount: number(row.debtAmount), paymentOrderCode: row.paymentOrderCode === null ? null : Number(row.paymentOrderCode),
    payOsTransactionReference: row.payOsTransactionReference, createdAt: toIso(row.createdAt),
    lastModifiedAt: toIso(row.lastModifiedAt), orderItems: await listOrderItems(row.id),
  }
}

const orderSelect = `SELECT o.*, o.user_id AS "userId", o.customer_id AS "customerId",
  o.sales_staff_id AS "salesStaffId", o.payment_method AS "paymentMethod",
  o.discount_amount AS "discountAmount", o.amount_paid AS "amountPaid", o.debt_amount AS "debtAmount",
  o.payment_order_code AS "paymentOrderCode", o.payos_transaction_reference AS "payOsTransactionReference",
  o.created_at AS "createdAt", o.last_modified_at AS "lastModifiedAt",
  c.full_name AS "customerName", s.full_name AS "salesStaffName"
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN users s ON s.id = o.sales_staff_id`

async function getOrder(id) {
  const [row] = await query(`${orderSelect} WHERE o.id = $1`, [id])
  return row ? orderDto(row) : null
}

async function ensureCustomer(payload, userId = null) {
  if (userId) {
    const [existing] = await query('SELECT id FROM customers WHERE user_id = $1', [userId])
    if (existing) return Number(existing.id)
  }
  const [created] = await query(
    `INSERT INTO customers (user_id, full_name, phone, email, address)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userId, requireValue(payload.fullName, 'Họ tên'), requireValue(payload.phone, 'Số điện thoại'), text(payload.email, 254) || null, text(payload.address) || null],
  )
  return Number(created.id)
}

async function createOrderFromItems({ userId, customerId, items, paymentMethod, discountAmount = 0 }) {
  if (!Array.isArray(items) || !items.length || items.length > 30) throw apiError(400, 'Giỏ hàng không hợp lệ.')
  const resolved = []
  for (const item of items) {
    const productId = integer(item.productId)
    const quantity = integer(item.quantity)
    if (!productId || quantity < 1) throw apiError(400, 'Sản phẩm hoặc số lượng không hợp lệ.')
    const [product] = await query(
      `SELECT id, name, quantity, COALESCE(NULLIF(sale_price, 0), selling_price) AS price
       FROM products WHERE id = $1`, [productId],
    )
    if (!product) throw apiError(404, `Không tìm thấy sản phẩm #${productId}.`)
    if (integer(product.quantity) < quantity) throw apiError(409, `${product.name} không đủ tồn kho.`)
    resolved.push({ productId, productName: product.name, quantity, price: number(product.price), subTotal: number(product.price) * quantity })
  }
  const subtotal = resolved.reduce((sum, item) => sum + item.subTotal, 0)
  const discount = Math.max(0, Math.min(number(discountAmount), subtotal))
  const total = subtotal - discount
  const [order] = await query(
    `INSERT INTO orders (user_id, customer_id, sales_staff_id, status, payment_method, subtotal, discount_amount, total, amount_paid, debt_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [userId, customerId, userId, paymentMethod === 'PayOS' ? 'PendingPayment' : 'Pending', paymentMethod, subtotal, discount, total, paymentMethod === 'Cash' ? total : 0, paymentMethod === 'Cash' ? 0 : total],
  )
  for (const item of resolved) {
    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, sub_total)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [order.id, item.productId, item.productName, item.quantity, item.price, item.subTotal],
    )
  }
  return { id: Number(order.id), items: resolved, total }
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  const configured = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET)
  if (!configured) return res.status(503).json({ ok: false, configured: false })
  await query('SELECT 1')
  return res.json({ ok: true, configured: true })
}))

app.post('/api/User/login', asyncRoute(async (req, res) => {
  const email = requireValue(req.body.email, 'Email').toLowerCase()
  const password = requireValue(req.body.password, 'Mật khẩu')
  const [row] = await query(
    `SELECT id, user_name AS "userName", full_name AS "fullName", email, password_hash AS "passwordHash", role,
            date_of_birth AS "dateOfBirth", sex, address, created_at AS "createdAt", last_modified_at AS "lastModifiedAt"
     FROM users WHERE email = $1`, [email],
  )
  if (!row || !(await bcrypt.compare(password, row.passwordHash))) throw apiError(401, 'Email hoặc mật khẩu không đúng.')
  const user = userDto(row)
  return res.json({ ...signTokens(user), user })
}))

app.post('/api/User/refresh', asyncRoute(async (req, res) => {
  try {
    const payload = jwt.verify(requireValue(req.body.refreshToken, 'Refresh token'), ensureJwtSecret())
    if (payload.type !== 'refresh') throw apiError(401, 'Refresh token không hợp lệ.')
    const user = await findUser(Number(payload.sub))
    if (!user) throw apiError(401, 'Người dùng không tồn tại.')
    return res.json(signTokens(user))
  } catch (error) {
    throw error.statusCode ? error : apiError(401, 'Refresh token không hợp lệ hoặc đã hết hạn.')
  }
}))

app.post('/api/User/register-customer', asyncRoute(async (req, res) => {
  const email = requireValue(req.body.email, 'Email').toLowerCase()
  const password = requireValue(req.body.password, 'Mật khẩu')
  if (password.length < 8) throw apiError(400, 'Mật khẩu cần ít nhất 8 ký tự.')
  const [created] = await query(
    `INSERT INTO users (user_name, full_name, email, password_hash, role, date_of_birth, sex, address)
     VALUES ($1, $2, $3, $4, 'Customer', $5, $6, $7)
     RETURNING id`,
    [requireValue(req.body.userName, 'Tên đăng nhập'), requireValue(req.body.fullName, 'Họ tên'), email,
      await bcrypt.hash(password, 12), req.body.dateOfBirth || null, integer(req.body.sex), text(req.body.address) || null],
  )
  const user = await findUser(Number(created.id))
  return res.status(201).json(user)
}))

app.get('/api/User/me', authenticate, asyncRoute(async (req, res) => {
  const user = await findUser(req.user.id)
  if (!user) throw apiError(404, 'Không tìm thấy người dùng.')
  res.json(user)
}))

app.get('/api/User', authenticate, requireRoles('Admin'), asyncRoute(async (_req, res) => {
  const rows = await query(`SELECT id, user_name AS "userName", full_name AS "fullName", email, role,
    date_of_birth AS "dateOfBirth", sex, address, created_at AS "createdAt", last_modified_at AS "lastModifiedAt" FROM users ORDER BY id DESC`)
  res.json(rows.map(userDto))
}))

app.post('/api/User', authenticate, requireRoles('Admin'), asyncRoute(async (req, res) => {
  const role = roles.has(req.body.role) ? req.body.role : 'SalesStaff'
  const password = requireValue(req.body.passwordHash, 'Mật khẩu')
  const [created] = await query(
    `INSERT INTO users (user_name, full_name, email, password_hash, role, date_of_birth, sex, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [requireValue(req.body.userName, 'Tên đăng nhập'), requireValue(req.body.fullName, 'Họ tên'), requireValue(req.body.email, 'Email').toLowerCase(),
      await bcrypt.hash(password, 12), role, req.body.dateOfBirth || null, integer(req.body.sex), text(req.body.address) || null],
  )
  res.status(201).json(await findUser(Number(created.id)))
}))

app.get('/api/products', asyncRoute(async (_req, res) => {
  const rows = await query(`SELECT p.id, p.name, p.description, p.import_price AS "importPrice", p.selling_price AS "sellingPrice",
    p.original_price AS "originalPrice", p.sale_price AS "salePrice", p.image_url AS "imageUrl", p.image_urls AS "imageUrls", p.image_items AS "imageItems",
    p.category_id AS "categoryId", p.supplier_id AS "supplierId", p.quantity, p.reserve_stock AS "reserveStock", c.name AS "categoryName", s.name AS "supplierName"
    FROM products p LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN suppliers s ON s.id = p.supplier_id ORDER BY p.id DESC`)
  res.json(rows.map(productDto))
}))

app.post('/api/products', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (req, res) => {
  const body = req.body
  const [created] = await query(
    `INSERT INTO products (name, description, import_price, selling_price, original_price, sale_price, image_url, image_urls, image_items, category_id, supplier_id, quantity, reserve_stock)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13) RETURNING id`,
    [requireValue(body.name, 'Tên sản phẩm'), text(body.description) || null, Math.max(0, number(body.importPrice)), Math.max(0, number(body.sellingPrice)),
      Math.max(0, number(body.originalPrice, number(body.sellingPrice))), body.salePrice === null || body.salePrice === undefined ? null : Math.max(0, number(body.salePrice)),
      text(body.imageUrl, 2000) || null, JSON.stringify(Array.isArray(body.imageUrls) ? body.imageUrls : []), JSON.stringify(Array.isArray(body.imageItems) ? body.imageItems : []),
      integer(body.categoryId) || null, integer(body.supplierId) || null, Math.max(0, integer(body.quantity)), Math.max(0, integer(body.reserveStock))],
  )
  const [row] = await query(`SELECT p.id, p.name, p.description, p.import_price AS "importPrice", p.selling_price AS "sellingPrice", p.original_price AS "originalPrice", p.sale_price AS "salePrice", p.image_url AS "imageUrl", p.image_urls AS "imageUrls", p.image_items AS "imageItems", p.category_id AS "categoryId", p.supplier_id AS "supplierId", p.quantity, p.reserve_stock AS "reserveStock", c.name AS "categoryName", s.name AS "supplierName" FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN suppliers s ON s.id=p.supplier_id WHERE p.id=$1`, [created.id])
  res.status(201).json(productDto(row))
}))

app.put('/api/products/:id', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (req, res) => {
  const body = req.body
  await query(`UPDATE products SET name=$1, description=$2, import_price=$3, selling_price=$4, original_price=$5, sale_price=$6, image_url=$7, image_urls=$8::jsonb, image_items=$9::jsonb, category_id=$10, supplier_id=$11, quantity=$12, reserve_stock=$13, last_modified_at=now() WHERE id=$14`,
    [requireValue(body.name, 'Tên sản phẩm'), text(body.description) || null, Math.max(0, number(body.importPrice)), Math.max(0, number(body.sellingPrice)), Math.max(0, number(body.originalPrice, number(body.sellingPrice))), body.salePrice === null || body.salePrice === undefined ? null : Math.max(0, number(body.salePrice)), text(body.imageUrl, 2000) || null, JSON.stringify(Array.isArray(body.imageUrls) ? body.imageUrls : []), JSON.stringify(Array.isArray(body.imageItems) ? body.imageItems : []), integer(body.categoryId) || null, integer(body.supplierId) || null, Math.max(0, integer(body.quantity)), Math.max(0, integer(body.reserveStock)), integer(req.params.id)])
  const [row] = await query(`SELECT p.id, p.name, p.description, p.import_price AS "importPrice", p.selling_price AS "sellingPrice", p.original_price AS "originalPrice", p.sale_price AS "salePrice", p.image_url AS "imageUrl", p.image_urls AS "imageUrls", p.image_items AS "imageItems", p.category_id AS "categoryId", p.supplier_id AS "supplierId", p.quantity, p.reserve_stock AS "reserveStock", c.name AS "categoryName", s.name AS "supplierName" FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN suppliers s ON s.id=p.supplier_id WHERE p.id=$1`, [integer(req.params.id)])
  if (!row) throw apiError(404, 'Không tìm thấy sản phẩm.')
  res.json(productDto(row))
}))

app.delete('/api/products/:id', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (req, res) => {
  await query('DELETE FROM products WHERE id = $1', [integer(req.params.id)])
  res.status(204).end()
}))

app.get('/api/categories', asyncRoute(async (_req, res) => {
  const rows = await query('SELECT id, name, parent_category_id AS "parentCategoryId" FROM categories ORDER BY name')
  res.json(rows.map((row) => ({ ...row, id: Number(row.id), parentCategoryId: row.parentCategoryId === null ? null : Number(row.parentCategoryId) })))
}))

app.post('/api/categories', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (req, res) => {
  const [row] = await query('INSERT INTO categories (name, parent_category_id) VALUES ($1, $2) RETURNING id, name, parent_category_id AS "parentCategoryId"', [requireValue(req.body.name, 'Tên danh mục'), integer(req.body.parentCategoryId) || null])
  res.status(201).json({ ...row, id: Number(row.id), parentCategoryId: row.parentCategoryId === null ? null : Number(row.parentCategoryId) })
}))

app.get('/api/inventory/low-stock', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (_req, res) => {
  const rows = await query('SELECT id AS "productId", name AS "productName", quantity, reserve_stock AS "reserveStock" FROM products WHERE quantity <= reserve_stock ORDER BY quantity ASC')
  res.json(rows.map((row) => ({ ...row, productId: Number(row.productId), quantity: integer(row.quantity), reserveStock: integer(row.reserveStock) })))
}))

async function stockReceiptDto(row) {
  const items = await query(`SELECT sri.product_id AS "productId", p.name AS "productName", sri.quantity, sri.import_price AS "importPrice"
    FROM stock_receipt_items sri JOIN products p ON p.id=sri.product_id WHERE sri.receipt_id=$1 ORDER BY sri.id`, [row.id])
  return {
    id: Number(row.id), supplierId: row.supplierId === null ? 0 : Number(row.supplierId), supplierName: row.supplierName ?? '—',
    note: row.note, status: row.status, invoiceNumber: row.invoiceNumber, importDate: String(row.importDate).slice(0, 10),
    createdAt: toIso(row.createdAt), submittedAt: toIso(row.submittedAt), approvedAt: toIso(row.approvedAt), confirmedAt: toIso(row.confirmedAt),
    createdByUserId: row.createdByUserId === null ? 0 : Number(row.createdByUserId), approvedByUserId: row.approvedByUserId === null ? null : Number(row.approvedByUserId),
    totalAmount: items.reduce((sum, item) => sum + integer(item.quantity) * number(item.importPrice), 0),
    items: items.map((item) => ({ ...item, productId: Number(item.productId), quantity: integer(item.quantity), importPrice: number(item.importPrice) })),
  }
}

const stockReceiptSelect = `SELECT sr.id, sr.supplier_id AS "supplierId", sr.note, sr.status, sr.invoice_number AS "invoiceNumber",
  sr.import_date AS "importDate", sr.created_at AS "createdAt", sr.submitted_at AS "submittedAt", sr.approved_at AS "approvedAt",
  sr.confirmed_at AS "confirmedAt", sr.created_by_user_id AS "createdByUserId", sr.approved_by_user_id AS "approvedByUserId", s.name AS "supplierName"
  FROM stock_receipts sr LEFT JOIN suppliers s ON s.id=sr.supplier_id`

app.get('/api/stock-receipts', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (_req, res) => {
  const rows = await query(`${stockReceiptSelect} ORDER BY sr.id DESC`)
  res.json(await Promise.all(rows.map(stockReceiptDto)))
}))

app.post('/api/stock-receipts', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (req, res) => {
  const b = req.body
  if (!Array.isArray(b.items) || !b.items.length) throw apiError(400, 'Phiếu nhập cần có ít nhất một mặt hàng.')
  const [receipt] = await query(`INSERT INTO stock_receipts (supplier_id, invoice_number, import_date, note, created_by_user_id)
    VALUES ($1,$2,$3,$4,$5) RETURNING id`, [integer(b.supplierId) || null, requireValue(b.invoiceNumber,'Mã hóa đơn'), b.importDate || new Date().toISOString().slice(0,10), text(b.note) || null, req.user.id])
  for (const item of b.items) {
    const productId = integer(item.productId)
    const quantity = integer(item.quantity)
    if (!productId || quantity < 1) throw apiError(400, 'Mặt hàng nhập không hợp lệ.')
    await query('INSERT INTO stock_receipt_items (receipt_id, product_id, quantity, import_price) VALUES ($1,$2,$3,$4)', [receipt.id, productId, quantity, Math.max(0, number(item.importPrice))])
  }
  const [row] = await query(`${stockReceiptSelect} WHERE sr.id=$1`, [receipt.id])
  res.status(201).json(await stockReceiptDto(row))
}))

app.post('/api/stock-receipts/:id/submit', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (req, res) => {
  const [row] = await query(`UPDATE stock_receipts SET status='PendingApproval', submitted_at=now() WHERE id=$1 AND status='Draft' RETURNING id`, [integer(req.params.id)])
  if (!row) throw apiError(409, 'Chỉ có thể gửi duyệt phiếu nháp.')
  const [updated] = await query(`${stockReceiptSelect} WHERE sr.id=$1`, [row.id])
  res.json(await stockReceiptDto(updated))
}))

app.post('/api/stock-receipts/:id/approve', authenticate, requireRoles('Admin'), asyncRoute(async (req, res) => {
  const id = integer(req.params.id)
  const [receipt] = await query(`UPDATE stock_receipts SET status='Confirmed', approved_at=now(), confirmed_at=now(), approved_by_user_id=$1 WHERE id=$2 AND status='PendingApproval' RETURNING id`, [req.user.id, id])
  if (!receipt) throw apiError(409, 'Phiếu nhập không ở trạng thái chờ duyệt.')
  const items = await query('SELECT product_id AS "productId", quantity, import_price AS "importPrice" FROM stock_receipt_items WHERE receipt_id=$1', [id])
  for (const item of items) await query('UPDATE products SET quantity=quantity+$1, import_price=$2, last_modified_at=now() WHERE id=$3', [integer(item.quantity), number(item.importPrice), item.productId])
  const [updated] = await query(`${stockReceiptSelect} WHERE sr.id=$1`, [id])
  res.json(await stockReceiptDto(updated))
}))

app.post('/api/stock-receipts/:id/reject', authenticate, requireRoles('Admin'), asyncRoute(async (req, res) => {
  const [row] = await query(`UPDATE stock_receipts SET status='Rejected', approved_at=now(), approved_by_user_id=$1 WHERE id=$2 AND status='PendingApproval' RETURNING id`, [req.user.id, integer(req.params.id)])
  if (!row) throw apiError(409, 'Phiếu nhập không ở trạng thái chờ duyệt.')
  const [updated] = await query(`${stockReceiptSelect} WHERE sr.id=$1`, [row.id])
  res.json(await stockReceiptDto(updated))
}))

app.get('/api/suppliers', authenticate, requireRoles('Admin', 'WarehouseKeeper', 'SalesStaff'), asyncRoute(async (_req, res) => {
  const rows = await query('SELECT id, name, contact_name AS "contactName", phone, email, address, notes, created_at AS "createdAt", last_modified_at AS "lastModifiedAt" FROM suppliers ORDER BY id DESC')
  res.json(rows.map(supplierDto))
}))

app.post('/api/suppliers', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (req, res) => {
  const b = req.body
  const [row] = await query('INSERT INTO suppliers (name, contact_name, phone, email, address, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, contact_name AS "contactName", phone, email, address, notes, created_at AS "createdAt", last_modified_at AS "lastModifiedAt"', [requireValue(b.name, 'Tên nhà cung cấp'), text(b.contactName), text(b.phone), text(b.email, 254) || null, text(b.address) || null, text(b.notes) || null])
  res.status(201).json(supplierDto(row))
}))

app.put('/api/suppliers/:id', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (req, res) => {
  const b = req.body
  const [row] = await query('UPDATE suppliers SET name=$1, contact_name=$2, phone=$3, email=$4, address=$5, notes=$6, last_modified_at=now() WHERE id=$7 RETURNING id, name, contact_name AS "contactName", phone, email, address, notes, created_at AS "createdAt", last_modified_at AS "lastModifiedAt"', [requireValue(b.name, 'Tên nhà cung cấp'), text(b.contactName), text(b.phone), text(b.email,254) || null, text(b.address) || null, text(b.notes) || null, integer(req.params.id)])
  if (!row) throw apiError(404, 'Không tìm thấy nhà cung cấp.')
  res.json(supplierDto(row))
}))

app.delete('/api/suppliers/:id', authenticate, requireRoles('Admin', 'WarehouseKeeper'), asyncRoute(async (req, res) => {
  await query('DELETE FROM suppliers WHERE id=$1', [integer(req.params.id)])
  res.status(204).end()
}))

app.get('/api/customers', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (_req, res) => {
  const rows = await query(`SELECT c.id, c.full_name AS "fullName", c.phone, c.email, c.address, c.gender, c.cccd, c.age, c.tier, c.created_at AS "createdAt", c.last_modified_at AS "lastModifiedAt", COALESCE(SUM(o.total) FILTER (WHERE o.status NOT IN ('Cancelled','PaymentCancelled','PaymentExpired')),0) AS "totalSpent", COALESCE(SUM(o.debt_amount),0) AS "currentDebt", COUNT(o.id) AS "orderCount" FROM customers c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id ORDER BY c.id DESC`)
  res.json(rows.map(customerDto))
}))

app.post('/api/customers', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const b = req.body
  const [row] = await query(`INSERT INTO customers (full_name,phone,email,address,gender,cccd,age,tier) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, full_name AS "fullName", phone, email, address, gender, cccd, age, tier, created_at AS "createdAt", last_modified_at AS "lastModifiedAt"`, [requireValue(b.fullName,'Họ tên'),requireValue(b.phone,'Số điện thoại'),text(b.email,254)||null,text(b.address)||null,b.gender ?? null,text(b.cccd,64)||null,integer(b.age)||null,text(b.tier,30)||null])
  res.status(201).json(customerDto({ ...row, totalSpent: 0, currentDebt: 0, orderCount: 0 }))
}))

app.get('/api/Order', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (_req, res) => {
  const rows = await query(`${orderSelect} ORDER BY o.id DESC`)
  res.json(await Promise.all(rows.map(orderDto)))
}))

app.get('/api/Order/my-purchases', authenticate, asyncRoute(async (req, res) => {
  const rows = await query(`${orderSelect} WHERE o.user_id=$1 ORDER BY o.id DESC`, [req.user.id])
  res.json(await Promise.all(rows.map(orderDto)))
}))

app.post('/api/Order', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const data = await createOrderFromItems({ userId: req.user.id, customerId: integer(req.body.customerId) || null, items: req.body.orderItems, paymentMethod: 'Cash', discountAmount: req.body.discountAmount })
  res.status(201).json(await getOrder(data.id))
}))

app.post('/api/Order/customer-cash', authenticate, requireRoles('Customer'), asyncRoute(async (req, res) => {
  const customerId = await ensureCustomer(req.body, req.user.id)
  const data = await createOrderFromItems({ userId: req.user.id, customerId, items: req.body.orderItems, paymentMethod: 'Cash' })
  res.status(201).json(await getOrder(data.id))
}))

app.post('/api/payments/links', authenticate, requireRoles('Customer'), asyncRoute(async (req, res) => {
  const customerId = await ensureCustomer(req.body, req.user.id)
  const data = await createOrderFromItems({ userId: req.user.id, customerId, items: req.body.orderItems, paymentMethod: 'PayOS' })
  const orderCode = Date.now()
  const publicWebUrl = requireValue(process.env.PUBLIC_WEB_URL, 'PUBLIC_WEB_URL').replace(/\/$/, '')
  const link = await payos().paymentRequests.create({
    orderCode, amount: Math.round(data.total), description: `Thanh toan #${orderCode}`.slice(0, 25),
    items: data.items.map((item) => ({ name: item.productName.slice(0, 100), quantity: item.quantity, price: Math.round(item.price) })),
    returnUrl: `${publicWebUrl}/#/payment/success?orderCode=${orderCode}`,
    cancelUrl: `${publicWebUrl}/#/payment/cancelled?orderCode=${orderCode}`,
  })
  await query('UPDATE orders SET payment_order_code=$1, last_modified_at=now() WHERE id=$2', [orderCode, data.id])
  res.status(201).json({ orderId: data.id, orderCode, checkoutUrl: link.checkoutUrl, expiresAt: link.expiredAt ? new Date(link.expiredAt * 1000).toISOString() : new Date(Date.now() + 15 * 60 * 1000).toISOString() })
}))

app.get('/api/payments/:orderCode', asyncRoute(async (req, res) => {
  const code = Number(req.params.orderCode)
  const [row] = await query(`${orderSelect} WHERE o.payment_order_code=$1`, [code])
  if (!row) throw apiError(404, 'Không tìm thấy giao dịch.')
  try {
    const payment = await payos().paymentRequests.get(code)
    if (payment.status === 'PAID' && row.status !== 'Paid') await query(`UPDATE orders SET status='Paid', amount_paid=total, debt_amount=0, payos_transaction_reference=$1, last_modified_at=now() WHERE id=$2`, [payment.transactions?.[0]?.reference ?? null, row.id])
    if (payment.status === 'CANCELLED' && !['Paid','PaymentCancelled'].includes(row.status)) await query(`UPDATE orders SET status='PaymentCancelled', last_modified_at=now() WHERE id=$1`, [row.id])
  } catch (error) {
    console.warn('Could not refresh PayOS status:', error.message)
  }
  const updated = await getOrder(row.id)
  res.json({ orderId: updated.id, orderCode: Number(updated.paymentOrderCode), status: updated.status, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() })
}))

app.post('/api/webhooks/payos', asyncRoute(async (req, res) => {
  const verified = await payos().webhooks.verify(req.body)
  const data = verified?.data ?? verified
  const orderCode = Number(data?.orderCode)
  if (!Number.isSafeInteger(orderCode)) throw apiError(400, 'Webhook PayOS thiếu orderCode hợp lệ.')
  await query(`UPDATE orders SET status='Paid', amount_paid=total, debt_amount=0, payos_transaction_reference=$1, last_modified_at=now() WHERE payment_order_code=$2 AND status <> 'Paid'`, [data.reference ?? data.transactionDateTime ?? null, orderCode])
  res.status(200).send('OK')
}))

app.put('/api/Order/:id/status', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const status = requireValue(req.body.status, 'Trạng thái')
  if (!orderStatuses.has(status)) throw apiError(400, 'Trạng thái đơn hàng không hợp lệ.')
  await query('UPDATE orders SET status=$1, last_modified_at=now() WHERE id=$2', [status, integer(req.params.id)])
  const order = await getOrder(integer(req.params.id))
  if (!order) throw apiError(404, 'Không tìm thấy đơn hàng.')
  res.json(order)
}))

app.get('/api/reports/dashboard', authenticate, requireRoles('Admin'), asyncRoute(async (_req, res) => {
  const [summary] = await query(`SELECT COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('day', now()) AND status NOT IN ('Cancelled','PaymentCancelled','PaymentExpired')),0) AS "revenueToday", COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('week', now()) AND status NOT IN ('Cancelled','PaymentCancelled','PaymentExpired')),0) AS "revenueThisWeek", COALESCE(SUM(total) FILTER (WHERE created_at >= date_trunc('month', now()) AND status NOT IN ('Cancelled','PaymentCancelled','PaymentExpired')),0) AS "revenueThisMonth", COUNT(*) AS "orderCount" FROM orders`)
  const topProducts = await query(`SELECT oi.product_id AS "productId", oi.product_name AS "productName", SUM(oi.quantity) AS "quantitySold", SUM(oi.sub_total) AS revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status NOT IN ('Cancelled','PaymentCancelled','PaymentExpired') GROUP BY oi.product_id, oi.product_name ORDER BY revenue DESC LIMIT 5`)
  const topCustomers = await query(`SELECT c.id AS "customerId", c.full_name AS "customerName", COUNT(o.id) AS "orderCount", COALESCE(SUM(o.total),0) AS revenue, COALESCE(SUM(o.debt_amount),0) AS debt FROM customers c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id, c.full_name ORDER BY revenue DESC LIMIT 5`)
  res.json({ revenueToday:number(summary.revenueToday), revenueThisWeek:number(summary.revenueThisWeek), revenueThisMonth:number(summary.revenueThisMonth), orderCount:integer(summary.orderCount), topProducts:topProducts.map((r)=>({...r,productId:Number(r.productId),quantitySold:integer(r.quantitySold),revenue:number(r.revenue)})), topCustomers:topCustomers.map((r)=>({...r,customerId:Number(r.customerId),orderCount:integer(r.orderCount),revenue:number(r.revenue),debt:number(r.debt)})) })
}))

app.get('/api/reports/revenue-chart', authenticate, requireRoles('Admin'), asyncRoute(async (req, res) => {
  const groupBy = req.query.groupBy === 'month' ? 'month' : 'day'
  const dateFormat = groupBy === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'
  const rows = await query(`SELECT to_char(date_trunc($1, created_at), $2) AS label, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS "orderCount" FROM orders WHERE status NOT IN ('Cancelled','PaymentCancelled','PaymentExpired') GROUP BY 1 ORDER BY 1`, [groupBy, dateFormat])
  res.json({ groupBy, from: rows[0]?.label ?? '', to: rows.at(-1)?.label ?? '', labels: rows.map((r)=>r.label), revenue:rows.map((r)=>number(r.revenue)), orderCount:rows.map((r)=>integer(r.orderCount)) })
}))

async function activeChatSession(userId) {
  const [existing] = await query('SELECT id FROM chat_sessions WHERE user_id=$1 AND ended_at IS NULL ORDER BY id DESC LIMIT 1', [userId])
  if (existing) return Number(existing.id)
  const [created] = await query('INSERT INTO chat_sessions (user_id) VALUES ($1) RETURNING id', [userId])
  return Number(created.id)
}

app.get('/api/chatbot/session', authenticate, asyncRoute(async (req, res) => {
  const sessionId = await activeChatSession(req.user.id)
  const messages = await query('SELECT role, content, created_at AS "createdAt" FROM chat_messages WHERE session_id=$1 ORDER BY id', [sessionId])
  res.json({ id: sessionId, messages: messages.map((message) => ({ ...message, createdAt: toIso(message.createdAt) })) })
}))

app.post('/api/chatbot/messages', authenticate, asyncRoute(async (req, res) => {
  const message = requireValue(req.body.message, 'Tin nhắn').slice(0, 2000)
  if (!process.env.OPENAI_API_KEY) throw apiError(503, 'OPENAI_API_KEY chưa được cấu hình trên Render.')
  const sessionId = await activeChatSession(req.user.id)
  const history = await query('SELECT role, content FROM chat_messages WHERE session_id=$1 ORDER BY id DESC LIMIT 12', [sessionId])
  const products = await query('SELECT id, name, COALESCE(NULLIF(sale_price,0), selling_price) AS price, quantity FROM products WHERE quantity > 0 ORDER BY id DESC LIMIT 12')
  const catalog = products.map((p) => `#${p.id} ${p.name} — ${Math.round(number(p.price)).toLocaleString('vi-VN')}đ (còn ${p.quantity})`).join('\n') || 'Chưa có sản phẩm nào trong cơ sở dữ liệu.'
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.6', store: false,
    instructions: `Bạn là trợ lý SmartSale. Trả lời bằng tiếng Việt, ngắn gọn, chính xác. Chỉ tư vấn dựa trên danh mục dưới đây; không bịa giá, tồn kho hoặc chính sách. Nếu không có dữ liệu, nói rõ và mời khách liên hệ nhân viên.\n\nDanh mục:\n${catalog}`,
    input: [...history.reverse().map((item) => ({ role: item.role, content: item.content })), { role: 'user', content: message }],
  })
  const reply = response.output_text?.trim() || 'Xin lỗi, tôi chưa thể trả lời ngay lúc này.'
  await query('INSERT INTO chat_messages (session_id, role, content) VALUES ($1,$2,$3),($1,$4,$5)', [sessionId, 'user', message, 'assistant', reply])
  const matched = products.filter((product) => message.toLowerCase().includes(String(product.name).toLowerCase().slice(0, 12))).slice(0, 3)
  const messages = await query('SELECT role, content, created_at AS "createdAt" FROM chat_messages WHERE session_id=$1 ORDER BY id', [sessionId])
  res.json({ sessionId, reply, actions: matched.map((product) => ({ type: 'open-product', productId: Number(product.id), label: `Xem ${product.name}` })), messages: messages.map((item) => ({ ...item, createdAt: toIso(item.createdAt) })) })
}))

app.post('/api/chatbot/session/end', authenticate, asyncRoute(async (req, res) => {
  await query('UPDATE chat_sessions SET ended_at=now() WHERE user_id=$1 AND ended_at IS NULL', [req.user.id])
  res.status(204).end()
}))

app.use((error, _req, res, _next) => {
  const status = error.statusCode || (error.name === 'JsonWebTokenError' ? 401 : 500)
  if (status >= 500) console.error(error)
  res.status(status).json({ message: error.message || 'Máy chủ gặp lỗi không mong muốn.' })
})

const port = Number(process.env.PORT || 10000)
app.listen(port, () => console.log(`SmartSale API listening on ${port}`))
