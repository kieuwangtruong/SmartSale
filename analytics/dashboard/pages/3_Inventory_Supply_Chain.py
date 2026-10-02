import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from utils.data_loader import load_inventory_data

st.set_page_config(page_title="Inventory & Supply Chain | SmartSale Analytics", page_icon="📦", layout="wide")

# Custom Styling
st.markdown("""
    <style>
    .page-title { font-size: 2.1rem; font-weight: 800; color: #0F172A; margin-bottom: 0.2rem; }
    .page-sub { font-size: 1.05rem; color: #475569; margin-bottom: 1.5rem; }
    .kpi-metric-card {
        background: white;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 1.1rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    </style>
""", unsafe_allow_html=True)

st.markdown('<div class="page-title">📦 Chuỗi Cung Ứng & Cảnh Báo Sớm Rủi Ro Hết Hàng</div>', unsafe_allow_html=True)
st.markdown('<div class="page-sub">Chẩn đoán điểm nghẽn tồn kho: Phân biệt hàng chết chôn vốn (Dead Capital) và SKU bán chạy có nguy cơ đứt hàng (Stockout)</div>', unsafe_allow_html=True)

df_inv = load_inventory_data().copy()

# Add Days of Inventory (DOI) based on synthetic daily run rate
np.random.seed(42)
df_inv['daily_run_rate'] = (df_inv['sold'] / 30).clip(lower=0.5).round(1) # average sold per day in last month
df_inv['days_of_inventory'] = (df_inv['stock'] / df_inv['daily_run_rate']).round(1)

# Metrics
total_val = df_inv['stock_value'].sum()
avg_str = df_inv['sell_through_rate'].mean()
low_stock_cnt = (df_inv['stock'] <= 10).sum()
safety_breach_cnt = (df_inv['stock'] <= df_inv['reserve']).sum()
total_capital_at_risk = df_inv[df_inv['stock'] <= df_inv['reserve']]['stock_value'].sum()

# -------------------------------------------------------------
# 1. TOP METRICS
# -------------------------------------------------------------
c1, c2, c3, c4 = st.columns(4)
c1.metric("💰 Tổng Giá Trị Tồn Kho", f"{total_val:,.0f} ₫")
c2.metric("⚡ Tỷ Lệ Bán Hết Bình Quân (STR)", f"{avg_str:.1f}%")
c3.metric("🚨 SKU Báo Động (Tồn <= 10)", f"{low_stock_cnt} SKU", delta=f"{low_stock_cnt} cần nhập ngay", delta_color="inverse")
c4.metric("🛡️ SKU Vi Phạm Tồn An Toàn", f"{safety_breach_cnt} SKU", delta=f"Rủi ro: {total_capital_at_risk:,.0f}₫", delta_color="inverse")

st.divider()

# -------------------------------------------------------------
# 2. DIAGNOSTIC SCATTER MATRIX (4 QUADRANTS)
# -------------------------------------------------------------
st.subheader("🎯 Ma Trận Rủi Ro Tồn Kho 4 Góc Phần Tư (Inventory Risk Matrix)")
st.caption("Biểu đồ phân tích tương quan giữa Tỷ lệ bán hết (Sell-Through Rate) và Giá trị vốn tồn kho (Stock Value)")

median_str = df_inv['sell_through_rate'].median()
median_val = df_inv['stock_value'].median()

fig_scatter = px.scatter(
    df_inv,
    x='sell_through_rate',
    y='stock_value',
    size='sold',
    color='health_status',
    hover_name='name',
    hover_data=['cat', 'stock', 'reserve', 'days_of_inventory'],
    labels={
        'sell_through_rate': 'Tỷ Lệ Bán Hết (Sell-Through Rate %)',
        'stock_value': 'Giá Trị Hàng Tồn Hiện Tại (VNĐ)',
        'health_status': 'Trạng Thái Tồn Kho',
        'sold': 'Số Lượng Đã Bán'
    },
    color_discrete_map={
        'Hết hàng (Out of Stock)': '#DC2626',
        'Dưới mức an toàn (Safety Stock Breached)': '#EA580C',
        'Cảnh báo tồn thấp (Low Stock <= 10)': '#D97706',
        'Tồn kho an toàn (Healthy)': '#059669'
    },
    template='plotly_white',
    height=520
)

