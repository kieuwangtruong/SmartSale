<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { endChatSession, getChatSession, sendChatMessage, type ChatMessage } from '../services/chatbotApi'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'
import { useVerticalDraggableChat } from '../utils/useDraggableChat'
import ChatStructuredMessage from './ChatStructuredMessage.vue'

const auth = useAuthStore()
const { t } = useLanguage()

const isOpen = ref(false)
const isLoaded = ref(false)
const isLoading = ref(false)
const isSending = ref(false)
const errorMessage = ref('')
const inputMessage = ref('')
const messages = ref<ChatMessage[]>([])
const chatContainer = ref<HTMLElement | null>(null)
const chatbotRootRef = ref<HTMLElement | null>(null)

const {
  isDragging,
  hasMovedSignificantly,
  isCustomPositioned,
  dragStyle,
  startDrag,
  resetPosition,
} = useVerticalDraggableChat(chatbotRootRef, {
  defaultBottom: 24,
  defaultRight: 24,
  buttonHeight: 54,
  padding: 20,
})

function handleFabClick() {
  if (hasMovedSignificantly.value) return
  toggleChat()
}

const roleName = computed(() => {
  const role = auth.role
  if (role === 'Admin') return t('Quản trị viên', 'Admin')
  if (role === 'SalesStaff') return t('Nhân viên Bán hàng', 'Sales Staff')
  if (role === 'WarehouseKeeper') return t('Thủ kho', 'Warehouse Keeper')
  return t('Người dùng', 'User')
})

const roleBadgeColor = computed(() => {
  const role = auth.role
  if (role === 'Admin') return 'bg-purple-500/20 text-purple-600 border-purple-500/30'
  if (role === 'SalesStaff') return 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'
  if (role === 'WarehouseKeeper') return 'bg-amber-500/20 text-amber-600 border-amber-500/30'
  return 'bg-blue-500/20 text-blue-600 border-blue-500/30'
})

// Suggestion prompts specifically designed per Role
const suggestions = computed(() => {
  const role = auth.role
  if (role === 'SalesStaff') {
    return [
      t('📊 Doanh thu & đơn hôm nay', '📊 Today\'s revenue & orders'),
      t('👑 Top 5 khách hàng VIP', '👑 Top 5 VIP customers'),
      t('🔥 Top 5 sản phẩm bán chạy', '🔥 Top 5 best-selling products'),
      t('⏳ Đơn hàng đang chờ xử lý', '⏳ Orders pending processing'),
    ]
  }
  if (role === 'WarehouseKeeper') {
    return [
      t('⚠️ Kiểm tra tồn kho báo động', '⚠️ Low stock alert check'),
      t('🏭 Danh sách nhà cung cấp', '🏭 Suppliers list & contact'),
      t('📦 Phiếu nhập kho gần nhất', '📦 Recent stock receipts'),
      t('🔍 Sản phẩm đã hết hàng', '🔍 Out-of-stock products'),
    ]
  }
  // Admin & default
  return [
    t('📈 Báo cáo tổng quan kinh doanh', '📈 Business summary report'),
    t('👑 Khách hàng chi tiêu cao nhất', '👑 Top spending customers'),
    t('⚠️ Sản phẩm sắp hết hàng', '⚠️ Low stock alert'),
    t('🔥 Top sản phẩm bán chạy', '🔥 Top selling items'),
  ]
})

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

async function loadSession() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const session = await getChatSession()
    messages.value = session.messages
    if (!messages.value.length) {
      const welcomeText = auth.role === 'SalesStaff'
        ? `Xin chào **${auth.user?.fullName || 'bạn'}**! Tôi là **SmartSale AI** trợ lý hỗ trợ **Bán hàng & Doanh thu**.\nBạn muốn kiểm tra doanh thu, top khách hàng hay sản phẩm bán chạy hôm nay?`
        : auth.role === 'WarehouseKeeper'
        ? `Xin chào **${auth.user?.fullName || 'bạn'}**! Tôi là **SmartSale AI** trợ lý hỗ trợ **Kho & Tồn kho**.\nTôi có thể giúp bạn kiểm tra sản phẩm sắp hết hàng, phiếu nhập kho hoặc liên hệ nhà cung cấp.`
        : `Xin chào **${auth.user?.fullName || 'Quản trị viên'}**! Tôi là **SmartSale AI** trợ lý thông minh.\nBạn có thể tra cứu nhanh số liệu kinh doanh, top khách hàng VIP, tồn kho báo động hoặc đơn hàng hệ thống.`

      messages.value = [
        {
          role: 'assistant',
          content: welcomeText,
          createdAt: new Date().toISOString(),
        },
      ]
    }
    isLoaded.value = true
    scrollToBottom()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : t('Không thể kết nối với máy chủ AI.', 'Unable to connect to AI server.')
  } finally {
    isLoading.value = false
  }
}

async function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value && !isLoaded.value) {
    await loadSession()
  } else if (isOpen.value) {
    scrollToBottom()
  }
}

