# 🛍️ SmartSale - Omnichannel Sales & Real-Time Inventory Management System

**SmartSale** là nền tảng quản lý bán hàng đa kênh, kiểm soát tồn kho thông minh và tích hợp trợ lý ảo AI thế hệ mới. Hệ thống được xây dựng với kiến trúc hiện đại, hỗ trợ thanh toán tự động qua mã VietQR PayOS, hệ thống phân tích kinh doanh (BI Analytics), quản lý khuyến mãi linh hoạt và trợ lý AI phân quyền theo từng vai trò người dùng.

---

## 🌟 Tổng quan các phân hệ chức năng

### 1. 🛒 Cửa hàng trực tuyến & Trải nghiệm Khách hàng (Storefront)
- **Trải nghiệm mua sắm hiện đại:** Giao diện tối ưu, tìm kiếm sản phẩm thông minh theo tên, danh mục và mã hàng hóa.
- **Thư viện ảnh đa góc nhìn (Lightbox Viewer):** Phóng to hình ảnh sản phẩm chất lượng cao với thanh trượt chuyển ảnh linh hoạt.
- **Giỏ hàng & Quản lý đơn:** Tự động tính toán tổng tiền, chiết khấu theo hạng VIP và áp dụng mã giảm giá.
- **Thanh toán trực tuyến PayOS:** Tạo link và quét mã QR thanh toán ngân hàng tự động (VietQR), đồng bộ trạng thái đơn hàng theo thời gian thực (Webhook).
- **Hệ thống Hạng thành viên VIP:** Tự động xếp hạng (*Đồng, Bạc, Vàng, Kim Cương*) dựa trên tổng chi tiêu tích lũy và áp dụng ưu đãi chiết khấu trực tiếp trên từng đơn hàng.
- **Cổng thông tin khách hàng (Customer Profile):** Tra cứu lịch sử đơn hàng, tiến độ vận chuyển và yêu cầu hủy/hoàn tiền.

---

### 2. 🏷️ Phân hệ Khuyến mãi & Ưu đãi (Promotions)
- **Tạo & Quản lý mã giảm giá:** Hỗ trợ giảm giá theo phần trăm (%) hoặc giảm theo số tiền cố định (VNĐ).
- **Phạm vi áp dụng linh hoạt:** Áp dụng cho toàn bộ cửa hàng, theo danh mục sản phẩm hoặc từng mặt hàng cụ thể.
- **Quy tắc & Giới hạn:** Thiết lập giá trị đơn hàng tối thiểu, mức giảm tối đa và thời gian hiệu lực của chương trình.

---

### 3. 💼 Quản lý Bán hàng & Đơn hàng (Sales Management)
- **Xử lý đơn hàng toàn diện:** Quản lý quy trình xử lý đơn hàng qua các trạng thái: *Pending, Paid, Processing, Shipped, Completed, Cancelled, Refunded*.
- **Xuất / Nhập dữ liệu Excel:** Hỗ trợ xuất danh sách đơn hàng, doanh số và dữ liệu khách hàng ra file Excel.
- **Quản lý thông tin khách hàng:** Theo dõi lịch sử mua sắm, công nợ, phân khúc khách hàng và thông tin liên hệ.

---

### 4. 📦 Quản lý Kho & Chuỗi cung ứng (Inventory & Supply Chain)
- **Kiểm soát hàng hóa & Tồn kho:** Theo dõi tồn kho thực tế, tồn kho dự trữ an toàn (`reserve_stock`).
- **Quy trình nhập kho chuẩn hóa:** Quản lý phiếu nhập kho qua nhiều bước phê duyệt (*Draft $\rightarrow$ Pending Approval $\rightarrow$ Confirmed*).
- **Quản lý Nhà cung cấp (Suppliers):** Lưu trữ danh bạ đối tác, số điện thoại, email, địa chỉ và lịch sử cung ứng hàng hóa.
- **Cảnh báo tồn kho báo động:** Tự động cảnh báo các mặt hàng sắp hết hàng (tồn $\le$ 10) hoặc đã hết hàng.

---

