import api from './api';
import { type Agent, type AgentStatus, type AgentFramework } from '@/types';

export interface AgentSearchResponse {
    agents: Agent[];
    count: number;
    query: string;
}

export interface GetAgentsResponse {
    agents: Agent[];
    total: number;
}

export const agentService = {
  getAgents: async (filters?: {
    status?: AgentStatus;
    framework?: AgentFramework;
    department?: string;
    visibility?: 'public' | 'private' | 'team';
    only_mine?: boolean;
  }): Promise<GetAgentsResponse> => {
    return await api.get<GetAgentsResponse>('/agents/', { params: filters });
  },

  getAgentById: async (id: number): Promise<Agent> => {
    return await api.get<Agent>(`/agents/${id}/`);
  },

  createAgent: async (data: Partial<Agent>): Promise<Agent> => {
    return await api.post<Agent>('/agents/', data);
  },

  updateAgent: async (id: number, data: Partial<Agent>): Promise<Agent> => {
    return await api.put<Agent>(`/agents/${id}`, data);
  },

  deleteAgent: async (id: number): Promise<void> => {
    await api.delete<void>(`/agents/${id}/`);
  },

  searchAgents: async (query: string): Promise<AgentSearchResponse> => {
    return await api.post<AgentSearchResponse>('/agents/search', { query });
  },
};