# Add benchmark quadrant reference lines
fig_scatter.add_vline(x=median_str, line_dash="dash", line_color="#94A3B8")
fig_scatter.add_hline(y=median_val, line_dash="dash", line_color="#94A3B8")

# Annotations for quadrants
fig_scatter.add_annotation(
    x=df_inv['sell_through_rate'].min() + 2, y=df_inv['stock_value'].max() * 0.95,
    text="⚠️ <b>GÓC BẪY VỐN (DEAD CAPITAL TRAP)</b><br>Vốn tồn lớn nhưng bán chậm → Cần Flash Sale xả hàng",
    showarrow=False, bgcolor="#FEF2F2", bordercolor="#FECACA", borderwidth=1, font=dict(color="#991B1B", size=11)
)

fig_scatter.add_annotation(
    x=df_inv['sell_through_rate'].max() - 5, y=df_inv['stock_value'].min() * 1.5,
    text="🚨 <b>GÓC NGUY CƠ CHÁY HÀNG (STOCKOUT ALERT)</b><br>Bán siêu chạy nhưng tồn mỏng → Cần nhập hàng gấp",
    showarrow=False, bgcolor="#FFFBEB", bordercolor="#FDE68A", borderwidth=1, font=dict(color="#92400E", size=11)
)

fig_scatter.update_layout(
    margin=dict(l=30, r=30, t=30, b=30),
    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
)

st.plotly_chart(fig_scatter, use_container_width=True)

st.divider()

# -------------------------------------------------------------
# 3. ACTIONABLE PURCHASE ORDER GENERATOR (REORDER TABLE)
# -------------------------------------------------------------
st.subheader("🚨 Bảng Điều Phối Nhập Hàng Khẩn Cấp (Purchase Order Dispatcher)")
st.caption("Thuật toán tự động tính toán số lượng đề xuất nhập dựa trên ngưỡng an toàn: `Suggest = Max(0, Safety Stock * 3 - Current Stock)`")

alert_df = df_inv[df_inv['stock'] <= 12].copy().sort_values('days_of_inventory')
alert_df['suggested_reorder'] = np.maximum(0, alert_df['reserve'] * 3 - alert_df['stock'])
alert_df['procurement_cost'] = alert_df['suggested_reorder'] * alert_df['cost']

col_tab, col_action = st.columns([75, 25])

with col_tab:
    st.dataframe(
        alert_df[['name', 'cat', 'stock', 'reserve', 'days_of_inventory', 'suggested_reorder', 'procurement_cost', 'health_status']],
        column_config={
            'name': 'Tên Sản Phẩm',
            'cat': 'Danh Mục',
            'stock': st.column_config.NumberColumn('Tồn Kho'),
            'reserve': st.column_config.NumberColumn('Tồn An Toàn'),
            'days_of_inventory': st.column_config.NumberColumn('Số Ngày Còn Hàng (DOI)', format="%.1f ngày"),
            'suggested_reorder': st.column_config.NumberColumn('Đề Xuất Nhập (Units)'),
            'procurement_cost': st.column_config.NumberColumn('Chi Phí Nhập (₫)', format="%d ₫"),
            'health_status': 'Trạng Thái'
        },
        use_container_width=True,
        hide_index=True
    )

with col_action:
    st.markdown("#### ⚡ Quyết Định Điều Hành")
    total_reorder_units = alert_df['suggested_reorder'].sum()
    total_reorder_cost = alert_df['procurement_cost'].sum()
    
    st.metric("Tổng Số Lượng Cần Nhập", f"{total_reorder_units:,} sản phẩm")
    st.metric("Tổng Dự Toán Ngân Sách", f"{total_reorder_cost:,.0f} ₫")
    
    # Export PO action
    po_csv = alert_df[['id', 'name', 'cat', 'suggested_reorder', 'procurement_cost']].to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Tải Đơn Đặt Hàng PO (CSV)",
        data=po_csv,
        file_name="SmartSale_Emergency_PO_List.csv",
        mime="text/csv",
        use_container_width=True
    )
    st.success("✅ Sẵn sàng gửi PO sang Phòng Mua hàng (Procurement)")
