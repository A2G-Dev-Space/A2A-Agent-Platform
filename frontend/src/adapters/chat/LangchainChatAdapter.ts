/**
 * Langchain Chat Adapter - Custom Configurable Implementation
 * Handles chat communication with Langchain framework agents using user-defined endpoint and schema
 */

import { AgentFramework } from '@/types';
import type {
  ChatAdapter,
  ChatAdapterConfig,
  ChatAdapterCallbacks,
  ChatMessage,
} from './types';

/**
 * Extended configuration for Langchain adapter with custom schema
 */
export interface LangchainChatAdapterConfig extends ChatAdapterConfig {
  requestSchema?: string; // JSON template for request body, e.g., '{"input": "{{message}}"}'
  responseFormat?: 'sse' | 'json'; // Response format: SSE streaming or JSON blocking
  messagePathInResponse?: string; // Path to extract message from JSON response, e.g., 'output' or 'result.content'
}

export class LangchainChatAdapter implements ChatAdapter {
  readonly framework = AgentFramework.LANGCHAIN;

  private config: LangchainChatAdapterConfig | null = null;
  private abortController: AbortController | null = null;
  private streamingMessageBuffer = '';
  private reasoningBuffer = '';
  private isInThinkingMode = false;

  initialize(config: ChatAdapterConfig): void {
    this.config = config as LangchainChatAdapterConfig;
    console.log('[LangchainChatAdapter] Initialized with config:', {
      agentId: config.agentId,
      hasEndpoint: !!config.agentEndpoint,
      hasSchema: !!(config as LangchainChatAdapterConfig).requestSchema,
      responseFormat: (config as LangchainChatAdapterConfig).responseFormat || 'sse',
    });
  }

  async sendMessage(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    conversationHistory?: import('./types').ConversationMessage[]
  ): Promise<void> {
    if (!this.config) {
      throw new Error('LangchainChatAdapter not initialized');
    }

    // Reset streaming buffers
    this.streamingMessageBuffer = '';
    this.reasoningBuffer = '';
    this.isInThinkingMode = false;

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      const responseFormat = this.config.responseFormat || 'sse';

      if (responseFormat === 'sse') {
        await this.handleSSEStream(message, callbacks, conversationHistory);
      } else {
        await this.handleJSONResponse(message, callbacks, conversationHistory);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[LangchainChatAdapter] Request aborted');
      } else {
        console.error('[LangchainChatAdapter] Error:', error);
        callbacks.onError?.(error);
      }
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      console.log('[LangchainChatAdapter] Cancelling request');
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
    console.log('[LangchainChatAdapter] Disposed');
  }

  supportsStreaming(): boolean {
    return true;
  }

  /**
   * Build request body from user-defined schema template
   */
  private buildRequestBody(
    message: string,
    conversationHistory?: import('./types').ConversationMessage[]
  ): any {
    const requestSchema = this.config?.requestSchema;

    // Build message content with conversation history (like Agno)
    let messageContent = message;

    // Add conversation history as text prefix if provided
    if (conversationHistory && conversationHistory.length > 0) {
      const historyText = conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      messageContent = `Previous conversation:\n${historyText}\n\nCurrent message: ${message}`;
    }

    if (!requestSchema) {
      // Default schema for Langchain
      return {
        input: messageContent,
        config: {
          metadata: {
            conversation_id: this.config?.sessionId || `session-${Date.now()}`,
          },
        },
      };
    }

    try {
      // Parse the schema template
      let schemaObj = JSON.parse(requestSchema);

      // Replace {{message}} placeholder with actual message (including history)
      const schemaStr = JSON.stringify(schemaObj);
      const processedStr = schemaStr.replace(/\{\{message\}\}/g, messageContent);

      return JSON.parse(processedStr);
    } catch (error) {
      console.error('[LangchainChatAdapter] Failed to parse request schema:', error);
      // Fallback to default schema
      return {
        input: messageContent,
      };
    }
  }

