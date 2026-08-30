-- =====================================================================================
-- SMART SALE DATA ANALYTICS & BI
-- Script 01: RFM Customer Segmentation & Pareto Revenue Contribution Analysis
-- Engine: PostgreSQL (Neon Serverless Compatible)
-- Author: Senior Data Analyst & Analytics Engineer
-- =====================================================================================
-- Nghiệp vụ:
--   1. Tính toán 3 chỉ số RFM cho từng khách hàng:
--      - Recency (R): Số ngày kể từ lần mua hàng thành công gần nhất đến thời điểm phân tích.
--      - Frequency (F): Tổng số đơn hàng thành công (Completed / Shipped / Paid).
--      - Monetary (M): Tổng giá trị chi tiêu thực tế (SUM(total)).
--   2. Sử dụng Window Function NTILE(4) để chia đều thang điểm 1-4 cho từng trụ cột R, F, M.
--   3. Gán nhãn phân khúc khách hàng (Customer Segment) và 4 cấp độ VIP:
--      - Diamond (Kim Cương): Top tier giá trị cao nhất (R_score >= 3, M_score = 4, F_score >= 3)
--      - Gold (Vàng): Khách hàng tiềm năng & trung thành cao (M_score >= 3, F_score >= 2)
--      - Silver (Bạc): Khách hàng thường xuyên / chi tiêu tầm trung
--      - Bronze (Đồng): Khách hàng mới hoặc nguy cơ rời bỏ (At-Risk / Inactive)
--   4. Kiểm chứng quy luật Pareto 80/20: Nhóm khách hàng VIP (Gold + Diamond) đóng góp ~45%+ GMV.
-- =====================================================================================

WITH valid_orders AS (
    -- Bước 1: Lọc các đơn hàng hợp lệ đã thanh toán / hoàn tất, loại bỏ đơn hủy hoặc lỗi thanh toán
    SELECT 
        o.id AS order_id,
        o.customer_id,
        o.user_id,
        o.total,
        o.discount_amount,
        o.subtotal,
        o.created_at,
        o.status
    FROM orders o
    WHERE o.status IN ('Completed', 'Shipped', 'Paid')
      AND o.customer_id IS NOT NULL
),

customer_rfm_raw AS (
    -- Bước 2: Tổng hợp các chỉ số R, F, M thô ở cấp độ từng khách hàng
    SELECT 
        c.id AS customer_id,
        c.full_name,
        c.email,
        c.phone,
        c.tier AS registered_tier,
        c.created_at AS customer_registered_at,
        
        -- Recency: Số ngày kể từ đơn hàng cuối cùng đến thời điểm hiện tại
        EXTRACT(DAY FROM (NOW() - MAX(vo.created_at))) AS recency_days,
        
        -- Frequency: Tổng số đơn hàng hoàn tất
        COUNT(vo.order_id) AS total_orders,
        
        -- Monetary: Tổng chi tiêu tích lũy (VND)
        COALESCE(SUM(vo.total), 0) AS total_spent,
        
        -- AOV: Giá trị trung bình trên mỗi đơn hàng
        ROUND(COALESCE(AVG(vo.total), 0), 2) AS avg_order_value,
        
        MAX(vo.created_at) AS last_order_date,
        MIN(vo.created_at) AS first_order_date
    FROM customers c
    LEFT JOIN valid_orders vo ON c.id = vo.customer_id
    GROUP BY c.id, c.full_name, c.email, c.phone, c.tier, c.created_at
),

rfm_scoring AS (
    -- Bước 3: Đánh giá điểm RFM từ 1 đến 4 bằng Window Function NTILE(4)
    -- Đối với Recency: Số ngày càng nhỏ -> Điểm càng cao (Dùng DESC trong ORDER BY)
    -- Đối với Frequency & Monetary: Giá trị càng lớn -> Điểm càng cao
    SELECT 
        rfm.*,
        NTILE(4) OVER (ORDER BY rfm.recency_days DESC NULLS FIRST) AS r_score,
        NTILE(4) OVER (ORDER BY rfm.total_orders ASC NULLS FIRST) AS f_score,
        NTILE(4) OVER (ORDER BY rfm.total_spent ASC NULLS FIRST) AS m_score
    FROM customer_rfm_raw rfm
),

