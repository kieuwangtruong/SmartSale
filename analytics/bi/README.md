# 📊 SmartSale BI & Visual Analytics Workspace

Thư mục này chứa các tài nguyên, template mẫu và hướng dẫn kết nối các nền tảng Business Intelligence (Microsoft Power BI, Tableau, Metabase, Apache Superset) vào Data Mart của SmartSale.

---

## 📁 Cấu trúc Thư mục Analytics

- `analytics/sql/`: Bộ script SQL nâng cao (RFM Segmentation, Cohort Retention Matrix, Inventory Health & Stockout Alerts).
- `analytics/notebooks/`: Data Pipelines & A/B Testing Jupyter Notebooks (ETL GMT+7, Two-Proportion Z-Test, AI Gemini Conversational Funnel).
- `analytics/docs/`: Từ điển dữ liệu Data Mart (`DATA_DICTIONARY.md`) và Kiến trúc Star Schema kèm công thức DAX chuẩn (`POWER_BI_MODELING.md`).
- `analytics/bi/`: Hướng dẫn kết nối và cấu hình trực quan hóa Dashboard.

---

## 🔌 Kết nối Cơ sở Dữ liệu Neon PostgreSQL với Power BI

1. Mở **Power BI Desktop** $\rightarrow$ Chọn **Get Data** $\rightarrow$ **PostgreSQL database**.
2. **Server & Database:** Điền thông tin Host và Database Name từ chuỗi kết nối Neon (`.env`).
3. **Data Connectivity mode:** Chọn `DirectQuery` (cho Real-time Dashboard) hoặc `Import` (cho tối ưu hiệu năng VertiPaq và DAX phức tạp).
4. **Advanced Options:** Dán các truy vấn SQL từ thư mục `analytics/sql/` để tạo các View tự động.

---

## 📈 4 Bảng Điều Khiển Trực Quan Trọng Tâm

1. **Executive Revenue & Cash Flow Dashboard:** Giám sát doanh thu thực, dòng tiền VietQR PayOS theo thời gian thực.
2. **Customer RFM & Loyalty Segmentations:** Nhận diện nhóm khách hàng VIP (Diamond, Gold) chiếm 45% doanh số và kích hoạt chiến dịch tiếp thị tự động.
3. **Supply Chain & Stock Health Monitor:** Cảnh báo SKU chạm ngưỡng $\le 10$ sản phẩm hoặc dưới mức tồn an toàn.
4. **Conversational AI Sales Funnel:** Đánh giá tỷ lệ Chat-to-Cart (22%) và bước tăng trưởng +14% AOV từ trợ lý AI Gemini.
