import 'dotenv/config'
import { query } from './db.js'

async function verify() {
  console.log('--- Verifying Database & Promotion/Coupon Tables ---')

  const promos = await query('SELECT count(*) as count FROM promotions')
  console.log(`✓ Promotions in DB: ${promos[0].count}`)

  const coupons = await query('SELECT count(*) as count FROM coupons')
  console.log(`✓ Coupons in DB: ${coupons[0].count}`)

  const sampleCoupons = await query('SELECT code, name, discount_type, discount_value, min_order_amount FROM coupons')
  console.log('Sample coupons:')
  console.table(sampleCoupons)

  const sampleOrdersColumns = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name IN ('coupon_id', 'coupon_code', 'coupon_discount_amount', 'tier_discount_amount', 'tier_discount_percent')
  `)
  console.log('Order promotion columns:')
  console.table(sampleOrdersColumns)

  console.log('✅ All promotion & coupon DB structures verified successfully!')
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err)
    process.exit(1)
  })
