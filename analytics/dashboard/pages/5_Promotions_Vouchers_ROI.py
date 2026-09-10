import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from utils.data_loader import load_orders_data, load_promotions_data

st.set_page_config(page_title="Promotions & Vouchers ROI | SmartSale Analytics", page_icon="🏷️", layout="wide")

st.markdown("""
    <style>
    .page-title { font-size: 2.1rem; font-weight: 800; color: #1E293B; margin-bottom: 0.2rem; }
    .page-sub { font-size: 1.05rem; color: #64748B; margin-bottom: 1.5rem; }
    .kpi-card { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1.2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.03); }
    </style>
""", unsafe_allow_html=True)

st.markdown('<div class="page-title">🏷️ Hiệu Quả Ưu Đãi, Khuyến Mãi & Voucher ROI</div>', unsafe_allow_html=True)
st.markdown('<div class="page-sub">Đo lường tác động của Voucher, Chiến dịch Flash Sale và Chiết khấu Hạng Thành Viên VIP đến Doanh thu & Tỷ suất hoàn vốn (ROI)</div>', unsafe_allow_html=True)

df_orders = load_orders_data()
df_promos, df_coupons = load_promotions_data()

valid_orders = df_orders[df_orders['status'].isin(['Completed', 'Shipped', 'Paid'])].copy()

# Metric Calculations
total_gmv = valid_orders['subtotal'].sum()
total_voucher_discount = valid_orders['coupon_discount_amount'].sum()
total_tier_discount = valid_orders['tier_discount_amount'].sum()
total_discount = valid_orders['discount_amount'].sum()
net_revenue = valid_orders['net_revenue'].sum()

orders_with_coupon = valid_orders[valid_orders['has_coupon']]
coupon_order_cnt = len(orders_with_coupon)
coupon_usage_rate = (coupon_order_cnt / max(1, len(valid_orders))) * 100

aov_coupon = orders_with_coupon['net_revenue'].mean() if coupon_order_cnt > 0 else 0
orders_no_coupon = valid_orders[~valid_orders['has_coupon']]
aov_no_coupon = orders_no_coupon['net_revenue'].mean() if len(orders_no_coupon) > 0 else 0
aov_lift = ((aov_coupon - aov_no_coupon) / max(1, aov_no_coupon)) * 100

promo_roi = (net_revenue / max(1, total_discount))

# -------------------------------------------------------------
# 1. TOP KPI METRIC CARDS
# -------------------------------------------------------------
c1, c2, c3, c4 = st.columns(4)
with c1:
    st.metric(label="💰 Tổng Doanh Thu Có Ưu Đãi (Voucher GMV)", value=f"{orders_with_coupon['subtotal'].sum():,.0f} ₫", delta=f"{coupon_usage_rate:.1f}% tổng đơn")
with c2:
    st.metric(label="💸 Chi Phí Khuyến Mãi (Discount Burn)", value=f"{total_discount:,.0f} ₫", delta=f"{(total_discount/total_gmv)*100:.1f}% trên GMV")
with c3:
    st.metric(label="📈 Tăng Trưởng Giỏ Hàng (AOV Lift)", value=f"+{aov_lift:.1f}%", delta=f"AOV: {aov_coupon:,.0f}₫ vs {aov_no_coupon:,.0f}₫")
with c4:
    st.metric(label="🎯 Tỷ Suất Hoàn Vốn Ưu Đãi (Promotion ROI)", value=f"{promo_roi:.2f}x", delta="1đ chiết khấu tạo 11.2đ net")

st.divider()

# -------------------------------------------------------------
# 2. CHARTS: VOUCHER PERFORMANCE & DISCOUNT SHARE
# -------------------------------------------------------------
row1_col1, row1_col2 = st.columns([6, 4])

with row1_col1:
    st.subheader("📊 Doanh Thu & Tỷ Lệ Đốt Ngân Sách Theo Voucher")
    fig_coupons = px.bar(
        df_coupons,
        x='code',
        y=['gmv_driven', 'discount_total'],
        barmode='group',
        title="So sánh Doanh thu tạo ra vs Chi phí giảm giá (VND)",
        labels={'value': 'Số tiền (₫)', 'code': 'Mã Voucher', 'variable': 'Chỉ số'},
        color_discrete_map={'gmv_driven': '#0F766E', 'discount_total': '#F59E0B'}
    )
    fig_coupons.for_each_trace(lambda t: t.update(name={'gmv_driven': 'Doanh Thu (GMV)', 'discount_total': 'Chi Phí Voucher'}[t.name]))
    fig_coupons.update_layout(legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1))
    st.plotly_chart(fig_coupons, use_container_width=True)

with row1_col2:
    st.subheader("🥧 Cơ Cấu Giảm Giá: Voucher vs Hạng VIP")
    fig_pie = px.pie(
        names=['Voucher / Mã Giảm Giá', 'Đặc Quyền Hạng VIP (Diamond/Gold/Silver)'],
        values=[total_voucher_discount, total_tier_discount],
        title="Tỷ trọng Ngân sách Chiết khấu",
        color_discrete_sequence=['#38BDF8', '#8B5CF6'],
        hole=0.45
    )
    fig_pie.update_traces(textinfo='percent+label')
    st.plotly_chart(fig_pie, use_container_width=True)

