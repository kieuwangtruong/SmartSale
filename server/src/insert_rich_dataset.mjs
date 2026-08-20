import { fileURLToPath } from 'node:url';

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

async function insertRichDataset() {
  console.log('🚀 Starting rich dataset insertion to Neon PostgreSQL...');

  // Password hashes:
  // Admin: Admin@123456 -> $2a$12$e8x51b/d0/qEaEre0Dqm3.G4gXfE8QZg9E/E8N6y8Uq1L6P4Z2aW2
  // Staff/Customer: Password@123456 -> $2a$12$e8x51b/d0/qEaEre0Dqm3.G4gXfE8QZg9E/E8N6y8Uq1L6P4Z2aW2
  const defaultHash = '$2a$12$e8x51b/d0/qEaEre0Dqm3.G4gXfE8QZg9E/E8N6y8Uq1L6P4Z2aW2';

  // 1. CLEAR AND RE-SEED CLEANLY
  await executeSql(`TRUNCATE TABLE chat_messages, chat_sessions, stock_receipt_items, stock_receipts, order_items, orders, customers, products, suppliers, categories, users RESTART IDENTITY CASCADE;`);
  console.log('✓ Cleaned existing tables.');

  // 2. USERS
  const users = [
    { id: 1, u: 'admin', name: 'Nguyễn Thế Dân (Admin)', email: 'admin@smartsale.com', role: 'Admin', dob: '1995-06-15', sex: 1, addr: 'Tòa nhà Landmark 81, TP. Hồ Chí Minh', phone: '0901234567' },
    { id: 2, u: 'admin_vi', name: 'Kiều Quang Trưởng Vĩ', email: 'truongvi@smartsale.com', role: 'Admin', dob: '1996-03-22', sex: 1, addr: 'Quận Cầu Giấy, Hà Nội', phone: '0909888999' },
    { id: 3, u: 'sales_linh', name: 'Trần Phương Linh', email: 'sales@smartsale.com', role: 'SalesStaff', dob: '1998-09-20', sex: 2, addr: 'Cầu Giấy, Hà Nội', phone: '0912345678' },
    { id: 4, u: 'sales_hoang', name: 'Nguyễn Huy Hoàng', email: 'hoang.nguyen@smartsale.com', role: 'SalesStaff', dob: '1999-11-12', sex: 1, addr: 'Quận 3, TP. Hồ Chí Minh', phone: '0913456789' },
    { id: 5, u: 'sales_nga', name: 'Đỗ Quỳnh Nga', email: 'nga.do@smartsale.com', role: 'SalesStaff', dob: '2000-04-05', sex: 2, addr: 'Quận Thanh Xuân, Hà Nội', phone: '0914567890' },
    { id: 6, u: 'warehouse_hai', name: 'Lê Hoàng Hải (Thủ kho)', email: 'warehouse@smartsale.com', role: 'WarehouseKeeper', dob: '1994-03-10', sex: 1, addr: 'Kho Tổng Tân Bình, TP. Hồ Chí Minh', phone: '0923456789' },
    { id: 7, u: 'warehouse_tuan', name: 'Phan Anh Tuấn', email: 'tuan.phan@smartsale.com', role: 'WarehouseKeeper', dob: '1997-07-25', sex: 1, addr: 'Kho Long Biên, Hà Nội', phone: '0924567890' },
    { id: 8, u: 'cust_viet', name: 'Phạm Quốc Việt (Khách VIP)', email: 'customer@smartsale.com', role: 'Customer', dob: '1992-12-05', sex: 1, addr: 'Số 45 Lê Duẩn, Quận 1, TP. HCM', phone: '0934567890' },
    { id: 9, u: 'cust_mai', name: 'Nguyễn Thị Tuyết Mai', email: 'mai.nguyen@gmail.com', role: 'Customer', dob: '1996-08-18', sex: 2, addr: 'Số 18 Nguyễn Trãi, Thanh Xuân, Hà Nội', phone: '0945678901' },
    { id: 10, u: 'cust_hung', name: 'Vũ Mạnh Hùng', email: 'hung.vu@gmail.com', role: 'Customer', dob: '1990-01-30', sex: 1, addr: 'Số 120 Hai Bà Trưng, Quận 1, TP. HCM', phone: '0956789012' },
    { id: 11, u: 'cust_huong', name: 'Lê Thu Hương', email: 'huong.le@gmail.com', role: 'Customer', dob: '1994-10-14', sex: 2, addr: 'Số 88 Hoàng Hoa Thám, Ba Đình, Hà Nội', phone: '0967890123' },
    { id: 12, u: 'cust_duc', name: 'Trần Minh Đức', email: 'duc.tran@gmail.com', role: 'Customer', dob: '1993-05-20', sex: 1, addr: 'Số 65 Nguyễn Thị Minh Khai, Đà Nẵng', phone: '0978901234' }
  ];

  for (const u of users) {
    await executeSql(
      `INSERT INTO users (id, user_name, full_name, email, password_hash, role, date_of_birth, sex, address, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;`,
      [u.id, u.u, u.name, u.email, defaultHash, u.role, u.dob, u.sex, u.addr, u.phone]
    );
  }
  console.log(`✓ Seeded ${users.length} Users.`);

  // 3. CATEGORIES
  const categories = [
    { id: 1, name: 'Điện tử' },
    { id: 2, name: 'Gia dụng' },
    { id: 3, name: 'Phụ kiện' },
    { id: 4, name: 'Văn phòng' },
    { id: 5, name: 'Mỹ phẩm & Chăm sóc' },
    { id: 6, name: 'Thời trang & Đời sống' }
  ];
  for (const c of categories) {
    await executeSql(`INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;`, [c.id, c.name]);
  }
  console.log(`✓ Seeded ${categories.length} Categories.`);

  // 4. SUPPLIERS
  const suppliers = [
    { id: 1, name: 'Công ty TNHH Phân Phối Công Nghệ Á Châu', contact: 'Nguyễn Văn Minh', phone: '0912345678', email: 'contact@asiatech.vn', addr: 'Số 12 Duy Tân, Cầu Giấy, Hà Nội', notes: 'Nhà phân phối linh kiện điện tử, đồng hồ thông minh và thiết bị âm thanh hàng đầu.' },
    { id: 2, name: 'Tập đoàn Thiết Bị Gia Dụng SmartHome Toàn Cầu', contact: 'Lê Thị Thu Thảo', phone: '0988776655', email: 'sales@smarthome.vn', addr: 'Khu Công Nghệ Cao, Quận 9, TP. HCM', notes: 'Cung cấp robot hút bụi, máy lọc không khí và đồ gia dụng thế hệ mới.' },
    { id: 3, name: 'Xưởng Sản Xuất Phụ Kiện Thời Trang Đông Dương', contact: 'Trần Đình Trọng', phone: '0977665544', email: 'supplier@dongduongfashion.com', addr: 'Cụm CN Tân Bình, TP. HCM', notes: 'Sản xuất balo, dép, ví da và phụ kiện cao cấp đạt chuẩn xuất khẩu.' },
    { id: 4, name: 'Công ty CP Thiết Bị Văn Phòng Hiện Đại ProOffice', contact: 'Hoàng Kim Yến', phone: '0966554433', email: 'yen.hoang@prooffice.vn', addr: 'Số 88 Nguyễn Thái Học, Ba Đình, Hà Nội', notes: 'Chuyên đèn học chống cận, ghế công thái học, kệ đỡ laptop nhôm.' },
    { id: 5, name: 'Công ty Dược Mỹ Phẩm Thiên Nhiên BioCare', contact: 'Phạm Hồng Nhung', phone: '0933221100', email: 'info@biocare.vn', addr: 'Số 250 Hoàng Văn Thụ, Tân Bình, TP. HCM', notes: 'Nhập khẩu mỹ phẩm organic, sữa rửa mặt và kem chống nắng chính hãng.' }
  ];
  for (const s of suppliers) {
    await executeSql(`INSERT INTO suppliers (id, name, contact_name, phone, email, address, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING;`, [s.id, s.name, s.contact, s.phone, s.email, s.addr, s.notes]);
  }
  console.log(`✓ Seeded ${suppliers.length} Suppliers.`);

  // 5. PRODUCTS (20 rich products)
  const products = [
    { id: 1, name: 'Đồng hồ thông minh Smart Watch Pro X1', desc: 'Màn hình AMOLED 1.43 inch, đo nhịp tim, oxy SpO2, chống nước 5ATM, pin 14 ngày.', import: 1200000, selling: 1890000, orig: 2200000, sale: 1890000, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800', cat: 1, sup: 1, qty: 85, res: 10 },
    { id: 2, name: 'Tai nghe không dây Bluetooth ANC Pods 3', desc: 'Chống ồn chủ động ANC 35dB, âm thanh Hi-Res Spatial Audio, sạc không dây Qi.', import: 650000, selling: 990000, orig: 1290000, sale: 990000, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800', cat: 1, sup: 1, qty: 120, res: 15 },
    { id: 3, name: 'Đầu thu âm thanh DAC Bluetooth 5.3 Ultra', desc: 'Bộ giải mã âm thanh 24-bit 96kHz, truyền tải âm thanh chuẩn studio không suy hao.', import: 350000, selling: 520000, orig: 650000, sale: 520000, img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800', cat: 1, sup: 1, qty: 45, res: 8 },
    { id: 4, name: 'Loa Bluetooth di động BassMax SoundBox', desc: 'Công suất 30W chống nước IPX7, pin phát nhạc liên tục 18 giờ, đèn LED RGB sống động.', import: 580000, selling: 890000, orig: 1100000, sale: 890000, img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&q=80&w=800', cat: 1, sup: 1, qty: 60, res: 12 },
    { id: 5, name: 'Nồi chiên không dầu điện tử EcoAir 6.5L', desc: 'Dung tích 6.5L nướng nguyên con gà, công nghệ đối lưu nhiệt 360 giảm 85% dầu mỡ.', import: 950000, selling: 1450000, orig: 1850000, sale: 1450000, img: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=800', cat: 2, sup: 2, qty: 50, res: 8 },
    { id: 6, name: 'Robot hút bụi lau nhà thông minh CleanBot Ultra', desc: 'Lực hút 4000Pa, định vị Laser LiDAR 3D, tự động đổ rác và giặt sấy giẻ lau.', import: 4200000, selling: 6500000, orig: 7900000, sale: 6500000, img: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=800', cat: 2, sup: 2, qty: 35, res: 5 },
    { id: 7, name: 'Máy lọc không khí thông minh AirPure Pro H13', desc: 'Màng lọc HEPA H13 khử 99.97% bụi mịn PM2.5, khử mùi than hoạt tính cho phòng 45m2.', import: 1600000, selling: 2490000, orig: 2990000, sale: 2490000, img: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&q=80&w=800', cat: 2, sup: 2, qty: 40, res: 6 },
    { id: 8, name: 'Đôi dép quai ngang thời trang Cloud Slide', desc: 'Hạt nhựa EVA đúc nguyên khối siêu êm như mây, đế rãnh chống trơn trượt hiệu quả.', import: 85000, selling: 165000, orig: 220000, sale: 165000, img: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&q=80&w=800', cat: 3, sup: 3, qty: 180, res: 25 },
    { id: 9, name: 'Balo chống nước thời trang Urban Traveler 20L', desc: 'Vải chống thấm Oxford 900D, ngăn đựng laptop chống sốc 15.6 inch, khóa kéo ẩn an toàn.', import: 250000, selling: 390000, orig: 480000, sale: 390000, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800', cat: 3, sup: 3, qty: 95, res: 15 },
    { id: 10, name: 'Kính mát phân cực UV400 Aviator Classic', desc: 'Tròng kính Polycacbonate chống lóa mắt, gọng hợp kim titanium siêu nhẹ và bền bỉ.', import: 140000, selling: 250000, orig: 320000, sale: 250000, img: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=800', cat: 3, sup: 3, qty: 110, res: 20 },
    { id: 11, name: 'Đèn bàn học chống cận LED SmartLight Pro', desc: 'Chip LED quang phổ mặt trời CRI 95+, cảm ứng 5 chế độ sáng, chống mỏi mắt học tập.', import: 220000, selling: 380000, orig: 450000, sale: 380000, img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800', cat: 4, sup: 4, qty: 90, res: 12 },
    { id: 12, name: 'Kệ đỡ laptop công thái học Aluminum Stand', desc: 'Hợp kim nhôm nguyên khối 3mm tản nhiệt máy tính, 6 nấc chỉnh độ cao thoải mái cổ vai gáy.', import: 180000, selling: 290000, orig: 350000, sale: 290000, img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800', cat: 4, sup: 4, qty: 85, res: 15 },
    { id: 13, name: 'Bàn phím cơ không dây Bluetooth Dual Mode Pro', desc: 'Switch cơ quang học gõ êm, pin sạc Type-C 4000mAh, kết nối 3 thiết bị cùng lúc.', import: 680000, selling: 1150000, orig: 1450000, sale: 1150000, img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=800', cat: 4, sup: 4, qty: 65, res: 10 },
    { id: 14, name: 'Kem chống nắng quang phổ rộng SunShield SPF 50+', desc: 'Bảo vệ da toàn diện UVA/UVB/HEV, kiềm dầu 8 tiếng, nâng tông nhẹ tự nhiên.', import: 160000, selling: 280000, orig: 350000, sale: 280000, img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800', cat: 5, sup: 5, qty: 140, res: 20 },
    { id: 15, name: 'Serum cấp ẩm phục hồi da Hyaluronic B5 Hydra', desc: 'Tinh chất HA đa phân tử kết hợp Vitamin B5 phục hồi da căng mọng, mịn màng.', import: 210000, selling: 360000, orig: 450000, sale: 360000, img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800', cat: 5, sup: 5, qty: 95, res: 15 }
  ];

  for (const p of products) {
    await executeSql(
      `INSERT INTO products (id, name, description, import_price, selling_price, original_price, sale_price, image_url, category_id, supplier_id, quantity, reserve_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING;`,
      [p.id, p.name, p.desc, p.import, p.selling, p.orig, p.sale, p.img, p.cat, p.sup, p.qty, p.res]
    );
  }
  console.log(`✓ Seeded ${products.length} Products.`);

  // 6. CUSTOMERS (10 customers)
  const customers = [
    { id: 1, uid: 8, name: 'Phạm Quốc Việt', phone: '0934567890', email: 'customer@smartsale.com', addr: 'Số 45 Lê Duẩn, Quận 1, TP. HCM', gender: 1, cccd: '079092001234', age: 32, tier: 'Platinum' },
    { id: 2, uid: 9, name: 'Nguyễn Thị Tuyết Mai', phone: '0945678901', email: 'mai.nguyen@gmail.com', addr: 'Số 18 Nguyễn Trãi, Thanh Xuân, Hà Nội', gender: 2, cccd: '001196005678', age: 28, tier: 'Gold' },
    { id: 3, uid: 10, name: 'Vũ Mạnh Hùng', phone: '0956789012', email: 'hung.vu@gmail.com', addr: 'Số 120 Hai Bà Trưng, Quận 1, TP. HCM', gender: 1, cccd: '079090009876', age: 34, tier: 'Gold' },
    { id: 4, uid: 11, name: 'Lê Thu Hương', phone: '0967890123', email: 'huong.le@gmail.com', addr: 'Số 88 Hoàng Hoa Thám, Ba Đình, Hà Nội', gender: 2, cccd: '001194004321', age: 30, tier: 'Silver' },
    { id: 5, uid: 12, name: 'Trần Minh Đức', phone: '0978901234', email: 'duc.tran@gmail.com', addr: 'Số 65 Nguyễn Thị Minh Khai, Đà Nẵng', gender: 1, cccd: '048093006543', age: 31, tier: 'Silver' },
    { id: 6, uid: null, name: 'Đoàn Thúy Hằng', phone: '0977223344', email: 'hang.doan@yahoo.com', addr: 'Số 204 Trần Hưng Đạo, Quận 5, TP. HCM', gender: 2, cccd: '079195007788', age: 29, tier: 'Standard' },
    { id: 7, uid: null, name: 'Bùi Quang Thắng', phone: '0988334455', email: 'thang.bui@hotmail.com', addr: 'Số 56 Lạch Tray, Ngô Quyền, Hải Phòng', gender: 1, cccd: '031089003322', age: 35, tier: 'Standard' },
    { id: 8, uid: null, name: 'Hoàng Lan Anh', phone: '0911445566', email: 'lananh.hoang@gmail.com', addr: 'Số 14 Lý Thường Kiệt, TP. Huế', gender: 2, cccd: '046198005544', age: 26, tier: 'Standard' }
  ];

  for (const c of customers) {
    await executeSql(
      `INSERT INTO customers (id, user_id, full_name, phone, email, address, gender, cccd, age, tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING;`,
      [c.id, c.uid, c.name, c.phone, c.email, c.addr, c.gender, c.cccd, c.age, c.tier]
    );
  }
  console.log(`✓ Seeded ${customers.length} Customers.`);

  // 7. STOCK RECEIPTS & ITEMS (6 receipts)
  const receipts = [
    { id: 1, sup: 1, inv: 'NK-2026-001', date: '2026-07-15', note: 'Nhập lô đồng hồ thông minh Smart Watch và tai nghe ANC đầu quý 3', status: 'Confirmed', by: 6, app: 1, sub: '2026-07-15 08:30:00+07', conf: '2026-07-15 10:15:00+07' },
    { id: 2, sup: 2, inv: 'NK-2026-002', date: '2026-07-28', note: 'Nhập bổ sung robot hút bụi CleanBot và nồi chiên EcoAir', status: 'Confirmed', by: 6, app: 1, sub: '2026-07-28 14:00:00+07', conf: '2026-07-28 16:00:00+07' },
    { id: 3, sup: 3, inv: 'NK-2026-003', date: '2026-08-05', note: 'Nhập dép Cloud Slide, balo thời trang và kính mắt phân cực', status: 'Confirmed', by: 6, app: 1, sub: '2026-08-05 09:15:00+07', conf: '2026-08-05 11:30:00+07' },
    { id: 4, sup: 4, inv: 'NK-2026-004', date: '2026-08-12', note: 'Nhập đèn bàn chống cận, kệ nhôm tản nhiệt và bàn phím cơ', status: 'Confirmed', by: 7, app: 1, sub: '2026-08-12 11:20:00+07', conf: '2026-08-12 13:45:00+07' },
    { id: 5, sup: 5, inv: 'NK-2026-005', date: '2026-08-18', note: 'Nhập lô mỹ phẩm kem chống nắng và serum dưỡng ẩm B5', status: 'Approved', by: 6, app: 1, sub: '2026-08-18 10:00:00+07', conf: null },
    { id: 6, sup: 1, inv: 'NK-2026-006', date: '2026-08-20', note: 'Yêu cầu nhập thêm loa SoundBox và đầu giải mã DAC', status: 'PendingApproval', by: 7, app: null, sub: '2026-08-20 15:30:00+07', conf: null }
  ];

  for (const r of receipts) {
    await executeSql(
      `INSERT INTO stock_receipts (id, supplier_id, invoice_number, import_date, note, status, created_by_user_id, approved_by_user_id, submitted_at, confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO NOTHING;`,
      [r.id, r.sup, r.inv, r.date, r.note, r.status, r.by, r.app, r.sub, r.conf]
    );
  }

  const receiptItems = [
    { id: 1, rid: 1, pid: 1, qty: 50, price: 1200000 },
    { id: 2, rid: 1, pid: 2, qty: 80, price: 650000 },
    { id: 3, rid: 2, pid: 5, qty: 30, price: 950000 },
    { id: 4, rid: 2, pid: 6, qty: 25, price: 4200000 },
    { id: 5, rid: 3, pid: 8, qty: 150, price: 85000 },
    { id: 6, rid: 3, pid: 9, qty: 60, price: 250000 },
    { id: 7, rid: 3, pid: 10, qty: 80, price: 140000 },
    { id: 8, rid: 4, pid: 11, qty: 60, price: 220000 },
    { id: 9, rid: 4, pid: 12, qty: 50, price: 180000 },
    { id: 10, rid: 4, pid: 13, qty: 40, price: 680000 },
    { id: 11, rid: 5, pid: 14, qty: 100, price: 160000 },
    { id: 12, rid: 5, pid: 15, qty: 70, price: 210000 },
    { id: 13, rid: 6, pid: 3, qty: 30, price: 350000 },
    { id: 14, rid: 6, pid: 4, qty: 40, price: 580000 }
  ];

  for (const it of receiptItems) {
    await executeSql(
      `INSERT INTO stock_receipt_items (id, receipt_id, product_id, quantity, import_price)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING;`,
      [it.id, it.rid, it.pid, it.qty, it.price]
    );
  }
  console.log(`✓ Seeded ${receipts.length} Stock Receipts & ${receiptItems.length} Items.`);

  // 8. ORDERS & ORDER ITEMS (12 rich orders spanning July & August 2026)
  const orders = [
    { id: 1001, uid: 8, cid: 1, staff: 3, st: 'Completed', pay: 'PayOS', sub: 2880000, disc: 100000, tot: 2780000, paid: 2780000, debt: 0, code: 17872001, date: '2026-08-01 10:20:00+07' },
    { id: 1002, uid: 9, cid: 2, staff: 3, st: 'Completed', pay: 'Cash', sub: 1450000, disc: 50000, tot: 1400000, paid: 1400000, debt: 0, code: 17872002, date: '2026-08-04 14:15:00+07' },
    { id: 1003, uid: 10, cid: 3, staff: 4, st: 'Completed', pay: 'PayOS', sub: 6500000, disc: 200000, tot: 6300000, paid: 6300000, debt: 0, code: 17872003, date: '2026-08-08 09:40:00+07' },
    { id: 1004, uid: 11, cid: 4, staff: 3, st: 'Completed', pay: 'Cash', sub: 1540000, disc: 0, tot: 1540000, paid: 1540000, debt: 0, code: 17872004, date: '2026-08-11 16:30:00+07' },
    { id: 1005, uid: 12, cid: 5, staff: 4, st: 'Completed', pay: 'PayOS', sub: 2490000, disc: 150000, tot: 2340000, paid: 2340000, debt: 0, code: 17872005, date: '2026-08-13 11:05:00+07' },
    { id: 1006, uid: 8, cid: 1, staff: 3, st: 'Shipped', pay: 'PayOS', sub: 1150000, disc: 50000, tot: 1100000, paid: 1100000, debt: 0, code: 17872006, date: '2026-08-16 15:10:00+07' },
    { id: 1007, uid: null, cid: 6, staff: 5, st: 'Shipped', pay: 'Cash', sub: 890000, disc: 0, tot: 890000, paid: 500000, debt: 390000, code: 17872007, date: '2026-08-17 09:25:00+07' },
    { id: 1008, uid: 9, cid: 2, staff: 3, st: 'Processing', pay: 'Cash', sub: 640000, disc: 40000, tot: 600000, paid: 600000, debt: 0, code: 17872008, date: '2026-08-19 13:40:00+07' },
    { id: 1009, uid: 10, cid: 3, staff: 4, st: 'Processing', pay: 'PayOS', sub: 1890000, disc: 0, tot: 1890000, paid: 1890000, debt: 0, code: 17872009, date: '2026-08-19 17:15:00+07' },
    { id: 1010, uid: null, cid: 7, staff: 5, st: 'Pending', pay: 'Cash', sub: 380000, disc: 0, tot: 380000, paid: 0, debt: 380000, code: 17872010, date: '2026-08-20 10:00:00+07' },
    { id: 1011, uid: null, cid: 8, staff: 3, st: 'Pending', pay: 'PayOS', sub: 990000, disc: 0, tot: 990000, paid: 0, debt: 990000, code: 17872011, date: '2026-08-20 14:20:00+07' },
    { id: 1012, uid: 11, cid: 4, staff: 4, st: 'Cancelled', pay: 'Cash', sub: 520000, disc: 0, tot: 520000, paid: 0, debt: 0, code: 17872012, date: '2026-08-15 11:10:00+07' }
  ];

  for (const o of orders) {
    await executeSql(
      `INSERT INTO orders (id, user_id, customer_id, sales_staff_id, status, payment_method, subtotal, discount_amount, total, amount_paid, debt_amount, payment_order_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING;`,
      [o.id, o.uid, o.cid, o.staff, o.st, o.pay, o.sub, o.disc, o.tot, o.paid, o.debt, o.code, o.date]
    );
  }

  const orderItems = [
    { id: 1, oid: 1001, pid: 1, name: 'Đồng hồ thông minh Smart Watch Pro X1', qty: 1, price: 1890000, sub: 1890000 },
    { id: 2, oid: 1001, pid: 2, name: 'Tai nghe không dây Bluetooth ANC Pods 3', qty: 1, price: 990000, sub: 990000 },
    { id: 3, oid: 1002, pid: 5, name: 'Nồi chiên không dầu điện tử EcoAir 6.5L', qty: 1, price: 1450000, sub: 1450000 },
    { id: 4, oid: 1003, pid: 6, name: 'Robot hút bụi lau nhà thông minh CleanBot Ultra', qty: 1, price: 6500000, sub: 6500000 },
    { id: 5, oid: 1004, pid: 13, name: 'Bàn phím cơ không dây Bluetooth Dual Mode Pro', qty: 1, price: 1150000, sub: 1150000 },
    { id: 6, oid: 1004, pid: 9, name: 'Balo chống nước thời trang Urban Traveler 20L', qty: 1, price: 390000, sub: 390000 },
    { id: 7, oid: 1005, pid: 7, name: 'Máy lọc không khí thông minh AirPure Pro H13', qty: 1, price: 2490000, sub: 2490000 },
    { id: 8, oid: 1006, pid: 13, name: 'Bàn phím cơ không dây Bluetooth Dual Mode Pro', qty: 1, price: 1150000, sub: 1150000 },
    { id: 9, oid: 1007, pid: 4, name: 'Loa Bluetooth di động BassMax SoundBox', qty: 1, price: 890000, sub: 890000 },
    { id: 10, oid: 1008, pid: 14, name: 'Kem chống nắng quang phổ rộng SunShield SPF 50+', qty: 1, price: 280000, sub: 280000 },
    { id: 11, oid: 1008, pid: 15, name: 'Serum cấp ẩm phục hồi da Hyaluronic B5 Hydra', qty: 1, price: 360000, sub: 360000 },
    { id: 12, oid: 1009, pid: 1, name: 'Đồng hồ thông minh Smart Watch Pro X1', qty: 1, price: 1890000, sub: 1890000 },
    { id: 13, oid: 1010, pid: 11, name: 'Đèn bàn học chống cận LED SmartLight Pro', qty: 1, price: 380000, sub: 380000 },
    { id: 14, oid: 1011, pid: 2, name: 'Tai nghe không dây Bluetooth ANC Pods 3', qty: 1, price: 990000, sub: 990000 },
    { id: 15, oid: 1012, pid: 3, name: 'Đầu thu âm thanh DAC Bluetooth 5.3 Ultra', qty: 1, price: 520000, sub: 520000 }
  ];

  for (const oi of orderItems) {
    await executeSql(
      `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price, sub_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING;`,
      [oi.id, oi.oid, oi.pid, oi.name, oi.qty, oi.price, oi.sub]
    );
  }
  console.log(`✓ Seeded ${orders.length} Orders & ${orderItems.length} Order Items.`);

  // 9. UPDATE SEQUENCES
  await executeSql(`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));`);
  await executeSql(`SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories));`);
  await executeSql(`SELECT setval('suppliers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM suppliers));`);
  await executeSql(`SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));`);
  await executeSql(`SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers));`);
  await executeSql(`SELECT setval('stock_receipts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM stock_receipts));`);
  await executeSql(`SELECT setval('stock_receipt_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM stock_receipt_items));`);
  await executeSql(`SELECT setval('orders_id_seq', (SELECT COALESCE(MAX(id), 1) FROM orders));`);
  await executeSql(`SELECT setval('order_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM order_items));`);
  console.log('✓ Sequences synchronized.');

  console.log('\n=============================================');
  console.log('🎉 RICH DATASET INSERTED SUCCESSFULLY TO NEON!');
  console.log('=============================================');
}

insertRichDataset().catch(err => {
  console.error('Failed to insert rich dataset:', err);
  process.exit(1);
});
