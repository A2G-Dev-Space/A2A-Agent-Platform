/**
 * Chat Adapter Factory
 * Creates the appropriate chat adapter based on agent framework
 */

import { AgentFramework } from '@/types';
import type { ChatAdapter } from './types';
import { ADKChatAdapter } from './ADKChatAdapter';
import { AgnoChatAdapter } from './AgnoChatAdapter';
import { LangchainChatAdapter } from './LangchainChatAdapter';

export class ChatAdapterFactory {
  /**
   * Create a chat adapter for the specified framework
   * @param framework - The agent framework type
   * @returns ChatAdapter instance
   * @throws Error if framework is not supported
   */
  static createAdapter(framework: AgentFramework): ChatAdapter {
    switch (framework) {
      case AgentFramework.ADK:
        return new ADKChatAdapter();

      case AgentFramework.AGNO:
        return new AgnoChatAdapter();

      case AgentFramework.LANGCHAIN:
        return new LangchainChatAdapter();

      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * Alias for createAdapter for backward compatibility
   */
  static create(framework: AgentFramework): ChatAdapter {
    return this.createAdapter(framework);
  }

  /**
   * Check if a framework is supported
   * @param framework - The agent framework type
   * @returns true if framework is supported
   */
  static isSupported(framework: AgentFramework): boolean {
    return [AgentFramework.ADK, AgentFramework.AGNO, AgentFramework.LANGCHAIN].includes(framework);
  }

  /**
   * Get list of supported frameworks
   * @returns Array of supported framework types
   */
  static getSupportedFrameworks(): AgentFramework[] {
    return [AgentFramework.ADK, AgentFramework.AGNO, AgentFramework.LANGCHAIN];
  }
}
