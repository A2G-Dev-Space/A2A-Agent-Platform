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
  private reasoningBuffer = '';
  private isInThinkingMode = false;

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
    conversationHistory?: import('./types').ConversationMessage[]
  ): Promise<void> {
    if (!this.config) {
      throw new Error('AgnoChatAdapter not initialized');
    }

    // Reset streaming buffers
    this.streamingMessageBuffer = '';
    this.reasoningBuffer = '';
    this.isInThinkingMode = false;

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      await this.handleSSEStream(message, callbacks, conversationHistory);
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
    this.reasoningBuffer = '';
    this.isInThinkingMode = false;
    console.log('[AgnoChatAdapter] Disposed');
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

    const { agentEndpoint, selectedResource, selectedResourceType } = this.config;

    if (!selectedResource) {
      throw new Error('No team or agent selected');
    }

    // Construct Agno endpoint based on selected resource type
    // Default to 'team' if not specified (backward compatibility)
    const resourceType = selectedResourceType || 'team';
    const endpoint = `${agentEndpoint}/${resourceType}s/${selectedResource}/runs`;

    // Build message content with conversation history
    let messageContent = message.content;

    // Add conversation history as text prefix if provided
    if (conversationHistory && conversationHistory.length > 0) {
      const historyText = conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      messageContent = `history:\n${historyText}\n\n${message.content}`;
    }

    console.log('[AgnoChatAdapter] Sending message:', {
      endpoint,
      messageLength: messageContent.length,
      hasHistory: conversationHistory && conversationHistory.length > 0,
      historyLength: conversationHistory?.length || 0,
      selectedResource,
      selectedResourceType: resourceType,
    });

    // Use FormData for Agno's multipart/form-data API
    const formData = new FormData();
    formData.append('message', messageContent);
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

    const resourceType = this.config?.selectedResourceType || 'team';

    switch (data.event) {
      // === Team-level events → Chat messages (final output) ===
      case 'TeamRunStarted':
        console.log('[AgnoChatAdapter] Team run started');
        break;

      case 'TeamRunContent':
        // Team-level content → Display in chat
        if (data.content) {
          this.processContentChunk(data.content, callbacks);
        }
        break;

      case 'TeamRunCompleted':
        console.log('[AgnoChatAdapter] Team run completed, total length:', this.streamingMessageBuffer.length);
        callbacks.onComplete?.({
          content: this.streamingMessageBuffer,
          timestamp: new Date(),
          reasoningContent: this.reasoningBuffer || undefined,
        });
        this.streamingMessageBuffer = '';
        this.reasoningBuffer = '';
        this.isInThinkingMode = false;
        break;

      // === Agent-level events ===
      case 'RunStarted':
        console.log('[AgnoChatAdapter] Agent run started');
        // If agent mode, this is the start of chat - don't show as system event
        if (resourceType !== 'agent') {
          callbacks.onSystemEvent?.({
            event: data.event,
            data: data,
            timestamp: new Date(),
          });
        }
        break;

      case 'RunContent':
        // If agent mode → Display in chat (like TeamRunContent)
        // If team mode → Show as system event (internal agent processing)
        if (resourceType === 'agent') {
          if (data.content) {
            this.processContentChunk(data.content, callbacks);
          }
        } else {
          callbacks.onSystemEvent?.({
            event: data.event,
            data: data,
            timestamp: new Date(),
          });
        }
        break;

      case 'RunCompleted':
        if (resourceType === 'agent') {
          // Agent mode: This is the final completion
          console.log('[AgnoChatAdapter] Agent run completed, total length:', this.streamingMessageBuffer.length);
          callbacks.onComplete?.({
            content: this.streamingMessageBuffer,
            timestamp: new Date(),
            reasoningContent: this.reasoningBuffer || undefined,
          });
          this.streamingMessageBuffer = '';
          this.reasoningBuffer = '';
          this.isInThinkingMode = false;
        } else {
          // Team mode: Show as system event
          callbacks.onSystemEvent?.({
            event: data.event,
            data: data,
            timestamp: new Date(),
          });
        }
        break;

      case 'RunContentCompleted':
        // Show as system event in both modes
        callbacks.onSystemEvent?.({
          event: data.event,
          data: data,
          timestamp: new Date(),
        });
        break;

      // === Tool call events → System events ===
      case 'TeamToolCallStarted':
      case 'ToolCallStarted':
      case 'TeamToolCallCompleted':
      case 'ToolCallCompleted':
      case 'TeamRunContentCompleted':
        // Tool and system events
        console.log('[AgnoChatAdapter] System event:', data.event);
        callbacks.onSystemEvent?.({
          event: data.event,
          data: data,
          timestamp: new Date(),
        });
        break;

      case 'TeamRunError':
      case 'RunError':
      case 'error':
        console.error('[AgnoChatAdapter] Error event:', data.event);
        console.error('[AgnoChatAdapter] Full error data:', JSON.stringify(data, null, 2));
        callbacks.onError?.(new Error(data.message || data.error || 'Unknown error'));
        break;

      default:
        console.warn('[AgnoChatAdapter] Unknown event type:', data.event);
    }
  }

  /**
   * Process content chunk and separate thinking/reasoning content from actual response
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
