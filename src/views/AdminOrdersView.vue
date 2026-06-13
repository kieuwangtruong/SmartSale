<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import {
  createOrder,
  deleteOrder,
  formatCurrency,
  getCustomers,
  getOrders,
  ORDER_STATUSES,
  updateOrderStatus,
  type Customer,
  type Order,
  type OrderStatus,
} from '../services/orderApi'
import { getProducts, type Product } from '../services/productApi'

const auth = useAuthStore()
const orders = ref<Order[]>([])
const products = ref<Product[]>([])
const customers = ref<Customer[]>([])
const loading = ref(false)
const error = ref('')
const filter = ref<'All' | OrderStatus>('All')
const form = reactive({
  customerId: null as number | null,
  discountAmount: 0,
  amountPaid: 0,
  items: [{ productId: 0, quantity: 1 }],
})

const filtered = computed(() => filter.value === 'All' ? orders.value : orders.value.filter((o) => o.status === filter.value))

async function load() {
  loading.value = true
  error.value = ''
  try {
    ;[orders.value, products.value, customers.value] = await Promise.all([
      getOrders(), getProducts(), getCustomers(),
    ])
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tải dữ liệu.' }
  finally { loading.value = false }
}

function addItem() { form.items.push({ productId: 0, quantity: 1 }) }
function removeItem(index: number) { if (form.items.length > 1) form.items.splice(index, 1) }

async function submit() {
  const items = form.items.filter((item) => item.productId > 0 && item.quantity > 0)
  if (!auth.user || !items.length) { error.value = 'Vui lòng chọn ít nhất một sản phẩm.'; return }
  try {
    await createOrder({
      userId: auth.user.id, customerId: form.customerId,
      discountAmount: form.discountAmount, amountPaid: form.amountPaid, orderItems: items,
    })
    Object.assign(form, { customerId: null, discountAmount: 0, amountPaid: 0, items: [{ productId: 0, quantity: 1 }] })
    await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Không thể tạo đơn.' }
}

async function changeStatus(order: Order, status: OrderStatus) {
  try { await updateOrderStatus(order.id, status); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể cập nhật trạng thái.' }
}

async function remove(order: Order) {
  if (!confirm(`Xóa đơn #${order.id}?`)) return
  try { await deleteOrder(order.id); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Không thể xóa đơn.' }
}

onMounted(load)
</script>

<template>
  <section class="page">
    <div class="page-head"><div><h2>Đơn bán hàng</h2><p>Tạo đơn, giữ tồn kho và theo dõi công nợ.</p></div>
      <select v-model="filter"><option value="All">Tất cả</option><option v-for="s in ORDER_STATUSES" :key="s">{{ s }}</option></select>
    </div>
    <p v-if="error" class="alert error">{{ error }}</p>
    <div class="grid-form">
      <form class="panel form" @submit.prevent="submit">
        <h3>Tạo đơn mới</h3>
        <label>Khách hàng<select v-model="form.customerId"><option :value="null">Khách lẻ</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.fullName }} - {{ c.phone }}</option></select></label>
        <label>Giảm giá<input v-model.number="form.discountAmount" type="number" min="0" /></label>
        <label>Đã thanh toán<input v-model.number="form.amountPaid" type="number" min="0" /></label>
        <div v-for="(item, index) in form.items" :key="index" class="item-row">
          <select v-model.number="item.productId" required><option :value="0">Chọn sản phẩm</option><option v-for="p in products" :key="p.id" :value="p.id" :disabled="p.quantity <= 0">{{ p.name }} ({{ p.quantity }})</option></select>
          <input v-model.number="item.quantity" type="number" min="1" />
          <button type="button" @click="removeItem(index)">Xóa</button>
        </div>
        <div class="actions"><button type="button" @click="addItem">Thêm dòng</button><button class="primary">Tạo đơn</button></div>
      </form>

      <article class="panel table-wrap">
        <p v-if="loading">Đang tải...</p>
        <table v-else>
          <thead><tr><th>Đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Công nợ</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody><tr v-for="order in filtered" :key="order.id">
            <td>#{{ order.id }}<small>{{ order.orderItems.map((i) => `${i.productName} x${i.quantity}`).join(', ') }}</small></td>
            <td>{{ order.customerName || 'Khách lẻ' }}</td><td>{{ formatCurrency(order.total) }}</td><td>{{ formatCurrency(order.debtAmount) }}</td>
            <td><select :value="order.status" @change="changeStatus(order, ($event.target as HTMLSelectElement).value as OrderStatus)"><option v-for="s in ORDER_STATUSES" :key="s">{{ s }}</option></select></td>
            <td><button class="danger" @click="remove(order)">Xóa</button></td>
          </tr></tbody>
        </table>
      </article>
    </div>
  </section>
</template>
