import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from utils.data_loader import load_orders_data

st.set_page_config(page_title="Executive Overview - SmartSale", page_icon="📊", layout="wide")

st.title("📊 Executive Overview & Cash Flow Performance")
st.caption("Báo cáo tài chính cấp cao, phân bổ kênh thanh toán PayOS và kiểm chứng quy luật Pareto 80/20")

df_orders = load_orders_data()
valid = df_orders[df_orders['status'].isin(['Completed', 'Shipped', 'Paid'])]

# Top Row KPI Metrics
c1, c2, c3, c4 = st.columns(4)
total_rev = valid['net_revenue'].sum()
c1.metric("Tổng Doanh Thu Thuần", f"{total_rev:,.0f} ₫")
c2.metric("Số Lượng Đơn Hoàn Tất", f"{len(valid):,}")
c3.metric("Chiết Khấu Khuyến Mãi Đã Cấp", f"{valid['discount_amount'].sum():,.0f} ₫")
c4.metric("Tỷ Lệ Thanh Toán PayOS (VietQR)", f"{(valid['payment_method'] == 'PayOS').mean() * 100:.1f}%")

st.divider()

# Row 2: Revenue Trend & Payment Breakdown
col1, col2 = st.columns([7, 3])

with col1:
    st.subheader("📈 Doanh Thu Tích Lũy Theo Thời Gian (Cumulative GMV)")
    daily = valid.groupby('order_date')['net_revenue'].sum().reset_index().sort_values('order_date')
    daily['cumulative_revenue'] = daily['net_revenue'].cumsum()
    
    fig = px.line(daily, x='order_date', y='cumulative_revenue', markers=True, template='plotly_white')
    fig.update_traces(line_color='#2563EB', line_width=3)
    fig.update_layout(xaxis_title="Ngày Giao Dịch", yaxis_title="Doanh Thu Tích Lũy (VNĐ)")
    st.plotly_chart(fig, use_container_width=True)

with col2:
    st.subheader("💳 Cơ Cấu Kênh Thanh Toán")
    pay_summary = valid.groupby('payment_method')['net_revenue'].agg(['sum', 'count']).reset_index()
    pay_summary.columns = ['Phương Thức', 'Doanh Thu', 'Số Đơn']
    
    fig_pay = px.pie(pay_summary, names='Phương Thức', values='Doanh Thu', hole=0.5,
                     color='Phương Thức', color_discrete_map={'PayOS': '#3B82F6', 'Cash': '#10B981'})
    st.plotly_chart(fig_pay, use_container_width=True)

st.divider()

# Row 3: Pareto Analysis Deep-dive
st.subheader("💎 Phân Tích Quy Luật Pareto: Đóng Góp Doanh Thu Từng Phân Khúc VIP")

tier_agg = valid.groupby('vip_tier').agg(
    Tong_Doanh_Thu=('net_revenue', 'sum'),
    So_Luong_Khach=('customer_id', 'nunique'),
    So_Don_Hang=('order_id', 'count')
).reset_index()

# Ordering tiers
tier_order = {'Diamond': 1, 'Gold': 2, 'Silver': 3, 'Bronze': 4}
tier_agg['sort_order'] = tier_agg['vip_tier'].map(tier_order)
tier_agg = tier_agg.sort_values('sort_order').reset_index(drop=True)

tier_agg['Ty_Trong_Khach_%'] = (tier_agg['So_Luong_Khach'] / tier_agg['So_Luong_Khach'].sum() * 100).round(1)
tier_agg['Ty_Trong_Doanh_Thu_%'] = (tier_agg['Tong_Doanh_Thu'] / tier_agg['Tong_Doanh_Thu'].sum() * 100).round(1)
tier_agg['Doanh_Thu_Luy_Ke_%'] = tier_agg['Ty_Trong_Doanh_Thu_%'].cumsum().round(1)

# Dual-axis Pareto Chart
fig_pareto = go.Figure()
fig_pareto.add_trace(go.Bar(
    x=tier_agg['vip_tier'],
    y=tier_agg['Ty_Trong_Doanh_Thu_%'],
    name='Tỷ Trọng Doanh Thu (%)',
    marker_color='#3B82F6',
    text=tier_agg['Ty_Trong_Doanh_Thu_%'].apply(lambda x: f"{x}%"),
    textposition='auto'
))
fig_pareto.add_trace(go.Scatter(
    x=tier_agg['vip_tier'],
    y=tier_agg['Doanh_Thu_Luy_Ke_%'],
    name='Doanh Thu Lũy Kế (%)',
    yaxis='y2',
    mode='lines+markers+text',
    line=dict(color='#EF4444', width=3),
    text=tier_agg['Doanh_Thu_Luy_Ke_%'].apply(lambda x: f"{x}%"),
    textposition='top center'
))
fig_pareto.update_layout(
    yaxis=dict(title='Tỷ trọng từng nhóm (%)', range=[0, 100]),
    yaxis2=dict(title='Lũy kế Pareto (%)', overlaying='y', side='right', range=[0, 110]),
    template='plotly_white',
    legend=dict(x=0.01, y=0.99)
)
st.plotly_chart(fig_pareto, use_container_width=True)

st.dataframe(
    tier_agg[['vip_tier', 'So_Luong_Khach', 'Ty_Trong_Khach_%', 'Tong_Doanh_Thu', 'Ty_Trong_Doanh_Thu_%', 'Doanh_Thu_Luy_Ke_%']],
    column_config={
        'vip_tier': 'Hạng VIP',
        'So_Luong_Khach': 'Số Lượng Khách Hàng',
        'Ty_Trong_Khach_%': 'Tỷ Trọng Khách (%)',
        'Tong_Doanh_Thu': st.column_config.NumberColumn('Tổng Doanh Thu (VNĐ)', format="%d ₫"),
        'Ty_Trong_Doanh_Thu_%': 'Đóng Góp Doanh Thu (%)',
        'Doanh_Thu_Luy_Ke_%': 'Doanh Thu Tích Lũy (%)'
    },
    use_container_width=True
)
