import React from 'react';
import { type Agent, AgentFramework } from '@/types';
import { HubChatADK } from './HubChatADK';
import { HubChatAgno } from './HubChatAgno';
import { HubChatLangchain } from './HubChatLangchain';

interface HubChatProps {
  agent: Agent;
  onClose?: () => void;
}

/**
 * HubChat Wrapper Component
 *
 * Delegates to framework-specific implementations:
 * - ADK: Simple message-based chat for deployed agents
 * - Agno: Team/Agent selection + system events for deployed agents
 * - Langchain: Custom schema chat for deployed agents
 */
export const HubChat: React.FC<HubChatProps> = (props) => {
  // Delegate to framework-specific component
  if (props.agent.framework === AgentFramework.AGNO) {
    return <HubChatAgno {...props} />;
  }

  if (props.agent.framework === AgentFramework.LANGCHAIN) {
    return <HubChatLangchain {...props} />;
  }

  // Default to ADK for ADK framework or any unknown framework
  return <HubChatADK {...props} />;
};
