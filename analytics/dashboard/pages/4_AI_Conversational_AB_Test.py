import streamlit as st
import pandas as pd
import numpy as np
import scipy.stats as stats
from statsmodels.stats.proportion import proportions_ztest, proportion_confint
import plotly.express as px
import plotly.graph_objects as go

st.set_page_config(page_title="AI Conversational & A/B Testing - SmartSale", page_icon="🤖", layout="wide")

st.title("🤖 Conversational AI Commerce & A/B Testing Lab")
st.caption("Đo lường tác động thương mại của Trợ lý Google Gemini và Kiểm định giả thuyết tối ưu hóa Voucher")

tab1, tab2 = st.tabs(["🤖 Phễu Chuyển Đổi AI Gemini (Conversational Funnel)", "🧪 Phòng Thí Nghiệm A/B Testing Voucher"])

# =========================================================================
# TAB 1: AI Conversational Funnel
# =========================================================================
with tab1:
    st.subheader("📊 Phễu Chuyển Đổi Tương Tác AI (Google Gemini 3.6 Flash)")
    
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Phiên Chat Khởi Tạo", "5,400 sessions")
    col2.metric("Hỏi Đáp Tư Vấn Sản Phẩm", "3,780 sessions", delta="70.0%")
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
        fig_funnel.update_layout(template='plotly_white', height=400)
        st.plotly_chart(fig_funnel, use_container_width=True)
        
    with f_right:
        st.subheader("🛍️ Tác Động Tăng Giỏ Hàng (AOV Lift)")
        st.metric(label="AOV Khách Tự Mua (Không Chat)", value="1,420,000 ₫")
        st.metric(label="AOV Khách Có Chat AI Gemini", value="1,620,000 ₫", delta="+14.0% AOV Lift")
        
        st.info("""
        **Khai phá giá trị:**
        - Khách hàng trò chuyện với AI nhận được tư vấn combo phụ kiện cá nhân hóa (VD: Mua Laptop kèm Giá đỡ nhôm & Bàn phím cơ).
        - Động cơ **Gemini 3.6 Flash** xử lý ngữ cảnh tức thì, phản hồi < 1s, chi phí API tối ưu.
        """)

# =========================================================================
# TAB 2: A/B Testing Lab
# =========================================================================
with tab2:
    st.subheader("🧪 Kiểm Định Giả Thuyết: Voucher Giảm % vs. Voucher Tiền Mặt Cố Định")
    
    c_in1, c_in2 = st.columns(2)
    with c_in1:
        st.markdown("#### Nhóm A (Control - Voucher Tiền Mặt)")
        sample_A = st.number_input("Số lượt tiếp cận Nhóm A (Visitors)", min_value=100, max_value=50000, value=1250, step=50)
        conv_A = st.number_input("Số đơn hoàn tất Nhóm A (Conversions)", min_value=1, max_value=sample_A, value=112, step=5)
        cr_A = conv_A / sample_A
        st.write(f"👉 **Tỷ lệ chuyển đổi A:** `{cr_A:.2%}`")

    with c_in2:
        st.markdown("#### Nhóm B (Variant - Voucher %)")
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
        P-Value ({p_value:.6f}) < 0.05. Chúng ta bác bỏ giả thuyết $H_0$. Chương trình **Voucher Giảm %** thực sự tạo ra tỷ lệ chuyển đổi cao hơn rõ rệt so với Voucher tiền mặt cố định.
        """)
    else:
        st.warning(f"⚠️ Chưa đủ bằng chứng thống kê để kết luận sự vượt trội (p-value = {p_value:.4f} >= 0.05).")

    # Comparison Plot
    fig_ab = go.Figure()
    fig_ab.add_trace(go.Bar(
        x=['Nhóm A (Voucher VNĐ)', 'Nhóm B (Voucher %)'],
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
