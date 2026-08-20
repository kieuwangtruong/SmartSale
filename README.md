# 🛍️ SmartSale - Omnichannel Sales & Real-Time Inventory Management System

**SmartSale** là nền tảng quản lý bán hàng đa kênh và kiểm soát tồn kho thông minh thế hệ mới. Hệ thống tích hợp cổng thanh toán trực tuyến PayOS QR, báo cáo phân tích kinh doanh nâng cao (BI Analytics), trợ lý ảo AI Chatbot và hệ thống phân quyền đa người dùng.

---

## 🚀 Tính năng nổi bật

- **Cửa hàng trực tuyến (Storefront):**
  - Trải nghiệm mua sắm hiện đại, hỗ trợ bộ lọc và tìm kiếm chuyên biệt theo từng danh mục.
  - Trình xem ảnh lớn sắc nét (Image Lightbox Viewer) với thư viện ảnh chi tiết.
  - Giỏ hàng thời gian thực, đồng bộ tồn kho trực tiếp.
  - Thanh toán tự động qua mã QR PayOS và Tiền mặt.
  - Lộ trình theo dõi trạng thái đơn hàng trực quan.
- **Quản trị bán hàng & CRM:**
  - Quản lý danh sách đơn hàng, xuất Excel, xử lý trạng thái đơn và công nợ.
  - Quản lý hồ sơ khách hàng, phân cấp bậc thành viên (*Standard, Silver, Gold, Platinum*).
- **Quản lý kho & Nhà cung cấp:**
  - Lập và phê duyệt phiếu nhập kho nhiều bước (*Draft $\rightarrow$ Pending $\rightarrow$ Confirmed*).
  - Cảnh báo tồn kho an toàn (`reserve_stock`), theo dõi biến động hàng hóa.
- **Báo cáo & Phân tích kinh doanh (BI Analytics):**
  - Trực quan hóa doanh thu, lợi nhuận, phân khúc khách hàng, tỷ lệ chuyển đổi, phân tích vòng đời khách hàng (LTV) và biểu đồ giữ chân (Cohort Retention).
- **Trợ lý AI Chatbot:**
  - Hỗ trợ tư vấn sản phẩm, tra cứu đơn hàng và gợi ý mua sắm thông minh 24/7.

---

## 🛠️ Công nghệ sử dụng

- **Frontend:** Vue 3 (Composition API), Vite, TypeScript, PrimeVue, Chart.js, Pinia.
- **Backend:** Node.js, Express.js, JWT, Bcrypt, OpenAI API, PayOS SDK.
- **Database:** PostgreSQL trên nền tảng đám mây **Neon Serverless**.

---

## 🔑 Tài khoản Demo hệ thống

| Vai trò (Role) | Họ và tên | Email đăng nhập | Mật khẩu (Password) |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | Nguyễn Thế Dân | `admin@smartsale.com` | `Admin@123456` |
| **Nhân viên bán hàng (Sales)** | Trần Phương Linh | `sales@smartsale.com` | `Admin@123456` |
| **Thủ kho (Warehouse)** | Lê Hoàng Hải | `warehouse@smartsale.com` | `Admin@123456` |
| **Khách hàng VIP (Customer)** | Phạm Quốc Việt | `customer@smartsale.com` | `Admin@123456` |

---

## 💻 Cài đặt & Chạy ứng dụng

### 1. Khởi chạy Frontend:
```bash
npm install
npm run dev
```
Truy cập tại: `http://localhost:5173/` hoặc `http://localhost:5174/`

### 2. Khởi chạy Backend & Database:
```bash
cd server
npm install
node src/server.js
```

### 3. Khởi tạo & nạp dữ liệu Database lên Neon:
```bash
cd server
node src/apply_complete_seed.mjs
```

---

## 📄 Bản quyền
Phát triển bởi **Kiều Quang Trưởng Vĩ** & SmartSale Team. Bảo lưu mọi quyền © 2026.
