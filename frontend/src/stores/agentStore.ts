import { create } from 'zustand';
import { type Agent } from '@/types';

// This store is now responsible only for UI state related to agents,
// such as tracking the currently selected agent in a list.
// Fetching and caching of agent data is handled by React Query in the components.

interface AgentUiState {
  selectedAgent: Agent | null;
  selectAgent: (agent: Agent | null) => void;
}

export const useAgentStore = create<AgentUiState>()((set) => ({
  selectedAgent: null,
  selectAgent: (agent: Agent | null) => {
    set({ selectedAgent: agent });
  },
}));