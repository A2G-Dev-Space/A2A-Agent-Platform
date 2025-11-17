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

    const { agentEndpoint, selectedResource } = this.config;

    if (!selectedResource) {
      throw new Error('No team or agent selected');
    }

    // Construct Agno endpoint based on selected resource type
    // selectedResource format: "team-name" or "agent-name"
    // We need to determine if it's a team or agent
    // For now, we'll try teams first (most common case)
    const endpoint = `${agentEndpoint}/teams/${selectedResource}/runs`;

    console.log('[AgnoChatAdapter] Sending message:', {
      endpoint,
      messageLength: message.content.length,
      selectedResource,
    });

    // Use FormData for Agno's multipart/form-data API
    const formData = new FormData();
    formData.append('message', message.content);
    formData.append('stream', 'true');
    formData.append('user_id', 'workbench_user');

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
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
    console.log('[AgnoChatAdapter] SSE event:', data.event);

    switch (data.event) {
      case 'TeamRunStarted':
      case 'RunStarted':
        console.log('[AgnoChatAdapter] Run started:', data.event);
        break;

      case 'TeamRunContent':
      case 'RunContent':
        if (data.content) {
          this.streamingMessageBuffer += data.content;
          callbacks.onChunk?.({
            content: this.streamingMessageBuffer,
            isComplete: false,
          });
        }
        break;

      case 'TeamRunCompleted':
      case 'RunCompleted':
        console.log('[AgnoChatAdapter] Run completed, total length:', this.streamingMessageBuffer.length);
        callbacks.onComplete?.({
          content: this.streamingMessageBuffer,
          timestamp: new Date(),
        });
        this.streamingMessageBuffer = '';
        break;

      case 'TeamToolCallStarted':
      case 'ToolCallStarted':
      case 'TeamToolCallCompleted':
      case 'ToolCallCompleted':
      case 'TeamRunContentCompleted':
      case 'RunContentCompleted':
        // System events - can be used for system events display in the future
        console.log('[AgnoChatAdapter] System event:', data.event);
        break;

      case 'TeamRunError':
      case 'RunError':
      case 'error':
        console.error('[AgnoChatAdapter] Error event:', data.event, data.message || data.error);
        callbacks.onError?.(new Error(data.message || data.error || 'Unknown error'));
        break;

      default:
        console.warn('[AgnoChatAdapter] Unknown event type:', data.event);
    }
  }
}
