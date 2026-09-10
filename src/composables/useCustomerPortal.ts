import { computed, ref } from 'vue'
import {
  getMyPurchases,
  requestOrderCancellation,
  getOrderStatusLabel,
  type Order,
  type OrderStatus,
} from '../services/orderApi'
import { getMyProfile, updateUser, type UserDto } from '../services/userApi'
import { saveSession } from '../services/apiClient'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'

export type OrderTab = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled'

export interface TimelineStep {
  key: string
  label: string
  description: string
  done: boolean
  active: boolean
}

export function useCustomerPortal() {
  const auth = useAuthStore()
  const { t } = useLanguage()

  const customerProfile = ref<UserDto | null>(auth.user)
  const customerOrders = ref<Order[]>([])
  const customerPanelLoading = ref(false)
  const customerPanelError = ref('')
  const customerPanelLoaded = ref(false)

  const showCustomerPanel = ref(false)
  const showProfileModal = ref(false)
  const showOrdersModal = ref(false)
  const selectedOrderId = ref<number | null>(null)
  const activeOrderTab = ref<OrderTab>('pending')
  const ordersSearchQuery = ref('')

  const cancelOrderModalShow = ref(false)
  const cancelOrderActive = ref<Order | null>(null)
  const cancelReasonText = ref('')
  const selectedCancelReason = ref('thay_doi_y_dinh')

  const cancelReasonOptions = computed(() => [
    { value: 'thay_doi_y_dinh', label: t('Thay đổi ý định mua hàng', 'Change of mind') },
    { value: 'tim_thay_gia_tot_hon', label: t('Tìm thấy sản phẩm có giá tốt hơn', 'Found a better price elsewhere') },
    { value: 'dat_trung_lap', label: t('Đặt trùng đơn / Đặt nhầm sản phẩm', 'Duplicate order / Wrong item selected') },
    { value: 'giao_hang_lau', label: t('Thời gian giao hàng quá lâu', 'Delivery time is too long') },
    { value: 'khac', label: t('Lý do khác', 'Other reason') },
  ])

  const editingAddress = ref('')
  const savingAddress = ref(false)
  const saveAddressError = ref('')
  const saveAddressSuccess = ref(false)

  async function loadCustomerPanel() {
    if (!auth.isAuthenticated || auth.user?.role !== 'Customer') return
    customerPanelLoading.value = true
    customerPanelError.value = ''
    try {
      const [profileData, ordersData] = await Promise.all([
        getMyProfile().catch(() => auth.user),
        getMyPurchases().catch(() => []),
      ])
      if (profileData) customerProfile.value = profileData
      customerOrders.value = ordersData || []
      customerPanelLoaded.value = true
    } catch (err) {
      customerPanelError.value = err instanceof Error ? err.message : t('Không thể tải thông tin khách hàng.', 'Unable to load customer information.')
    } finally {
      customerPanelLoading.value = false
    }
  }

  function statusRank(status: OrderStatus) {
    const ranks: Record<OrderStatus, number> = {
      Pending: 1,
      PendingPayment: 1,
      ProcessingPayment: 1,
      PaymentFailed: 1,
      PaymentCancelled: 1,
      PaymentExpired: 1,
      Paid: 2,
      Processing: 3,
      Shipped: 4,
      Completed: 5,
      Cancelled: 0,
      RefundRequested: 0,
      Refunded: 0,
      RefundRejected: 0,
    }
    return ranks[status] ?? 0
  }

  function getOrderTimeline(order: Order): TimelineStep[] {
    const cancelled = ['Cancelled', 'PaymentCancelled', 'PaymentExpired', 'PaymentFailed', 'RefundRequested', 'Refunded', 'RefundRejected'].includes(order.status)
    const isPayOs = (order.paymentMethod || '').toLowerCase() === 'payos'
    const rank = statusRank(order.status)
    const cashConfirmed = !isPayOs && rank >= 2 && !cancelled

    if (cancelled) {
      return [{
        key: 'cancelled',
        label: getOrderStatusLabel(order.status),
        description: t('Đơn hàng không tiếp tục xử lý ở trạng thái này.', 'The order will not continue processing in this status.'),
        done: true,
        active: true,
      }]
    }

    return [
      {
        key: 'created',
        label: t('Đã đặt hàng', 'Order placed'),
        description: t('Hệ thống đã ghi nhận đơn hàng của bạn.', 'The system has received your order.'),
        done: rank >= 1,
        active: rank === 1 && !cancelled,
      },
      {
        key: 'confirmed',
        label: isPayOs
          ? t('Đã thanh toán', 'Paid')
          : cashConfirmed
            ? t('Đã xác nhận tiền mặt', 'Cash confirmed')
            : t('Chờ nhân viên xác nhận', 'Waiting for staff confirmation'),
        description: isPayOs
          ? t('Đơn chuyển khoản đã thanh toán, không cần xác nhận tiền mặt.', 'Online payment is completed; no cash confirmation is needed.')
          : cashConfirmed
            ? t('Nhân viên bán hàng đã xác nhận khách thanh toán tiền mặt.', 'Sales staff confirmed the cash payment.')
            : t('Nhân viên bán hàng sẽ gọi xác nhận đơn tiền mặt.', 'Sales staff will confirm the cash order.'),
        done: rank >= 2,
        active: rank === 2 && !cancelled,
      },
      {
        key: 'processing',
        label: t('Đang chuẩn bị hàng', 'Preparing order'),
        description: t('Cửa hàng đang đóng gói và chuẩn bị giao hàng.', 'The store is packing and preparing shipment.'),
        done: rank >= 3,
        active: rank === 3 && !cancelled,
      },
      {
        key: 'shipping',
        label: t('Đang giao hàng', 'Shipping'),
        description: t('Đơn hàng đang trên đường giao đến bạn.', 'The order is on its way to you.'),
        done: rank >= 4,
        active: rank === 4 && !cancelled,
      },
      {
        key: 'completed',
        label: t('Hoàn tất', 'Completed'),
        description: t('Đơn hàng đã hoàn tất.', 'The order is completed.'),
        done: rank >= 5,
        active: rank === 5 && !cancelled,
      },
    ]
  }

  const filteredCustomerOrders = computed(() => {
    const query = ordersSearchQuery.value.trim().toLowerCase()
    let list = customerOrders.value

    if (activeOrderTab.value === 'pending') {
      list = list.filter((order) => ['Pending', 'PendingPayment', 'ProcessingPayment', 'Processing'].includes(order.status))
    } else if (activeOrderTab.value === 'paid') {
      list = list.filter((order) => order.status === 'Paid')
    } else if (activeOrderTab.value === 'shipped') {
      list = list.filter((order) => order.status === 'Shipped')
    } else if (activeOrderTab.value === 'completed') {
      list = list.filter((order) => order.status === 'Completed')
    } else if (activeOrderTab.value === 'cancelled') {
      list = list.filter((order) => ['Cancelled', 'PaymentCancelled', 'PaymentExpired', 'PaymentFailed', 'RefundRequested', 'Refunded', 'RefundRejected'].includes(order.status))
    }

    if (query) {
      list = list.filter((order) => {
        const matchesId = String(order.id).toLowerCase().includes(query)
        const matchesProducts = order.orderItems.some((item) =>
          item.productName.toLowerCase().includes(query),
        )
        const statusLabel = getOrderStatusLabel(order.status).toLowerCase()
        const matchesStatus = statusLabel.includes(query)
        return matchesId || matchesProducts || matchesStatus
      })
    }

    return list
  })

  const selectedCustomerOrder = computed(() => {
    if (selectedOrderId.value !== null) {
      const found = customerOrders.value.find((o) => o.id === selectedOrderId.value)
      if (found && filteredCustomerOrders.value.some((o) => o.id === found.id)) return found
    }
    return filteredCustomerOrders.value[0] || null
  })

  function canRequestOrderCancellation(order: Order) {
    const paymentMethod = (order.paymentMethod || 'Cash').toLowerCase()
    if (paymentMethod === 'payos') {
      return ['Paid', 'Processing', 'Shipped', 'Completed'].includes(order.status)
    }
    return ['Pending', 'Processing'].includes(order.status)
  }

  function openCancellationModal(order: Order) {
    cancelOrderActive.value = order
    cancelReasonText.value = ''
    selectedCancelReason.value = 'thay_doi_y_dinh'
    cancelOrderModalShow.value = true
  }

  async function submitCancellation() {
    if (!cancelOrderActive.value) return

    let finalReason = ''
    if (selectedCancelReason.value === 'khac') {
      finalReason = cancelReasonText.value.trim()
    } else {
      const selectedOpt = cancelReasonOptions.value.find((o) => o.value === selectedCancelReason.value)
      finalReason = selectedOpt ? selectedOpt.label : ''
    }

    if (!finalReason) return
    const order = cancelOrderActive.value
    cancelOrderModalShow.value = false

    try {
      const updated = await requestOrderCancellation(order.id, finalReason)
      const index = customerOrders.value.findIndex((item) => item.id === updated.id)
      if (index >= 0) customerOrders.value[index] = updated
      else customerOrders.value.unshift(updated)
      selectedOrderId.value = updated.id
    } catch (exception) {
      customerPanelError.value = exception instanceof Error
        ? exception.message
        : t('Không thể gửi yêu cầu hủy/hoàn tiền.', 'Unable to submit cancellation/refund request.')
    }
  }

  async function handleSaveAddress() {
    if (savingAddress.value) return
    savingAddress.value = true
    saveAddressError.value = ''
    saveAddressSuccess.value = false
    try {
      const userId = customerProfile.value?.id || auth.user?.id
      if (!userId) {
        throw new Error(t('Không tìm thấy thông tin người dùng.', 'User information not found.'))
      }
      try {
        const updated = await updateUser({
          id: userId,
          address: editingAddress.value,
        })
        customerProfile.value = updated
        if (auth.session) {
          auth.session.user = updated
          saveSession(auth.session)
        }
      } catch {
        localStorage.setItem(`customer-address-${userId}`, editingAddress.value)
        if (customerProfile.value) {
          customerProfile.value.address = editingAddress.value
        }
        if (auth.session) {
          auth.session.user.address = editingAddress.value
          saveSession(auth.session)
        }
      }
      saveAddressSuccess.value = true
      setTimeout(() => {
        saveAddressSuccess.value = false
      }, 3000)
    } catch (error: any) {
      saveAddressError.value = error instanceof Error ? error.message : String(error)
    } finally {
      savingAddress.value = false
    }
  }

  return {
    customerProfile,
    customerOrders,
    customerPanelLoading,
    customerPanelError,
    customerPanelLoaded,
    showCustomerPanel,
    showProfileModal,
    showOrdersModal,
    selectedOrderId,
    activeOrderTab,
    ordersSearchQuery,
    cancelOrderModalShow,
    cancelOrderActive,
    cancelReasonText,
    selectedCancelReason,
    cancelReasonOptions,
    editingAddress,
    savingAddress,
    saveAddressError,
    saveAddressSuccess,
    filteredCustomerOrders,
    selectedCustomerOrder,
    loadCustomerPanel,
    getOrderTimeline,
    canRequestOrderCancellation,
    openCancellationModal,
    submitCancellation,
    handleSaveAddress,
  }
}
