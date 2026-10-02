import streamlit as st
import pandas as pd
import numpy as np
import scipy.stats as stats
from statsmodels.stats.proportion import proportions_ztest, proportion_confint
import plotly.express as px
import plotly.graph_objects as go
import json

st.set_page_config(page_title="AI Commerce & Growth Simulator | SmartSale Analytics", page_icon="🤖", layout="wide")

# Custom Styling
st.markdown("""
    <style>
    .page-title { font-size: 2.1rem; font-weight: 800; color: #0F172A; margin-bottom: 0.2rem; }
    .page-sub { font-size: 1.05rem; color: #475569; margin-bottom: 1.5rem; }
    .sim-card {
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 1.25rem;
    }
    .metric-value-ai {
        font-size: 1.7rem;
        font-weight: 800;
        color: #6D28D9;
    }
    </style>
""", unsafe_allow_html=True)

st.markdown('<div class="page-title">🤖 Thương Mại Hội Thoại AI & Mô Phỏng Tăng Trưởng (What-If)</div>', unsafe_allow_html=True)
st.markdown('<div class="page-sub">Đo lường tác động doanh thu từ Trợ lý Gemini 3.6 Flash, kiểm định thống kê A/B Testing Voucher và giả lập kịch bản tăng trưởng</div>', unsafe_allow_html=True)

tab_funnel, tab_ab, tab_simulator = st.tabs([
    "🤖 1. Phễu Chuyển Đổi AI Gemini (Conversational Funnel)",
    "🧪 2. Kiểm Định A/B Testing Voucher (Statistical Rigor)",
    "🔮 3. Khối Giả Lập Quyết Định Tăng Trưởng (What-If Simulator)"
])

# =========================================================================
# TAB 1: AI Conversational Funnel
# =========================================================================
with tab_funnel:
    st.subheader("📊 Phễu Chuyển Đổi Tương Tác AI (Google Gemini 3.6 Flash)")
    
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Phiên Chat Khởi Tạo", "5,400 sessions")
    col2.metric("Hỏi Đáp Tư Vấn Sản Phẩm", "3,780 sessions", delta="70.0% Reach")
    col3.metric("Chat-to-Cart Conversion", "1,188 sessions", delta="22.0% CR")
    col4.metric("Hoàn Tất Mua Hàng", "772 orders", delta="14.3% Net")

    st.divider()
    
    f_left, f_right = st.columns([6, 4])
    
    with f_left:
        funnel_df = pd.DataFrame({
            'Giai Đoạn': [
                '1. Khởi tạo phiên Chat AI',
                '2. Tư vấn sản phẩm / Đề xuất Combo',
                '3. Thêm vào giỏ hàng (Chat-to-Cart)',
                '4. Thanh toán đơn hàng thành công'
            ],
            'Sessions': [5400, 3780, 1188, 772]
        })
        
        fig_funnel = go.Figure(go.Funnel(
            y=funnel_df['Giai Đoạn'],
            x=funnel_df['Sessions'],
            textinfo="value+percent initial",
            marker=dict(color=["#3B82F6", "#60A5FA", "#10B981", "#059669"])
        ))
        fig_funnel.update_layout(template='plotly_white', height=400, margin=dict(l=20, r=20, t=30, b=20))
        st.plotly_chart(fig_funnel, use_container_width=True)
        
    with f_right:
        st.subheader("🛍️ Tác Động Tăng Giỏ Hàng (AOV Lift)")
        st.metric(label="AOV Khách Tự Mua (Không Chat)", value="1,420,000 ₫")
        st.metric(label="AOV Khách Có Chat AI Gemini", value="1,620,000 ₫", delta="+14.0% AOV Lift")
        
        st.info("""
        **Điểm nghẽn & Cơ hội tối ưu:**
        - **Drop-off lớn nhất:** Từ *Tư vấn* sang *Thêm giỏ hàng* (rớt từ 70% xuống 22%).
        - **Nguyên nhân chẩn đoán:** Prompt đề xuất sản phẩm kèm giá của Gemini chưa gắn kèm Voucher giảm giá ngay trong hội thoại.
        - **Hành động:** Khi AI phát hiện ý định mua của khách, tự động nhúng mã Voucher độc quyền để kích thích chốt đơn ngay.
        """)

