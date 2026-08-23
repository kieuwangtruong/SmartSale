import 'dotenv/config'
import bcrypt from 'bcryptjs'
import cors from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import OpenAI from 'openai'
import { PayOS } from '@payos/node'
import { query } from './db.js'
import { openApiSpec, swaggerHtml } from './openapi.js'

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

app.get('/', (_req, res) => {
  res.json({
    status: 'online',
    service: 'SmartSale REST API Server',
    version: '1.0.0',
    database: 'Neon Serverless PostgreSQL (Connected)',
    docsUrl: 'http://localhost:3001/docs',
    endpoints: [
      'GET /api/products',
      'GET /api/categories',
      'GET /api/suppliers',
      'GET /api/orders',
      'GET /api/User/me',
      'GET /api/reports/dashboard'
    ],
    webAppUrl: process.env.PUBLIC_WEB_URL || 'http://localhost:5173',
    message: 'SmartSale API is running successfully. Visit /docs to view Swagger documentation.'
  })
})

app.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(swaggerHtml())
})

app.get('/swagger', (_req, res) => {
  res.redirect('/docs')
})

app.get('/api/openapi.json', (_req, res) => {
  res.json(openApiSpec)
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

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

function calculateTierBySpent(totalSpent) {
  const spent = number(totalSpent)
  if (spent >= 20000000) return 'Platinum'
  if (spent >= 8000000) return 'Gold'
  if (spent >= 2000000) return 'Silver'
  return 'Standard'
}

function customerDto(row) {
  const totalSpent = number(row.totalSpent)
  const tier = calculateTierBySpent(totalSpent)
  return {
    id: Number(row.id), fullName: row.fullName, phone: row.phone, email: row.email,
    address: row.address, gender: row.gender, cccd: row.cccd, age: row.age,
    tier, totalSpent, currentDebt: number(row.currentDebt),
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
  if (!row) return null
  const user = userDto(row)
  if (user.role === 'Customer') {
    const [spentRow] = await query(
      `SELECT COALESCE(SUM(total) FILTER (WHERE status NOT IN ('Cancelled','PaymentCancelled','PaymentExpired')), 0) AS "totalSpent",
              COUNT(id) AS "paidOrderCount"
       FROM orders WHERE user_id = $1`, [id],
    )
    const totalSpent = number(spentRow?.totalSpent)
    const tier = calculateTierBySpent(totalSpent)
    const tierLabels = { Platinum: 'Thành viên Kim cương', Gold: 'Thành viên Vàng', Silver: 'Thành viên Bạc', Standard: 'Thành viên thường' }
    user.totalSpent = totalSpent
    user.customerTier = tier
    user.customerTierLabel = tierLabels[tier] || 'Thành viên thường'
    user.paidOrderCount = integer(spentRow?.paidOrderCount)
  }
  return user
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

function getTierDiscountPercent(tier) {
  switch (tier) {
    case 'Platinum': return 10
    case 'Gold': return 5
    case 'Silver': return 2
    default: return 0
  }
}

async function orderDto(row) {
  return {
    id: Number(row.id), userId: row.userId === null ? 0 : Number(row.userId),
    customerId: row.customerId === null ? null : Number(row.customerId), customerName: row.customerName,
    salesStaffId: row.salesStaffId === null ? null : Number(row.salesStaffId), salesStaffName: row.salesStaffName,
    status: row.status, paymentMethod: row.paymentMethod, subtotal: number(row.subtotal),
    discountAmount: number(row.discountAmount),
    couponId: row.couponId === null ? null : Number(row.couponId),
    couponCode: row.couponCode || null,
    couponDiscountAmount: number(row.couponDiscountAmount),
    tierDiscountAmount: number(row.tierDiscountAmount),
    tierDiscountPercent: number(row.tierDiscountPercent),
    total: number(row.total), amountPaid: number(row.amountPaid),
    debtAmount: number(row.debtAmount), paymentOrderCode: row.paymentOrderCode === null ? null : Number(row.paymentOrderCode),
    payOsTransactionReference: row.payOsTransactionReference, createdAt: toIso(row.createdAt),
    lastModifiedAt: toIso(row.lastModifiedAt), orderItems: await listOrderItems(row.id),
  }
}

const orderSelect = `SELECT o.*, o.user_id AS "userId", o.customer_id AS "customerId",
  o.sales_staff_id AS "salesStaffId", o.payment_method AS "paymentMethod",
  o.discount_amount AS "discountAmount", o.coupon_id AS "couponId", o.coupon_code AS "couponCode",
  o.coupon_discount_amount AS "couponDiscountAmount", o.tier_discount_amount AS "tierDiscountAmount",
  o.tier_discount_percent AS "tierDiscountPercent",
  o.amount_paid AS "amountPaid", o.debt_amount AS "debtAmount",
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

async function getCustomerTier(customerId, userId) {
  let customer = null
  if (customerId) {
    const [c] = await query(
      `SELECT c.id, c.tier, COALESCE(SUM(o.total) FILTER (WHERE o.status NOT IN ('Cancelled','PaymentCancelled','PaymentExpired')), 0) AS "totalSpent"
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       WHERE c.id = $1 GROUP BY c.id`,
      [customerId],
    )
    customer = c
  } else if (userId) {
    const [c] = await query(
      `SELECT c.id, c.tier, COALESCE(SUM(o.total) FILTER (WHERE o.status NOT IN ('Cancelled','PaymentCancelled','PaymentExpired')), 0) AS "totalSpent"
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       WHERE c.user_id = $1 GROUP BY c.id`,
      [userId],
    )
    customer = c
  }
  if (!customer) return 'Standard'
  return calculateTierBySpent(customer.totalSpent)
}

async function validateCouponForCart({ couponCode, resolvedItems, subtotal, customerId = null, userId = null }) {
  if (!couponCode || !couponCode.trim()) return null
  const code = couponCode.trim().toUpperCase()

  const [coupon] = await query(`SELECT * FROM coupons WHERE UPPER(code) = $1`, [code])
  if (!coupon) {
    throw apiError(404, `Mã giảm giá "${code}" không tồn tại.`)
  }

  if (!coupon.is_active) {
    throw apiError(400, `Mã giảm giá "${code}" hiện đang bị tạm khóa.`)
  }

  const now = new Date()
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    throw apiError(400, `Mã giảm giá "${code}" chưa đến thời gian áp dụng.`)
  }
  if (coupon.end_date && new Date(coupon.end_date) < now) {
    throw apiError(400, `Mã giảm giá "${code}" đã hết hạn sử dụng.`)
  }

  if (coupon.max_uses !== null && integer(coupon.used_count) >= integer(coupon.max_uses)) {
    throw apiError(400, `Mã giảm giá "${code}" đã hết lượt sử dụng.`)
  }

  // Check per customer usage limit
  if (customerId || userId) {
    const [usage] = await query(
      `SELECT COUNT(id) as count FROM coupon_usages WHERE coupon_id = $1 AND (customer_id = $2 OR user_id = $3)`,
      [coupon.id, customerId || null, userId || null],
    )
    const perCustLimit = coupon.max_uses_per_customer || 1
    if (integer(usage?.count) >= perCustLimit) {
      throw apiError(400, `Bạn đã sử dụng tối đa lượt cho phép (${perCustLimit} lần) với mã "${code}".`)
    }
  }

  if (subtotal < number(coupon.min_order_amount)) {
    throw apiError(400, `Đơn hàng chưa đạt giá trị tối thiểu ${number(coupon.min_order_amount).toLocaleString('vi-VN')}₫ để dùng mã "${code}".`)
  }

  // Calculate applicable subtotal based on applies_to
  let applicableSubtotal = subtotal
  if (coupon.applies_to === 'product') {
    const itemRows = await query(`SELECT product_id AS "productId" FROM coupon_items WHERE coupon_id = $1 AND product_id IS NOT NULL`, [coupon.id])
    const validProductIds = new Set(itemRows.map(r => Number(r.productId)))
    const matchingItems = resolvedItems.filter(item => validProductIds.has(item.productId))
    applicableSubtotal = matchingItems.reduce((sum, item) => sum + item.subTotal, 0)
    if (applicableSubtotal <= 0) {
      throw apiError(400, `Mã "${code}" chỉ áp dụng cho một số sản phẩm chỉ định, không áp dụng cho giỏ hàng hiện tại.`)
    }
  } else if (coupon.applies_to === 'category') {
    const itemRows = await query(`SELECT category_id AS "categoryId" FROM coupon_items WHERE coupon_id = $1 AND category_id IS NOT NULL`, [coupon.id])
    const validCatIds = new Set(itemRows.map(r => Number(r.categoryId)))
    const matchingItems = resolvedItems.filter(item => item.categoryId && validCatIds.has(item.categoryId))
    applicableSubtotal = matchingItems.reduce((sum, item) => sum + item.subTotal, 0)
    if (applicableSubtotal <= 0) {
      throw apiError(400, `Mã "${code}" chỉ áp dụng cho một số danh mục sản phẩm cụ thể.`)
    }
  }

  let discount = 0
  if (coupon.discount_type === 'percent') {
    discount = Math.round(applicableSubtotal * (number(coupon.discount_value) / 100))
    if (coupon.max_discount_amount && number(coupon.max_discount_amount) > 0) {
      discount = Math.min(discount, number(coupon.max_discount_amount))
    }
  } else {
    discount = Math.min(number(coupon.discount_value), applicableSubtotal)
  }

  return {
    couponId: Number(coupon.id),
    code: coupon.code,
    name: coupon.name,
    discountType: coupon.discount_type,
    discountValue: number(coupon.discount_value),
    discountAmount: Math.max(0, discount),
    appliesTo: coupon.applies_to,
  }
}

async function createOrderFromItems({ userId, customerId, items, paymentMethod, discountAmount = 0, couponCode = null }) {
  if (!Array.isArray(items) || !items.length || items.length > 30) throw apiError(400, 'Giỏ hàng không hợp lệ.')
  const resolved = []
  for (const item of items) {
    const productId = integer(item.productId)
    const quantity = integer(item.quantity)
    if (!productId || quantity < 1) throw apiError(400, 'Sản phẩm hoặc số lượng không hợp lệ.')
    const [product] = await query(
      `SELECT id, name, category_id AS "categoryId", quantity, COALESCE(NULLIF(sale_price, 0), selling_price) AS price
       FROM products WHERE id = $1`, [productId],
    )
    if (!product) throw apiError(404, `Không tìm thấy sản phẩm #${productId}.`)
    if (integer(product.quantity) < quantity) throw apiError(409, `${product.name} không đủ tồn kho.`)
    resolved.push({
      productId,
      productName: product.name,
      categoryId: product.categoryId ? Number(product.categoryId) : null,
      quantity,
      price: number(product.price),
      subTotal: number(product.price) * quantity,
    })
  }
  const subtotal = resolved.reduce((sum, item) => sum + item.subTotal, 0)

  // 1. Calculate Member Tier Discount
  const tier = await getCustomerTier(customerId, userId)
  const tierPercent = getTierDiscountPercent(tier)
  const tierDiscountAmount = tierPercent > 0 ? Math.round(subtotal * (tierPercent / 100)) : 0

  // 2. Calculate Coupon Discount (if supplied) or manual discount
  let couponDiscountAmount = 0
  let appliedCoupon = null
  if (couponCode && couponCode.trim()) {
    appliedCoupon = await validateCouponForCart({
      couponCode,
      resolvedItems: resolved,
      subtotal,
      customerId,
      userId,
    })
    couponDiscountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0
  } else {
    couponDiscountAmount = Math.max(0, number(discountAmount))
  }

  // 3. Combined total discount
  const totalDiscount = Math.min(subtotal, tierDiscountAmount + couponDiscountAmount)
  const total = subtotal - totalDiscount

  const [order] = await query(
    `INSERT INTO orders (user_id, customer_id, sales_staff_id, status, payment_method, subtotal, discount_amount, coupon_id, coupon_code, coupon_discount_amount, tier_discount_amount, tier_discount_percent, total, amount_paid, debt_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
    [
      userId,
      customerId,
      userId,
      paymentMethod === 'PayOS' ? 'PendingPayment' : 'Pending',
      paymentMethod,
      subtotal,
      totalDiscount,
      appliedCoupon ? appliedCoupon.couponId : null,
      appliedCoupon ? appliedCoupon.code : null,
      couponDiscountAmount,
      tierDiscountAmount,
      tierPercent,
      total,
      paymentMethod === 'Cash' ? total : 0,
      paymentMethod === 'Cash' ? 0 : total,
    ],
  )

  for (const item of resolved) {
    await query(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, sub_total)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [order.id, item.productId, item.productName, item.quantity, item.price, item.subTotal],
    )
  }

  // 4. Record coupon usage and increment coupon used_count
  if (appliedCoupon) {
    await query(
      `INSERT INTO coupon_usages (coupon_id, order_id, customer_id, user_id, discount_applied)
       VALUES ($1, $2, $3, $4, $5)`,
      [appliedCoupon.couponId, order.id, customerId, userId, couponDiscountAmount],
    )
    await query(
      `UPDATE coupons SET used_count = used_count + 1, last_modified_at = now() WHERE id = $1`,
      [appliedCoupon.couponId],
    )
  }

  return { id: Number(order.id), items: resolved, total, subtotal, totalDiscount, tierDiscountAmount, couponDiscountAmount }
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
  const user = await findUser(Number(row.id))
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

app.get('/api/tier-benefits', (_req, res) => {
  res.json([
    { tier: 'Platinum', label: 'Kim Cương', discountPercent: 10, minSpent: 20000000, description: 'Giảm 10% cho toàn bộ đơn hàng' },
    { tier: 'Gold', label: 'Vàng', discountPercent: 5, minSpent: 8000000, description: 'Giảm 5% cho toàn bộ đơn hàng' },
    { tier: 'Silver', label: 'Bạc', discountPercent: 2, minSpent: 2000000, description: 'Giảm 2% cho toàn bộ đơn hàng' },
    { tier: 'Standard', label: 'Thường', discountPercent: 0, minSpent: 0, description: 'Hạng thành viên tiêu chuẩn' },
  ])
})

async function promotionDto(row) {
  const items = await query(
    `SELECT pi.id, pi.product_id AS "productId", p.name AS "productName",
            pi.category_id AS "categoryId", c.name AS "categoryName"
     FROM promotion_items pi
     LEFT JOIN products p ON p.id = pi.product_id
     LEFT JOIN categories c ON c.id = pi.category_id
     WHERE pi.promotion_id = $1`,
    [row.id],
  )
  const [couponStat] = await query(
    `SELECT COUNT(id) as count, COALESCE(SUM(used_count), 0) as "totalUsed" FROM coupons WHERE promotion_id = $1`,
    [row.id],
  )
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    discountType: row.discount_type,
    discountValue: number(row.discount_value),
    minOrderAmount: number(row.min_order_amount),
    maxDiscountAmount: row.max_discount_amount ? number(row.max_discount_amount) : null,
    appliesTo: row.applies_to,
    startDate: toIso(row.start_date),
    endDate: toIso(row.end_date),
    isActive: Boolean(row.is_active),
    createdById: row.created_by_user_id ? Number(row.created_by_user_id) : null,
    createdAt: toIso(row.created_at),
    lastModifiedAt: toIso(row.last_modified_at),
    items: items.map((i) => ({
      id: Number(i.id),
      productId: i.productId ? Number(i.productId) : null,
      productName: i.productName || null,
      categoryId: i.categoryId ? Number(i.categoryId) : null,
      categoryName: i.categoryName || null,
    })),
    couponCount: integer(couponStat?.count),
    totalCouponsUsed: integer(couponStat?.totalUsed),
  }
}

async function couponDto(row) {
  const items = await query(
    `SELECT ci.id, ci.product_id AS "productId", p.name AS "productName",
            ci.category_id AS "categoryId", c.name AS "categoryName"
     FROM coupon_items ci
     LEFT JOIN products p ON p.id = ci.product_id
     LEFT JOIN categories c ON c.id = ci.category_id
     WHERE ci.coupon_id = $1`,
    [row.id],
  )
  return {
    id: Number(row.id),
    promotionId: row.promotion_id ? Number(row.promotion_id) : null,
    promotionName: row.promotion_name || null,
    code: row.code,
    name: row.name,
    description: row.description,
    discountType: row.discount_type,
    discountValue: number(row.discount_value),
    minOrderAmount: number(row.min_order_amount),
    maxDiscountAmount: row.max_discount_amount ? number(row.max_discount_amount) : null,
    maxUses: row.max_uses ? integer(row.max_uses) : null,
    usedCount: integer(row.used_count),
    maxUsesPerCustomer: integer(row.max_uses_per_customer || 1),
    appliesTo: row.applies_to,
    startDate: toIso(row.start_date),
    endDate: toIso(row.end_date),
    isActive: Boolean(row.is_active),
    createdAt: toIso(row.created_at),
    lastModifiedAt: toIso(row.last_modified_at),
    items: items.map((i) => ({
      id: Number(i.id),
      productId: i.productId ? Number(i.productId) : null,
      productName: i.productName || null,
      categoryId: i.categoryId ? Number(i.categoryId) : null,
      categoryName: i.categoryName || null,
    })),
  }
}

// PROMOTIONS CRUD
app.get('/api/promotions', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (_req, res) => {
  const rows = await query(`SELECT * FROM promotions ORDER BY id DESC`)
  res.json(await Promise.all(rows.map(promotionDto)))
}))

app.get('/api/promotions/:id', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const [row] = await query(`SELECT * FROM promotions WHERE id = $1`, [integer(req.params.id)])
  if (!row) throw apiError(404, 'Không tìm thấy đợt khuyến mãi.')
  res.json(await promotionDto(row))
}))

app.post('/api/promotions', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const b = req.body
  const discountType = b.discountType === 'fixed' ? 'fixed' : 'percent'
  const appliesTo = ['all', 'category', 'product'].includes(b.appliesTo) ? b.appliesTo : 'all'
  const [created] = await query(
    `INSERT INTO promotions (name, description, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to, start_date, end_date, is_active, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      requireValue(b.name, 'Tên đợt khuyến mãi'),
      text(b.description) || null,
      discountType,
      Math.max(0.01, number(b.discountValue)),
      Math.max(0, number(b.minOrderAmount)),
      b.maxDiscountAmount ? Math.max(0, number(b.maxDiscountAmount)) : null,
      appliesTo,
      b.startDate ? new Date(b.startDate).toISOString() : new Date().toISOString(),
      b.endDate ? new Date(b.endDate).toISOString() : null,
      b.isActive !== false,
      req.user.id,
    ],
  )
  if (appliesTo === 'product' && Array.isArray(b.productIds)) {
    for (const pId of b.productIds) {
      if (integer(pId)) await query(`INSERT INTO promotion_items (promotion_id, product_id) VALUES ($1, $2)`, [created.id, integer(pId)])
    }
  } else if (appliesTo === 'category' && Array.isArray(b.categoryIds)) {
    for (const cId of b.categoryIds) {
      if (integer(cId)) await query(`INSERT INTO promotion_items (promotion_id, category_id) VALUES ($1, $2)`, [created.id, integer(cId)])
    }
  }
  res.status(201).json(await promotionDto(created))
}))

