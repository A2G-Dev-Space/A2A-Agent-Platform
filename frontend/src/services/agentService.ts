import { apiClient as api } from './api';
import type { Agent } from '@/types';
import { AgentStatus, AgentFramework } from '@/types';

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
    await api.delete<void>(`/agents/${id}`);
  },

  searchAgents: async (query: string): Promise<AgentSearchResponse> => {
    return await api.post<AgentSearchResponse>('/agents/search', { query });
  },

  deployAgent: async (id: number, deployScope: 'team' | 'public'): Promise<{
    agent_id: number;
    status: string;
    deployed_at: string;
    deployed_by: string;
    validated_endpoint: string;
    deploy_scope: string;
  }> => {
    return await api.post(`/agents/${id}/deploy`, {
      deploy_scope: deployScope,
      deploy_config: {}
    });
  },

  undeployAgent: async (id: number): Promise<{
    agent_id: number;
    status: string;
    message: string;
  }> => {
    return await api.post(`/agents/${id}/undeploy`);
  },
};