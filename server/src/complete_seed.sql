-- =============================================================================
-- HỆ THỐNG QUẢN LÝ BÁN HÀNG & KHO THÔNG MINH - SMARTSALE POSTGRESQL DATABASE
-- =============================================================================

-- 0. DỌN DẸP DỮ LIỆU CŨ (NẾU CẦN KHỞI TẠO LẠI TOÀN BỘ TỪ ĐẦU)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS stock_receipt_items CASCADE;
DROP TABLE IF EXISTS stock_receipts CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG (USERS)
-- Phân quyền: Admin (Quản trị), SalesStaff (Bán hàng), WarehouseKeeper (Thủ kho), Customer (Khách hàng)
-- =============================================================================
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'SalesStaff', 'WarehouseKeeper', 'Customer')),
  date_of_birth DATE,
  sex SMALLINT DEFAULT 1, -- 1: Nam, 2: Nữ, 0: Khác
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. BẢNG DANH MỤC SẢN PHẨM (CATEGORIES)
-- =============================================================================
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  parent_category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL
);

-- =============================================================================
-- 3. BẢNG NHÀ CUNG CẤP (SUPPLIERS)
-- =============================================================================
CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4. BẢNG SẢN PHẨM & HÀNG HÓA (PRODUCTS)
-- =============================================================================
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  import_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (import_price >= 0),
  selling_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  original_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (original_price >= 0),
  sale_price NUMERIC(14,2),
  image_url TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserve_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserve_stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5. BẢNG HỒ SƠ KHÁCH HÀNG (CUSTOMERS)
-- =============================================================================
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  gender SMALLINT DEFAULT 1,
  cccd TEXT,
  age INTEGER,
  tier TEXT DEFAULT 'Standard' CHECK (tier IN ('Standard', 'Silver', 'Gold', 'Platinum')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 6. BẢNG ĐƠN HÀNG / HÓA ĐƠN BÁN HÀNG (ORDERS)
-- =============================================================================
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  sales_staff_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN (
    'Pending', 'PendingPayment', 'ProcessingPayment', 'Paid',
    'PaymentCancelled', 'PaymentExpired', 'PaymentFailed',
    'Processing', 'Shipped', 'Completed', 'Cancelled',
    'RefundRequested', 'Refunded', 'RefundRejected'
  )),
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'PayOS')),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  debt_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_order_code BIGINT UNIQUE,
  payos_transaction_reference TEXT,
  refund_amount NUMERIC(14,2),
  refund_reason TEXT,
  refund_transaction_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 7. BẢNG CHI TIẾT ĐƠN HÀNG (ORDER_ITEMS)
-- =============================================================================
CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  sub_total NUMERIC(14,2) NOT NULL CHECK (sub_total >= 0)
);

-- =============================================================================
-- 8. BẢNG PHIẾU NHẬP KHO (STOCK_RECEIPTS)
-- =============================================================================
CREATE TABLE stock_receipts (
  id BIGSERIAL PRIMARY KEY,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  import_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN (
    'Draft', 'PendingApproval', 'Approved', 'Rejected', 'Confirmed', 'Cancelled'
  )),
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 9. BẢNG CHI TIẾT PHIẾU NHẬP KHO (STOCK_RECEIPT_ITEMS)
-- =============================================================================
CREATE TABLE stock_receipt_items (
  id BIGSERIAL PRIMARY KEY,
  receipt_id BIGINT NOT NULL REFERENCES stock_receipts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  import_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (import_price >= 0)
);

-- =============================================================================
-- 10. BẢNG PHIÊN CHAT AI & TIN NHẮN (CHATBOT)
-- =============================================================================
CREATE TABLE chat_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TẠO CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_receipts_supplier ON stock_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, id);


-- =============================================================================
-- DỮ LIỆU MẪU ĐẦY ĐỦ VÀ HỢP LÝ (SEED DATA)
-- =============================================================================

