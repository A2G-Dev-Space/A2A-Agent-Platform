import React from 'react';
import { type Agent, AgentFramework } from '@/types';
import { ChatPlaygroundADK } from './ChatPlaygroundADK';
import { ChatPlaygroundAgno } from './ChatPlaygroundAgno';
import { ChatPlaygroundLangchain } from './ChatPlaygroundLangchain';

interface ChatPlaygroundProps {
  sessionId?: string;
  agentName?: string;
  agent: Agent;
  onTraceIdReceived?: (traceId: string) => void;
}

/**
 * ChatPlayground Wrapper Component
 *
 * Delegates to framework-specific implementations:
 * - ADK: Simple endpoint → direct chat
 * - Agno: Endpoint → Test Connection → Teams/Agents selection → Chat with system events
 * - Langchain(custom): User-defined endpoint and schema → configurable chat
 */
export const ChatPlayground: React.FC<ChatPlaygroundProps> = (props) => {
  // Delegate to framework-specific component
  if (props.agent.framework === AgentFramework.AGNO) {
    return <ChatPlaygroundAgno {...props} />;
  }

  if (props.agent.framework === AgentFramework.LANGCHAIN) {
    return <ChatPlaygroundLangchain {...props} />;
  }

  // Default to ADK for ADK framework or any unknown framework
  return <ChatPlaygroundADK {...props} />;
};
