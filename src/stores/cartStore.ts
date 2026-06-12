import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  stock: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const totalItems = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
  const totalPrice = computed(() => items.value.reduce((sum, item) => sum + item.price * item.quantity, 0))

  function addToCart(product: Omit<CartItem, 'quantity'>) {
    const existingItem = items.value.find(item => item.id === product.id)
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        existingItem.quantity++
      }
    } else {
      items.value.push({ ...product, quantity: 1 })
    }
  }

  function removeFromCart(productId: string) {
    items.value = items.value.filter(item => item.id !== productId)
  }

  function updateQuantity(productId: string, quantity: number) {
    const item = items.value.find(i => i.id === productId)
    if (item && quantity > 0 && quantity <= item.stock) {
      item.quantity = quantity
    }
  }

  function clearCart() {
    items.value = []
  }

  return {
    items,
    totalItems,
    totalPrice,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  }
})
