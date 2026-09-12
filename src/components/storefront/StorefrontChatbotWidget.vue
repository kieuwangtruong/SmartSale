<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useLanguage } from '../../services/i18n'
import { useVerticalDraggableChat } from '../../utils/useDraggableChat'
import ChatStructuredMessage from '../ChatStructuredMessage.vue'
import {
  getChatSession,
  sendChatMessage,
  endChatSession,
  type ChatAction,
  type ChatMessage,
} from '../../services/chatbotApi'
import type { Product } from '../../services/productApi'

const props = defineProps<{
  products: Product[]
}>()

const emit = defineEmits<{
  (e: 'open-product', productId: number): void
  (e: 'add-to-cart', productId: number): void
}>()

const { t } = useLanguage()

const showChatbot = ref(false)
const isChatExpanded = ref(false)
const storefrontChatWidgetRef = ref<HTMLElement | null>(null)

const {
  isDragging: isChatDragging,
  hasMovedSignificantly: hasChatMovedSignificantly,
  isCustomPositioned: isChatCustomPositioned,
  dragStyle: chatDragStyle,
  startDrag: startChatDrag,
  resetPosition: resetChatPosition,
} = useVerticalDraggableChat(storefrontChatWidgetRef, {
  defaultBottom: 24,
  defaultRight: 24,
  buttonHeight: 56,
  padding: 20,
})

const chatbotLoaded = ref(false)
const chatbotLoading = ref(false)
const chatbotSending = ref(false)
const chatbotError = ref('')
const chatbotInput = ref('')
const chatbotMessages = ref<ChatMessage[]>([])
const chatbotActions = ref<ChatAction[]>([])

const chatbotSuggestions = computed(() => [
  t('Sản phẩm nào đang khuyến mãi?', 'Which products are on sale?'),
  t('Tôi có đơn hàng nào đang xử lý?', 'Do I have any orders being processed?'),
  t('Hạng thành viên của tôi là gì?', 'What is my membership tier?'),
  t('Gợi ý sản phẩm còn hàng dưới 500.000đ', 'Suggest in-stock products under 500,000đ'),
])

function handleStorefrontFabClick() {
  if (hasChatMovedSignificantly.value) return
  toggleChatbot()
}

async function toggleChatbot() {
  showChatbot.value = !showChatbot.value
  if (showChatbot.value && !chatbotLoaded.value) {
    await loadChatbotSession()
  }
}

async function loadChatbotSession() {
  chatbotLoading.value = true
  chatbotError.value = ''
  try {
    const session = await getChatSession()
    chatbotMessages.value = session.messages || []
    chatbotLoaded.value = true
  } catch (err) {
    chatbotError.value = err instanceof Error ? err.message : t('Không thể kết nối trợ lý AI.', 'Unable to connect to AI assistant.')
  } finally {
    chatbotLoading.value = false
  }
}

async function sendChatbotText(textToSend?: string) {
  const text = (textToSend || chatbotInput.value).trim()
  if (!text || chatbotSending.value) return

  chatbotInput.value = ''
  chatbotError.value = ''
  chatbotSending.value = true

  chatbotMessages.value.push({
    role: 'user',
    content: text,
    createdAt: new Date().toISOString(),
  })

  try {
    const response = await sendChatMessage(text)
    if (response.messages?.length) {
      chatbotMessages.value = response.messages
    } else {
      chatbotMessages.value.push({
        role: 'assistant',
        content: response.reply,
        createdAt: new Date().toISOString(),
      })
    }
    chatbotActions.value = response.actions || []
  } catch (err) {
    chatbotError.value = err instanceof Error ? err.message : t('Trợ lý AI chưa thể phản hồi.', 'AI assistant failed to respond.')
  } finally {
    chatbotSending.value = false
  }
}

async function resetChatbotSession() {
  try {
    await endChatSession()
  } catch {
    // ignore
  }
  chatbotMessages.value = []
  chatbotActions.value = []
  chatbotLoaded.value = false
  await loadChatbotSession()
}

function handleChatAction(action: ChatAction) {
  if (action.type === 'open-product') {
    emit('open-product', Number(action.productId))
  } else if (action.type === 'add-to-cart') {
    emit('add-to-cart', Number(action.productId))
  }
}
</script>

