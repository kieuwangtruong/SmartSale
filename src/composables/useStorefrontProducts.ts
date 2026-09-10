import { computed, ref } from 'vue'
import { getProducts, type Product } from '../services/productApi'
import { translateProductName } from '../services/productTranslations'
import { useLanguage } from '../services/i18n'

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name'

export function useStorefrontProducts() {
  const { t } = useLanguage()
  const products = ref<Product[]>([])
  const loading = ref(true)
  const error = ref('')
  const search = ref('')
  const searchInput = ref('')
  const showSearchDropdown = ref(false)
  const category = ref('')
  const sort = ref<SortOption>('featured')

  async function loadProducts() {
    loading.value = true
    error.value = ''
    try {
      const data = await getProducts()
      products.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('Không thể tải sản phẩm.', 'Unable to load products.')
    } finally {
      loading.value = false
    }
  }

  function productMatchesSearch(product: Product, query: string): boolean {
    if (!query || !query.trim()) return true
    const q = query.toLowerCase().trim()
    const nameVi = (product.name || '').toLowerCase()
    const nameEn = translateProductName(product).toLowerCase()
    const desc = (product.description || '').toLowerCase()
    const idStr = String(product.id)
    return nameVi.includes(q) || nameEn.includes(q) || desc.includes(q) || idStr.includes(q)
  }

  const searchSuggestions = computed(() => {
    const q = searchInput.value.trim()
    if (!q || q.length < 2) return []
    return products.value
      .filter((p) => productMatchesSearch(p, q))
      .slice(0, 6)
  })

  const categories = computed(() => {
    const set = new Set<string>()
    products.value.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName)
    })
    return Array.from(set)
  })

  const filteredProducts = computed(() => {
    let list = [...products.value]

    if (category.value) {
      list = list.filter((p) => p.categoryName === category.value)
    }

    if (search.value) {
      list = list.filter((p) => productMatchesSearch(p, search.value))
    }

    if (sort.value === 'price-asc') {
      list.sort((a, b) => (a.salePrice ?? a.sellingPrice) - (b.salePrice ?? b.sellingPrice))
    } else if (sort.value === 'price-desc') {
      list.sort((a, b) => (b.salePrice ?? b.sellingPrice) - (a.salePrice ?? a.sellingPrice))
    } else if (sort.value === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    }

    return list
  })

  return {
    products,
    loading,
    error,
    search,
    searchInput,
    showSearchDropdown,
    category,
    sort,
    categories,
    searchSuggestions,
    filteredProducts,
    loadProducts,
    productMatchesSearch,
  }
}
