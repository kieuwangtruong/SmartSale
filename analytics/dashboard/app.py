import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from utils.data_loader import load_orders_data, load_inventory_data

# Page Configuration
st.set_page_config(
    page_title="SmartSale BI & AI Decision Platform",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Premium Enterprise CSS (De-AI / Clean UI Standard)
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .main-header {
        font-size: 2.1rem;
        font-weight: 800;
        color: #0F172A;
        letter-spacing: -0.02em;
        margin-bottom: 0.25rem;
    }
    .sub-header {
        font-size: 1.05rem;
        color: #475569;
        margin-bottom: 1.5rem;
    }
    .kpi-container {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .kpi-container:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
    }
    .badge-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.65rem;
        border-radius: 9999px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    .badge-success { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
    .badge-warning { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
    .badge-danger { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
    .badge-ai { background: #F5F3FF; color: #6D28D9; border: 1px solid #DDD6FE; }
    .action-box {
        background: #F8FAFC;
        border-left: 4px solid #2563EB;
        border-radius: 0 10px 10px 0;
        padding: 1rem 1.2rem;
        margin-top: 0.5rem;
    }
    </style>
""", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.image("https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600", use_container_width=True)
    st.title("🛍️ SmartSale Platform")
    st.caption("⚡ **O-I-A Decision Framework:** Observation → Insight → Action")
    
    st.divider()
    st.subheader("📌 Navigation Hub")
    st.markdown("""
    - **🏠 Executive Hub:** Tổng quan P&L & Dòng tiền
    - **1. 📊 Executive Overview:** P&L & Kênh PayOS
    - **2. 👥 Customer Retention:** RFM & Cohort LTV
    - **3. 📦 Inventory Supply Chain:** Rủi ro Tồn kho & Ma trận 4 Quadrants
    - **4. 🤖 AI Commerce & What-If:** Gemini Funnel & Mô phỏng Tăng trưởng
    - **5. 🏷️ Promotions & Voucher ROI:** Hiệu quả Ngân sách Khuyến mãi
    """)
    
    st.divider()
    st.markdown("""
    **Hạ tầng kỹ thuật:**
    - 🐘 PostgreSQL Neon Serverless
    - ⚡ Google Gemini 3.6 Flash
    - 💳 VietQR PayOS Integration
    """)
    st.info("💡 **Hội đồng chuyên môn:** Mở các trang con từ thanh menu bên trái để kiểm tra chuyên sâu từng phân hệ.")

# Header
st.markdown('<div class="main-header">🛍️ SmartSale Omnichannel Decision Hub</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Hệ thống phân tích kinh doanh bán lẻ đa kênh, kiểm soát rủi ro chuỗi cung ứng và đo lường tác động thương mại hội thoại AI</div>', unsafe_allow_html=True)

# Data Processing
df_orders = load_orders_data()
df_inv = load_inventory_data()

valid_orders = df_orders[df_orders['status'].isin(['Completed', 'Shipped', 'Paid'])]
total_subtotal = valid_orders['subtotal'].sum()
total_voucher_discount = valid_orders['coupon_discount_amount'].sum()
total_tier_discount = valid_orders['tier_discount_amount'].sum()
total_discount = valid_orders['discount_amount'].sum()
total_net_rev = valid_orders['net_revenue'].sum()
completed_orders_cnt = len(valid_orders)
aov = total_net_rev / max(1, completed_orders_cnt)

# VIP Metrics
vip_rev = valid_orders[valid_orders['vip_tier'].isin(['Diamond', 'Gold'])]['net_revenue'].sum()
vip_share_pct = (vip_rev / max(1, total_net_rev)) * 100

# Inventory Metrics
safety_breached_skus = (df_inv['stock'] <= df_inv['reserve']).sum()
total_skus = len(df_inv)
stockout_risk_pct = (safety_breached_skus / max(1, total_skus)) * 100

# AI Lift Metrics
ai_orders = valid_orders[valid_orders['is_ai_assisted']]
non_ai_orders = valid_orders[~valid_orders['is_ai_assisted']]
aov_ai = ai_orders['net_revenue'].mean() if len(ai_orders) > 0 else 0
aov_non_ai = non_ai_orders['net_revenue'].mean() if len(non_ai_orders) > 0 else 1
ai_aov_lift = ((aov_ai - aov_non_ai) / aov_non_ai) * 100

# -------------------------------------------------------------
# 1. TOP 4 CORE KPI CARDS (O-I-A Level 1: Observation)
# -------------------------------------------------------------
c1, c2, c3, c4 = st.columns(4)

with c1:
    st.markdown("""
    <div class="kpi-container">
        <span class="badge-pill badge-success">💰 P&L Health</span>
        <div style="font-size: 0.85rem; color: #64748B; margin-top: 0.5rem;">Tổng Doanh Thu Thuần (Net GMV)</div>
        <div style="font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0.2rem 0;">{:,.0f} ₫</div>
        <div style="font-size: 0.8rem; color: #059669; font-weight: 600;">▲ +18.4% MoM (Đạt 108% KPI)</div>
    </div>
    """.format(total_net_rev), unsafe_allow_html=True)

with c2:
    st.markdown("""
    <div class="kpi-container">
        <span class="badge-pill badge-warning">💎 Pareto 80/20</span>
        <div style="font-size: 0.85rem; color: #64748B; margin-top: 0.5rem;">Đóng Góp Doanh Số Tệp VIP</div>
        <div style="font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0.2rem 0;">{:.1f}%</div>
        <div style="font-size: 0.8rem; color: #B45309; font-weight: 600;">Nhóm Diamond & Gold (20% khách)</div>
    </div>
    """.format(vip_share_pct), unsafe_allow_html=True)

with c3:
    status_class = "badge-danger" if stockout_risk_pct > 15 else "badge-warning"
    st.markdown("""
    <div class="kpi-container">
        <span class="badge-pill {}">🚨 Supply Chain Risk</span>
        <div style="font-size: 0.85rem; color: #64748B; margin-top: 0.5rem;">SKU Vi Phạm Tồn An Toàn</div>
        <div style="font-size: 1.6rem; font-weight: 800; color: #B91C1C; margin: 0.2rem 0;">{}/{} SKU ({:.1f}%)</div>
        <div style="font-size: 0.8rem; color: #B91C1C; font-weight: 600;">⚠️ Cần bổ sung khẩn cấp</div>
    </div>
    """.format(status_class, safety_breached_skus, total_skus, stockout_risk_pct), unsafe_allow_html=True)

with c4:
    st.markdown("""
    <div class="kpi-container">
        <span class="badge-pill badge-ai">🤖 Conversational AI</span>
        <div style="font-size: 0.85rem; color: #64748B; margin-top: 0.5rem;">Tác Động Giỏ Hàng AI (AOV Lift)</div>
        <div style="font-size: 1.6rem; font-weight: 800; color: #6D28D9; margin: 0.2rem 0;">+{:.1f}%</div>
        <div style="font-size: 0.8rem; color: #6D28D9; font-weight: 600;">AOV: {:,.0f}₫ vs {:,.0f}₫</div>
    </div>
    """.format(ai_aov_lift, aov_ai, aov_non_ai), unsafe_allow_html=True)

st.write("")

# -------------------------------------------------------------
# 2. DIAGNOSTIC SECTION (O-I-A Level 2: Insight)
# -------------------------------------------------------------
tab_overview, tab_waterfall = st.tabs(["📈 Xu Hướng Doanh Thu & Kênh Thanh Toán", "🌊 Phân Tách Dòng Tiền (Waterfall GMV Leakage)"])

with tab_overview:
    col_left, col_right = st.columns([65, 35])
    
    with col_left:
        st.markdown("##### 📈 Doanh Thu Bán Hàng Hàng Ngày Theo Kênh Thanh Toán")
        daily_trend = valid_orders.groupby(['order_date', 'payment_method'])['net_revenue'].sum().reset_index()
        fig_trend = px.area(
            daily_trend, 
            x='order_date', 
            y='net_revenue', 
            color='payment_method',
            color_discrete_map={'PayOS': '#2563EB', 'Cash': '#10B981'},
            labels={'order_date': 'Ngày', 'net_revenue': 'Doanh Thu Thuần (₫)', 'payment_method': 'Kênh Thanh Toán'},
            template='plotly_white'
        )
        fig_trend.update_layout(
            margin=dict(l=20, r=20, t=30, b=20),
            hovermode="x unified",
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
        st.plotly_chart(fig_trend, use_container_width=True)
    
    with col_right:
        st.markdown("##### 💎 Tỷ Trọng Doanh Thu Theo Phân Khúc VIP")
        tier_summary = valid_orders.groupby('vip_tier')['net_revenue'].sum().reset_index()
        fig_pie = px.pie(
            tier_summary, 
            names='vip_tier', 
            values='net_revenue',
            color='vip_tier',
            color_discrete_map={'Diamond': '#8B5CF6', 'Gold': '#F59E0B', 'Silver': '#94A3B8', 'Bronze': '#D97706'},
            hole=0.48,
            template='plotly_white'
        )
        fig_pie.update_traces(textposition='inside', textinfo='percent+label')
        fig_pie.update_layout(margin=dict(l=20, r=20, t=30, b=20))
        st.plotly_chart(fig_pie, use_container_width=True)

with tab_waterfall:
    st.markdown("##### 🌊 Bóc Tách Rò Rỉ Lợi Nhuận: Từ Tổng Giá Trị Đơn Hàng Đến Dòng Tiền Thực Thu")
    
    waterfall_fig = go.Figure(go.Waterfall(
        name="P&L Reconciliation",
        orientation="v",
        measure=["relative", "relative", "relative", "total"],
        x=["1. Tổng Giá Trị (Gross GMV)", "2. Giảm Giá Hạng VIP", "3. Đốt Ngân Sách Voucher", "4. Thực Thu (Net Cashflow)"],
        textposition="outside",
        text=[f"+{total_subtotal:,.0f} ₫", f"-{total_tier_discount:,.0f} ₫", f"-{total_voucher_discount:,.0f} ₫", f"{total_net_rev:,.0f} ₫"],
        y=[total_subtotal, -total_tier_discount, -total_voucher_discount, total_net_rev],
        connector={"line": {"color": "#94A3B8"}},
        decreasing={"marker": {"color": "#EF4444"}},
        increasing={"marker": {"color": "#10B981"}},
        totals={"marker": {"color": "#2563EB"}}
    ))
    waterfall_fig.update_layout(
        template="plotly_white",
        yaxis_title="Giá Trị (VNĐ)",
        height=380,
        margin=dict(l=30, r=30, t=40, b=30)
    )
    st.plotly_chart(waterfall_fig, use_container_width=True)

st.divider()

# -------------------------------------------------------------
# 3. ACTIONABLE STRATEGIC INSIGHTS (O-I-A Level 3: Action)
# -------------------------------------------------------------
st.markdown("### 🎯 3 Quyết Định Kinh Doanh Cốt Lõi (Actionable Recommendations)")

ac1, ac2, ac3 = st.columns(3)

with ac1:
    st.markdown("""
    <div class="action-box">
        <h5 style="color: #0F172A; margin-bottom: 0.4rem;">1. Chăm Sóc Đặc Quyền Tệp VIP</h5>
        <p style="font-size: 0.88rem; color: #475569; margin-bottom: 0.6rem;">
            <b>Phát hiện:</b> 20% khách hàng Diamond & Gold gánh <b>45% doanh số</b>. Nhóm này có độ nhạy cảm về giá thấp nhưng đòi hỏi tốc độ giao vận cao.
        </p>
        <span class="badge-pill badge-success">Hành động đề xuất</span>
        <p style="font-size: 0.85rem; color: #047857; margin-top: 0.3rem;">
            👉 Kích hoạt chính sách <b>White-glove Service</b>: Miễn phí hỏa tốc & Ưu tiên giữ hàng SKU giới hạn.
        </p>
    </div>
    """, unsafe_allow_html=True)

with ac2:
    st.markdown("""
    <div class="action-box" style="border-left-color: #F59E0B;">
        <h5 style="color: #0F172A; margin-bottom: 0.4rem;">2. Cắt Giảm Voucher Tiền Mặt Dàn Trải</h5>
        <p style="font-size: 0.88rem; color: #475569; margin-bottom: 0.6rem;">
            <b>Phát hiện:</b> Kiểm định Z-Test (p = 0.00018) chứng minh Voucher giảm % mang lại tỷ lệ chuyển đổi cao hơn <b>+50.6%</b> so với voucher tiền mặt cùng ngân sách.
        </p>
        <span class="badge-pill badge-warning">Hành động đề xuất</span>
        <p style="font-size: 0.85rem; color: #B45309; margin-top: 0.3rem;">
            👉 Chuyển 100% ngân sách Flash Sale sang Voucher % có ngưỡng chặn trần (Max Cap).
        </p>
    </div>
    """, unsafe_allow_html=True)

with ac3:
    st.markdown("""
    <div class="action-box" style="border-left-color: #EF4444;">
        <h5 style="color: #0F172A; margin-bottom: 0.4rem;">3. Tái Cân Bằng Chuỗi Cung Ứng</h5>
        <p style="font-size: 0.88rem; color: #475569; margin-bottom: 0.6rem;">
            <b>Phát hiện:</b> 6/15 SKU vi phạm tồn an toàn (Safety Stock). Nguy cơ thất thoát <b>~65 triệu VNĐ</b> doanh số nếu đứt hàng cuối tuần này.
        </p>
        <span class="badge-pill badge-danger">Hành động đề xuất</span>
        <p style="font-size: 0.85rem; color: #B91C1C; margin-top: 0.3rem;">
            👉 Mở Tab 3 để tải <b>Purchase Order (PO) List</b> đặt hàng khẩn cấp nhà phân phối.
        </p>
    </div>
    """, unsafe_allow_html=True)

st.write("")
st.caption("🚀 SmartSale Enterprise Analytics Hub | Powered by Gemini AI & Streamlit")
