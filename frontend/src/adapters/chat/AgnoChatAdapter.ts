/**
 * Agno Chat Adapter - Agno Framework Implementation
 * Handles chat communication with Agno framework agents using REST + SSE
 */

import { AgentFramework } from '@/types';
import type {
  ChatAdapter,
  ChatAdapterConfig,
  ChatAdapterCallbacks,
  ChatMessage,
} from './types';

export class AgnoChatAdapter implements ChatAdapter {
  readonly framework = AgentFramework.AGNO;

  private config: ChatAdapterConfig | null = null;
  private abortController: AbortController | null = null;
  private streamingMessageBuffer = '';

  initialize(config: ChatAdapterConfig): void {
    this.config = config;
    console.log('[AgnoChatAdapter] Initialized with config:', {
      agentId: config.agentId,
      hasEndpoint: !!config.agentEndpoint,
      hasSession: !!config.sessionId,
    });
  }

  async sendMessage(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    _conversationHistory?: import('./types').ConversationMessage[]
  ): Promise<void> {
    if (!this.config) {
      throw new Error('AgnoChatAdapter not initialized');
    }

    // TODO: Implement conversation history support for Agno (streaming supported)

    // Reset streaming buffer
    this.streamingMessageBuffer = '';

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      await this.handleSSEStream(message, callbacks);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[AgnoChatAdapter] Stream aborted');
      } else {
        console.error('[AgnoChatAdapter] Error:', error);
        callbacks.onError?.(error);
      }
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      console.log('[AgnoChatAdapter] Cancelling stream');
      this.abortController.abort();
      this.abortController = null;
    }
  }

  dispose(): void {
    this.cancel();
    this.config = null;
    this.streamingMessageBuffer = '';
    console.log('[AgnoChatAdapter] Disposed');
  }

  supportsStreaming(): boolean {
    return true;
  }

  private async handleSSEStream(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks
  ): Promise<void> {
    if (!this.config || !this.abortController) {
      throw new Error('Invalid adapter state');
    }

    const { apiBaseUrl, accessToken, agentId, sessionId } = this.config;

    // Use workbench API if no sessionId, otherwise use chat API
    const endpoint = sessionId
      ? `${apiBaseUrl}/api/chat/sessions/${sessionId}/messages/stream`
      : `${apiBaseUrl}/api/workbench/chat/stream`;

    const body = sessionId
      ? { content: message.content }
      : { agent_id: agentId, content: message.content };

    console.log('[AgnoChatAdapter] Sending message:', {
      endpoint,
      messageLength: message.content.length,
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
            console.warn('[AgnoChatAdapter] Failed to parse event data:', line);
          }
        }
      }
    }
  }

  private handleSSEEvent(
    data: any,
    callbacks: ChatAdapterCallbacks
  ): void {
    console.log('[AgnoChatAdapter] SSE event:', data.type);

    switch (data.type) {
      case 'stream_start':
        console.log('[AgnoChatAdapter] Stream started');
        // Note: trace_id is not used in the adapter, it's handled at a higher level
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
        console.log('[AgnoChatAdapter] Stream ended, total length:', this.streamingMessageBuffer.length);
        callbacks.onComplete?.({
          content: this.streamingMessageBuffer,
          timestamp: new Date(),
        });
        this.streamingMessageBuffer = '';
        break;

      case 'error':
        console.error('[AgnoChatAdapter] Error event:', data.message);
        callbacks.onError?.(new Error(data.message || 'Unknown error'));
        break;

      default:
        console.warn('[AgnoChatAdapter] Unknown event type:', data.type);
    }
  }
}
