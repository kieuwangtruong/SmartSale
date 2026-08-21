import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { query } from './db.js'

async function run() {
  console.log('--- Seeding VIP Customers & Updating Tier Logic ---')
  const defaultPasswordHash = await bcrypt.hash('Admin@123456', 12)

  // 1. Define 4 VIP demo customer accounts
  const demoCustomers = [
    {
      username: 'cust_diamond',
      fullName: 'Phạm Quốc Việt (VIP Kim Cương)',
      email: 'diamond@smartsale.com',
      phone: '0934567890',
      address: 'Số 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. HCM',
      tier: 'Platinum',
      gender: 0,
      age: 32,
      cccd: '079092001234',
      targetSpent: 26500000,
      orderItemsPlan: [
        { productId: 6, qty: 3, price: 6500000 }, // CleanBot Ultra: 3 x 6.5M = 19.5M
        { productId: 7, qty: 2, price: 2490000 }, // AirPure Pro H13: 2 x 2.49M = 4.98M
        { productId: 1, qty: 1, price: 1890000 }, // Smart Watch Pro: 1 x 1.89M = 1.89M
        { productId: 13, qty: 1, price: 1150000 }, // Bàn phím cơ: 1 x 1.15M = 1.15M
      ], // Total sum = 27.52M (Kim Cương >= 20M)
    },
    {
      username: 'cust_gold',
      fullName: 'Nguyễn Thị Tuyết Mai (VIP Vàng)',
      email: 'gold@smartsale.com',
      phone: '0945678901',
      address: 'Số 18 Nguyễn Trãi, Phường Thanh Xuân Bắc, Hà Nội',
      tier: 'Gold',
      gender: 1,
      age: 28,
      cccd: '001196005678',
      targetSpent: 12800000,
      orderItemsPlan: [
        { productId: 6, qty: 1, price: 6500000 }, // CleanBot Ultra: 6.5M
        { productId: 7, qty: 2, price: 2490000 }, // AirPure Pro: 4.98M
        { productId: 5, qty: 1, price: 1450000 }, // Nồi chiên: 1.45M
      ], // Total sum = 12.93M (Vàng: 8M - 20M)
    },
    {
      username: 'cust_silver',
      fullName: 'Lê Thu Hương (VIP Bạc)',
      email: 'silver@smartsale.com',
      phone: '0967890123',
      address: 'Số 88 Hoàng Hoa Thám, Phường Thụy Khuê, Tây Hồ, Hà Nội',
      tier: 'Silver',
      gender: 1,
      age: 30,
      cccd: '001194004321',
      targetSpent: 4200000,
      orderItemsPlan: [
        { productId: 1, qty: 1, price: 1890000 }, // Smart Watch: 1.89M
        { productId: 5, qty: 1, price: 1450000 }, // Nồi chiên: 1.45M
        { productId: 4, qty: 1, price: 890000 },  // Loa Bluetooth: 890k
      ], // Total sum = 4.23M (Bạc: 2M - 8M)
    },
    {
      username: 'cust_standard',
      fullName: 'Trần Minh Đức (Thành viên Thường)',
      email: 'standard@smartsale.com',
      phone: '0978901234',
      address: 'Số 65 Nguyễn Thị Minh Khai, Hải Châu, Đà Nẵng',
      tier: 'Standard',
      gender: 0,
      age: 25,
      cccd: '048093006543',
      targetSpent: 650000,
      orderItemsPlan: [
        { productId: 9, qty: 1, price: 390000 }, // Balo: 390k
        { productId: 10, qty: 1, price: 250000 }, // Kính mát: 250k
      ], // Total sum = 640k (Thường: < 2M)
    },
  ]

  // Also ensure legacy customer@smartsale.com maps to Diamond
  const allTargetUsers = [
    ...demoCustomers,
    {
      username: 'cust_viet',
      fullName: 'Phạm Quốc Việt (VIP Kim Cương)',
      email: 'customer@smartsale.com',
      phone: '0934567899',
      address: 'Số 45 Lê Duẩn, Quận 1, TP. HCM',
      tier: 'Platinum',
      gender: 0,
      age: 32,
      cccd: '079092001239',
      targetSpent: 26500000,
      orderItemsPlan: [
        { productId: 6, qty: 3, price: 6500000 },
        { productId: 7, qty: 2, price: 2490000 },
        { productId: 1, qty: 1, price: 1890000 },
      ],
    },
  ]

  for (const c of allTargetUsers) {
    // 1. Insert or update User
    let [user] = await query('SELECT id FROM users WHERE email = $1', [c.email])
    if (!user) {
      const [createdUser] = await query(
        `INSERT INTO users (user_name, full_name, email, password_hash, role, date_of_birth, sex, address)
         VALUES ($1, $2, $3, $4, 'Customer', '1995-06-15', $5, $6)
         RETURNING id`,
        [c.username, c.fullName, c.email, defaultPasswordHash, c.gender, c.address],
      )
      user = createdUser
      console.log(`✓ Created User: ${c.email} (ID: ${user.id})`)
    } else {
      await query(
        `UPDATE users SET password_hash = $1, full_name = $2, address = $3 WHERE id = $4`,
        [defaultPasswordHash, c.fullName, c.address, user.id],
      )
      console.log(`✓ Updated User: ${c.email} (ID: ${user.id})`)
    }

    const userId = Number(user.id)

    // 2. Insert or update Customer record
    let [customer] = await query('SELECT id FROM customers WHERE user_id = $1 OR email = $2', [userId, c.email])
    if (!customer) {
      const [createdCust] = await query(
        `INSERT INTO customers (user_id, full_name, phone, email, address, gender, cccd, age, tier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [userId, c.fullName, c.phone, c.email, c.address, c.gender, c.cccd, c.age, c.tier],
      )
      customer = createdCust
      console.log(`✓ Created Customer record: ID ${customer.id}`)
    } else {
      await query(
        `UPDATE customers SET user_id = $1, full_name = $2, phone = $3, address = $4, gender = $5, cccd = $6, age = $7, tier = $8 WHERE id = $9`,
        [userId, c.fullName, c.phone, c.address, c.gender, c.cccd, c.age, c.tier, customer.id],
      )
      console.log(`✓ Updated Customer record: ID ${customer.id}`)
    }

    const customerId = Number(customer.id)

    // 3. Clear old orders for this customer to re-seed clean orders
    const existingOrders = await query('SELECT id FROM orders WHERE customer_id = $1 OR user_id = $2', [customerId, userId])
    for (const o of existingOrders) {
      await query('DELETE FROM order_items WHERE order_id = $1', [o.id])
      await query('DELETE FROM orders WHERE id = $1', [o.id])
    }

    // 4. Create completed orders matching the tier
    let orderIndex = 1
    for (const itemPlan of c.orderItemsPlan) {
      const subtotal = itemPlan.price * itemPlan.qty
      const total = subtotal
      const [product] = await query('SELECT name FROM products WHERE id = $1', [itemPlan.productId])
      const productName = product ? product.name : `Sản phẩm #${itemPlan.productId}`

      const dateOffset = orderIndex * 3 // few days ago
      const createdAt = new Date(Date.now() - dateOffset * 86400000).toISOString()

      const [order] = await query(
        `INSERT INTO orders (user_id, customer_id, sales_staff_id, status, payment_method, subtotal, discount_amount, total, amount_paid, debt_amount, created_at, last_modified_at)
         VALUES ($1, $2, 3, 'Completed', 'PayOS', $3, 0, $4, $5, 0, $6, $6)
         RETURNING id`,
        [userId, customerId, subtotal, total, total, createdAt],
      )

      await query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, sub_total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, itemPlan.productId, productName, itemPlan.qty, itemPlan.price, subtotal],
      )

      orderIndex++
    }

    // Calculate actual total spent
    const [spentRes] = await query(
      `SELECT COALESCE(SUM(total), 0) AS "totalSpent", COUNT(id) AS "orderCount"
       FROM orders WHERE customer_id = $1 AND status = 'Completed'`,
      [customerId],
    )
    console.log(`  -> Account ${c.email} [${c.tier}] configured with Total Spent: ${Number(spentRes.totalSpent).toLocaleString('vi-VN')} ₫ (${spentRes.orderCount} orders)`)
  }

  // 5. Update tier column for all customers in database based on total spent
  console.log('\n--- Recalculating Tiers for all database customers ---')
  await query(`
    UPDATE customers c
    SET tier = CASE
      WHEN COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.customer_id = c.id AND o.status NOT IN ('Cancelled', 'PaymentCancelled', 'PaymentExpired')), 0) >= 20000000 THEN 'Platinum'
      WHEN COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.customer_id = c.id AND o.status NOT IN ('Cancelled', 'PaymentCancelled', 'PaymentExpired')), 0) >= 8000000 THEN 'Gold'
      WHEN COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.customer_id = c.id AND o.status NOT IN ('Cancelled', 'PaymentCancelled', 'PaymentExpired')), 0) >= 2000000 THEN 'Silver'
      ELSE 'Standard'
    END
  `)

  const summary = await query(`
    SELECT c.id, c.full_name, c.email, c.tier,
      COALESCE(SUM(o.total) FILTER (WHERE o.status NOT IN ('Cancelled', 'PaymentCancelled', 'PaymentExpired')), 0) AS "totalSpent",
      COUNT(o.id) AS "orderCount"
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id
    ORDER BY "totalSpent" DESC
  `)

  console.log('\nFinal Customers Database Table:')
  console.table(summary.map(s => ({
    ID: s.id,
    Name: s.full_name,
    Email: s.email,
    Tier: s.tier,
    TotalSpent: Number(s.totalSpent).toLocaleString('vi-VN') + ' ₫',
    Orders: s.orderCount
  })))

  console.log('\n✅ SEEDING VIP CUSTOMERS COMPLETED!')
}

run().catch(console.error)