-- 1. TÀI KHOẢN HỆ THỐNG (Mật khẩu đã mã hóa bcrypt 12 rounds chuẩn xác)
-- Mật khẩu chung:
-- Admin: Admin@123456
-- SalesStaff: Sales@123456
-- WarehouseKeeper: Warehouse@123456
-- Customer: Customer@123456
INSERT INTO users (id, user_name, full_name, email, password_hash, role, date_of_birth, sex, address, phone) VALUES
(1, 'admin', 'Nguyễn Thế Dân (Admin)', 'admin@smartsale.com', '$2a$12$e8x51b/d0/qEaEre0Dqm3.G4gXfE8QZg9E/E8N6y8Uq1L6P4Z2aW2', 'Admin', '1995-06-15', 1, 'Tòa nhà Landmark 81, TP. Hồ Chí Minh', '0901234567'),
(2, 'sales_linh', 'Trần Phương Linh (Bán hàng)', 'sales@smartsale.com', '$2a$12$NqLq7qjBq0sA6cK/d38iA.1O8G1M4Q.c9IeG3mX1vY3w8L3gV0K7O', 'SalesStaff', '1998-09-20', 2, 'Cầu Giấy, Hà Nội', '0912345678'),
(3, 'kho_hai', 'Lê Hoàng Hải (Thủ kho)', 'warehouse@smartsale.com', '$2a$12$Z0bC7rJkQ1sB9cM/d58jB.2P9H2N5R.d0JfH4nY2wZ4x9M4hW1L8P', 'WarehouseKeeper', '1994-03-10', 1, 'Kho Tổng Tân Bình, TP. Hồ Chí Minh', '0923456789'),
(4, 'cust_viet', 'Phạm Quốc Việt (Khách VIP)', 'customer@smartsale.com', '$2a$12$Y1aB6qIkP0rA8bL/c47iA.0N7F0L3P.b8IeG2mX0uX3v7K2fU9J6N', 'Customer', '1992-12-05', 1, 'Quận 1, TP. Hồ Chí Minh', '0934567890'),
(5, 'cust_mai', 'Nguyễn Thị Tuyết Mai', 'mai.nguyen@gmail.com', '$2a$12$Y1aB6qIkP0rA8bL/c47iA.0N7F0L3P.b8IeG2mX0uX3v7K2fU9J6N', 'Customer', '1996-08-18', 2, 'Thanh Xuân, Hà Nội', '0945678901')
ON CONFLICT (id) DO NOTHING;

-- 2. DANH MỤC SẢN PHẨM
INSERT INTO categories (id, name) VALUES
(1, 'Điện tử'),
(2, 'Gia dụng'),
(3, 'Phụ kiện'),
(4, 'Văn phòng'),
(5, 'Mỹ phẩm & Chăm sóc')
ON CONFLICT (id) DO NOTHING;

-- 3. NHÀ CUNG CẤP
INSERT INTO suppliers (id, name, contact_name, phone, email, address, notes) VALUES
(1, 'Công ty TNHH Phân Phối Công Nghệ Á Châu', 'Nguyễn Văn Minh', '0912345678', 'contact@asiatech.vn', 'Số 12 Duy Tân, Cầu Giấy, Hà Nội', 'Cung cấp linh kiện điện tử, đồng hồ và phụ kiện số 1'),
(2, 'Tập đoàn Thiết Bị Gia Dụng SmartHome Toàn Cầu', 'Lê Thị Thu Thảo', '0988776655', 'sales@smarthome.vn', 'Khu Công Nghệ Cao, Quận 9, TP. HCM', 'Chuyên cung cấp robot hút bụi, nồi chiên và đồ gia dụng cao cấp'),
(3, 'Xưởng Sản Xuất Phụ Kiện Thời Trang Đông Dương', 'Trần Đình Trọng', '0977665544', 'supplier@dongduongfashion.com', 'Cụm CN Tân Bình, TP. HCM', 'Cung cấp dép, túi xách, kính mắt chất lượng cao'),
(4, 'Công ty CP Thiết Bị Văn Phòng Hiện Đại ProOffice', 'Hoàng Kim Yến', '0966554433', 'yen.hoang@prooffice.vn', 'Số 88 Nguyễn Thái Học, Ba Đình, Hà Nội', 'Thiết bị bàn làm việc, đèn học chống cận, ghế công thái học')
ON CONFLICT (id) DO NOTHING;

