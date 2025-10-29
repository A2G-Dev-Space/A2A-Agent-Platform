import { apiClient } from './api'
import { type ChatSession, type ChatMessage } from '@/types'

const CHAT_BASE = '/chat'

export const chatService = {
  // Session management
  createSession: async (agentId: number, title?: string): Promise<ChatSession> => {
    return apiClient.post(`${CHAT_BASE}/sessions/`, {
      agent_id: agentId,
      title: title || 'New Chat Session',
    })
  },

  getSessions: async (): Promise<ChatSession[]> => {
    return apiClient.get(`${CHAT_BASE}/sessions/`)
  },

  getSession: async (sessionId: string): Promise<ChatSession> => {
    return apiClient.get(`${CHAT_BASE}/sessions/${sessionId}/`)
  },

  updateSession: async (sessionId: string, data: Partial<ChatSession>): Promise<ChatSession> => {
    return apiClient.patch(`${CHAT_BASE}/sessions/${sessionId}/`, data)
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    return apiClient.delete(`${CHAT_BASE}/sessions/${sessionId}/`)
  },

  // Message management
  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    return apiClient.get(`${CHAT_BASE}/sessions/${sessionId}/messages/`)
  },

  sendMessage: async (sessionId: string, content: string, attachments?: any[]): Promise<ChatMessage> => {
    return apiClient.post(`${CHAT_BASE}/sessions/${sessionId}/messages/`, {
      role: 'user',
      content,
      attachments,
    })
  },

  // Get session history
  getSessionHistory: async (limit: number = 10): Promise<ChatSession[]> => {
    return apiClient.get(`${CHAT_BASE}/history/?limit=${limit}`)
  },

  // Clear session messages
  clearSession: async (sessionId: string): Promise<void> => {
    return apiClient.delete(`${CHAT_BASE}/sessions/${sessionId}/messages/`)
  },

  // Export chat session
  exportSession: async (sessionId: string, format: 'json' | 'markdown' | 'pdf' = 'json') => {
    return apiClient.get(`${CHAT_BASE}/sessions/${sessionId}/export/?format=${format}`)
  },
}