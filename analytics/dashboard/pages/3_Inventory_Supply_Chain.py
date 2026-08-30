import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from utils.data_loader import load_inventory_data

st.set_page_config(page_title="Inventory & Supply Chain - SmartSale", page_icon="📦", layout="wide")

st.title("📦 Inventory Health & Supply Chain Early Warning")
st.caption("Kiểm soát tốc độ bán (Sell-Through Rate), vòng quay tồn kho và cảnh báo rủi ro hết hàng (Stockout Alerts)")

df_inv = load_inventory_data()

# KPI Metrics
c1, c2, c3, c4 = st.columns(4)
total_val = df_inv['stock_value'].sum()
avg_str = df_inv['sell_through_rate'].mean()
low_stock_cnt = (df_inv['stock'] <= 10).sum()
safety_breach_cnt = (df_inv['stock'] <= df_inv['reserve']).sum()

c1.metric("Tổng Giá Trị Tồn Kho", f"{total_val:,.0f} ₫")
c2.metric("Tỷ Lệ Bán Hết TB (STR %)", f"{avg_str:.1f}%")
c3.metric("SKU Báo Động (Tồn <= 10)", f"{low_stock_cnt} SKU", delta=f"{low_stock_cnt} cần nhập", delta_color="inverse")
c4.metric("SKU Vi Phạm Tồn An Toàn", f"{safety_breach_cnt} SKU", delta_color="inverse")

st.divider()

# Charts
col1, col2 = st.columns([6, 4])

with col1:
    st.subheader("📊 Tốc Độ Bán Hết & Tồn Kho Theo Từng SKU")
    fig_bar = px.bar(
        df_inv.sort_values('sell_through_rate', ascending=True),
        x='sell_through_rate',
        y='name',
        color='health_status',
        orientation='h',
        labels={'sell_through_rate': 'Sell-Through Rate (%)', 'name': 'Sản Phẩm', 'health_status': 'Trạng Thái'},
        color_discrete_map={
            'Hết hàng (Out of Stock)': '#EF4444',
            'Dưới mức an toàn (Safety Stock Breached)': '#F97316',
            'Cảnh báo tồn thấp (Low Stock <= 10)': '#F59E0B',
            'Tồn kho an toàn (Healthy)': '#10B981'
        },
        template='plotly_white',
        height=500
    )
    st.plotly_chart(fig_bar, use_container_width=True)

with col2:
    st.subheader("⚡ Phân Bổ Danh Mục Hàng Hóa")
    cat_summary = df_inv.groupby('cat').agg(
        total_stock=('stock', 'sum'),
        total_sold=('sold', 'sum'),
        total_val=('stock_value', 'sum')
    ).reset_index()
    
    fig_donut = px.pie(cat_summary, names='cat', values='total_val', hole=0.45,
                       title="Giá Trị Tồn Kho Theo Danh Mục", template='plotly_white')
    st.plotly_chart(fig_donut, use_container_width=True)

st.divider()

# SKU Alert Table with Reorder recommendation
st.subheader("🚨 Danh Sách SKU Cần Đặt Hàng Khẩn Cấp (Reorder List)")
alert_df = df_inv[df_inv['stock'] <= 10].copy()
alert_df['suggested_reorder'] = np.maximum(0, alert_df['reserve'] * 3 - alert_df['stock'])
alert_df['procurement_cost'] = alert_df['suggested_reorder'] * alert_df['cost']

st.dataframe(
    alert_df[['name', 'cat', 'stock', 'reserve', 'sell_through_rate', 'suggested_reorder', 'procurement_cost', 'health_status']],
    column_config={
        'name': 'Tên Sản Phẩm',
        'cat': 'Danh Mục',
        'stock': 'Tồn Thực Tế',
        'reserve': 'Tồn Dự Trữ An Toàn',
        'sell_through_rate': st.column_config.NumberColumn('STR (%)', format="%.1f%%"),
        'suggested_reorder': 'SL Đề Xuất Nhập (Units)',
        'procurement_cost': st.column_config.NumberColumn('Chi Phí Nhập Ước Tính', format="%d ₫"),
        'health_status': 'Cảnh Báo'
    },
    use_container_width=True
)
