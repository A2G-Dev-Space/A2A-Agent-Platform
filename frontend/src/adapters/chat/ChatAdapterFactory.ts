/**
 * Chat Adapter Factory
 * Creates the appropriate chat adapter based on agent framework
 */

import { AgentFramework } from '@/types';
import type { ChatAdapter } from './types';
import { ADKChatAdapter } from './ADKChatAdapter';
import { AgnoChatAdapter } from './AgnoChatAdapter';

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

      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }

  /**
   * Check if a framework is supported
   * @param framework - The agent framework type
   * @returns true if framework is supported
   */
  static isSupported(framework: AgentFramework): boolean {
    return [AgentFramework.ADK, AgentFramework.AGNO].includes(framework);
  }

  /**
   * Get list of supported frameworks
   * @returns Array of supported framework types
   */
  static getSupportedFrameworks(): AgentFramework[] {
    return [AgentFramework.ADK, AgentFramework.AGNO];
  }
}
