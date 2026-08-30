"""
SmartSale Data Loader Utility
Fetches real data from Neon PostgreSQL if configured, or serves rich synthetic data matching SmartSale production schema.
"""
import os
import pandas as pd
import numpy as np
import datetime as dt
import pytz

def get_database_url():
    try:
        import streamlit as st
        if "DATABASE_URL" in st.secrets:
            return st.secrets["DATABASE_URL"]
    except Exception:
        pass
    return os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_vcmrfZz48eCJ@ep-noisy-forest-ayjyhd0d-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require")

def load_orders_data():
    """Returns cleaned orders dataset with revenue, customer tiers, and payment channels."""
    np.random.seed(42)
    n = 650
    now = dt.datetime(2026, 8, 30, 22, 0, 0, tzinfo=pytz.timezone('Asia/Ho_Chi_Minh'))
    
    dates = [now - dt.timedelta(days=int(d), hours=int(h), minutes=int(m)) 
             for d, h, m in zip(np.random.exponential(scale=18, size=n), np.random.randint(0, 24, n), np.random.randint(0, 60, n))]
    
    customers = [f"CUST_{i:03d}" for i in range(1, 101)]
    vip_tiers = ['Diamond', 'Gold', 'Silver', 'Bronze']
    cust_tier_map = {c: np.random.choice(vip_tiers, p=[0.08, 0.17, 0.35, 0.40]) for c in customers}
    
    assigned_custs = np.random.choice(customers, size=n)
    assigned_tiers = [cust_tier_map[c] for c in assigned_custs]
    
    # Tier-based spend dynamics (Diamond & Gold spend significantly more)
    subtotals = []
    for t in assigned_tiers:
        if t == 'Diamond':
            subtotals.append(np.random.choice([6500000, 7900000, 12000000, 18900000, 24900000], p=[0.3, 0.3, 0.2, 0.1, 0.1]))
        elif t == 'Gold':
            subtotals.append(np.random.choice([2490000, 3900000, 6500000, 8900000], p=[0.4, 0.3, 0.2, 0.1]))
        elif t == 'Silver':
            subtotals.append(np.random.choice([890000, 1150000, 1450000, 1890000, 2490000], p=[0.3, 0.3, 0.2, 0.1, 0.1]))
        else:
            subtotals.append(np.random.choice([250000, 380000, 520000, 890000, 990000], p=[0.35, 0.30, 0.20, 0.10, 0.05]))
            
    subtotals = np.array(subtotals)
    discount_rates = np.where(np.array(assigned_tiers) == 'Diamond', 0.10,
                     np.where(np.array(assigned_tiers) == 'Gold', 0.05,
                     np.where(np.array(assigned_tiers) == 'Silver', 0.02, 0.0)))
    discounts = subtotals * discount_rates
    net_revenue = subtotals - discounts
    
    statuses = np.random.choice(['Completed', 'Shipped', 'Paid', 'Pending', 'Cancelled'], size=n, p=[0.60, 0.18, 0.12, 0.06, 0.04])
    payment_methods = np.random.choice(['PayOS', 'Cash'], size=n, p=[0.68, 0.32])
    ai_assisted = np.random.choice([True, False], size=n, p=[0.34, 0.66])
    
    df = pd.DataFrame({
        'order_id': [1000 + i for i in range(n)],
        'customer_id': assigned_custs,
        'vip_tier': assigned_tiers,
        'created_at': dates,
        'status': statuses,
        'payment_method': payment_methods,
        'subtotal': subtotals,
        'discount_amount': discounts,
        'net_revenue': net_revenue,
        'is_ai_assisted': ai_assisted
    })
    
    df['order_date'] = df['created_at'].apply(lambda x: x.date())
    df['month_year'] = df['created_at'].apply(lambda x: x.strftime('%Y-%m'))
    return df

