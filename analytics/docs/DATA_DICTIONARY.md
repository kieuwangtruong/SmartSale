# 📖 SmartSale Enterprise Data Dictionary (Data Mart & Analytics Layer)

Tài liệu này định nghĩa cấu trúc dữ liệu chuẩn hóa, kiểu dữ liệu, các ràng buộc và ý nghĩa nghiệp vụ của các bảng **Fact** và **Dimension** phục vụ phân tích dữ liệu (Data Analytics) và mô hình hóa Business Intelligence (Power BI / Looker / Tableau).

---

## 1. 📊 Fact Table: `fact_orders`
Bảng chứa dữ liệu sự kiện giao dịch đơn hàng từ hệ thống bán lẻ đa kênh và cổng thanh toán VietQR PayOS.

- **Granularity (Độ chi tiết):** Một dòng tương ứng với một đơn hàng (`order_id`).
- **Nguồn trích xuất:** Bảng `orders` kết hợp `coupon_usages`.

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho phép Null | Mô tả & Quy tắc Nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `order_id` | `BIGINT` | **PK** | Không | Mã định danh duy nhất của đơn hàng trong SmartSale. |
| `customer_id` | `BIGINT` | **FK** | Có | Mã khách hàng liên kết với `dim_customers_rfm`. Null nếu là khách vãng lai (Guest). |
| `user_id` | `BIGINT` | **FK** | Có | Mã tài khoản người dùng mua hàng. |
| `sales_staff_id` | `BIGINT` | **FK** | Có | Mã nhân viên bán hàng phụ trách xử lý đơn hàng. |
| `order_date_key` | `INTEGER` | **FK** | Không | Khóa ngày giao dịch theo định dạng `YYYYMMDD` liên kết với `dim_date`. |
| `order_timestamp_utc` | `TIMESTAMPTZ` | - | Không | Thời điểm tạo đơn hàng theo chuẩn giờ UTC. |
| `order_timestamp_hcm` | `TIMESTAMPTZ` | - | Không | Thời điểm tạo đơn theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh` - GMT+7). |
| `order_status` | `VARCHAR(32)` | - | Không | Trạng thái đơn: `Completed`, `Shipped`, `Paid`, `Processing`, `Pending`, `Cancelled`, `Refunded`. |
| `payment_method` | `VARCHAR(16)` | - | Không | Phương thức thanh toán: `PayOS` (VietQR) hoặc `Cash` (Tiền mặt). |
| `subtotal` | `NUMERIC(14,2)` | - | Không | Tổng giá trị hàng hóa trước chiết khấu/khuyến mãi (VND). |
| `discount_amount` | `NUMERIC(14,2)` | - | Không | Tổng số tiền được giảm trừ (Voucher + Chiết khấu VIP) (VND). |
| `net_revenue` | `NUMERIC(14,2)` | - | Không | Doanh thu thuần thực tế ghi nhận = `subtotal` - `discount_amount`. |
| `amount_paid` | `NUMERIC(14,2)` | - | Không | Số tiền thực tế khách hàng đã thanh toán qua PayOS hoặc tiền mặt. |
| `debt_amount` | `NUMERIC(14,2)` | - | Không | Công nợ còn thiếu cần thu hồi khi giao hàng = `net_revenue` - `amount_paid`. |
| `payment_order_code`| `BIGINT` | - | Có | Mã đơn hàng đối soát giao dịch trực tuyến PayOS. |
| `is_ai_assisted` | `BOOLEAN` | - | Không | Cờ đánh dấu `TRUE` nếu khách có phát sinh phiên Chat AI Gemini trước khi mua. |

---

## 2. 👥 Dimension Table: `dim_customers_rfm`
Bảng chiều thông tin khách hàng, tích hợp các chỉ số RFM (Recency, Frequency, Monetary) và cấp bậc hội viên VIP.

- **Granularity:** Một dòng tương ứng với một khách hàng định danh (`customer_id`).
- **Cập nhật:** Daily Batch / Real-time Sync.

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho phép Null | Mô tả & Quy tắc Nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `customer_id` | `BIGINT` | **PK** | Không | Mã định danh khách hàng trong hệ thống. |
| `full_name` | `VARCHAR(255)` | - | Không | Họ và tên đầy đủ của khách hàng. |
| `phone` | `VARCHAR(20)` | - | Không | Số điện thoại liên hệ chính thức. |
| `email` | `VARCHAR(255)` | - | Có | Email tài khoản nhận hóa đơn điện tử. |
| `city_province` | `VARCHAR(100)` | - | Có | Tỉnh/Thành phố trích xuất từ địa chỉ giao hàng. |
| `gender` | `SMALLINT` | - | Có | Giới tính: `0` (Nữ), `1` (Nam), `2` (Khác). |
| `age` | `INTEGER` | - | Có | Độ tuổi khách hàng. |
| `registered_at` | `TIMESTAMPTZ` | - | Không | Thời điểm đăng ký tài khoản thành viên. |
| `recency_days` | `INTEGER` | - | Có | Số ngày tính từ lần đặt hàng thành công gần nhất. |
| `frequency_orders` | `INTEGER` | - | Không | Tổng số đơn hàng hợp lệ đã hoàn tất. |
| `monetary_total_spent`| `NUMERIC(14,2)`| - | Không | Tổng giá trị chi tiêu tích lũy hợp lệ (VND). |
| `r_score` | `SMALLINT` | - | Không | Điểm Recency (1: Mua xa nhất -> 4: Mua gần nhất). |
| `f_score` | `SMALLINT` | - | Không | Điểm Frequency (1: Mua ít nhất -> 4: Mua thường xuyên). |
| `m_score` | `SMALLINT` | - | Không | Điểm Monetary (1: Chi tiêu thấp -> 4: Chi tiêu cao nhất). |
| `vip_tier` | `VARCHAR(20)` | - | Không | Phân hạng VIP: `Diamond` ($\ge 20M$), `Gold` ($\ge 8M$), `Silver` ($\ge 3M$), `Bronze` ($< 3M$). |
| `rfm_segment` | `VARCHAR(50)` | - | Không | Nhãn phân khúc: `Diamond VIP`, `Gold VIP`, `Silver VIP`, `New Customer`, `At-Risk Customer`, `Bronze VIP`. |

---

## 3. 📦 Dimension Table: `dim_inventory_sku`
Bảng chiều sản phẩm và kiểm soát sức khỏe hàng tồn kho, tốc độ bán và chuỗi cung ứng.

- **Granularity:** Một dòng tương ứng với một mã sản phẩm / SKU (`product_id`).

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho phép Null | Mô tả & Quy tắc Nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `product_id` | `BIGINT` | **PK** | Không | Mã định danh duy nhất của sản phẩm. |
| `product_name` | `VARCHAR(255)` | - | Không | Tên sản phẩm thương mại. |
| `category_id` | `BIGINT` | **FK** | Có | Mã danh mục sản phẩm (Điện tử, Gia dụng, Phụ kiện, Mỹ phẩm...). |
| `category_name` | `VARCHAR(100)` | - | Có | Tên danh mục phục vụ hiển thị Slice & Dice trên báo cáo. |
| `supplier_id` | `BIGINT` | **FK** | Có | Mã nhà cung cấp liên kết. |
| `supplier_name` | `VARCHAR(255)` | - | Có | Tên nhà cung cấp chính thức. |
| `import_price` | `NUMERIC(14,2)` | - | Không | Đơn giá vốn nhập kho bình quân (COGS base). |
| `selling_price` | `NUMERIC(14,2)` | - | Không | Giá bán niêm yết hiện tại. |
| `current_stock` | `INTEGER` | - | Không | Số lượng tồn kho thực tế khả dụng trong kho. |
| `reserve_stock` | `INTEGER` | - | Không | Ngưỡng tồn kho dự trữ an toàn (Safety Stock). |
| `units_sold_total`| `INTEGER` | - | Không | Tổng số lượng sản phẩm đã bán thành công. |
| `sell_through_rate_pct`| `NUMERIC(6,2)` | - | Không | Tỷ lệ bán hết (STR %) = `(Sold / (Stock + Sold)) * 100`. |
| `inventory_turnover` | `NUMERIC(6,2)` | - | Không | Vòng quay tồn kho (Turnover Ratio) = `COGS / Giá trị tồn kho`. |
| `stock_status` | `VARCHAR(32)` | - | Không | Trạng thái: `OUT_OF_STOCK`, `CRITICAL_SAFETY_STOCK`, `LOW_STOCK_WARNING` ($\le 10$), `HEALTHY_STOCK`. |

---

## 4. 🤖 Fact Table: `fact_ai_chat_logs`
Bảng lưu vết toàn bộ tương tác giữa khách hàng và Trợ lý AI Gemini 3.6 Flash.

- **Granularity:** Một dòng tương ứng với một tin nhắn / phiên hội thoại AI (`message_id`).

| Tên Cột | Kiểu Dữ Liệu | Khóa | Cho phép Null | Mô tả & Quy tắc Nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `message_id` | `BIGINT` | **PK** | Không | Mã định danh duy nhất của tin nhắn. |
| `session_id` | `BIGINT` | **FK** | Không | Mã định danh phiên chat của khách hàng. |
| `user_id` | `BIGINT` | **FK** | Có | Mã người dùng (nếu đã đăng nhập). |
| `user_role` | `VARCHAR(32)` | - | Không | Vai trò người gửi: `Customer`, `SalesStaff`, `WarehouseKeeper`, `Admin`. |
| `sender_role` | `VARCHAR(16)` | - | Không | Đối tượng phản hồi: `user` hoặc `assistant` (Gemini). |
| `message_content` | `TEXT` | - | Không | Nội dung text trao đổi trong phiên chat. |
| `detected_intent` | `VARCHAR(64)` | - | Có | Intent phát hiện: `PRODUCT_INQUIRY`, `VIP_BENEFIT`, `ORDER_TRACKING`, `STOCK_CHECK`. |
| `recommended_product_id`| `BIGINT` | **FK** | Có | Mã sản phẩm được AI đề xuất trực tiếp cho khách hàng. |
| `converted_order_id`| `BIGINT` | **FK** | Có | Mã đơn hàng phát sinh từ phiên tư vấn (nếu có). |
| `created_at` | `TIMESTAMPTZ` | - | Không | Thời điểm gửi tin nhắn. |

---

## 5. 🗓️ Dimension Table: `dim_date`
Bảng chiều thời gian hỗ trợ phân tích Time-Intelligence (YTD, QTD, MTD, MoM, YoY).

| Tên Cột | Kiểu Dữ Liệu | Khóa | Mô tả |
| :--- | :--- | :--- | :--- |
| `date_key` | `INTEGER` | **PK** | Khóa ngày theo định dạng `YYYYMMDD` (VD: `20260830`). |
| `full_date` | `DATE` | - | Ngày chuẩn `YYYY-MM-DD`. |
| `day_of_month` | `SMALLINT` | - | Ngày trong tháng (1 - 31). |
| `month_number` | `SMALLINT` | - | Tháng trong năm (1 - 12). |
| `month_name` | `VARCHAR(15)` | - | Tên tháng (January, August...). |
| `quarter` | `VARCHAR(2)` | - | Quý (`Q1`, `Q2`, `Q3`, `Q4`). |
| `year` | `SMALLINT` | - | Năm tài chính (VD: `2026`). |
| `is_weekend` | `BOOLEAN` | - | `TRUE` nếu là Thứ Bảy hoặc Chủ Nhật. |