  /**
   * Handle SSE streaming response
   */
  private async handleSSEStream(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    conversationHistory?: import('./types').ConversationMessage[]
  ): Promise<void> {
    if (!this.config || !this.abortController) {
      throw new Error('Invalid adapter state');
    }

    const { agentEndpoint, accessToken } = this.config;
    const endpoint = agentEndpoint;

    const requestBody = this.buildRequestBody(message.content, conversationHistory);

    console.log('[LangchainChatAdapter] Sending SSE request:', {
      endpoint,
      requestBody,
      hasHistory: conversationHistory && conversationHistory.length > 0,
      historyLength: conversationHistory?.length || 0,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
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
          const data = line.slice(6);

          // Check for [DONE] signal
          if (data.trim() === '[DONE]') {
            console.log('[LangchainChatAdapter] Stream completed, total length:', this.streamingMessageBuffer.length);
            callbacks.onComplete?.({
              content: this.streamingMessageBuffer,
              timestamp: new Date(),
              reasoningContent: this.reasoningBuffer || undefined,
            });
            this.streamingMessageBuffer = '';
            this.reasoningBuffer = '';
            this.isInThinkingMode = false;
            continue;
          }

          try {
            const chunk = JSON.parse(data);
            this.handleSSEChunk(chunk, callbacks);
          } catch (err) {
            // Sometimes the chunk might be plain text
            this.streamingMessageBuffer += data;
            callbacks.onChunk?.({
              content: this.streamingMessageBuffer,
              isComplete: false,
            });
          }
        }
      }
    }

    // If stream ended without [DONE], finalize the response
    if (this.streamingMessageBuffer) {
      callbacks.onComplete?.({
        content: this.streamingMessageBuffer,
        timestamp: new Date(),
        reasoningContent: this.reasoningBuffer || undefined,
      });
      this.streamingMessageBuffer = '';
      this.reasoningBuffer = '';
      this.isInThinkingMode = false;
    }
  }

  /**
   * Handle SSE chunk - extract content from chunk based on common Langchain patterns
   */
  private handleSSEChunk(chunk: any, callbacks: ChatAdapterCallbacks): void {
    // Try different common patterns for Langchain streaming responses
    let content = '';

    if (typeof chunk === 'string') {
      content = chunk;
    } else if (chunk.output) {
      content = chunk.output;
    } else if (chunk.content) {
      content = chunk.content;
    } else if (chunk.delta) {
      content = chunk.delta;
    } else if (chunk.data && chunk.data.output) {
      content = chunk.data.output;
    }

    if (content) {
      this.processContentChunk(content, callbacks);
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

  /**
   * Handle blocking JSON response
   */
  private async handleJSONResponse(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    conversationHistory?: import('./types').ConversationMessage[]
  ): Promise<void> {
    if (!this.config || !this.abortController) {
      throw new Error('Invalid adapter state');
    }

    const { agentEndpoint, accessToken, messagePathInResponse } = this.config;
    const endpoint = agentEndpoint;

    const requestBody = this.buildRequestBody(message.content, conversationHistory);

    console.log('[LangchainChatAdapter] Sending JSON request:', {
      endpoint,
      requestBody,
      hasHistory: conversationHistory && conversationHistory.length > 0,
      historyLength: conversationHistory?.length || 0,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();

    // Extract message from response based on messagePathInResponse
    let content = '';

    if (messagePathInResponse) {
      // Navigate the path like 'output' or 'result.content'
      const pathParts = messagePathInResponse.split('.');
      let current = data;
      for (const part of pathParts) {
        current = current?.[part];
      }
      content = typeof current === 'string' ? current : JSON.stringify(current);
    } else {
      // Try common patterns
      content = data.output || data.content || data.result || data.response || JSON.stringify(data);
    }

    console.log('[LangchainChatAdapter] Received JSON response, content length:', content.length);

    callbacks.onComplete?.({
      content,
      timestamp: new Date(),
    });
  }
}