async function sendMessage(textToSend?: string) {
  const text = (textToSend || inputMessage.value).trim()
  if (!text || isSending.value) return

  inputMessage.value = ''
  errorMessage.value = ''
  isSending.value = true

  messages.value.push({
    role: 'user',
    content: text,
    createdAt: new Date().toISOString(),
  })
  scrollToBottom()

  try {
    const res = await sendChatMessage(text)
    messages.value = res.messages.length ? res.messages : [...messages.value, { role: 'assistant', content: res.reply, createdAt: new Date().toISOString() }]
    scrollToBottom()
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : t('Chatbot chưa thể phản hồi.', 'Chatbot failed to respond.')
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}

async function resetSession() {
  try {
    await endChatSession()
  } catch {
    // Ignore end session error
  }
  messages.value = []
  isLoaded.value = false
  await loadSession()
}
</script>

<template>
  <div
    ref="chatbotRootRef"
    class="admin-ai-chatbot-root"
    :class="{ 'is-dragging': isDragging }"
    :style="dragStyle"
  >
    <!-- Floating Launcher Trigger Button (Clean Message Logo, draggable vertically) -->
    <button
      type="button"
      class="ai-floating-btn"
      :class="{ 'ai-floating-btn--active': isOpen }"
      :title="t('Kéo lên/xuống để đổi vị trí • Nhấp để mở chat', 'Drag up/down to move • Click to toggle chat')"
      @pointerdown="startDrag"
      @mousedown="startDrag"
      @touchstart="startDrag"
      @click="handleFabClick"
    >
      <span class="ai-btn-icon">{{ isOpen ? '✕' : '🤖' }}</span>
    </button>

    <!-- Chat Modal Window -->
    <transition name="ai-drawer">
      <div
        v-if="isOpen"
        class="ai-chat-window"
      >
        <!-- Header -->
        <div
          class="ai-chat-header"
          :title="t('Trợ lý AI SmartSale', 'SmartSale AI Assistant')"
          @dblclick="resetPosition"
        >
          <div class="ai-header-left">
            <div class="ai-avatar-ring">
              <span class="ai-avatar-sparkle">🤖</span>
            </div>
            <div>
              <div class="ai-header-title">
                <strong>SmartSale AI</strong>
                <span class="ai-role-badge" :class="roleBadgeColor">{{ roleName }}</span>
              </div>
              <small class="ai-header-sub">
                <span class="ai-online-dot"></span>
                {{ t('Trợ lý quản trị & kinh doanh thông minh', 'Smart Management & Business Assistant') }}
              </small>
            </div>
          </div>
          <div class="ai-header-actions" @mousedown.stop @touchstart.stop>
            <button
              v-if="isCustomPositioned"
              type="button"
              class="ai-action-btn"
              :title="t('Đặt lại vị trí góc phải', 'Reset window position')"
              @click="resetPosition"
            >
              📍
            </button>
            <button
              type="button"
              class="ai-action-btn"
              :title="t('Làm mới phiên chat', 'Reset chat')"
              @click="resetSession"
            >
              🔄
            </button>
            <button
              type="button"
              class="ai-action-btn ai-close-btn"
              :title="t('Đóng', 'Close')"
              @click="isOpen = false"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Suggestions bar -->
        <div class="ai-suggestions-wrap">
          <button
            v-for="(sug, sIdx) in suggestions"
            :key="sIdx"
            type="button"
            class="ai-suggestion-chip"
            :disabled="isSending || isLoading"
            @click="sendMessage(sug)"
          >
            {{ sug }}
          </button>
        </div>

        <!-- Chat messages container -->
        <div ref="chatContainer" class="ai-messages-body">
          <div v-if="isLoading" class="ai-loading-box">
            <span class="ai-spinner" />
            <p>{{ t('Đang tải dữ liệu trợ lý AI...', 'Loading AI Assistant...') }}</p>
          </div>

          <template v-else>
            <div
              v-for="(msg, mIdx) in messages"
              :key="mIdx"
              class="ai-message-row"
              :class="msg.role === 'user' ? 'ai-row--user' : 'ai-row--assistant'"
            >
              <div class="ai-msg-avatar">
                {{ msg.role === 'user' ? (auth.user?.fullName?.charAt(0) || 'U') : '🤖' }}
              </div>
              <div class="ai-msg-bubble">
                <ChatStructuredMessage
                  :content="msg.content"
                  :role="msg.role"
                  :is-storefront="false"
                />
              </div>
            </div>

            <div v-if="isSending" class="ai-message-row ai-row--assistant">
              <div class="ai-msg-avatar">🤖</div>
              <div class="ai-msg-bubble ai-typing-bubble">
                <span class="ai-typing-dot" />
                <span class="ai-typing-dot" />
                <span class="ai-typing-dot" />
              </div>
            </div>
          </template>

          <div v-if="errorMessage" class="ai-error-banner">
            ⚠️ {{ errorMessage }}
          </div>
        </div>

        <!-- Input Box -->
        <form class="ai-input-form" @submit.prevent="sendMessage()">
          <input
            v-model="inputMessage"
            type="text"
            class="ai-text-input"
            :placeholder="t('Hỏi trợ lý AI về doanh thu, tồn kho, khách hàng...', 'Ask AI about sales, stock, customers...')"
            :disabled="isSending || isLoading"
          />
          <button
            type="submit"
            class="ai-send-button"
            :title="t('Gửi tin nhắn', 'Send message')"
            :disabled="!inputMessage.trim() || isSending || isLoading"
          >
            <span v-if="isSending" class="ai-spinner-sm" />
            <span v-else>➤</span>
          </button>
        </form>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.admin-ai-chatbot-root {
  position: fixed;
  right: 24px;
  z-index: 99999;
  font-family: inherit;
}

.admin-ai-chatbot-root.is-dragging {
  cursor: grabbing !important;
  user-select: none !important;
}

.ai-floating-btn {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #2563eb 100%);
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  cursor: grab;
  touch-action: none;
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.4), 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
  user-select: none;
}

