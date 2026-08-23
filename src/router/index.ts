import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { getSession, type UserRole } from '../services/apiClient'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    customerPage?: boolean
    adminLogin?: boolean
    roles?: UserRole[]
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'storefront',
    component: () => import('../views/StorefrontView.vue'),
    meta: { public: true },
  },
  {
    path: '/login/admin',
    name: 'admin-login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true, adminLogin: true, loginRole: 'Admin' },
  },
  {
    path: '/login/staff',
    name: 'staff-login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true, adminLogin: true, loginRole: 'SalesStaff' },
  },
  {
    path: '/login/warehouse',
    name: 'warehouse-login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true, adminLogin: true, loginRole: 'WarehouseKeeper' },
  },
  {
    path: '/admin',
    redirect: '/login/admin',
  },
  {
    path: '/login',
    redirect: '/login/admin',
  },
  {
    path: '/customer-login',
    name: 'customer-login',
    component: () => import('../views/CustomerAuthView.vue'),
    meta: { public: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/AdminDashboard.vue'),
    meta: { roles: ['Admin'] },
  },
  {
    path: '/admin/analytics',
    name: 'product-analytics',
    component: () => import('../modules/analytics/pages/ProductAnalyticsView.vue'),
    meta: { roles: ['Admin'] },
  },
  {
    path: '/analytics',
    redirect: '/admin/analytics',
  },
  {
    path: '/customer',
    name: 'customer-profile',
    component: () => import('../views/CustomerProfileView.vue'),
    meta: { roles: ['Customer'], customerPage: true },
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('../views/CheckoutView.vue'),
    meta: { roles: ['Customer'], customerPage: true },
  },
  {
    path: '/employees',
    name: 'employees',
    component: () => import('../views/EmployeesView.vue'),
    meta: { roles: ['Admin'] },
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('../views/UsersView.vue'),
    meta: { roles: ['Admin'] },
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('../views/AdminOrdersView.vue'),
    meta: { roles: ['Admin', 'SalesStaff'] },
  },
  {
    path: '/promotions',
    name: 'promotions',
    component: () => import('../views/PromotionsView.vue'),
    meta: { roles: ['Admin', 'SalesStaff'] },
  },
  {
    path: '/customers',
    name: 'customers',
    component: () => import('../views/CustomersView.vue'),
    meta: { roles: ['Admin', 'SalesStaff'] },
  },
  {
    path: '/suppliers',
    name: 'suppliers',
    component: () => import('../views/SuppliersView.vue'),
    meta: { roles: ['Admin', 'WarehouseKeeper'] },
  },
  {
    path: '/payment/success',
    name: 'payment-success',
    component: () => import('../views/PaymentResultView.vue'),
    meta: { public: true },
  },
  {
    path: '/payment/cancelled',
    name: 'payment-cancelled',
    component: () => import('../views/PaymentCancelledView.vue'),
    meta: { public: true },
  },
  {
    path: '/payment/expired',
    name: 'payment-expired',
    component: () => import('../views/PaymentResultView.vue'),
    meta: { public: true },
  },
  {
    path: '/payment/failed',
    name: 'payment-failed',
    component: () => import('../views/PaymentResultView.vue'),
    meta: { public: true },
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('../views/ProductsView.vue'),
    meta: { roles: ['Admin', 'WarehouseKeeper', 'SalesStaff'] },
  },
  {
    path: '/inventory',
    name: 'inventory',
    component: () => import('../views/WarehouseManagerView.vue'),
    meta: { roles: ['Admin', 'WarehouseKeeper'] },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

function homeForRole(role: UserRole) {
  if (role === 'Admin') return '/dashboard'
  if (role === 'WarehouseKeeper') return '/inventory'
  if (role === 'Customer') return '/'
  return '/orders'
}

router.beforeEach((to) => {
  const session = getSession()

  if (to.meta.public) {
    return to.meta.adminLogin && session && session.user.role !== 'Customer'
      ? homeForRole(session.user.role)
      : true
  }

  if (!session) {
    if (to.path.includes('/checkout') || to.path.includes('/customer')) {
      return { name: 'customer-login', query: { redirect: to.fullPath } }
    }
    if (to.path.includes('/inventory') || to.path.includes('/products') || to.path.includes('/suppliers')) {
      return { name: 'warehouse-login', query: { redirect: to.fullPath } }
    }
    if (to.path.includes('/orders') || to.path.includes('/customers')) {
      return { name: 'staff-login', query: { redirect: to.fullPath } }
    }
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }

  if (to.meta.roles && !to.meta.roles.includes(session.user.role)) {
    return homeForRole(session.user.role)
  }

  return true
})

export { homeForRole }
export default router