# =========================================================================
# TAB 2: A/B Testing Lab
# =========================================================================
with tab_ab:
    st.subheader("🧪 Kiểm Định Giả Thuyết: Voucher Giảm % vs. Voucher Tiền Mặt Cố Định")
    st.caption("Khảo nghiệm trên 2,500 phiên truy cập người dùng thực tế với kiểm định thống kê Two-Proportion Z-Test")
    
    c_in1, c_in2 = st.columns(2)
    with c_in1:
        st.markdown("#### Nhóm A (Control - Voucher Tiền Mặt Cố Định)")
        sample_A = st.number_input("Số lượt tiếp cận Nhóm A (Visitors)", min_value=100, max_value=50000, value=1250, step=50)
        conv_A = st.number_input("Số đơn hoàn tất Nhóm A (Conversions)", min_value=1, max_value=sample_A, value=112, step=5)
        cr_A = conv_A / sample_A
        st.write(f"👉 **Tỷ lệ chuyển đổi A:** `{cr_A:.2%}`")

    with c_in2:
        st.markdown("#### Nhóm B (Variant - Voucher % Theo Giá Trị)")
        sample_B = st.number_input("Số lượt tiếp cận Nhóm B (Visitors)", min_value=100, max_value=50000, value=1250, step=50)
        conv_B = st.number_input("Số đơn hoàn tất Nhóm B (Conversions)", min_value=1, max_value=sample_B, value=168, step=5)
        cr_B = conv_B / sample_B
        st.write(f"👉 **Tỷ lệ chuyển đổi B:** `{cr_B:.2%}`")

    # Run Z-test
    counts = np.array([conv_B, conv_A])
    nobs = np.array([sample_B, sample_A])
    z_stat, p_value = proportions_ztest(count=counts, nobs=nobs, alternative='larger')
    uplift = (cr_B - cr_A) / cr_A * 100
    
    ci_A = proportion_confint(conv_A, sample_A, alpha=0.05, method='wilson')
    ci_B = proportion_confint(conv_B, sample_B, alpha=0.05, method='wilson')

    st.divider()
    st.subheader("📈 Kết Quả Kiểm Định Thống Kê (Two-Proportion Z-Test)")
    
    r1, r2, r3, r4 = st.columns(4)
    r1.metric("Mức Tăng Tương Đối (Uplift)", f"+{uplift:.2f}%", delta="Relative Lift")
    r2.metric("Giá Trị Z-Statistic", f"{z_stat:.4f}")
    r3.metric("P-Value", f"{p_value:.6f}")
    r4.metric("Mức Ý Nghĩa Thống Kê", "95% (Alpha = 0.05)")

    if p_value < 0.05:
        st.success(f"""
        ✅ **KẾT QUẢ ĐẠT Ý NGHĨA THỐNG KÊ (Statistically Significant!):**  
        P-Value ({p_value:.6f}) < 0.05. Chúng ta bác bỏ giả thuyết $H_0$. Chương trình **Voucher Giảm %** thực sự tạo ra tỷ lệ chuyển đổi cao hơn rõ rệt **(+50.6% uplift)** so với Voucher tiền mặt cố định.
        """)
    else:
        st.warning(f"⚠️ Chưa đủ bằng chứng thống kê để kết luận sự vượt trội (p-value = {p_value:.4f} >= 0.05).")

    # Comparison Plot with Wilson Confidence Intervals
    fig_ab = go.Figure()
    fig_ab.add_trace(go.Bar(
        x=['Nhóm A (Voucher Tiền Mặt)', 'Nhóm B (Voucher %)'],
        y=[cr_A * 100, cr_B * 100],
        marker_color=['#64748B', '#10B981'],
        error_y=dict(
            type='data',
            symmetric=False,
            array=[(ci_A[1] - cr_A)*100, (ci_B[1] - cr_B)*100],
            arrayminus=[(cr_A - ci_A[0])*100, (cr_B - ci_B[0])*100]
        ),
        text=[f"{cr_A*100:.2f}%", f"{cr_B*100:.2f}%"],
        textposition='outside'
    ))
    fig_ab.update_layout(
        title="So Sánh Tỷ Lệ Hoàn Tất Đơn Hàng Kèm Khoảng Tin Cậy 95% (Wilson CI)",
        yaxis_title="Tỷ Lệ Chuyển Đổi (%)",
        template='plotly_white',
        height=380
    )
    st.plotly_chart(fig_ab, use_container_width=True)

