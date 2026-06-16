import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { getSession, type UserRole } from '../services/apiClient'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
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
    path: '/admin',
    name: 'admin-login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true, adminLogin: true },
  },
  {
    path: '/login',
    redirect: '/admin',
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
    path: '/customer',
    name: 'customer-profile',
    component: () => import('../views/CustomerProfileView.vue'),
    meta: { roles: ['Customer'] },
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
    meta: { roles: ['Admin', 'WarehouseKeeper'] },
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
    return { name: 'admin-login', query: { redirect: to.fullPath } }
  }

  if (to.meta.roles && !to.meta.roles.includes(session.user.role)) {
    return homeForRole(session.user.role)
  }

  return true
})

export { homeForRole }
export default router
