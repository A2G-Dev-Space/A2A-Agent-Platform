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
        'Accept': 'text/event-stream',  // Required for SSE streaming
        Authorization: `Bearer ${accessToken}`,
        'X-Agent-Framework': 'langchain',  // Indicate framework for API Gateway streaming optimization
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
    let eventCount = 0;
    let bytesReceived = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('[HubLangchainChatAdapter] Stream ended:', {
          eventCount,
          bytesReceived,
          finalBufferLength: buffer.length,
          messageBuffer: this.streamingMessageBuffer.length,
          reasoningBuffer: this.reasoningBuffer.length,
        });
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      bytesReceived += value.byteLength;
      buffer += chunk;

      console.log('[HubLangchainChatAdapter] Chunk received:', {
        chunkSize: value.byteLength,
        decodedLength: chunk.length,
        bufferLength: buffer.length,
        preview: chunk.substring(0, 100),
      });

      // Process complete SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          eventCount++;

          // Handle [DONE] marker from Langchain streaming
          if (data === '[DONE]') {
            console.log('[HubLangchainChatAdapter] [DONE] marker received:', {
              messageBuffer: this.streamingMessageBuffer,
              reasoningBuffer: this.reasoningBuffer,
            });
            callbacks.onComplete?.({
              content: this.streamingMessageBuffer,
              timestamp: new Date(),
              reasoningContent: this.reasoningBuffer || undefined,
            });
            continue;
          }

          try {
            const event = JSON.parse(data);
            console.log('[HubLangchainChatAdapter] SSE event parsed:', {
              eventNumber: eventCount,
              type: event.type,
              hasContent: !!event.content,
              contentLength: event.content?.length,
              contentPreview: event.content?.substring(0, 50),
              timestamp: new Date().toISOString(),
            });
            this.handleSSEEvent(event, callbacks);
          } catch (e) {
            console.warn('[HubLangchainChatAdapter] Failed to parse event:', {
              error: e,
              data,
              dataLength: data.length,
            });
          }
        } else if (line.trim()) {
          console.warn('[HubLangchainChatAdapter] Non-SSE line received:', line);
        }
      }
    }

    // Check if stream ended without [DONE] marker
    if (!this.abortController?.signal.aborted) {
      console.warn('[HubLangchainChatAdapter] Stream ended without [DONE] marker:', {
        eventCount,
        bytesReceived,
        hasContent: !!this.streamingMessageBuffer || !!this.reasoningBuffer,
      });
    }
  }

  private handleSSEEvent(event: any, callbacks: ChatAdapterCallbacks): void {
    if (event.type === 'stream_start') {
      // Stream started, pass session_id if present
      if (event.session_id) {
        console.log('[HubLangchainChatAdapter] Received session_id from backend:', event.session_id);
        callbacks.onSessionId?.(event.session_id);
      }
      // Don't return here - continue processing other data in the event
    }

    if (event.type === 'stream_end') {
      // For Langchain, completion is handled by [DONE] marker, not stream_end
      // to avoid duplicate completions
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

    // Log chunk processing for debugging
    console.log('[HubLangchainChatAdapter] Chunk processed:', {
      chunkLength: chunk.length,
      bufferLength: this.streamingMessageBuffer.length,
      reasoningLength: this.reasoningBuffer.length,
    });

    // Send update to UI
    callbacks.onChunk?.({
      content: this.streamingMessageBuffer,
      isComplete: false,
      reasoningContent: this.reasoningBuffer || undefined,
    });
  }
}
