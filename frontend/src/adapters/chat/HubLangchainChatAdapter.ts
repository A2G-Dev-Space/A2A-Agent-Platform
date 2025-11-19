/**
 * Hub Langchain Chat Adapter
 * Handles chat communication with Langchain agents through Hub backend API
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

export class HubLangchainChatAdapter implements ChatAdapter {
  readonly framework = AgentFramework.LANGCHAIN;

  private config: ChatAdapterConfig | null = null;
  private abortController: AbortController | null = null;
  private streamingMessageBuffer = '';
  private reasoningBuffer = '';
  private isInThinkingMode = false;

  initialize(config: ChatAdapterConfig): void {
    this.config = config;
    console.log('[HubLangchainChatAdapter] Initialized with config:', {
      agentId: config.agentId,
      sessionId: config.sessionId,
    });
  }

  async sendMessage(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    conversationHistory?: ConversationMessage[]
  ): Promise<void> {
    if (!this.config) {
      throw new Error('HubLangchainChatAdapter not initialized');
    }

    // Reset streaming buffers
    this.streamingMessageBuffer = '';
    this.reasoningBuffer = '';
    this.isInThinkingMode = false;

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      await this.streamFromHubBackend(message, callbacks, conversationHistory);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[HubLangchainChatAdapter] Stream aborted');
      } else {
        console.error('[HubLangchainChatAdapter] Error:', error);
        callbacks.onError?.(error);
      }
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      console.log('[HubLangchainChatAdapter] Cancelling stream');
      this.abortController.abort();
      this.abortController = null;
    }
  }

  dispose(): void {
    this.cancel();
    this.config = null;
    this.streamingMessageBuffer = '';
    this.reasoningBuffer = '';
    this.isInThinkingMode = false;
    console.log('[HubLangchainChatAdapter] Disposed');
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

    // Build request body for Langchain framework
    const body: any = {
      agent_id: agentId,
      session_id: sessionId || undefined,
      content: message.content,
    };

    // Add conversation history as messages array
    if (conversationHistory && conversationHistory.length > 0) {
      body.messages = conversationHistory;
    }

    console.log('[HubLangchainChatAdapter] Sending to Hub backend:', {
      endpoint,
      agentId,
      sessionId,
      hasHistory: !!conversationHistory?.length,
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

          // Handle [DONE] marker from Langchain streaming
          if (data === '[DONE]') {
            callbacks.onComplete?.({
              content: this.streamingMessageBuffer,
              timestamp: new Date(),
              reasoningContent: this.reasoningBuffer || undefined,
            });
            continue;
          }

          try {
            const event = JSON.parse(data);
            this.handleSSEEvent(event, callbacks);
          } catch (e) {
            console.warn('[HubLangchainChatAdapter] Failed to parse event:', data);
          }
        }
      }
    }
  }

  private handleSSEEvent(event: any, callbacks: ChatAdapterCallbacks): void {
    if (event.type === 'stream_start') {
      // Stream started, no action needed
      return;
    }

    if (event.type === 'stream_end') {
      callbacks.onComplete?.({
        content: this.streamingMessageBuffer,
        timestamp: new Date(),
        reasoningContent: this.reasoningBuffer || undefined,
      });
      return;
    }

    if (event.type === 'error') {
      callbacks.onError?.(new Error(event.message || 'Unknown error'));
      return;
    }

    // Handle content from Langchain agent (direct SSE format: {content: "..."})
    if (event.content !== undefined) {
      this.processContentChunk(event.content, callbacks);
    }
  }

  /**
   * Process content chunk and separate thinking/reasoning content from actual response
   * Same as Agno adapter - handles <think> tags
   */
  private processContentChunk(chunk: string, callbacks: ChatAdapterCallbacks): void {
    let remainingChunk = chunk;

    while (remainingChunk.length > 0) {
      if (this.isInThinkingMode) {
        // Look for closing </think> tag
        const thinkEndIndex = remainingChunk.indexOf('</think>');

        if (thinkEndIndex !== -1) {
          // Found closing tag - add content to reasoning buffer
          this.reasoningBuffer += remainingChunk.substring(0, thinkEndIndex);
          this.isInThinkingMode = false;

          // Continue processing after </think> tag
          remainingChunk = remainingChunk.substring(thinkEndIndex + 8); // 8 = length of '</think>'
        } else {
          // No closing tag yet - add entire chunk to reasoning buffer
          this.reasoningBuffer += remainingChunk;
          remainingChunk = '';
        }
      } else {
        // Look for opening <think> tag
        const thinkStartIndex = remainingChunk.indexOf('<think>');

        if (thinkStartIndex !== -1) {
          // Found opening tag - add content before tag to message buffer
          if (thinkStartIndex > 0) {
            this.streamingMessageBuffer += remainingChunk.substring(0, thinkStartIndex);
          }
          this.isInThinkingMode = true;

          // Continue processing after <think> tag
          remainingChunk = remainingChunk.substring(thinkStartIndex + 7); // 7 = length of '<think>'
        } else {
          // No thinking tag - add entire chunk to message buffer
          this.streamingMessageBuffer += remainingChunk;
          remainingChunk = '';
        }
      }
    }

    // Send update to UI
    callbacks.onChunk?.({
      content: this.streamingMessageBuffer,
      isComplete: false,
      reasoningContent: this.reasoningBuffer || undefined,
    });
  }
}