.is-dragging .ai-floating-btn {
  cursor: grabbing !important;
  transform: scale(1.08) !important;
  transition: none !important;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35) !important;
}

.ai-floating-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 12px 30px rgba(13, 148, 136, 0.55);
}

.ai-floating-btn--active {
  background: #334155;
  font-size: 1.1rem;
}

.ai-btn-icon {
  line-height: 1;
  display: inline-block;
}

/* Chat Window */
.ai-chat-window {
  position: absolute;
  bottom: 68px;
  right: 0;
  width: 440px;
  max-width: calc(100vw - 32px);
  height: 600px;
  max-height: calc(100vh - 110px);
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2), 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  z-index: 10000;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

:global(.app-dark) .ai-chat-window {
  background: #111827;
  border-color: #374151;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.ai-chat-header {
  padding: 12px 16px;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #0369a1 100%);
  color: #ffffff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
}

:global(.app-dark) .ai-chat-header {
  background: linear-gradient(135deg, #134e4a 0%, #1e293b 70%, #0f172a 100%);
  border-bottom-color: #334155;
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ai-avatar-ring {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.ai-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: #ffffff;
}

.ai-role-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  text-transform: uppercase;
}

.ai-header-sub {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.85);
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-online-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  display: inline-block;
  box-shadow: 0 0 6px #34d399;
}

.ai-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ai-action-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.ai-action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.08);
}

.ai-close-btn:hover {
  background: rgba(239, 68, 68, 0.8);
}

/* Quick Suggestion Chips */
.ai-suggestions-wrap {
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: thin;
}

:global(.app-dark) .ai-suggestions-wrap {
  background: #1e293b;
  border-bottom-color: #334155;
}

.ai-suggestion-chip {
  flex-shrink: 0;
  padding: 5px 12px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 9999px;
  font-size: 0.76rem;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.ai-suggestion-chip:hover {
  background: #ecfdf5;
  border-color: #10b981;
  color: #047857;
  transform: translateY(-1px);
}

:global(.app-dark) .ai-suggestion-chip {
  background: #0f172a;
  border-color: #475569;
  color: #cbd5e1;
}

:global(.app-dark) .ai-suggestion-chip:hover {
  background: #064e3b;
  border-color: #10b981;
  color: #6ee7b7;
}

/* Messages Body */
.ai-messages-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #f8fafc;
}

:global(.app-dark) .ai-messages-body {
  background: #0b1120;
}

.ai-loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  gap: 10px;
}

.ai-message-row {
  display: flex;
  gap: 10px;
  max-width: 92%;
}

.ai-row--user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.ai-row--assistant {
  align-self: flex-start;
  width: 100%;
}

.ai-msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: bold;
  flex-shrink: 0;
}

.ai-row--user .ai-msg-avatar {
  background: #0f766e;
  color: #ffffff;
}

.ai-msg-bubble {
  width: 100%;
}

.ai-typing-bubble {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  width: fit-content;
}

:global(.app-dark) .ai-typing-bubble {
  background: #1e293b;
  border-color: #334155;
}

.ai-typing-dot {
  width: 6px;
  height: 6px;
  background: #94a3b8;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.ai-typing-dot:nth-child(1) { animation-delay: -0.32s; }
.ai-typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.ai-error-banner {
  padding: 8px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 0.8rem;
}

/* Input Form */
.ai-input-form {
  padding: 12px 14px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 8px;
}

:global(.app-dark) .ai-input-form {
  background: #111827;
  border-top-color: #374151;
}

.ai-text-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 9999px;
  border: 1px solid #cbd5e1;
  font-size: 0.875rem;
  outline: none;
  background: #f8fafc;
  color: #0f172a;
  transition: all 0.2s;
}

.ai-text-input:focus {
  border-color: #0d9488;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
}

:global(.app-dark) .ai-text-input {
  background: #1e293b;
  border-color: #475569;
  color: #f8fafc;
}

.ai-send-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #0f766e;
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.ai-send-button:hover:not(:disabled) {
  background: #0d9488;
  transform: scale(1.05);
}

.ai-send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Spinner */
.ai-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #cbd5e1;
  border-top-color: #0d9488;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.ai-spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Transitions */
.ai-drawer-enter-active,
.ai-drawer-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.ai-drawer-enter-from,
.ai-drawer-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
