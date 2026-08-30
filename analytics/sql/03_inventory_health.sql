-- =====================================================================================
-- SMART SALE DATA ANALYTICS & BI
-- Script 03: Inventory Health, Sell-Through Rate & Stockout Risk Analytics
-- Engine: PostgreSQL (Neon Serverless Compatible)
-- Author: Senior Data Analyst & Analytics Engineer
-- =====================================================================================
-- Nghiệp vụ:
--   1. Đo lường tốc độ bán (Sell-Through Rate - STR):
--      STR (%) = [Tổng số lượng bán / (Tồn kho hiện tại + Tổng số lượng bán)] * 100%
--   2. Vòng quay tồn kho (Inventory Turnover Ratio - ITR):
--      ITR = Tổng giá vốn bán hàng (COGS) / Giá trị tồn kho bình quân (hoặc tồn kho hiện tại)
--   3. Tính số ngày tồn kho ước tính (Days of Inventory - DOI / DSI):
--      DOI = (Tồn kho hiện tại / Tốc độ bán bình quân ngày (Daily Run Rate))
--   4. Cảnh báo sớm rủi ro đứt gãy chuỗi cung ứng:
--      - Ngưỡng báo động 1: Tồn kho thực tế <= 10 đơn vị
--      - Ngưỡng báo động 2: Tồn kho thực tế <= Mức tồn dự trữ an toàn (reserve_stock)
-- =====================================================================================

WITH sales_performance AS (
    -- Bước 1: Tổng hợp doanh số bán và giá vốn COGS theo từng sản phẩm SKU
    SELECT 
        oi.product_id,
        COALESCE(SUM(oi.quantity), 0) AS total_units_sold,
        COALESCE(SUM(oi.sub_total), 0) AS total_revenue_generated,
        COUNT(DISTINCT oi.order_id) AS total_order_appearances,
        MIN(o.created_at) AS first_sale_date,
        MAX(o.created_at) AS last_sale_date,
        -- Tính số ngày hoạt động bán lẻ (tối thiểu 1 ngày để tránh chia 0)
        GREATEST(1, EXTRACT(DAY FROM (NOW() - MIN(o.created_at)))) AS days_on_market
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('Completed', 'Shipped', 'Paid', 'Processing')
    GROUP BY oi.product_id
),

inventory_metrics AS (
    -- Bước 2: Kết hợp dữ liệu sản phẩm, danh mục, nhà cung cấp và tồn kho hiện tại
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        c.name AS category_name,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email,
        p.import_price,
        p.selling_price,
        p.quantity AS current_stock_qty,
        p.reserve_stock AS safety_stock_threshold,
        
        -- Định giá trị vốn tồn kho hiện tại
        (p.quantity * p.import_price) AS current_inventory_value,
        
        -- Dữ liệu bán hàng từ CTE sales_performance
        COALESCE(sp.total_units_sold, 0) AS total_units_sold,
        COALESCE(sp.total_revenue_generated, 0) AS total_sales_revenue,
        
        -- COGS (Cost of Goods Sold): Giá vốn của hàng đã bán
        (COALESCE(sp.total_units_sold, 0) * p.import_price) AS cogs_total,
        
        -- Tổng nguồn cung ban đầu (Tồn kho hiện tại + Đã bán)
        (p.quantity + COALESCE(sp.total_units_sold, 0)) AS total_available_inventory,
        
        -- Daily Run Rate (Số lượng bán trung bình mỗi ngày)
        ROUND(COALESCE(sp.total_units_sold, 0)::NUMERIC / COALESCE(sp.days_on_market, 30)::NUMERIC, 2) AS avg_daily_sales_rate
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN sales_performance sp ON p.id = sp.product_id
),