app.put('/api/promotions/:id', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const id = integer(req.params.id)
  const b = req.body
  const discountType = b.discountType === 'fixed' ? 'fixed' : 'percent'
  const appliesTo = ['all', 'category', 'product'].includes(b.appliesTo) ? b.appliesTo : 'all'
  const [updated] = await query(
    `UPDATE promotions
     SET name = $1, description = $2, discount_type = $3, discount_value = $4,
         min_order_amount = $5, max_discount_amount = $6, applies_to = $7,
         start_date = $8, end_date = $9, is_active = $10, last_modified_at = now()
     WHERE id = $11 RETURNING *`,
    [
      requireValue(b.name, 'Tên đợt khuyến mãi'),
      text(b.description) || null,
      discountType,
      Math.max(0.01, number(b.discountValue)),
      Math.max(0, number(b.minOrderAmount)),
      b.maxDiscountAmount ? Math.max(0, number(b.maxDiscountAmount)) : null,
      appliesTo,
      b.startDate ? new Date(b.startDate).toISOString() : new Date().toISOString(),
      b.endDate ? new Date(b.endDate).toISOString() : null,
      b.isActive !== false,
      id,
    ],
  )
  if (!updated) throw apiError(404, 'Không tìm thấy đợt khuyến mãi.')

  // Update promotion_items
  await query(`DELETE FROM promotion_items WHERE promotion_id = $1`, [id])
  if (appliesTo === 'product' && Array.isArray(b.productIds)) {
    for (const pId of b.productIds) {
      if (integer(pId)) await query(`INSERT INTO promotion_items (promotion_id, product_id) VALUES ($1, $2)`, [id, integer(pId)])
    }
  } else if (appliesTo === 'category' && Array.isArray(b.categoryIds)) {
    for (const cId of b.categoryIds) {
      if (integer(cId)) await query(`INSERT INTO promotion_items (promotion_id, category_id) VALUES ($1, $2)`, [id, integer(cId)])
    }
  }
  res.json(await promotionDto(updated))
}))

