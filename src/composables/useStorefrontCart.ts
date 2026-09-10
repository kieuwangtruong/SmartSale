import { computed, ref, watch } from 'vue'
import type { Product, ProductVariant, ProductVariantColor } from '../services/productApi'
import { getTierConfig, getTierLabel } from '../services/customerTier'
import { useAuthStore } from '../stores/authStore'

export interface CartLine {
  product: Product
  variant: ProductVariant
  color: ProductVariantColor
  quantity: number
}

const CART_STORAGE_KEY = 'storefront-cart'

export function useStorefrontCart() {
  const auth = useAuthStore()
  const cart = ref<CartLine[]>([])
  const showCart = ref(false)
  const animateCart = ref(false)

  function loadCart() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        cart.value = JSON.parse(stored)
      }
    } catch {
      cart.value = []
    }
  }

  function persistCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart.value))
  }

  watch(cart, () => {
    persistCart()
  }, { deep: true })

  // Initialize cart
  loadCart()

  const cartTotalQuantity = computed(() =>
    cart.value.reduce((total, line) => total + line.quantity, 0),
  )

  const cartSubtotal = computed(() =>
    cart.value.reduce((sum, line) => {
      const unitPrice = line.product.salePrice ?? line.product.sellingPrice
      return sum + unitPrice * line.quantity
    }, 0),
  )

  const customerTotalSpent = computed(() => {
    if (!auth.isAuthenticated || auth.user?.role !== 'Customer') return 0
    return auth.user?.totalSpent ?? 0
  })

  const tierConfig = computed(() => getTierConfig(customerTotalSpent.value))
  const tierLabel = computed(() => getTierLabel(tierConfig.value.tier))

  const vipTierDiscountAmount = computed(() => {
    if (!auth.isAuthenticated || auth.user?.role !== 'Customer') return 0
    const percent = tierConfig.value.discountPercent || 0
    if (percent <= 0) return 0
    return Math.round((cartSubtotal.value * percent) / 100)
  })

  const cartFinalTotal = computed(() => {
    return Math.max(0, cartSubtotal.value - vipTierDiscountAmount.value)
  })

  function addToCart(
    product: Product,
    variant: ProductVariant,
    color: ProductVariantColor,
    quantity: number,
  ) {
    const existingIndex = cart.value.findIndex(
      (line) =>
        line.product.id === product.id &&
        line.variant.id === variant.id &&
        line.color.id === color.id,
    )

    const availableStock = Math.min(
      product.quantity,
      Math.min(variant.quantity, color.quantity),
    )

    if (existingIndex >= 0 && cart.value[existingIndex]) {
      const line = cart.value[existingIndex]
      const newQty = line.quantity + quantity
      line.quantity = Math.min(newQty, availableStock)
    } else {
      cart.value.push({
        product,
        variant,
        color,
        quantity: Math.min(quantity, availableStock),
      })
    }

    animateCart.value = true
    setTimeout(() => {
      animateCart.value = false
    }, 600)
  }

  function quickAddToCart(product: Product) {
    const firstVariant: ProductVariant =
      product.variants.find((v) => v.isActive && v.quantity > 0) ??
      product.variants[0] ?? {
        id: 0,
        productId: product.id,
        name: 'Tiêu chuẩn',
        originalPrice: product.originalPrice,
        sellingPrice: product.sellingPrice,
        salePrice: product.salePrice,
        quantity: product.quantity,
        reserveStock: product.reserveStock,
        sku: `SS-${product.id}`,
        isActive: true,
        colors: [],
      }

    const firstColor =
      firstVariant.colors?.find((c) => c.isActive && c.quantity > 0) ??
      firstVariant.colors?.[0] ?? {
        id: 0,
        variantId: firstVariant.id,
        name: 'Mặc định',
        colorCode: '#0f172a',
        quantity: firstVariant.quantity || product.quantity,
        isActive: true,
        images: [],
      }

    addToCart(product, firstVariant, firstColor, 1)
  }

  function updateQuantity(index: number, quantity: number) {
    if (index < 0 || index >= cart.value.length) return
    const line = cart.value[index]
    if (!line) return
    if (quantity <= 0) {
      removeFromCart(index)
      return
    }
    const maxStock = Math.min(
      line.product.quantity,
      Math.min(line.variant.quantity, line.color.quantity),
    )
    line.quantity = Math.min(quantity, maxStock)
  }

  function removeFromCart(index: number) {
    if (index >= 0 && index < cart.value.length) {
      cart.value.splice(index, 1)
    }
  }

  function clearCart() {
    cart.value = []
    persistCart()
  }

  return {
    cart,
    showCart,
    animateCart,
    cartTotalQuantity,
    cartSubtotal,
    customerTotalSpent,
    tierConfig,
    tierLabel,
    vipTierDiscountAmount,
    cartFinalTotal,
    addToCart,
    quickAddToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  }
}