<template>
  <section
    ref="storefrontChatWidgetRef"
    class="chatbot-widget"
    :class="{ open: showChatbot, 'is-dragging': isChatDragging, 'is-custom-pos': isChatCustomPositioned }"
    :style="chatDragStyle"
  >
    <button
      class="chatbot-fab"
      type="button"
      :title="t('Kéo lên/xuống để đổi vị trí • Nhấp để mở chat', 'Drag up/down to move • Click to toggle chat')"
      @pointerdown="startChatDrag"
      @mousedown="startChatDrag"
      @touchstart="startChatDrag"
      @click="handleStorefrontFabClick"
    >
      <i :class="showChatbot ? 'pi pi-times' : 'pi pi-comments'" />
    </button>

    <Transition name="chat-slide">
      <aside
        v-if="showChatbot"
        class="chatbot-panel"
        :class="{ 'is-expanded': isChatExpanded }"
      >
        <header
          class="chatbot-head"
          :title="t('Bấm giữ để kéo di chuyển • Nhấp đúp để về vị trí gốc', 'Click & drag to move • Double-click to reset position')"
          @mousedown="startChatDrag"
          @touchstart="startChatDrag"
          @dblclick="resetChatPosition"
        >
          <div class="chatbot-head-left">
            <div class="chatbot-drag-handle" :title="t('Kéo để di chuyển', 'Drag to move')">
              <span class="drag-dots">⋮⋮</span>
            </div>
            <div class="chatbot-avatar-ring">
              <span>🤖</span>
            </div>
            <div>
              <div class="chatbot-title-row">
                <strong>SmartSale AI</strong>
                <span class="chatbot-badge">{{ t('Mua sắm', 'Shopping') }}</span>
              </div>
              <small class="chatbot-sub">
                <span class="chatbot-online-dot"></span>
                {{ t('Trợ lý mua sắm thông minh', 'Smart Shopping Assistant') }}
              </small>
            </div>
          </div>
          <div class="chatbot-head-actions" @mousedown.stop @touchstart.stop>
            <button
              class="chatbot-action-btn"
              type="button"
              :title="isChatExpanded ? t('Thu nhỏ cửa sổ', 'Collapse window') : t('Mở rộng cửa sổ', 'Expand window')"
              @click="isChatExpanded = !isChatExpanded"
            >
              {{ isChatExpanded ? '❐' : '⛶' }}
            </button>
            <button
              v-if="isChatCustomPositioned"
              class="chatbot-action-btn"
              type="button"
              :title="t('Đặt lại vị trí góc phải', 'Reset window position')"
              @click="resetChatPosition"
            >
              📍
            </button>
            <button
              class="chatbot-action-btn"
              type="button"
              :title="t('Làm mới phiên chat', 'Reset chat')"
              @click="resetChatbotSession"
            >
              🔄
            </button>
            <button
              class="chatbot-action-btn chatbot-close-btn"
              type="button"
              @click="showChatbot = false"
              :aria-label="t('Đóng', 'Close')"
            >
              ✕
            </button>
          </div>
        </header>

        <div class="chatbot-body">
          <div v-if="chatbotLoading" class="chatbot-state">
            <i class="pi pi-spin pi-spinner" />
            <span>{{ t('Đang tải phiên chat...', 'Loading chat session...') }}</span>
          </div>
          <template v-else>
            <article
              v-for="(message, index) in chatbotMessages"
              :key="`${message.createdAt}-${index}`"
              class="chat-message"
              :class="message.role === 'user' ? 'from-user' : 'from-bot'"
            >
              <div class="message-bubble">
                <ChatStructuredMessage
                  :content="message.content"
                  :role="message.role"
                  :is-storefront="true"
                  @open-product="emit('open-product', $event)"
                  @add-to-cart="emit('add-to-cart', $event)"
                />
              </div>
            </article>
            <div v-if="chatbotSending" class="chat-message from-bot loading-message">
              <span class="typing-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
              <small>{{ t('Đang trả lời', 'Typing') }}</small>
            </div>
            <div v-if="chatbotActions.length && !chatbotSending" class="chat-message from-bot chat-response-actions">
              <button
                v-for="(action, index) in chatbotActions"
                :key="`${action.type}-${action.productId}-${index}`"
                type="button"
                @click="handleChatAction(action)"
              >
                <i :class="action.type === 'add-to-cart' ? 'pi pi-shopping-bag' : 'pi pi-eye'" />
                <span>{{ action.label }}</span>
              </button>
            </div>
          </template>
        </div>

        <div class="chatbot-suggestions" v-if="!chatbotSending && chatbotSuggestions.length">
          <button
            v-for="suggestion in chatbotSuggestions"
            :key="suggestion"
            type="button"
            @click="sendChatbotText(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>

        <p v-if="chatbotError" class="chatbot-error">
          <i class="pi pi-exclamation-circle" /> {{ chatbotError }}
        </p>

        <form class="chatbot-input" @submit.prevent="sendChatbotText()">
          <input
            v-model="chatbotInput"
            type="text"
            :placeholder="t('Hỏi về sản phẩm, đơn hàng, tồn kho...', 'Ask about products, orders, stock...')"
            :disabled="chatbotSending"
          />
          <button type="submit" :title="t('Gửi', 'Send')" :disabled="chatbotSending || !chatbotInput.trim()">
            <i class="pi pi-send" />
          </button>
        </form>
      </aside>
    </Transition>
  </section>
</template>