### 5. 📊 Phân hệ Data Analytics & Business Intelligence (Analytics Engineering)
Hệ thống tích hợp kiến trúc phân tích dữ liệu chuyên sâu tại thư mục [`analytics/`](./analytics/), hỗ trợ ra quyết định kinh doanh dựa trên dữ liệu (Data-Driven Decisions) với 3 phát hiện cốt lõi:
- 💎 **Quy luật Pareto 80/20 & Phân khúc VIP:** Phân tích RFM (`NTILE(4)`) chứng minh nhóm khách hàng VIP (*Kim Cương & Vàng*) chỉ chiếm ~20% tập khách hàng nhưng đóng góp tới **~45% tổng doanh thu GMV**.
- 🧪 **Kiểm định A/B Testing Khuyến mãi:** Phân tích Two-Proportion Z-Test ($p\text{-value} = 0.00018 < 0.05$) khẳng định chiến lược voucher giảm theo phần trăm (%) mang lại tỷ lệ hoàn tất đơn hàng vượt trội (+50.6% relative uplift) so với voucher tiền mặt cố định.
- 🤖 **Thương mại Hội thoại AI (Conversational Funnel):** Trợ lý ảo Google Gemini tạo tỷ lệ chuyển đổi Chat-to-Cart đạt **22%** và thúc đẩy mức tăng trưởng **+14% giá trị đơn hàng trung bình (AOV Lift)** nhờ tư vấn combo phụ kiện cá nhân hóa.

📂 **Tài nguyên Phân hệ Analytics:**
- 📜 [SQL Scripts Nâng Cao](./analytics/sql/): [01_rfm_segmentation.sql](./analytics/sql/01_rfm_segmentation.sql) | [02_cohort_retention.sql](./analytics/sql/02_cohort_retention.sql) | [03_inventory_health.sql](./analytics/sql/03_inventory_health.sql)
- 📓 [Jupyter Data Pipelines & Testing](./analytics/notebooks/): [01_data_cleaning_etl.ipynb](./analytics/notebooks/01_data_cleaning_etl.ipynb) | [02_ab_test_promotions.ipynb](./analytics/notebooks/02_ab_test_promotions.ipynb) | [03_conversational_funnel.ipynb](./analytics/notebooks/03_conversational_funnel.ipynb)
- 📚 [Data Modeling & DAX Docs](./analytics/docs/): [DATA_DICTIONARY.md](./analytics/docs/DATA_DICTIONARY.md) | [POWER_BI_MODELING.md](./analytics/docs/POWER_BI_MODELING.md)
- 📊 [BI Dashboard Workspace](./analytics/bi/): [README.md](./analytics/bi/README.md)

---

### 6. 🤖 Trợ lý Chatbot AI Đa Quyền (Role-Based Smart AI Assistant)
- **Động cơ AI tối ưu:** Tích hợp **Google Gemini 3.6 Flash** (Context window 1.000.000 tokens, 100% miễn phí, phản hồi < 1s) cùng cơ chế fallback **OpenAI**.
- **Tối ưu hóa Token:** Kỹ thuật *Rolling History Window* và *Dynamic Context Injection* giúp giảm 80% dung lượng token và tăng tốc độ xử lý.
- **Phân quyền ngữ cảnh thông minh theo từng Role:**
  - **🛍️ Khách hàng (`Customer`):** Tra cứu hạng thành viên VIP, tổng chi tiêu tích lũy, tra cứu đơn hàng gần nhất, ưu đãi đang áp dụng và tư vấn sản phẩm có sẵn.
  - **💼 Nhân viên Sale (`SalesStaff` / `Admin`):** Báo cáo doanh thu & số đơn hôm nay, Top 5 khách hàng VIP, Top 5 sản phẩm bán chạy, đơn hàng cần xử lý.
  - **📦 Thủ kho (`WarehouseKeeper` / `Admin`):** Cảnh báo tồn kho báo động (hết hàng/sắp hết hàng), thông tin liên hệ nhà cung cấp, phiếu nhập kho mới nhất.
  - **⚡ Quản trị viên (`Admin`):** Báo cáo tổng thể tình hình kinh doanh, dòng tiền, hiệu suất kho hàng và nhân sự.

---

## 🛠️ Công nghệ sử dụng

| Phân tầng | Công nghệ |
| :--- | :--- |
| **Frontend** | Vue 3 (Composition API), TypeScript, Vite, Pinia, PrimeVue, PrimeIcons, Chart.js, Tailwind / CSS3 |
| **Backend API** | Node.js, Express.js (RESTful API), JWT Authentication, Bcrypt |
| **Database** | PostgreSQL trên nền tảng đám mây **Neon Serverless** |
| **Thanh toán** | PayOS SDK (VietQR Payment Gateway & Webhook) |
| **Trí tuệ nhân tạo** | Google Gemini API (`gemini-3.6-flash`), OpenAI Responses / Completions API |
| **Triển khai (Cloud)** | **Vercel** (Frontend SPA) + **Render** (Backend Node API) |