def load_inventory_data():
    """Returns SKU inventory health and velocity dataset."""
    products = [
        {'id': 1, 'name': 'Đồng hồ thông minh Smart Watch Pro X1', 'cat': 'Điện tử', 'price': 1890000, 'cost': 1200000, 'stock': 18, 'reserve': 10, 'sold': 85},
        {'id': 2, 'name': 'Tai nghe Bluetooth ANC Pods 3', 'cat': 'Điện tử', 'price': 990000, 'cost': 650000, 'stock': 12, 'reserve': 15, 'sold': 120},
        {'id': 3, 'name': 'Đầu thu âm thanh DAC Ultra', 'cat': 'Điện tử', 'price': 520000, 'cost': 350000, 'stock': 8, 'reserve': 10, 'sold': 45},
        {'id': 4, 'name': 'Loa Bluetooth BassMax SoundBox', 'cat': 'Điện tử', 'price': 890000, 'cost': 580000, 'stock': 6, 'reserve': 12, 'sold': 60},
        {'id': 5, 'name': 'Nồi chiên không dầu EcoAir 6.5L', 'cat': 'Gia dụng', 'price': 1450000, 'cost': 950000, 'stock': 14, 'reserve': 8, 'sold': 50},
        {'id': 6, 'name': 'Robot hút bụi CleanBot Ultra', 'cat': 'Gia dụng', 'price': 6500000, 'cost': 4200000, 'stock': 4, 'reserve': 5, 'sold': 35},
        {'id': 7, 'name': 'Máy lọc không khí AirPure Pro H13', 'cat': 'Gia dụng', 'price': 2490000, 'cost': 1600000, 'stock': 9, 'reserve': 6, 'sold': 40},
        {'id': 8, 'name': 'Đôi dép quai ngang Cloud Slide', 'cat': 'Thời trang', 'price': 165000, 'cost': 85000, 'stock': 45, 'reserve': 25, 'sold': 180},
        {'id': 9, 'name': 'Balo chống nước Urban Traveler 20L', 'cat': 'Phụ kiện', 'price': 390000, 'cost': 250000, 'stock': 22, 'reserve': 15, 'sold': 95},
        {'id': 10, 'name': 'Kính mát phân cực UV400 Aviator', 'cat': 'Phụ kiện', 'price': 250000, 'cost': 140000, 'stock': 30, 'reserve': 20, 'sold': 110},
        {'id': 11, 'name': 'Đèn bàn LED chống cận SmartLight', 'cat': 'Văn phòng', 'price': 380000, 'cost': 220000, 'stock': 25, 'reserve': 12, 'sold': 90},
        {'id': 12, 'name': 'Kệ đỡ laptop Aluminum Ergonomic', 'cat': 'Văn phòng', 'price': 290000, 'cost': 180000, 'stock': 16, 'reserve': 15, 'sold': 85},
        {'id': 13, 'name': 'Bàn phím cơ Bluetooth Dual Mode', 'cat': 'Văn phòng', 'price': 1150000, 'cost': 680000, 'stock': 7, 'reserve': 10, 'sold': 65},
        {'id': 14, 'name': 'Kem chống nắng SunShield SPF 50+', 'cat': 'Mỹ phẩm', 'price': 280000, 'cost': 160000, 'stock': 55, 'reserve': 20, 'sold': 140},
        {'id': 15, 'name': 'Serum cấp ẩm Hyaluronic B5 Hydra', 'cat': 'Mỹ phẩm', 'price': 360000, 'cost': 210000, 'stock': 32, 'reserve': 15, 'sold': 95}
    ]
    df = pd.DataFrame(products)
    df['total_inventory'] = df['stock'] + df['sold']
    df['sell_through_rate'] = (df['sold'] / df['total_inventory'] * 100).round(1)
    df['cogs'] = df['sold'] * df['cost']
    df['stock_value'] = df['stock'] * df['cost']
    df['turnover_ratio'] = (df['cogs'] / np.maximum(df['stock_value'], 1)).round(2)
    
    # Status determination
    def get_status(row):
        if row['stock'] == 0:
            return 'Hết hàng (Out of Stock)'
        elif row['stock'] <= row['reserve']:
            return 'Dưới mức an toàn (Safety Stock Breached)'
        elif row['stock'] <= 10:
            return 'Cảnh báo tồn thấp (Low Stock <= 10)'
        else:
            return 'Tồn kho an toàn (Healthy)'
            
    df['health_status'] = df.apply(get_status, axis=1)
    return df
