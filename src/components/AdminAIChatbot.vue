<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { endChatSession, getChatSession, sendChatMessage, type ChatAction, type ChatMessage } from '../services/chatbotApi'
import { useAuthStore } from '../stores/authStore'
import { useLanguage } from '../services/i18n'

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
        ? `Xin chào **${auth.user?.fullName || 'bạn'}**! Tôi là Trợ lý AI SmartSale hỗ trợ **Bán hàng & Doanh thu**. Bạn muốn kiểm tra doanh thu, top khách hàng hay sản phẩm bán chạy hôm nay?`
        : auth.role === 'WarehouseKeeper'
        ? `Xin chào **${auth.user?.fullName || 'bạn'}**! Tôi là Trợ lý AI SmartSale hỗ trợ **Kho & Tồn kho**. Tôi có thể giúp bạn kiểm tra sản phẩm sắp hết hàng, phiếu nhập kho hoặc liên hệ nhà cung cấp.`
        : `Xin chào **${auth.user?.fullName || 'Quản trị viên'}**! Tôi là Trợ lý AI SmartSale. Bạn có thể tra cứu nhanh số liệu kinh doanh, top khách hàng VIP, tồn kho báo động hoặc đơn hàng hệ thống.`

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

// Convert markdown-like formatting to HTML safely
function formatMarkdown(content: string) {
  if (!content) return ''
  let escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold **text**
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // Bullet lists
  escaped = escaped.replace(/^[•\-\*]\s+(.*)$/gm, '<li class="ml-4 list-disc">$1</li>')
  
  // Numbered list
  escaped = escaped.replace(/^(\d+)\.\s+(.*)$/gm, '<li class="ml-4 list-decimal"><strong>$1.</strong> $2</li>')

  // Line breaks
  escaped = escaped.replace(/\n/g, '<br/>')

  return escaped
}
</script>

<template>
  <div class="admin-ai-chatbot-root">
    <!-- Floating Launcher Trigger Button -->
    <button
      type="button"
      class="ai-floating-btn"
      :class="{ 'ai-floating-btn--active': isOpen }"
      :title="t('Trợ lý AI SmartSale', 'SmartSale AI Assistant')"
      @click="toggleChat"
    >
      <div class="ai-btn-glow" />
      <span class="ai-sparkle-icon">✨</span>
      <span class="ai-btn-text">{{ isOpen ? '✕' : 'AI Assistant' }}</span>
      <span v-if="!isOpen" class="ai-pulse-dot" />
    </button>

    <!-- Chat Modal Window -->
    <transition name="ai-drawer">
      <div v-if="isOpen" class="ai-chat-window">
        <!-- Header -->
        <div class="ai-chat-header">
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
                ⚡ {{ t('Google Gemini 3.6 Flash • Tối ưu token', 'Google Gemini 3.6 Flash • Token Efficient') }}
              </small>
            </div>
          </div>
          <div class="ai-header-actions">
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
              class="ai-action-btn"
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
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div class="ai-msg-content" v-html="formatMarkdown(msg.content)" />
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
  bottom: 24px;
  right: 24px;
  z-index: 9999;
  font-family: inherit;
}

.ai-floating-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #059669 0%, #0d9488 50%, #2563eb 100%);
  color: #ffffff;
  border: none;
  border-radius: 9999px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.4), 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-floating-btn:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 12px 30px rgba(13, 148, 136, 0.55);
}

.ai-floating-btn--active {
  background: #334155;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}

.ai-sparkle-icon {
  font-size: 1.2rem;
  animation: sparkle-pulse 2s infinite ease-in-out;
}

@keyframes sparkle-pulse {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.25) rotate(15deg); }
}

.ai-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.8); opacity: 0.8; }
  50% { transform: scale(1.4); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.8; }
}

/* Chat Window */
.ai-chat-window {
  position: absolute;
  bottom: 64px;
  right: 0;
  width: 420px;
  max-width: calc(100vw - 32px);
  height: 580px;
  max-height: calc(100vh - 120px);
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

:global(.app-dark) .ai-chat-window {
  background: #111827;
  border-color: #374151;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.ai-chat-header {
  padding: 14px 18px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:global(.app-dark) .ai-chat-header {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border-bottom-color: #374151;
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-avatar-ring {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, #10b981, #3b82f6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.ai-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: #0f172a;
}

:global(.app-dark) .ai-header-title {
  color: #f8fafc;
}

.ai-role-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid;
  text-transform: uppercase;
}

.ai-header-sub {
  font-size: 0.72rem;
  color: #64748b;
  display: block;
}

.ai-header-actions {
  display: flex;
  gap: 6px;
}

.ai-action-btn {
  background: transparent;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;
}

.ai-action-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

:global(.app-dark) .ai-action-btn:hover {
  background: #374151;
  color: #f8fafc;
}

/* Quick Suggestion Chips */
.ai-suggestions-wrap {
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
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
  padding: 4px 10px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 9999px;
  font-size: 0.75rem;
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
  background: #059669;
  color: #ffffff;
}

.ai-msg-bubble {
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 0.875rem;
  line-height: 1.5;
  word-break: break-word;
}

.ai-row--user .ai-msg-bubble {
  background: #059669;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}

.ai-row--assistant .ai-msg-bubble {
  background: #f1f5f9;
  color: #0f172a;
  border-bottom-left-radius: 4px;
  border: 1px solid #e2e8f0;
}

:global(.app-dark) .ai-row--assistant .ai-msg-bubble {
  background: #1f2937;
  color: #f3f4f6;
  border-color: #374151;
}

.ai-typing-bubble {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
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
  padding: 12px;
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
}

.ai-text-input:focus {
  border-color: #10b981;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
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
  background: #059669;
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-send-button:hover:not(:disabled) {
  background: #047857;
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
  border-top-color: #10b981;
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
