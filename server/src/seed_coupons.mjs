import 'dotenv/config'
import { query } from './db.js'

async function seedCoupons() {
  console.log('--- Seeding & Refreshing All Storefront Vouchers ---')

  const now = new Date()
  const farFuture = new Date('2027-12-31T23:59:59Z')

  const vouchers = [
    {
      code: 'SUMMER10',
      name: 'Ưu Đãi Mùa Hè 2026',
      description: 'Giảm 10% tối đa 500k cho đơn từ 500k',
      discount_type: 'percent',
      discount_value: 10,
      min_order_amount: 500000,
      max_discount_amount: 500000,
      max_uses: 1000,
      max_uses_per_customer: 5,
      applies_to: 'all',
      start_date: now,
      end_date: farFuture,
      is_active: true,
    },
    {
      code: 'WELCOME50K',
      name: 'Khách Hàng Mới',
      description: 'Giảm ngay 50.000₫ cho đơn đầu tiên từ 300.000₫',
      discount_type: 'fixed',
      discount_value: 50000,
      min_order_amount: 300000,
      max_discount_amount: null,
      max_uses: 1000,
      max_uses_per_customer: 3,
      applies_to: 'all',
      start_date: now,
      end_date: farFuture,
      is_active: true,
    },
    {
      code: 'TECH200K',
      name: 'Voucher Công Nghệ & Phụ Kiện',
      description: 'Giảm 200.000₫ cho đơn hàng từ 2.000.000₫',
      discount_type: 'fixed',
      discount_value: 200000,
      min_order_amount: 2000000,
      max_discount_amount: null,
      max_uses: 1000,
      max_uses_per_customer: 5,
      applies_to: 'all',
      start_date: now,
      end_date: farFuture,
      is_active: true,
    },
    {
      code: 'SMARTSALE15',
      name: 'Đại Tiệc Siêu Khuyến Mãi 15%',
      description: 'Giảm 15% tối đa 1.000.000₫ cho đơn từ 1.000.000₫',
      discount_type: 'percent',
      discount_value: 15,
      min_order_amount: 1000000,
      max_discount_amount: 1000000,
      max_uses: 1000,
      max_uses_per_customer: 5,
      applies_to: 'all',
      start_date: now,
      end_date: farFuture,
      is_active: true,
    },
    {
      code: 'FREESHIP',
      name: 'Miễn Phí Vận Chuyển',
      description: 'Giảm 30.000₫ phí ship toàn quốc cho đơn từ 199.000₫',
      discount_type: 'fixed',
      discount_value: 30000,
      min_order_amount: 199000,
      max_discount_amount: null,
      max_uses: 1000,
      max_uses_per_customer: 10,
      applies_to: 'all',
      start_date: now,
      end_date: farFuture,
      is_active: true,
    },
    {
      code: 'VIP15',
      name: 'Mã Đặc Quyền VIP 15%',
      description: 'Giảm 15% tối đa 1 triệu cho đơn từ 1.5 triệu',
      discount_type: 'percent',
      discount_value: 15,
      min_order_amount: 1500000,
      max_discount_amount: 1000000,
      max_uses: 500,
      max_uses_per_customer: 5,
      applies_to: 'all',
      start_date: now,
      end_date: farFuture,
      is_active: true,
    },
  ]

  for (const v of vouchers) {
    const [existing] = await query('SELECT id FROM coupons WHERE UPPER(code) = $1', [v.code])
    if (existing) {
      await query(
        `UPDATE coupons
         SET name = $1, description = $2, discount_type = $3, discount_value = $4,
             min_order_amount = $5, max_discount_amount = $6, max_uses = $7,
             max_uses_per_customer = $8, applies_to = $9, start_date = $10, end_date = $11,
             is_active = true, last_modified_at = now()
         WHERE id = $12`,
        [
          v.name,
          v.description,
          v.discount_type,
          v.discount_value,
          v.min_order_amount,
          v.max_discount_amount,
          v.max_uses,
          v.max_uses_per_customer,
          v.applies_to,
          v.start_date,
          v.end_date,
          existing.id,
        ]
      )
      console.log(`✓ Updated voucher: ${v.code}`)
    } else {
      await query(
        `INSERT INTO coupons (code, name, description, discount_type, discount_value,
                             min_order_amount, max_discount_amount, max_uses,
                             max_uses_per_customer, applies_to, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)`,
        [
          v.code,
          v.name,
          v.description,
          v.discount_type,
          v.discount_value,
          v.min_order_amount,
          v.max_discount_amount,
          v.max_uses,
          v.max_uses_per_customer,
          v.applies_to,
          v.start_date,
          v.end_date,
        ]
      )
      console.log(`✓ Inserted voucher: ${v.code}`)
    }
  }

  const allCoupons = await query('SELECT code, name, discount_type, discount_value, min_order_amount, end_date, is_active FROM coupons')
  console.table(allCoupons)
  console.log('✅ Seeding coupons finished successfully!')
}

seedCoupons()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error seeding coupons:', err)
    process.exit(1)
  })
