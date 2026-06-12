import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/AdminDashboard.vue'),
    },
    {
      path: '/sales-ui',
      name: 'sales-ui',
      component: () => import('../views/SalesUIView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UsersView.vue'),
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/ProductsView.vue'),
    },
    {
      path: '/orders-admin',
      name: 'orders-admin',
      component: () => import('../views/AdminOrdersView.vue'),
    },
    {
      path: '/user/home',
      name: 'user-home',
      component: () => import('../views/UserHomeView.vue'),
    },
    {
      path: '/user/cart',
      name: 'user-cart',
      component: () => import('../views/UserCartView.vue'),
    },
    {
      path: '/user/orders',
      name: 'user-orders',
      component: () => import('../views/UserOrdersView.vue'),
    },
    {
      path: '/warehouse-manager',
      name: 'warehouse-manager',
      component: () => import('../views/WarehouseManagerView.vue'),
    },
    {
      path: '/sales-officer',
      name: 'sales-officer',
      component: () => import('../views/SalesOfficerView.vue'),
    },
  ],
})

export default router