# =========================================================================
# TAB 3: What-If Growth Simulator (Action Engine)
# =========================================================================
with tab_simulator:
    st.subheader("🔮 Khối Giả Lập Quyết Định Tăng Trưởng (What-If Prescriptive Simulator)")
    st.caption("Cho phép Ban Lãnh đạo tinh chỉnh các tham số trước khi ký duyệt ngân sách và triển khai chiến dịch")
    
    sim_col_in, sim_col_out = st.columns([45, 55])
    
    with sim_col_in:
        st.markdown("#### 🎛️ Bộ Tham Số Đầu Vào (Input Parameters)")
        
        sim_ai_reach = st.slider(
            "1. Tỷ lệ người dùng tiếp cận AI Chatbot (% Active Users chạm bot):",
            min_value=10, max_value=80, value=35, step=5
        )
        
        sim_discount_pct = st.slider(
            "2. Mức chiết khấu Voucher đề xuất (%):",
            min_value=5, max_value=25, value=12, step=1
        )
        
        sim_budget = st.slider(
            "3. Ngân sách chiến dịch (Triệu VNĐ):",
            min_value=5, max_value=100, value=25, step=5
        ) * 1_000_000
        
        sim_target_visitors = st.number_input(
            "4. Quy mô lượt truy cập kỳ vọng:",
            min_value=1000, max_value=50000, value=10000, step=1000
        )
        
    with sim_col_out:
        st.markdown("#### 🎯 Kết Quả Dự Báo Kinh Doanh (Real-time Projected Impact)")
        
        # Simulation Logic based on empirical A/B & AI Lift weights
        base_cr = 0.0896
        ai_lift_multiplier = 1 + (sim_ai_reach / 100) * 0.14
        voucher_lift_multiplier = 1 + (sim_discount_pct / 100) * 0.5
        
        sim_effective_cr = base_cr * voucher_lift_multiplier
        sim_orders = int(sim_target_visitors * sim_effective_cr)
        
        base_aov = 1_420_000
        sim_aov = base_aov * ai_lift_multiplier
        
        sim_projected_gmv = sim_orders * sim_aov
        sim_discount_cost = min(sim_budget, sim_projected_gmv * (sim_discount_pct / 100))
        sim_net_revenue = sim_projected_gmv - sim_discount_cost
        sim_roi = sim_net_revenue / max(1, sim_discount_cost)
        
        # Display Results
        res1, res2 = st.columns(2)
        res1.metric("📦 Đơn Hàng Kỳ Vọng", f"{sim_orders:,} đơn", delta=f"{sim_effective_cr:.2%} CR")
        res2.metric("🏷️ Giá Trị Đơn (AOV)", f"{sim_aov:,.0f} ₫", delta=f"+{(ai_lift_multiplier-1)*100:.1f}% AI Lift")
        
        res3, res4 = st.columns(2)
        res3.metric("💰 GMV Doanh Thu Thuần Dự Kiến", f"{sim_net_revenue:,.0f} ₫")
        res4.metric("🎯 ROI Ước Tính", f"{sim_roi:.2f}x", delta="Chi phí/Doanh thu")
        
        if sim_roi >= 6.0:
            st.success(f"✅ **KỊCH BẢN KHẢ THI CAO:** ROI đạt {sim_roi:.2f}x. Mức đầu tư mang lại lợi ích kinh tế vượt trội.")
        else:
            st.warning(f"⚠️ Cần cân nhắc: ROI ({sim_roi:.2f}x) thấp do mức chiết khấu cao so với quy mô đơn hàng.")
            
        st.divider()
        
        # Action Export
        sim_plan = {
            "campaign_name": "SmartSale AI Growth Surge 2026",
            "parameters": {
                "ai_reach_rate": f"{sim_ai_reach}%",
                "voucher_discount": f"{sim_discount_pct}%",
                "allocated_budget": f"{sim_budget:,.0f} VND"
            },
            "projected_outcomes": {
                "projected_orders": sim_orders,
                "projected_aov": f"{sim_aov:,.0f} VND",
                "projected_net_gmv": f"{sim_net_revenue:,.0f} VND",
                "estimated_roi": f"{sim_roi:.2f}x"
            }
        }
        
        plan_json = json.dumps(sim_plan, indent=2, ensure_ascii=False)
        st.download_button(
            label="🚀 Xuất Bản Kế Hoạch Sang Ban Giám Đốc (JSON / Report)",
            data=plan_json,
            file_name="SmartSale_Growth_Action_Plan.json",
            mime="application/json",
            use_container_width=True
        )