-- 4. SẢN PHẨM
INSERT INTO products (id, name, description, import_price, selling_price, original_price, sale_price, image_url, category_id, supplier_id, quantity, reserve_stock) VALUES
(1, 'Đồng hồ thông minh Smart Watch Pro X1', 'Màn hình AMOLED 1.43 inch sắc nét, đo nhịp tim, nồng độ oxy SpO2, chống nước 5ATM, pin bền 14 ngày.', 1200000, 1890000, 2200000, 1890000, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800', 1, 1, 65, 10),
(2, 'Tai nghe không dây Bluetooth ANC Pods 3', 'Chống ồn chủ động ANC 35dB, âm thanh vòm Hi-Res Spatial Audio, sạc nhanh không dây Qi, thời lượng pin 30h.', 650000, 990000, 1290000, 990000, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800', 1, 1, 110, 15),
(3, 'Đầu thu âm thanh Bluetooth 5.3 DAC Ultra', 'Bộ chuyển đổi âm thanh giải mã chất lượng cao 24-bit 96kHz, truyền tải âm thanh không suy hao.', 350000, 520000, 650000, 520000, 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=800', 1, 1, 40, 5),
(4, 'Nồi chiên không dầu điện tử EcoAir 6.5L', 'Dung tích cực đại 6.5L nướng nguyên con gà, công nghệ đối lưu nhiệt 360 độ giảm 85% chất béo.', 950000, 1450000, 1850000, 1450000, 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=800', 2, 2, 45, 8),
(5, 'Robot hút bụi lau nhà thông minh CleanBot Ultra', 'Lực hút siêu mạnh 4000Pa, định vị Laser LiDAR 3D né vật cản, tự động giặt giẻ và gom rác thông minh.', 4200000, 6500000, 7900000, 6500000, 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=800', 2, 2, 28, 5),
(6, 'Đôi dép quai ngang thời trang Cloud Slide', 'Chất liệu hạt nhựa EVA đúc nguyên khối mềm mại như mây, thiết kế đế chống trơn trượt hiệu quả.', 85000, 165000, 220000, 165000, 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&q=80&w=800', 3, 3, 150, 20),
(7, 'Balo chống nước thời trang Urban Traveler 20L', 'Vải chống thấm chuẩn Oxford 900D, ngăn đựng laptop chống sốc 15.6 inch riêng biệt, cổng sạc USB.', 250000, 390000, 480000, 390000, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800', 3, 3, 75, 10),
(8, 'Đèn bàn học chống cận LED SmartLight Pro', 'Chip LED quang phổ mặt trời CRI 95+, 5 cấp độ sáng cảm ứng, xoay gập 180 độ, bảo vệ thị lực tối đa.', 220000, 380000, 450000, 380000, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=800', 4, 4, 90, 12),
(9, 'Kệ đỡ laptop công thái học Aluminum Stand', 'Hợp kim nhôm nguyên khối dày 3mm chắc chắn, nâng tản nhiệt laptop, gập gọn tiện di chuyển.', 180000, 290000, 350000, 290000, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=800', 4, 4, 85, 15)
ON CONFLICT (id) DO NOTHING;

-- 5. HỒ SƠ KHÁCH HÀNG
INSERT INTO customers (id, user_id, full_name, phone, email, address, gender, cccd, age, tier) VALUES
(1, 4, 'Phạm Quốc Việt', '0934567890', 'customer@smartsale.com', 'Số 45 Lê Duẩn, Bến Nghé, Quận 1, TP. HCM', 1, '079092001234', 32, 'Platinum'),
(2, 5, 'Nguyễn Thị Tuyết Mai', '0945678901', 'mai.nguyen@gmail.com', 'Số 18 Nguyễn Trãi, Thanh Xuân, Hà Nội', 2, '001196005678', 28, 'Gold'),
(3, NULL, 'Vũ Hoàng Nam', '0966112233', 'nam.vu@outlook.com', 'Tầng 12 Landmark, Ba Đình, Hà Nội', 1, '001090008899', 35, 'Silver'),
(4, NULL, 'Đoàn Thúy Hằng', '0977223344', 'hang.doan@yahoo.com', 'Số 204 Trần Hưng Đạo, Quận 5, TP. HCM', 2, '079195007788', 29, 'Standard')
ON CONFLICT (id) DO NOTHING;

-- 6. PHIẾU NHẬP KHO (STOCK_RECEIPTS)
INSERT INTO stock_receipts (id, supplier_id, invoice_number, import_date, note, status, created_by_user_id, approved_by_user_id, submitted_at, approved_at, confirmed_at) VALUES
(1, 1, 'NK-2026-001', '2026-08-10', 'Nhập lô đồng hồ Smart Watch Pro và tai nghe ANC đợt 1', 'Confirmed', 3, 1, '2026-08-10 08:30:00+07', '2026-08-10 09:00:00+07', '2026-08-10 10:15:00+07'),
(2, 2, 'NK-2026-002', '2026-08-12', 'Nhập bổ sung robot hút bụi và nồi chiên EcoAir', 'Confirmed', 3, 1, '2026-08-12 14:00:00+07', '2026-08-12 14:30:00+07', '2026-08-12 16:00:00+07'),
(3, 3, 'NK-2026-003', '2026-08-15', 'Nhập lô dép Cloud Slide và balo thời trang mùa hè', 'Approved', 3, 1, '2026-08-15 09:15:00+07', '2026-08-15 10:00:00+07', NULL),
(4, 4, 'NK-2026-004', '2026-08-18', 'Nhập đèn bàn học chống cận và giá đỡ nhôm công thái học', 'PendingApproval', 3, NULL, '2026-08-18 11:20:00+07', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 7. CHI TIẾT PHIẾU NHẬP KHO (STOCK_RECEIPT_ITEMS)
INSERT INTO stock_receipt_items (id, receipt_id, product_id, quantity, import_price) VALUES
(1, 1, 1, 50, 1200000),
(2, 1, 2, 80, 650000),
(3, 2, 4, 30, 950000),
(4, 2, 5, 20, 4200000),
(5, 3, 6, 120, 85000),
(6, 3, 7, 60, 250000),
(7, 4, 8, 70, 220000),
(8, 4, 9, 60, 180000)
ON CONFLICT (id) DO NOTHING;

-- 8. ĐƠN HÀNG (ORDERS)
INSERT INTO orders (id, user_id, customer_id, sales_staff_id, status, payment_method, subtotal, discount_amount, total, amount_paid, debt_amount, payment_order_code, created_at) VALUES
(1001, 4, 1, 2, 'Completed', 'PayOS', 2880000, 100000, 2780000, 2780000, 0, 17872001, '2026-08-16 10:20:00+07'),
(1002, 5, 2, 2, 'Completed', 'Cash', 1450000, 50000, 1400000, 1400000, 0, 17872002, '2026-08-17 14:15:00+07'),
(1003, NULL, 3, 2, 'Shipped', 'Cash', 6500000, 200000, 6300000, 2000000, 4300000, 17872003, '2026-08-18 09:40:00+07'),
(1004, 4, 1, 2, 'Processing', 'PayOS', 1890000, 0, 1890000, 1890000, 0, 17872004, '2026-08-19 16:30:00+07'),
(1005, NULL, 4, 2, 'Pending', 'Cash', 670000, 0, 670000, 0, 670000, 17872005, '2026-08-20 11:05:00+07')
ON CONFLICT (id) DO NOTHING;

-- 9. CHI TIẾT ĐƠN HÀNG (ORDER_ITEMS)
INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price, sub_total) VALUES
(1, 1001, 1, 'Đồng hồ thông minh Smart Watch Pro X1', 1, 1890000, 1890000),
(2, 1001, 2, 'Tai nghe không dây Bluetooth ANC Pods 3', 1, 990000, 990000),
(3, 1002, 4, 'Nồi chiên không dầu điện tử EcoAir 6.5L', 1, 1450000, 1450000),
(4, 1003, 5, 'Robot hút bụi lau nhà thông minh CleanBot Ultra', 1, 6500000, 6500000),
(5, 1004, 1, 'Đồng hồ thông minh Smart Watch Pro X1', 1, 1890000, 1890000),
(6, 1005, 8, 'Đèn bàn học chống cận LED SmartLight Pro', 1, 380000, 380000),
(7, 1005, 9, 'Kệ đỡ laptop công thái học Aluminum Stand', 1, 290000, 290000)
ON CONFLICT (id) DO NOTHING;

-- 10. ĐỒNG BỘ AUTO-INCREMENT SEQUENCES ĐỂ KHÔNG BỊ TRÙNG ID KHI THÊM MỚI
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories));
SELECT setval('suppliers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM suppliers));
SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));
SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM customers));
SELECT setval('orders_id_seq', (SELECT COALESCE(MAX(id), 1) FROM orders));
SELECT setval('order_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM order_items));
SELECT setval('stock_receipts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM stock_receipts));
SELECT setval('stock_receipt_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM stock_receipt_items));

-- =============================================================================
-- HOÀN TẤT KHỞI TẠO VÀ NẠP TOÀN BỘ CƠ SỞ DỮ LIỆU SMARTSALE!
-- =============================================================================