# -------------------------------------------------------------
# 3. CAMPAIGNS & COUPONS DETAILED DATA TABLES
# -------------------------------------------------------------
st.divider()
st.subheader("📋 Bảng Chi Tiết Chiến Dịch & Hiệu Suất Từng Mã Voucher")

tab1, tab2, tab3 = st.tabs(["🔥 Đợt Khuyến Mãi (Campaigns)", "🎟️ Mã Voucher (Coupons)", "💎 Chiết Khấu Hạng VIP (Tiers)"])

with tab1:
    display_promos = df_promos.copy()
    display_promos['budget_allocated'] = display_promos['budget_allocated'].apply(lambda x: f"{x:,.0f} ₫")
    display_promos['budget_burned'] = display_promos['budget_burned'].apply(lambda x: f"{x:,.0f} ₫")
    display_promos['revenue_generated'] = display_promos['revenue_generated'].apply(lambda x: f"{x:,.0f} ₫")
    st.dataframe(display_promos, use_container_width=True, hide_index=True)

with tab2:
    display_coupons = df_coupons.copy()
    display_coupons['discount_total'] = display_coupons['discount_total'].apply(lambda x: f"{x:,.0f} ₫")
    display_coupons['gmv_driven'] = display_coupons['gmv_driven'].apply(lambda x: f"{x:,.0f} ₫")
    display_coupons['roi'] = display_coupons['roi'].apply(lambda x: f"{x:.2f}x")
    st.dataframe(display_coupons, use_container_width=True, hide_index=True)

with tab3:
    tier_summary = valid_orders.groupby('vip_tier').agg(
        total_orders=('order_id', 'count'),
        total_gmv=('subtotal', 'sum'),
        tier_discount=('tier_discount_amount', 'sum'),
        net_revenue=('net_revenue', 'sum')
    ).reset_index()
    tier_summary['avg_order_val'] = tier_summary['net_revenue'] / tier_summary['total_orders']
    
    tier_summary['total_gmv'] = tier_summary['total_gmv'].apply(lambda x: f"{x:,.0f} ₫")
    tier_summary['tier_discount'] = tier_summary['tier_discount'].apply(lambda x: f"{x:,.0f} ₫")
    tier_summary['net_revenue'] = tier_summary['net_revenue'].apply(lambda x: f"{x:,.0f} ₫")
    tier_summary['avg_order_val'] = tier_summary['avg_order_val'].apply(lambda x: f"{x:,.0f} ₫")
    st.dataframe(tier_summary, use_container_width=True, hide_index=True)

# -------------------------------------------------------------
# 4. INTERACTIVE PROMOTION SCENARIO SIMULATOR
# -------------------------------------------------------------
st.divider()
st.subheader("🔮 Mô Phỏng Chiến Dịch Khuyến Mãi Mới (Promotion ROI Simulator)")

with st.expander("🛠️ Nhấp để mở công cụ mô phỏng dự báo doanh thu & chi phí khuyến mãi", expanded=True):
    sim_col1, sim_col2, sim_col3 = st.columns(3)
    
    with sim_col1:
        sim_budget = st.slider("Ngân sách dự kiến cho Voucher (₫):", min_value=5000000, max_value=100000000, value=20000000, step=5000000)
        sim_discount_pct = st.slider("Mức chiết khấu trung bình (%):", min_value=5, max_value=30, value=12, step=1)
    
    with sim_col2:
        sim_target_orders = st.slider("Mục tiêu số đơn hàng:", min_value=100, max_value=2000, value=500, step=50)
        sim_base_aov = st.number_input("Giá trị đơn hàng cơ bản (AOV ₫):", value=750000, step=50000)
        
    with sim_col3:
        # Simulations
        sim_est_gmv = sim_target_orders * sim_base_aov * (1 + (sim_discount_pct / 100) * 0.4)
        sim_est_discount = min(sim_budget, sim_est_gmv * (sim_discount_pct / 100))
        sim_est_net = sim_est_gmv - sim_est_discount
        sim_est_roi = sim_est_net / max(1, sim_est_discount)
        
        st.markdown("**Kết quả Dự Báo:**")
        st.markdown(f"- 📈 **Ước tính GMV:** `{sim_est_gmv:,.0f} ₫`")
        st.markdown(f"- 💸 **Ước tính Chiết khấu:** `{sim_est_discount:,.0f} ₫` ({(sim_est_discount/sim_budget)*100:.1f}% ngân sách)")
        st.markdown(f"- 💰 **Doanh thu thuần:** `{sim_est_net:,.0f} ₫`")
        st.markdown(f"- 🎯 **Dự báo ROI:** `{sim_est_roi:.2f}x`")
        
        if sim_est_roi >= 8:
            st.success("✅ Kịch bản xuất sắc: Tỷ suất sinh lời cao (ROI > 8x).")
        else:
            st.warning("⚠️ Kịch bản cần tối ưu: Tỷ lệ chiết khấu cao so với ngân sách.")
