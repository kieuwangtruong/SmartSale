import type { AnalyticsEvent, StandardEventName } from '../types'
import { getSession } from '../../../services/apiClient'
import { ref } from 'vue'

const SESSION_STORAGE_KEY = 'smartsale_analytics_session'
const EVENT_QUEUE_STORAGE_KEY = 'smartsale_analytics_event_queue'
const DEDUP_CACHE_KEY = 'smartsale_analytics_dedup_cache'

export const liveEventLog = ref<AnalyticsEvent[]>([])

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getOrCreateSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${generateUUID().substring(0, 8)}`
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId)
    }
    return sessionId
  } catch {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

class EventTracker {
  private queue: AnalyticsEvent[] = []
  private history: AnalyticsEvent[] = []
  private dedupCache: Set<string> = new Set()
  private isProcessing = false
  private healthStats = {
    totalTracked: 0,
    duplicatesDropped: 0,
    failedUploads: 0,
    lastEventTime: null as string | null,
  }

  constructor() {
    this.loadQueueFromStorage()
    this.loadDedupCache()
  }

  private loadQueueFromStorage() {
    try {
      const raw = localStorage.getItem(EVENT_QUEUE_STORAGE_KEY)
      if (raw) {
        this.queue = JSON.parse(raw)
        this.history = [...this.queue]
        liveEventLog.value = [...this.history]
      }
    } catch {
      this.queue = []
      this.history = []
    }
  }

  private saveQueueToStorage() {
    try {
      localStorage.setItem(EVENT_QUEUE_STORAGE_KEY, JSON.stringify(this.history.slice(-500)))
    } catch {
      /* fail silent */
    }
  }

  private loadDedupCache() {
    try {
      const raw = sessionStorage.getItem(DEDUP_CACHE_KEY)
      if (raw) {
        const arr = JSON.parse(raw)
        this.dedupCache = new Set(arr)
      }
    } catch {
      this.dedupCache = new Set()
    }
  }

  private saveDedupCache() {
    try {
      const arr = Array.from(this.dedupCache).slice(-200)
      sessionStorage.setItem(DEDUP_CACHE_KEY, JSON.stringify(arr))
    } catch {
      /* fail silent */
    }
  }

  public track(
    eventName: StandardEventName | string,
    properties: Record<string, any> = {},
    context: {
      orderId?: number | null
      productId?: number | null
      categoryId?: number | null
      customerId?: number | null
      eventId?: string
    } = {},
  ): string {
    const eventId = context.eventId || generateUUID()

    // Deduplication check
    if (this.dedupCache.has(eventId)) {
      this.healthStats.duplicatesDropped++
      return eventId
    }

    try {
      const session = getSession()
      const authUser = session?.user

      const event: AnalyticsEvent = {
        eventId,
        eventName,
        userId: authUser?.id ?? null,
        customerId: context.customerId ?? (authUser?.role === 'Customer' ? authUser.id : null),
        sessionId: getOrCreateSessionId(),
        anonymousId: getOrCreateSessionId(),
        orderId: context.orderId ?? properties.orderId ?? null,
        productId: context.productId ?? properties.productId ?? null,
        categoryId: context.categoryId ?? properties.categoryId ?? null,
        eventTime: new Date().toISOString(),
        source: 'web',
        properties: this.sanitizeProperties(properties),
      }

      this.queue.push(event)
      this.history.push(event)
      liveEventLog.value.unshift(event)

      this.dedupCache.add(eventId)
      this.healthStats.totalTracked++
      this.healthStats.lastEventTime = event.eventTime

      this.saveQueueToStorage()
      this.saveDedupCache()

      // Flush queue in background asynchronously
      this.scheduleFlush()
    } catch (err) {
      console.warn('[Analytics EventTracker] Error recording event silently:', err)
    }

    return eventId
  }

  private sanitizeProperties(props: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    const sensitiveKeys = ['password', 'token', 'secret', 'cccd', 'auth']

    for (const [key, value] of Object.entries(props)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        continue
      }
      sanitized[key] = value
    }
    return sanitized
  }

  private scheduleFlush() {
    if (this.isProcessing) return
    setTimeout(() => {
      this.flushQueue().catch(() => {})
    }, 500)
  }

  public async flushQueue(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) return

    this.isProcessing = true
    const batch = this.queue.slice(0, 50)

    try {
      this.queue = this.queue.slice(batch.length)
    } catch {
      this.healthStats.failedUploads++
    } finally {
      this.isProcessing = false
    }
  }

  public getQueueLength(): number {
    return this.queue.length
  }

  public getHealthStats() {
    return {
      ...this.healthStats,
      queuePendingCount: this.queue.length,
      dedupCacheSize: this.dedupCache.size,
    }
  }

  public getTrackedEvents(): AnalyticsEvent[] {
    return [...this.history]
  }

  // Convenience helper methods
  public trackProductView(product: { id: number; name: string; sellingPrice: number; categoryId?: number }) {
    this.track('product_viewed', {
      productName: product.name,
      sellingPrice: product.sellingPrice,
    }, { productId: product.id, categoryId: product.categoryId })
  }

  public trackAddToCart(product: { id: number; name: string; sellingPrice: number }, quantity: number) {
    this.track('product_added_to_cart', {
      productName: product.name,
      sellingPrice: product.sellingPrice,
      quantity,
      subtotal: product.sellingPrice * quantity,
    }, { productId: product.id })
  }

  public trackCheckoutStarted(totalAmount: number, itemCount: number) {
    this.track('checkout_started', { totalAmount, itemCount })
  }

  public trackOrderCreated(orderId: number, total: number, paymentMethod: string) {
    this.track('order_created', { total, paymentMethod }, { orderId })
  }

  public trackPaymentCompleted(orderId: number, amount: number, paymentMethod: string) {
    this.track('payment_completed', { amount, paymentMethod }, { orderId })
  }
}

export const eventTracker = new EventTracker()
