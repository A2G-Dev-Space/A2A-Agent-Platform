/**
 * Chat Adapter Types
 * Defines interfaces for framework-specific chat adapters
 */

import { AgentFramework } from '@/types';

/**
 * Message sent by user
 */
export interface ChatMessage {
  content: string;
  timestamp?: Date;
}

/**
 * Response chunk from agent (for streaming)
 */
export interface ChatResponseChunk {
  content: string;
  isComplete: boolean;
  reasoningContent?: string; // Optional reasoning/thinking content (e.g., from <think> tags)
}

/**
 * Complete response from agent
 */
export interface ChatResponse {
  content: string;
  timestamp: Date;
  reasoningContent?: string; // Optional reasoning/thinking content (e.g., from <think> tags)
}

/**
 * System event from agent (tool calls, agent transfers, etc.)
 */
export interface SystemEvent {
  event: string;
  data: any;
  timestamp: Date;
}

/**
 * Configuration for chat adapter
 */
export interface ChatAdapterConfig {
  agentId: number;
  agentEndpoint: string;
  apiBaseUrl: string;
  accessToken: string;
  sessionId?: string; // Optional for workbench mode
  selectedResource?: string; // Optional team/agent ID for Agno framework
  selectedResourceType?: 'team' | 'agent'; // Resource type for Agno framework
  chatEndpoint?: string; // Optional custom chat endpoint (defaults to /api/workbench/chat/stream)
  // Langchain-specific configuration
  requestSchema?: string; // JSON template for request body (e.g., '{"input": "{{message}}"}')
  responseFormat?: 'sse' | 'json'; // Response format: SSE streaming or JSON blocking
  messagePathInResponse?: string; // Path to extract message from JSON response (e.g., 'output')
}

/**
 * Callbacks for chat events
 */
export interface ChatAdapterCallbacks {
  onChunk?: (chunk: ChatResponseChunk) => void;
  onComplete?: (response: ChatResponse) => void;
  onError?: (error: Error) => void;
  onSystemEvent?: (event: SystemEvent) => void;
  onSessionId?: (sessionId: string) => void; // Callback for receiving session ID from backend
}

/**
 * Message in conversation history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Chat Adapter Interface
 * All framework-specific adapters must implement this interface
 */
export interface ChatAdapter {
  /**
   * Framework type this adapter handles
   */
  readonly framework: AgentFramework;

  /**
   * Initialize the adapter with configuration
   */
  initialize(config: ChatAdapterConfig): void;

  /**
   * Send a message to the agent
   * @param message - User message
   * @param callbacks - Event callbacks
   * @param conversationHistory - Optional previous messages for context (workbench mode only)
   * @returns Promise that resolves when message is sent
   */
  sendMessage(
    message: ChatMessage,
    callbacks: ChatAdapterCallbacks,
    conversationHistory?: ConversationMessage[]
  ): Promise<void>;

  /**
   * Cancel ongoing message sending
   */
  cancel(): void;

  /**
   * Clean up resources
   */
  dispose(): void;

  /**
   * Check if adapter supports streaming
   */
  supportsStreaming(): boolean;
}
