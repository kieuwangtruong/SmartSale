import { apiRequest } from './apiClient'
import { API_URLS } from './config'

export interface ChatMessage {
  role: 'user' | 'assistant' | string
  content: string
  createdAt: string
}

export interface ChatAction {
  type: 'open-product' | 'add-to-cart' | string
  productId: number
  label: string
}

export interface ChatSession {
  id: number
  messages: ChatMessage[]
}

export interface ChatResponse {
  sessionId: number
  reply: string
  actions: ChatAction[]
  messages: ChatMessage[]
}

export function getChatSession() {
  return apiRequest<ChatSession>(API_URLS.order, '/api/chatbot/session', { auth: true })
}

export function sendChatMessage(message: string) {
  return apiRequest<ChatResponse>(API_URLS.order, '/api/chatbot/messages', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ message }),
  })
}

export function endChatSession() {
  return apiRequest<unknown>(API_URLS.order, '/api/chatbot/session/end', {
    method: 'POST',
    auth: true,
  })
}