calculated_inventory_health AS (
    -- Bước 3: Tính toán các chỉ số tài chính kho và phân loại trạng thái rủi ro
    SELECT 
        im.*,
        
        -- 1. Sell-Through Rate (STR %): Tỷ lệ bán hết
        ROUND(
            CASE 
                WHEN im.total_available_inventory > 0 
                THEN (im.total_units_sold::NUMERIC / im.total_available_inventory::NUMERIC) * 100.0 
                ELSE 0.0 
            END, 
            2
        ) AS sell_through_rate_pct,
        
        -- 2. Inventory Turnover Ratio (ITR): Vòng quay tồn kho
        ROUND(
            CASE 
                WHEN im.current_inventory_value > 0 
                THEN (im.cogs_total::NUMERIC / im.current_inventory_value::NUMERIC) 
                ELSE 0.0 
            END, 
            2
        ) AS inventory_turnover_ratio,
        
        -- 3. Days of Inventory (DOI): Số ngày còn lại để bán hết tồn kho hiện tại
        CASE 
            WHEN im.avg_daily_sales_rate > 0 
            THEN ROUND(im.current_stock_qty / im.avg_daily_sales_rate, 1)
            WHEN im.current_stock_qty = 0 THEN 0
            ELSE 999.0 -- Sản phẩm không phát sinh bán (Slow moving)
        END AS estimated_days_of_inventory,
        
        -- 4. Phân loại cảnh báo tồn kho (Inventory Health Status)
        CASE 
            WHEN im.current_stock_qty = 0 THEN 'OUT_OF_STOCK'
            WHEN im.current_stock_qty <= im.safety_stock_threshold THEN 'CRITICAL_SAFETY_STOCK'
            WHEN im.current_stock_qty <= 10 THEN 'LOW_STOCK_WARNING'
            WHEN (im.total_units_sold::NUMERIC / NULLIF(im.total_available_inventory, 0)) >= 0.70 THEN 'FAST_MOVING'
            WHEN im.avg_daily_sales_rate = 0 AND im.current_stock_qty > 50 THEN 'OVERSTOCK_SLOW_MOVING'
            ELSE 'HEALTHY_STOCK'
        END AS stock_health_status
    FROM inventory_metrics im
)

-- =====================================================================================
-- FINAL OUTPUT 1: Bảng điều hành tổng quan Sức khỏe Tồn kho & Cảnh báo SKU khẩn cấp
-- =====================================================================================
SELECT 
    product_id,
    product_name,
    category_name,
    supplier_name,
    current_stock_qty AS "Current Stock",
    safety_stock_threshold AS "Safety Threshold",
    total_units_sold AS "Sold Units",
    sell_through_rate_pct AS "STR (%)",
    inventory_turnover_ratio AS "Turnover Ratio",
    estimated_days_of_inventory AS "Estimated DOI (Days)",
    stock_health_status AS "Health Status",
    supplier_phone AS "Supplier Contact"
FROM calculated_inventory_health
ORDER BY 
    CASE stock_health_status
        WHEN 'OUT_OF_STOCK' THEN 1
        WHEN 'CRITICAL_SAFETY_STOCK' THEN 2
        WHEN 'LOW_STOCK_WARNING' THEN 3
        WHEN 'FAST_MOVING' THEN 4
        WHEN 'HEALTHY_STOCK' THEN 5
        ELSE 6
    END ASC,
    current_stock_qty ASC;

-- =====================================================================================
-- FINAL OUTPUT 2: Danh sách các SKU cần Tạo đơn Nhập kho (Reorder List <= 10 units)
-- =====================================================================================
-- SELECT 
--     product_id,
--     product_name,
--     category_name,
--     supplier_name,
--     supplier_email,
--     supplier_phone,
--     current_stock_qty,
--     safety_stock_threshold,
--     (safety_stock_threshold * 3 - current_stock_qty) AS suggested_reorder_qty,
--     import_price,
--     ((safety_stock_threshold * 3 - current_stock_qty) * import_price) AS estimated_procurement_cost
-- FROM calculated_inventory_health
-- WHERE current_stock_qty <= 10 OR current_stock_qty <= safety_stock_threshold
-- ORDER BY current_stock_qty ASC;