---

## 🌐 Đường dẫn Production

- **Frontend Application:** [https://www.smartsale-dev.me](https://www.smartsale-dev.me)
- **Backend API Docs:** Deploy trên **Render** (`smartsale-api` service)
- **Cơ sở dữ liệu:** Neon Serverless PostgreSQL

---

## 🔑 Tài khoản Demo hệ thống

| Vai trò / Phân quyền | Họ và tên | Email đăng nhập | Mật khẩu (Password) | Ghi chú & Quyền hạn |
| :--- | :--- | :--- | :--- | :--- |
| **⚡ Quản trị viên (Admin)** | Nguyễn Thế Dân | `admin@smartsale.com` | `Admin@123456` | Toàn quyền quản trị, BI & cấu hình hệ thống |
| **💼 Nhân viên Bán hàng (Sales)** | Trần Phương Linh | `sales@smartsale.com` | `Admin@123456` | Quản lý đơn hàng, khách hàng, khuyến mãi |
| **📦 Thủ kho (Warehouse)** | Lê Hoàng Hải | `warehouse@smartsale.com` | `Admin@123456` | Quản lý tồn kho, nhập hàng, nhà cung cấp |
| 💎 **Khách VIP Kim Cương** | Phạm Quốc Việt | `diamond@smartsale.com` | `Admin@123456` | Chi tiêu $\ge$ 20.000.000 ₫ (Giảm 10%) |
| 🥇 **Khách VIP Vàng** | Nguyễn Thị Tuyết Mai | `gold@smartsale.com` | `Admin@123456` | Chi tiêu $\ge$ 10.000.000 ₫ (Giảm 5%) |
| 🥈 **Khách VIP Bạc** | Lê Thu Hương | `silver@smartsale.com` | `Admin@123456` | Chi tiêu $\ge$ 3.000.000 ₫ (Giảm 2%) |
| 👤 **Khách Thành viên Thường** | Trần Minh Đức | `standard@smartsale.com` | `Admin@123456` | Chi tiêu < 3.000.000 ₫ |

---

## ⚙️ Cấu hình Biến Môi Trường (Environment Variables)

### 1. Frontend (`/.env`) — Môi trường chạy Local:
```env
VITE_ENABLE_MOCK_FALLBACK=false
VITE_API_URL=http://localhost:3001
```

### 2. Backend (`/server/.env`):
```env
# Neon Serverless PostgreSQL Database
DATABASE_URL=postgresql://neondb_owner:password@ep-noisy-forest-...aws.neon.tech/neondb?sslmode=require

# Cấu hình App & CORS
PORT=3001
PUBLIC_WEB_URL=https://www.smartsale-dev.me
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,https://www.smartsale-dev.me

# JWT Secret
JWT_SECRET=smartsale-neon-database-jwt-secret-key-production-ready-2026-auth

# Tài khoản Admin mặc định (dùng khi migrate DB)
ADMIN_EMAIL=admin@smartsale.com
ADMIN_PASSWORD=Admin@123456
ADMIN_FULL_NAME=Quản trị viên

# Cổng thanh toán PayOS
PAYOS_CLIENT_ID=your-payos-client-id
PAYOS_API_KEY=your-payos-api-key
PAYOS_CHECKSUM_KEY=your-payos-checksum-key

# Trợ lý AI Chatbot (Google Gemini - Miễn phí từ aistudio.google.com/apikey)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.6-flash

# OpenAI Fallback (Nếu có)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

---

## 💻 Cài đặt & Khởi chạy ứng dụng

### 1. Khởi chạy Frontend:
```bash
npm install
npm run dev
```
Truy cập tại: `http://localhost:5173/`

### 2. Khởi chạy Backend Server:
```bash
cd server
npm install
node src/server.js
```
API server chạy tại: `http://localhost:3001`

### 3. Nạp dữ liệu mẫu lên cơ sở dữ liệu Neon:
```bash
cd server
node src/apply_complete_seed.mjs
```

---

## 📄 Bản quyền
Dự án được phát triển bởi **Kiều Quang Trưởng Vĩ** & SmartSale Team. Bảo lưu mọi quyền © 2026.
