<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '../stores/cartStore'

interface User {
  email: string
  role: string
  fullName: string
}

const router = useRouter()
const cartStore = useCartStore()
const paymentMethod = ref('cash')
const showCheckout = ref(false)
const orderPlaced = ref(false)
const currentUser = ref<User | null>(null)
const showUserMenu = ref(false)

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

function handleCheckout() {
  if (cartStore.items.length === 0) {
    return
  }
  showCheckout.value = true
}

function handlePlaceOrder() {
  const order = {
    id: `ORD-${Date.now()}`,
    items: cartStore.items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    total: cartStore.totalPrice,
    paymentMethod: paymentMethod.value,
    status: paymentMethod.value === 'cash' ? 'Chờ xác nhận' : 'Đã thanh toán',
    createdAt: new Date().toISOString(),
  }

  const orders = JSON.parse(localStorage.getItem('orders') || '[]')
  orders.push(order)
  localStorage.setItem('orders', JSON.stringify(orders))

  orderPlaced.value = true
  cartStore.clearCart()
  
  setTimeout(() => {
    orderPlaced.value = false
    showCheckout.value = false
  }, 3000)
}

function removeItem(productId: string) {
  cartStore.removeFromCart(productId)
}

function decreaseQuantity(productId: string) {
  const item = cartStore.items.find(i => i.id === productId)
  if (item && item.quantity > 1) {
    cartStore.updateQuantity(productId, item.quantity - 1)
  }
}

function increaseQuantity(productId: string) {
  const item = cartStore.items.find(i => i.id === productId)
  if (item && item.quantity < item.stock) {
    cartStore.updateQuantity(productId, item.quantity + 1)
  }
}

function handleViewHome() {
  router.push('/user/home')
}

function handleViewOrders() {
  router.push('/user/orders')
}

function handleLogout() {
  localStorage.removeItem('isAuthenticated')
  localStorage.removeItem('user')
  router.push('/')
}

onMounted(() => {
  const user = localStorage.getItem('user')
  if (user) {
    currentUser.value = JSON.parse(user)
  }
})
</script>

<template>
  <div class="cart-wrapper">
    <!-- Header -->
    <header class="header">
      <div class="header-top">
        <div class="logo-section">
          <h1 class="logo">🛍️ SHOP</h1>
          <span class="tagline">Cửa hàng online</span>
        </div>

        <div class="page-title">
          🛒 Giỏ hàng
        </div>

        <div class="header-actions">
          <div class="user-menu-wrapper">
            <button @click="showUserMenu = !showUserMenu" class="user-btn">
              👤 {{ currentUser?.fullName || 'Người dùng' }}
            </button>
            <div v-if="showUserMenu" class="user-dropdown">
              <a href="#" @click.prevent="handleViewHome" class="dropdown-item">Trang chủ</a>
              <a href="#" @click.prevent="handleViewOrders" class="dropdown-item">Đơn hàng của tôi</a>
              <a href="#" @click.prevent="handleLogout" class="dropdown-item logout">Đăng xuất</a>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div v-if="orderPlaced" class="success-message">
        ✅ Đặt hàng thành công! Đơn hàng sẽ được xác nhận trong vài phút.
      </div>

      <div v-if="cartStore.items.length === 0 && !showCheckout" class="empty-cart">
        <p class="empty-icon">🛒</p>
        <p class="empty-text">Giỏ hàng của bạn trống</p>
        <router-link to="/user/home" class="btn-continue">
          Tiếp tục mua sắm
        </router-link>
      </div>

      <div v-else-if="!showCheckout" class="cart-content">
        <div class="cart-items">
          <h2>Giỏ hàng của bạn ({{ cartStore.totalItems }} sản phẩm)</h2>
          <div class="items-list">
            <div v-for="item in cartStore.items" :key="item.id" class="cart-item">
              <div class="item-info">
                <h4>{{ item.name }}</h4>
                <p class="item-category">{{ item.category }}</p>
                <p class="item-price">{{ formatCurrency(item.price) }}/cái</p>
              </div>

              <div class="item-quantity">
                <button @click="decreaseQuantity(item.id)" class="qty-btn">−</button>
                <input v-model.number="item.quantity" type="number" class="qty-input" min="1" />
                <button @click="increaseQuantity(item.id)" class="qty-btn">+</button>
              </div>

              <div class="item-total">
                {{ formatCurrency(item.price * item.quantity) }}
              </div>

              <button @click="removeItem(item.id)" class="btn-remove">🗑️</button>
            </div>
          </div>
        </div>

        <div class="cart-summary">
          <div class="summary-card">
            <h3>Tổng kết</h3>
            <div class="summary-row">
              <span>Tổng sản phẩm:</span>
              <strong>{{ cartStore.totalItems }}</strong>
            </div>
            <div class="summary-row">
              <span>Tổng tiền:</span>
              <strong class="total-price">{{ formatCurrency(cartStore.totalPrice) }}</strong>
            </div>

            <button @click="handleCheckout" class="btn-checkout">
              Tiến hành thanh toán
            </button>
          </div>
        </div>
      </div>

      <!-- Checkout Modal -->
      <div v-if="showCheckout" class="checkout-modal" @click.self="showCheckout = false">
        <div class="modal-overlay"></div>
        <div class="modal-content" @click.stop>
          <button @click="showCheckout = false" class="btn-close">✕</button>
          
          <h2>Xác nhận đơn hàng</h2>

          <div class="checkout-section">
            <h3>Thông tin sản phẩm</h3>
            <div class="checkout-items">
              <div v-for="item in cartStore.items" :key="item.id" class="checkout-item">
                <div class="item-detail">
                  <strong>{{ item.name }}</strong>
                  <span class="qty">x{{ item.quantity }}</span>
                </div>
                <div class="item-price">{{ formatCurrency(item.price * item.quantity) }}</div>
              </div>
            </div>
          </div>

          <div class="checkout-section">
            <h3>Phương thức thanh toán</h3>
            <div class="payment-options">
              <label class="payment-option">
                <input
                  v-model="paymentMethod"
                  type="radio"
                  value="cash"
                />
                <span>💵 Thanh toán khi giao hàng (COD)</span>
              </label>
              <label class="payment-option">
                <input
                  v-model="paymentMethod"
                  type="radio"
                  value="online"
                />
                <span>💳 Thanh toán trực tuyến</span>
              </label>
            </div>
          </div>

          <div class="checkout-section">
            <h3>Tổng tiền</h3>
            <div class="final-total">
              {{ formatCurrency(cartStore.totalPrice) }}
            </div>
          </div>

          <div class="checkout-actions">
            <button @click="showCheckout = false" class="btn-cancel">
              Hủy
            </button>
            <button @click="handlePlaceOrder" class="btn-place-order">
              Đặt hàng
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.cart-wrapper {
  background: #f5f5f5;
  min-height: 100vh;
}

