/**
 * Hub ADK Chat Adapter
 * Handles chat communication with ADK agents through Hub backend API
 * Preserves Workbench adapter functionality by using separate implementation
 */

import { AgentFramework } from '@/types';
import type {
  ChatAdapter,
  ChatAdapterConfig,
  ChatAdapterCallbacks,
  ChatMessage,
  ConversationMessage,
} from './types';

export class HubADKChatAdapter implements ChatAdapter {
  readonly framework = AgentFramework.ADK;

  private config: ChatAdapterConfig | null = null;
  private abortController: AbortController | null = null;
  private streamingMessageBuffer = '';

  initialize(config: ChatAdapterConfig): void {
    this.config = config;
    console.log('[HubADKChatAdapter] Initialized with config:', {
      agentId: config.agentId,
      sessionId: config.sessionId,
      apiBaseUrl: config.apiBaseUrl,
    });
  }

  async sendMessage(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    conversationHistory?: ConversationMessage[]
  ): Promise<void> {
    if (!this.config) {
      throw new Error('HubADKChatAdapter not initialized');
    }

    // Reset streaming buffer
    this.streamingMessageBuffer = '';

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      await this.streamFromHubBackend(message, callbacks, conversationHistory);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[HubADKChatAdapter] Stream aborted');
      } else {
        console.error('[HubADKChatAdapter] Error:', error);
        callbacks.onError?.(error);
      }
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      console.log('[HubADKChatAdapter] Cancelling stream');
      this.abortController.abort();
      this.abortController = null;
    }
  }

  dispose(): void {
    this.cancel();
    this.config = null;
    this.streamingMessageBuffer = '';
    console.log('[HubADKChatAdapter] Disposed');
  }

  supportsStreaming(): boolean {
    return true;
  }

  private async streamFromHubBackend(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    conversationHistory?: ConversationMessage[]
  ): Promise<void> {
    if (!this.config || !this.abortController) {
      throw new Error('Invalid adapter state');
    }

    const { apiBaseUrl, accessToken, agentId, sessionId } = this.config;
    const endpoint = `${apiBaseUrl}/api/hub/chat/stream`;

    // Build messages array for ADK framework
    const messages: any[] = [];

    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message.content,
    });

    const body = {
      agent_id: agentId,
      session_id: sessionId || undefined,
      messages,
    };

    console.log('[HubADKChatAdapter] Sending to Hub backend:', {
      endpoint,
      agentId,
      sessionId,
      messageCount: messages.length,
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

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const event = JSON.parse(data);

            if (event.type === 'stream_start') {
              // Stream started, pass session_id if present
              if (event.session_id) {
                console.log('[HubADKChatAdapter] Received session_id from backend:', event.session_id);
                callbacks.onSessionId?.(event.session_id);
              }
            } else if (event.type === 'text_token') {
              this.streamingMessageBuffer += event.content || '';
              callbacks.onChunk?.({
                content: this.streamingMessageBuffer,
                isComplete: false,
              });
            } else if (event.type === 'stream_end') {
              callbacks.onComplete?.({
                content: this.streamingMessageBuffer,
                timestamp: new Date(),
              });
            } else if (event.type === 'error') {
              callbacks.onError?.(new Error(event.message || 'Unknown error'));
            }
          } catch (e) {
            console.warn('[HubADKChatAdapter] Failed to parse event:', data);
          }
        }
      }
    }
  }
}
