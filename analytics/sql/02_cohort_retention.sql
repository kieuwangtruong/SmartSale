-- =====================================================================================
-- SMART SALE DATA ANALYTICS & BI
-- Script 02: Cohort Retention Analysis & Repeat Purchase Matrix
-- Engine: PostgreSQL (Neon Serverless Compatible)
-- Author: Senior Data Analyst & Analytics Engineer
-- =====================================================================================
-- Nghiệp vụ:
--   1. Xác định Cohort Month (Tháng mua hàng đầu tiên hoặc tháng đăng ký của khách hàng).
--   2. Theo dõi các giao dịch mua lại (Repeat Purchases) ở các tháng tiếp theo (M0, M1, M2, M3...).
--   3. Tính toán Retention Rate (%) = (Số lượng khách hàng active ở tháng Mx / Khách ban đầu M0) * 100%.
--   4. Xuất ma trận Cohort Retention phục vụ hiển thị Heatmap trên Power BI / BI Dashboards.
-- =====================================================================================

WITH customer_first_order AS (
    -- Bước 1: Xác định thời điểm phát sinh đơn hàng đầu tiên của từng khách hàng (Cohort Month)
    SELECT 
        o.customer_id,
        DATE_TRUNC('month', MIN(o.created_at))::DATE AS cohort_month
    FROM orders o
    WHERE o.status IN ('Completed', 'Shipped', 'Paid')
      AND o.customer_id IS NOT NULL
    GROUP BY o.customer_id
),

cohort_size AS (
    -- Bước 2: Đếm quy mô tổng số khách hàng gia nhập theo từng Cohort (M0 Baseline)
    SELECT 
        cfo.cohort_month,
        COUNT(DISTINCT cfo.customer_id) AS total_cohort_customers
    FROM customer_first_order cfo
    GROUP BY cfo.cohort_month
),

customer_activities AS (
    -- Bước 3: Lấy tất cả các tháng phát sinh đơn hàng tiếp theo của khách hàng
    SELECT 
        o.customer_id,
        cfo.cohort_month,
        DATE_TRUNC('month', o.created_at)::DATE AS activity_month,
        -- Tính khoảng cách số tháng chênh lệch (Month Index: 0 = tháng đầu, 1 = tháng sau, ...)
        (
            (EXTRACT(YEAR FROM o.created_at) - EXTRACT(YEAR FROM cfo.cohort_month)) * 12 + 
            (EXTRACT(MONTH FROM o.created_at) - EXTRACT(MONTH FROM cfo.cohort_month))
        )::INTEGER AS month_number,
        SUM(o.total) AS monthly_spent
    FROM orders o
    JOIN customer_first_order cfo ON o.customer_id = cfo.customer_id
    WHERE o.status IN ('Completed', 'Shipped', 'Paid')
    GROUP BY o.customer_id, cfo.cohort_month, DATE_TRUNC('month', o.created_at)::DATE, o.created_at
),

cohort_retention_summary AS (
    -- Bước 4: Tổng hợp số lượng khách hàng quay lại theo từng mốc tháng
    SELECT 
        ca.cohort_month,
        cs.total_cohort_customers,
        ca.month_number,
        COUNT(DISTINCT ca.customer_id) AS active_customers,
        SUM(ca.monthly_spent) AS cohort_monthly_revenue,
        ROUND(
            (COUNT(DISTINCT ca.customer_id)::NUMERIC / cs.total_cohort_customers::NUMERIC) * 100.0, 
            2
        ) AS retention_rate_pct
    FROM customer_activities ca
    JOIN cohort_size cs ON ca.cohort_month = cs.cohort_month
    GROUP BY ca.cohort_month, cs.total_cohort_customers, ca.month_number
)

-- =====================================================================================
-- FINAL OUTPUT 1: Ma trận Cohort Retention Rate theo dạng Bảng Pivot (M0 -> M6)
-- =====================================================================================
SELECT 
    TO_CHAR(crs.cohort_month, 'YYYY-MM') AS "Cohort Month",
    crs.total_cohort_customers AS "Cohort Size (M0)",
    
    -- M0: Luôn đạt 100%
    MAX(CASE WHEN crs.month_number = 0 THEN crs.retention_rate_pct ELSE NULL END) AS "M0 (%)",
    
    -- M1: Tháng thứ 1 sau lần mua đầu tiên
    MAX(CASE WHEN crs.month_number = 1 THEN crs.retention_rate_pct ELSE NULL END) AS "M1 (%)",
    
    -- M2: Tháng thứ 2
    MAX(CASE WHEN crs.month_number = 2 THEN crs.retention_rate_pct ELSE NULL END) AS "M2 (%)",
    
    -- M3: Tháng thứ 3
    MAX(CASE WHEN crs.month_number = 3 THEN crs.retention_rate_pct ELSE NULL END) AS "M3 (%)",
    
    -- M4: Tháng thứ 4
    MAX(CASE WHEN crs.month_number = 4 THEN crs.retention_rate_pct ELSE NULL END) AS "M4 (%)",
    
    -- M5: Tháng thứ 5
    MAX(CASE WHEN crs.month_number = 5 THEN crs.retention_rate_pct ELSE NULL END) AS "M5 (%)",
    
    -- M6: Tháng thứ 6
    MAX(CASE WHEN crs.month_number = 6 THEN crs.retention_rate_pct ELSE NULL END) AS "M6 (%)"

FROM cohort_retention_summary crs
GROUP BY crs.cohort_month, crs.total_cohort_customers
ORDER BY crs.cohort_month ASC;

-- =====================================================================================
-- FINAL OUTPUT 2: Tỷ lệ Churn Rate & Customer Lifetime Value (LTV) theo Cohort
-- =====================================================================================
-- SELECT 
--     TO_CHAR(cohort_month, 'YYYY-MM') AS cohort_period,
--     month_number,
--     active_customers,
--     retention_rate_pct,
--     (100.0 - retention_rate_pct) AS churn_rate_pct,
--     cohort_monthly_revenue,
--     ROUND(cohort_monthly_revenue / NULLIF(active_customers, 0), 2) AS arpu_per_active_cust
-- FROM cohort_retention_summary
-- ORDER BY cohort_month ASC, month_number ASC;