/* Header */
.header {
  background: linear-gradient(135deg, #ffd000 0%, #ffb800 100%);
  padding: 15px 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1a1a1a;
  margin: 0;
  white-space: nowrap;
}

.tagline {
  font-size: 0.8rem;
  color: #666;
  white-space: nowrap;
}

.page-title {
  flex: 1;
  text-align: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: #1a1a1a;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-menu-wrapper {
  position: relative;
}

.user-btn {
  padding: 10px 16px;
  background: white;
  color: #1a1a1a;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.user-btn:hover {
  background: #f0f0f0;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  min-width: 150px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  margin-top: 5px;
}

.dropdown-item {
  display: block;
  padding: 12px 16px;
  color: #333;
  text-decoration: none;
  border-bottom: 1px solid #eee;
  transition: background 0.3s;
  font-size: 14px;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #f5f5f5;
}

.dropdown-item.logout:hover {
  background: #fee;
  color: #c00;
}

/* Main Content */
.main-content {
  padding: 30px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.success-message {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 500;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
  background: white;
  border-radius: 8px;
  padding: 40px;
}

.empty-icon {
  font-size: 64px;
}

.empty-text {
  font-size: 18px;
  color: #666;
  margin: 0;
}

.btn-continue {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s;
  display: inline-block;
}

.btn-continue:hover {
  opacity: 0.9;
}

.cart-content {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 30px;
}

.cart-items {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.cart-items h2 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-category {
  margin: 0 0 4px 0;
  font-size: 12px;
  color: #999;
}

.item-price {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #d63031;
}

.item-quantity {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 4px;
}

.qty-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.qty-btn:hover {
  color: #333;
}

.qty-input {
  width: 40px;
  border: none;
  text-align: center;
  font-size: 14px;
  outline: none;
}

.item-total {
  min-width: 100px;
  text-align: right;
  font-weight: 600;
  color: #333;
}

.btn-remove {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  transition: all 0.2s;
}

.btn-remove:hover {
  opacity: 0.7;
}

.cart-summary {
  height: fit-content;
}

.summary-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  position: sticky;
  top: 30px;
}

.summary-card h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
  color: #666;
}

.summary-row strong {
  color: #333;
}

.total-price {
  font-size: 18px;
  color: #d63031;
}

.btn-checkout {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  margin-top: 20px;
  transition: all 0.2s;
}

.btn-checkout:hover {
  opacity: 0.9;
}

/* Checkout Modal */
.checkout-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 8px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.btn-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.modal-content h2 {
  margin: 0 0 24px 0;
  font-size: 20px;
  color: #333;
}

.checkout-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.checkout-section:last-of-type {
  border-bottom: none;
}

.checkout-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
}

.checkout-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkout-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.item-detail {
  display: flex;
  gap: 8px;
  align-items: center;
}

.item-detail strong {
  color: #333;
}

.qty {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: #666;
}

.payment-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.payment-option:hover {
  background: #f0f0f0;
}

.payment-option input[type='radio'] {
  cursor: pointer;
}

.payment-option span {
  font-size: 14px;
  color: #333;
}

.final-total {
  font-size: 24px;
  font-weight: 700;
  color: #d63031;
  text-align: center;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 6px;
}

.checkout-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  background: #e0e0e0;
  color: #333;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #d0d0d0;
}

.btn-place-order {
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-place-order:hover {
  opacity: 0.9;
}

@media (max-width: 768px) {
  .header-top {
    flex-direction: column;
  }

  .page-title {
    order: 2;
    margin-top: 10px;
  }

  .main-content {
    padding: 20px 15px;
  }

  .cart-content {
    grid-template-columns: 1fr;
  }

  .summary-card {
    position: static;
  }

  .modal-content {
    width: 95%;
    max-width: 100%;
    padding: 20px;
  }
}
</style>
