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

  function removeVietnameseTones(str: string): string {
    if (!str) return ''
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim()
  }

  function productMatchesSearch(product: Product, query: string): boolean {
    if (!query || !query.trim()) return true
    const normQ = removeVietnameseTones(query)
    const nameVi = removeVietnameseTones(product.name || '')
    const nameEn = removeVietnameseTones(translateProductName(product) || '')
    const cat = removeVietnameseTones(product.categoryName || '')
    const desc = removeVietnameseTones(product.description || '')
    const idStr = String(product.id)
    return nameVi.includes(normQ) || nameEn.includes(normQ) || cat.includes(normQ) || desc.includes(normQ) || idStr === normQ
  }

  const searchSuggestions = computed(() => {
    const q = searchInput.value.trim()
    if (!q) return []
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
