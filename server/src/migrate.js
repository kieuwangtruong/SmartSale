import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { query } from './db.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const schema = await readFile(path.join(here, 'schema.sql'), 'utf8')

for (const statement of schema.split(/;\s*(?:\r?\n|$)/)) {
  const sql = statement.trim()
  if (sql) await query(sql)
}

// Ensure columns exist on existing orders table
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id BIGINT REFERENCES coupons(id) ON DELETE SET NULL`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tier_discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tier_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(14,2)`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_transaction_reference TEXT`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL`)
await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_source_status TEXT`)

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME = 'Quản trị viên' } = process.env
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  await query(
    `INSERT INTO users (user_name, full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, 'Admin')
     ON CONFLICT (email) DO NOTHING`,
    [ADMIN_EMAIL.split('@')[0], ADMIN_FULL_NAME, ADMIN_EMAIL.toLowerCase(), passwordHash],
  )
}

// Add performance composite indexes for high concurrency & 1M+ orders scale
await query(`CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC)`)
await query(`CREATE INDEX IF NOT EXISTS idx_orders_customer_created ON orders (customer_id, created_at DESC)`)
await query(`CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at DESC)`)
await query(`CREATE INDEX IF NOT EXISTS idx_coupons_code_active ON coupons (code, is_active)`)
await query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_prod ON order_items (order_id, product_id)`)

console.log('Neon schema and high-performance indexes are ready.')

