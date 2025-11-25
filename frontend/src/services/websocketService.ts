import { io, Socket } from 'socket.io-client'
import { type WebSocketMessage } from '@/types'
import { getWsProtocol } from '@/config/api'

class WebSocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<Function>> = new Map()

  connect(sessionId: string, token: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected')
      return
    }

    // Use VITE_WS_URL if set, otherwise construct from current location with correct protocol
    const wsUrl = import.meta.env.VITE_WS_URL || (() => {
      const wsProtocol = getWsProtocol()
      const host = window.location.host
      return `${wsProtocol}://${host}`
    })()

    this.socket = io(wsUrl, {
      path: '/ws',
      query: {
        session_id: sessionId,
        token: token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.emit('connected', {})
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.emit('disconnected', { reason })
    })

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', { error })
    })

    // Handle different message types
    this.socket.on('stream_start', (data) => {
      this.emit('stream_start', data)
    })

    this.socket.on('token', (data) => {
      this.emit('token', data)
    })

    this.socket.on('stream_end', (data) => {
      this.emit('stream_end', data)
    })

    this.socket.on('agent_transfer', (data) => {
      this.emit('agent_transfer', data)
    })

    this.socket.on('trace_log', (data) => {
      this.emit('trace_log', data)
    })

    this.socket.on('message', (data: WebSocketMessage) => {
      this.emit('message', data)
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }
  }

  sendMessage(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.error('WebSocket not connected')
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(callback)
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback)
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in WebSocket listener for ${event}:`, error)
      }
    })
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Subscribe to trace logs for a specific trace ID
  subscribeToTrace(traceId: string): void {
    this.sendMessage('subscribe_trace', { trace_id: traceId })
  }

  unsubscribeFromTrace(traceId: string): void {
    this.sendMessage('unsubscribe_trace', { trace_id: traceId })
  }

  // Send chat message
  sendChatMessage(sessionId: string, message: string, attachments?: any[]): void {
    this.sendMessage('chat_message', {
      session_id: sessionId,
      content: message,
      attachments,
    })
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()