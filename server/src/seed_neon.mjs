const databaseUrl = 'postgresql://neondb_owner:npg_vcmrfZz48eCJ@ep-noisy-forest-ayjyhd0d-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const urlObj = new URL(databaseUrl);
const sqlEndpoint = `https://${urlObj.host}/sql`;

async function executeSql(sqlQuery, params = []) {
  const response = await fetch(sqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': databaseUrl,
    },
    body: JSON.stringify({ query: sqlQuery, params }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }
  return await response.json();
}

async function seed() {
  console.log('Seeding initial data to Neon PostgreSQL...');

  // 1. Categories
  const categories = ['Điện tử', 'Gia dụng', 'Phụ kiện', 'Văn phòng'];
  for (const cat of categories) {
    await executeSql(
      `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING;`,
      [cat]
    );
  }
  console.log('✓ Categories seeded.');

  // 2. Suppliers
  await executeSql(
    `INSERT INTO suppliers (name, contact_name, phone, email, address)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING;`,
    ['Công ty TNHH Phân Phối Công Nghệ Á Châu', 'Nguyễn Văn Minh', '0912345678', 'contact@asiatech.vn', 'Hà Nội, Việt Nam']
  );
  console.log('✓ Suppliers seeded.');

  // 3. Products
  const sampleProducts = [
    {
      name: 'Đồng hồ thông minh Smart Watch Pro X1',
      description: 'Màn hình AMOLED 1.4 inch, đo nhịp tim, chống nước IP68, pin 14 ngày.',
      importPrice: 1200000,
      sellingPrice: 1890000,
      originalPrice: 2200000,
      salePrice: 1890000,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
      category: 'Điện tử',
      quantity: 45,
      reserveStock: 10,
    },
    {
      name: 'Tai nghe không dây Bluetooth ANC Pods 3',
      description: 'Chống ồn chủ động ANC 35dB, âm thanh Hi-Res, sạc nhanh không dây.',
      importPrice: 650000,
      sellingPrice: 990000,
      originalPrice: 1290000,
      salePrice: 990000,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
      category: 'Điện tử',
      quantity: 80,
      reserveStock: 15,
    },
    {
      name: 'Nồi chiên không dầu điện tử EcoAir 6.5L',
      description: 'Dung tích lớn 6.5L, công nghệ nướng nhiệt đối lưu Rapid Air không dầu mỡ.',
      importPrice: 950000,
      sellingPrice: 1450000,
      originalPrice: 1850000,
      salePrice: 1450000,
      imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=800',
      category: 'Gia dụng',
      quantity: 35,
      reserveStock: 8,
    },
    {
      name: 'Robot hút bụi lau nhà thông minh CleanBot Ultra',
      description: 'Lực hút 4000Pa, định vị Laser LiDAR 3D, tự động dọn rác và giặt giẻ.',
      importPrice: 4200000,
      sellingPrice: 6500000,
      originalPrice: 7900000,
      salePrice: 6500000,
      imageUrl: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=800',
      category: 'Gia dụng',
      quantity: 20,
      reserveStock: 5,
    },
    {
      name: 'Đôi dép quai ngang thời trang Cloud Slide',
      description: 'Chất liệu EVA đúc nguyên khối siêu êm, chống trơn trượt hiệu quả.',
      importPrice: 85000,
      sellingPrice: 165000,
      originalPrice: 220000,
      salePrice: 165000,
      imageUrl: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&q=80&w=800',
      category: 'Phụ kiện',
      quantity: 120,
      reserveStock: 25,
    },
    {
      name: 'Đèn bàn học chống cận LED SmartLight Pro',
      description: 'Độ hoàn màu CRI 95+, 5 chế độ sáng cảm ứng, cổng sạc USB tích hợp.',
      importPrice: 220000,
      sellingPrice: 380000,
      originalPrice: 450000,
      salePrice: 380000,
      imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800',
      category: 'Văn phòng',
      quantity: 65,
      reserveStock: 12,
    },
  ];

  // Fetch category IDs
  const catRes = await executeSql(`SELECT id, name FROM categories;`);
  const catMap = {};
  for (const row of catRes.rows) {
    catMap[row.name] = row.id;
  }

  // Fetch supplier ID
  const supRes = await executeSql(`SELECT id FROM suppliers LIMIT 1;`);
  const supplierId = supRes.rows[0]?.id || null;

  for (const p of sampleProducts) {
    const categoryId = catMap[p.category] || null;
    await executeSql(
      `INSERT INTO products (
        name, description, import_price, selling_price, original_price, sale_price,
        image_url, category_id, supplier_id, quantity, reserve_stock
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
      [
        p.name,
        p.description,
        p.importPrice,
        p.sellingPrice,
        p.originalPrice,
        p.salePrice,
        p.imageUrl,
        categoryId,
        supplierId,
        p.quantity,
        p.reserveStock,
      ]
    );
  }

  console.log('✓ Products seeded successfully to Neon!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
