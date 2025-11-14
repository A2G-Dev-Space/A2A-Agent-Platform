/**
 * ADK Chat Adapter - A2A Protocol Implementation
 * Handles chat communication with ADK framework agents using REST + SSE
 */

import { AgentFramework } from '@/types';
import type {
  ChatAdapter,
  ChatAdapterConfig,
  ChatAdapterCallbacks,
  ChatMessage,
} from './types';

export class ADKChatAdapter implements ChatAdapter {
  readonly framework = AgentFramework.ADK;

  private config: ChatAdapterConfig | null = null;
  private abortController: AbortController | null = null;
  private streamingMessageBuffer = '';

  initialize(config: ChatAdapterConfig): void {
    this.config = config;
    console.log('[ADKChatAdapter] Initialized with config:', {
      agentId: config.agentId,
      hasEndpoint: !!config.agentEndpoint,
      hasSession: !!config.sessionId,
    });
  }

  async sendMessage(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    conversationHistory?: import('./types').ConversationMessage[]
  ): Promise<void> {
    if (!this.config) {
      throw new Error('ADKChatAdapter not initialized');
    }

    // Reset streaming buffer
    this.streamingMessageBuffer = '';

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      await this.handleSSEStream(message, callbacks, conversationHistory);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[ADKChatAdapter] Stream aborted');
      } else {
        console.error('[ADKChatAdapter] Error:', error);
        callbacks.onError?.(error);
      }
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      console.log('[ADKChatAdapter] Cancelling stream');
      this.abortController.abort();
      this.abortController = null;
    }
  }

  dispose(): void {
    this.cancel();
    this.config = null;
    this.streamingMessageBuffer = '';
    console.log('[ADKChatAdapter] Disposed');
  }

  supportsStreaming(): boolean {
    return true;
  }

  private async handleSSEStream(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    conversationHistory?: import('./types').ConversationMessage[]
  ): Promise<void> {
    if (!this.config || !this.abortController) {
      throw new Error('Invalid adapter state');
    }

    const { apiBaseUrl, accessToken, agentId, sessionId } = this.config;

    // Workbench always uses workbench API with agent-managed sessions
    const endpoint = `${apiBaseUrl}/api/workbench/chat/stream`;

    // Build messages array for workbench mode (includes conversation history)
    const messages = [];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user' as const,
      content: message.content,
    });

    const body = {
      agent_id: agentId,
      messages,
      session_id: sessionId, // Pass agent-managed sessionId
    };

    console.log('[ADKChatAdapter] Sending message:', {
      endpoint,
      messageCount: body.messages.length,
      hasHistory: conversationHistory && conversationHistory.length > 0,
      sessionId: sessionId || 'none',
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body reader available');
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            this.handleSSEEvent(data, callbacks);
          } catch (err) {
            console.warn('[ADKChatAdapter] Failed to parse event data:', line);
          }
        }
      }
    }
  }

  private handleSSEEvent(
    data: any,
    callbacks: ChatAdapterCallbacks
  ): void {
    console.log('[ADKChatAdapter] SSE event:', data.type);

    switch (data.type) {
      case 'stream_start':
        console.log('[ADKChatAdapter] Stream started');
        break;

      case 'text_token':
        if (data.content) {
          this.streamingMessageBuffer += data.content;
          callbacks.onChunk?.({
            content: this.streamingMessageBuffer,
            isComplete: false,
          });
        }
        break;

      case 'stream_end':
        console.log('[ADKChatAdapter] Stream ended, total length:', this.streamingMessageBuffer.length);
        callbacks.onComplete?.({
          content: this.streamingMessageBuffer,
          timestamp: new Date(),
        });
        this.streamingMessageBuffer = '';
        break;

      case 'error':
        console.error('[ADKChatAdapter] Error event:', data.message);
        callbacks.onError?.(new Error(data.message || 'Unknown error'));
        break;

      default:
        console.warn('[ADKChatAdapter] Unknown event type:', data.type);
    }
  }
}