app.delete('/api/promotions/:id', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  await query('DELETE FROM promotions WHERE id = $1', [integer(req.params.id)])
  res.status(204).end()
}))

// COUPONS CRUD
app.get('/api/coupons', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (_req, res) => {
  const rows = await query(`
    SELECT c.*, p.name AS promotion_name
    FROM coupons c
    LEFT JOIN promotions p ON p.id = c.promotion_id
    ORDER BY c.id DESC
  `)
  res.json(await Promise.all(rows.map(couponDto)))
}))

app.get('/api/coupons/:id', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const [row] = await query(`
    SELECT c.*, p.name AS promotion_name
    FROM coupons c
    LEFT JOIN promotions p ON p.id = c.promotion_id
    WHERE c.id = $1
  `, [integer(req.params.id)])
  if (!row) throw apiError(404, 'Không tìm thấy mã giảm giá.')
  res.json(await couponDto(row))
}))

app.post('/api/coupons', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const b = req.body
  const code = requireValue(b.code, 'Mã giảm giá').trim().toUpperCase()
  const discountType = b.discountType === 'fixed' ? 'fixed' : 'percent'
  const appliesTo = ['all', 'category', 'product'].includes(b.appliesTo) ? b.appliesTo : 'all'

  const [created] = await query(
    `INSERT INTO coupons (promotion_id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, max_uses_per_customer, applies_to, start_date, end_date, is_active, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    [
      integer(b.promotionId) || null,
      code,
      requireValue(b.name, 'Tên mã giảm giá'),
      text(b.description) || null,
      discountType,
      Math.max(0.01, number(b.discountValue)),
      Math.max(0, number(b.minOrderAmount)),
      b.maxDiscountAmount ? Math.max(0, number(b.maxDiscountAmount)) : null,
      b.maxUses ? integer(b.maxUses) : null,
      Math.max(1, integer(b.maxUsesPerCustomer, 1)),
      appliesTo,
      b.startDate ? new Date(b.startDate).toISOString() : new Date().toISOString(),
      b.endDate ? new Date(b.endDate).toISOString() : null,
      b.isActive !== false,
      req.user.id,
    ],
  )
  if (appliesTo === 'product' && Array.isArray(b.productIds)) {
    for (const pId of b.productIds) {
      if (integer(pId)) await query(`INSERT INTO coupon_items (coupon_id, product_id) VALUES ($1, $2)`, [created.id, integer(pId)])
    }
  } else if (appliesTo === 'category' && Array.isArray(b.categoryIds)) {
    for (const cId of b.categoryIds) {
      if (integer(cId)) await query(`INSERT INTO coupon_items (coupon_id, category_id) VALUES ($1, $2)`, [created.id, integer(cId)])
    }
  }
  res.status(201).json(await couponDto(created))
}))

app.put('/api/coupons/:id', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const id = integer(req.params.id)
  const b = req.body
  const code = requireValue(b.code, 'Mã giảm giá').trim().toUpperCase()
  const discountType = b.discountType === 'fixed' ? 'fixed' : 'percent'
  const appliesTo = ['all', 'category', 'product'].includes(b.appliesTo) ? b.appliesTo : 'all'

  const [updated] = await query(
    `UPDATE coupons
     SET promotion_id = $1, code = $2, name = $3, description = $4, discount_type = $5,
         discount_value = $6, min_order_amount = $7, max_discount_amount = $8, max_uses = $9,
         max_uses_per_customer = $10, applies_to = $11, start_date = $12, end_date = $13,
         is_active = $14, last_modified_at = now()
     WHERE id = $15 RETURNING *`,
    [
      integer(b.promotionId) || null,
      code,
      requireValue(b.name, 'Tên mã giảm giá'),
      text(b.description) || null,
      discountType,
      Math.max(0.01, number(b.discountValue)),
      Math.max(0, number(b.minOrderAmount)),
      b.maxDiscountAmount ? Math.max(0, number(b.maxDiscountAmount)) : null,
      b.maxUses ? integer(b.maxUses) : null,
      Math.max(1, integer(b.maxUsesPerCustomer, 1)),
      appliesTo,
      b.startDate ? new Date(b.startDate).toISOString() : new Date().toISOString(),
      b.endDate ? new Date(b.endDate).toISOString() : null,
      b.isActive !== false,
      id,
    ],
  )
  if (!updated) throw apiError(404, 'Không tìm thấy mã giảm giá.')

  // Update coupon_items
  await query(`DELETE FROM coupon_items WHERE coupon_id = $1`, [id])
  if (appliesTo === 'product' && Array.isArray(b.productIds)) {
    for (const pId of b.productIds) {
      if (integer(pId)) await query(`INSERT INTO coupon_items (coupon_id, product_id) VALUES ($1, $2)`, [id, integer(pId)])
    }
  } else if (appliesTo === 'category' && Array.isArray(b.categoryIds)) {
    for (const cId of b.categoryIds) {
      if (integer(cId)) await query(`INSERT INTO coupon_items (coupon_id, category_id) VALUES ($1, $2)`, [id, integer(cId)])
    }
  }
  res.json(await couponDto(updated))
}))

app.delete('/api/coupons/:id', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  await query('DELETE FROM coupons WHERE id = $1', [integer(req.params.id)])
  res.status(204).end()
}))

// VALIDATE COUPON FOR CART PREVIEW
app.post('/api/coupons/validate', asyncRoute(async (req, res) => {
  const code = requireValue(req.body.code, 'Mã giảm giá').trim().toUpperCase()
  const items = Array.isArray(req.body.items) ? req.body.items : []
  const customerId = integer(req.body.customerId) || null
  const userId = integer(req.body.userId) || null

  const resolved = []
  for (const item of items) {
    const productId = integer(item.productId)
    const quantity = integer(item.quantity, 1)
    if (!productId) continue
    const [product] = await query(
      `SELECT id, name, category_id AS "categoryId", COALESCE(NULLIF(sale_price, 0), selling_price) AS price
       FROM products WHERE id = $1`, [productId],
    )
    if (product) {
      resolved.push({
        productId,
        productName: product.name,
        categoryId: product.categoryId ? Number(product.categoryId) : null,
        quantity,
        price: number(product.price),
        subTotal: number(product.price) * quantity,
      })
    }
  }
  const subtotal = resolved.reduce((sum, item) => sum + item.subTotal, 0)
  const validation = await validateCouponForCart({
    couponCode: code,
    resolvedItems: resolved,
    subtotal,
    customerId,
    userId,
  })

  // Also include customer tier discount info for preview
  const tier = await getCustomerTier(customerId, userId)
  const tierPercent = getTierDiscountPercent(tier)
  const tierDiscountAmount = tierPercent > 0 ? Math.round(subtotal * (tierPercent / 100)) : 0

  res.json({
    valid: true,
    coupon: validation,
    tier,
    tierPercent,
    tierDiscountAmount,
    subtotal,
    totalDiscount: Math.min(subtotal, tierDiscountAmount + (validation?.discountAmount || 0)),
    finalTotal: Math.max(0, subtotal - Math.min(subtotal, tierDiscountAmount + (validation?.discountAmount || 0))),
  })
}))

app.post('/api/Order', authenticate, requireRoles('Admin', 'SalesStaff'), asyncRoute(async (req, res) => {
  const data = await createOrderFromItems({
    userId: req.user.id,
    customerId: integer(req.body.customerId) || null,
    items: req.body.orderItems,
    paymentMethod: 'Cash',
    discountAmount: req.body.discountAmount,
    couponCode: req.body.couponCode,
  })
  res.status(201).json(await getOrder(data.id))
}))

app.post('/api/Order/customer-cash', authenticate, requireRoles('Customer'), asyncRoute(async (req, res) => {
  const customerId = await ensureCustomer(req.body, req.user.id)
  const data = await createOrderFromItems({
    userId: req.user.id,
    customerId,
    items: req.body.orderItems,
    paymentMethod: 'Cash',
    couponCode: req.body.couponCode,
  })
  res.status(201).json(await getOrder(data.id))
}))

app.post('/api/payments/links', authenticate, requireRoles('Customer'), asyncRoute(async (req, res) => {
  const customerId = await ensureCustomer(req.body, req.user.id)
  const data = await createOrderFromItems({
    userId: req.user.id,
    customerId,
    items: req.body.orderItems,
    paymentMethod: 'PayOS',
    couponCode: req.body.couponCode,
  })
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

export default app

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
if (!isServerless && (process.env.NODE_ENV !== 'test')) {
  const port = Number(process.env.PORT || 10000)
  app.listen(port, () => console.log(`SmartSale API listening on ${port}`))
}