rfm_segmentation AS (
    -- Bước 4: Phân nhóm khách hàng và xếp hạng VIP chuẩn hóa
    SELECT 
        s.*,
        (s.r_score::TEXT || s.f_score::TEXT || s.m_score::TEXT) AS rfm_combined_code,
        ROUND((s.r_score + s.f_score + s.m_score) / 3.0, 2) AS rfm_avg_score,
        CASE 
            WHEN s.m_score = 4 AND s.f_score >= 3 AND s.r_score >= 3 THEN 'Diamond VIP'
            WHEN (s.m_score >= 3 AND s.f_score >= 2) OR (s.m_score = 4) THEN 'Gold VIP'
            WHEN s.m_score >= 2 AND s.f_score >= 2 THEN 'Silver VIP'
            WHEN s.r_score >= 3 AND s.f_score = 1 THEN 'New Customer'
            WHEN s.r_score <= 2 AND s.f_score >= 2 THEN 'At-Risk Customer'
            ELSE 'Bronze VIP'
        END AS dynamic_rfm_segment,
        
        -- Chuẩn hóa 4 Tier phục vụ chiến lược Loyalty & CRM
        CASE 
            WHEN s.total_spent >= 20000000 OR (s.m_score = 4 AND s.f_score >= 3) THEN 'Diamond'
            WHEN s.total_spent >= 8000000  OR (s.m_score >= 3 AND s.f_score >= 2) THEN 'Gold'
            WHEN s.total_spent >= 3000000  OR (s.m_score >= 2) THEN 'Silver'
            ELSE 'Bronze'
        END AS standardized_vip_tier
    FROM rfm_scoring s
),

pareto_analysis AS (
    -- Bước 5: Tính toán tích lũy doanh thu và tỷ trọng đóng góp theo quy luật Pareto
    SELECT 
        seg.standardized_vip_tier,
        COUNT(seg.customer_id) AS total_customers,
        ROUND(COUNT(seg.customer_id) * 100.0 / SUM(COUNT(seg.customer_id)) OVER (), 2) AS pct_customer_base,
        SUM(seg.total_spent) AS segment_revenue,
        ROUND(SUM(seg.total_spent) * 100.0 / SUM(SUM(seg.total_spent)) OVER (), 2) AS pct_revenue_contribution,
        ROUND(AVG(seg.total_spent), 0) AS avg_revenue_per_customer,
        ROUND(AVG(seg.total_orders), 1) AS avg_order_count
    FROM rfm_segmentation seg
    GROUP BY seg.standardized_vip_tier
)

-- =====================================================================================
-- FINAL OUTPUT 1: Bảng tổng hợp kiểm chứng Pareto & hiệu quả phân khúc VIP
-- =====================================================================================
SELECT 
    p.standardized_vip_tier,
    p.total_customers,
    p.pct_customer_base AS "Customer Share (%)",
    p.segment_revenue AS "Total Revenue (VND)",
    p.pct_revenue_contribution AS "Revenue Contribution (%)",
    p.avg_revenue_per_customer AS "ARPU (VND)",
    p.avg_order_count AS "Avg Orders",
    -- Tính tỷ lệ doanh thu tích lũy lũy kế
    SUM(p.pct_revenue_contribution) OVER (
        ORDER BY 
            CASE p.standardized_vip_tier 
                WHEN 'Diamond' THEN 1 
                WHEN 'Gold' THEN 2 
                WHEN 'Silver' THEN 3 
                ELSE 4 
            END
    ) AS "Cumulative Revenue (%)"
FROM pareto_analysis p
ORDER BY 
    CASE p.standardized_vip_tier 
        WHEN 'Diamond' THEN 1 
        WHEN 'Gold' THEN 2 
        WHEN 'Silver' THEN 3 
        ELSE 4 
    END;

-- =====================================================================================
-- FINAL OUTPUT 2: Danh sách chi tiết RFM của từng khách hàng kèm định danh VIP
-- =====================================================================================
-- SELECT 
--     customer_id,
--     full_name,
--     email,
--     phone,
--     total_spent,
--     total_orders,
--     recency_days,
--     r_score,
--     f_score,
--     m_score,
--     rfm_combined_code,
--     dynamic_rfm_segment,
--     standardized_vip_tier
-- FROM rfm_segmentation
-- ORDER BY total_spent DESC;
