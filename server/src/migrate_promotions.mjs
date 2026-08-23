import 'dotenv/config'
import { query } from './db.js'

async function migrate() {
  console.log('--- Running Promotions & Coupons Migration ---')

  // 1. Create promotions table (Campaigns / Đợt khuyến mãi)
  await query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
      discount_value NUMERIC(14,2) NOT NULL CHECK (discount_value > 0),
      min_order_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      max_discount_amount NUMERIC(14,2),
      applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'category', 'product')),
      start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
      end_date TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  console.log('✓ Table promotions ready')

  // 2. Create promotion_items mapping table
  await query(`
    CREATE TABLE IF NOT EXISTS promotion_items (
      id BIGSERIAL PRIMARY KEY,
      promotion_id BIGINT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
      product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
      category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE
    )
  `)
  console.log('✓ Table promotion_items ready')

  // 3. Create coupons table (Mã sale / mã giảm giá)
  await query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id BIGSERIAL PRIMARY KEY,
      promotion_id BIGINT REFERENCES promotions(id) ON DELETE SET NULL,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
      discount_value NUMERIC(14,2) NOT NULL CHECK (discount_value > 0),
      min_order_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      max_discount_amount NUMERIC(14,2),
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      max_uses_per_customer INTEGER DEFAULT 1,
      applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'category', 'product')),
      start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
      end_date TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  console.log('✓ Table coupons ready')

  // 4. Create coupon_items mapping table
  await query(`
    CREATE TABLE IF NOT EXISTS coupon_items (
      id BIGSERIAL PRIMARY KEY,
      coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
      category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE
    )
  `)
  console.log('✓ Table coupon_items ready')

  // 5. Create coupon_usages table
  await query(`
    CREATE TABLE IF NOT EXISTS coupon_usages (
      id BIGSERIAL PRIMARY KEY,
      coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      discount_applied NUMERIC(14,2) NOT NULL DEFAULT 0,
      used_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  console.log('✓ Table coupon_usages ready')

  // 6. Add columns to orders table
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id BIGINT REFERENCES coupons(id) ON DELETE SET NULL`)
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT`)
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0`)
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tier_discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0`)
  await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tier_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0`)
  console.log('✓ Updated orders table columns')

  // 7. Seed initial sample promotions and coupons
  const existingPromos = await query('SELECT count(*) as count FROM promotions')
  if (parseInt(existingPromos[0].count, 10) === 0) {
    console.log('--- Seeding Sample Promotions and Coupons ---')

    // Promo 1: Summer Super Sale (10% all products)
    const [p1] = await query(`
      INSERT INTO promotions (name, description, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to, start_date, end_date, is_active)
      VALUES ('Đại Tiệc Mùa Hè 2026', 'Giảm 10% cho toàn bộ đơn hàng từ 500k', 'percent', 10, 500000, 500000, 'all', now() - interval '2 days', now() + interval '30 days', true)
      RETURNING id
    `)

    // Promo 2: Flash Sale Thiết Bị Điện Tử (Fixed 200k for category)
    const [catRow] = await query("SELECT id FROM categories WHERE name ILIKE '%Điện tử%' OR name ILIKE '%Electronic%' LIMIT 1")
    const catId = catRow ? catRow.id : null

    const [p2] = await query(`
      INSERT INTO promotions (name, description, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to, start_date, end_date, is_active)
      VALUES ('Flash Sale Đồ Công Nghệ', 'Giảm ngay 200.000₫ cho danh mục Thiết bị Điện tử từ 2 triệu', 'fixed', 200000, 2000000, NULL, 'category', now() - interval '1 day', now() + interval '15 days', true)
      RETURNING id
    `)
    if (catId) {
      await query(`INSERT INTO promotion_items (promotion_id, category_id) VALUES ($1, $2)`, [p2.id, catId])
    }

    // Promo 3: Ưu Đãi Robot Hút Bụi & Gia Dụng Thông Minh (15% on specific products)
    const [prodRow] = await query("SELECT id FROM products WHERE name ILIKE '%CleanBot%' OR name ILIKE '%AirPure%' LIMIT 1")
    const [p3] = await query(`
      INSERT INTO promotions (name, description, discount_type, discount_value, min_order_amount, max_discount_amount, applies_to, start_date, end_date, is_active)
      VALUES ('Tuần Lễ Gia Dụng Thông Minh', 'Giảm 15% khi mua Robot CleanBot hoặc Máy lọc không khí', 'percent', 15, 1000000, 1000000, 'product', now(), now() + interval '20 days', true)
      RETURNING id
    `)
    if (prodRow) {
      await query(`INSERT INTO promotion_items (promotion_id, product_id) VALUES ($1, $2)`, [p3.id, prodRow.id])
    }

    // Coupons
    await query(`
      INSERT INTO coupons (promotion_id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, applies_to, start_date, end_date, is_active)
      VALUES ($1, 'SUMMER10', 'Mã Giảm 10% Hè', 'Giảm 10% tối đa 500k cho đơn từ 500k', 'percent', 10, 500000, 500000, 200, 'all', now() - interval '2 days', now() + interval '30 days', true)
    `, [p1.id])

    const [c2] = await query(`
      INSERT INTO coupons (promotion_id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, applies_to, start_date, end_date, is_active)
      VALUES ($1, 'TECH200K', 'Voucher Công Nghệ 200k', 'Giảm 200k trực tiếp cho đơn hàng công nghệ từ 2 triệu', 'fixed', 200000, 2000000, NULL, 100, 'category', now() - interval '1 day', now() + interval '15 days', true)
      RETURNING id
    `, [p2.id])
    if (catId) {
      await query(`INSERT INTO coupon_items (coupon_id, category_id) VALUES ($1, $2)`, [c2.id, catId])
    }

    await query(`
      INSERT INTO coupons (promotion_id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, applies_to, start_date, end_date, is_active)
      VALUES (NULL, 'WELCOME50K', 'Mã Chào Mừng Thành Viên Mới', 'Giảm ngay 50.000₫ cho đơn từ 300k', 'fixed', 50000, 300000, NULL, 500, 'all', now() - interval '10 days', now() + interval '60 days', true)
    `)

    await query(`
      INSERT INTO coupons (promotion_id, code, name, description, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, applies_to, start_date, end_date, is_active)
      VALUES (NULL, 'VIP15', 'Mã Đặc Quyền Siêu Sale 15%', 'Giảm 15% tối đa 1 triệu cho đơn từ 1.5 triệu', 'percent', 15, 1500000, 1000000, 50, 'all', now(), now() + interval '14 days', true)
    `)

    console.log('✓ Seeded sample promotions & coupons successfully')
  }

  console.log('✅ Promotions & Coupons Migration Completed!')
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  })
