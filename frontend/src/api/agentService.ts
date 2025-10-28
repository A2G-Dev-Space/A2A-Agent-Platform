import axiosInstance from './axios';
import { Agent } from '@/types';
import { AgentFormData } from '@/components/workbench/AddAgentModal';

export const agentService = {
  // Get all agents
  async getAgents(params?: { status?: string; visibility?: string; mode?: string }): Promise<Agent[]> {
    const response = await axiosInstance.get('/api/agents/', { params });
    return response.data;
  },

  // Get single agent
  async getAgent(id: number): Promise<Agent> {
    const response = await axiosInstance.get(`/api/agents/${id}/`);
    return response.data;
  },

  // Create agent
  async createAgent(data: AgentFormData): Promise<Agent> {
    const response = await axiosInstance.post('/api/agents/', data);
    return response.data;
  },

  // Update agent
  async updateAgent(id: number, data: Partial<AgentFormData>): Promise<Agent> {
    const response = await axiosInstance.patch(`/api/agents/${id}/`, data);
    return response.data;
  },

  // Delete agent
  async deleteAgent(id: number): Promise<void> {
    await axiosInstance.delete(`/api/agents/${id}/`);
  },

  // Deploy agent to production
  async deployAgent(id: number, data: { visibility: string; production_endpoint?: string }): Promise<Agent> {
    const response = await axiosInstance.post(`/api/agents/${id}/deploy/`, data);
    return response.data;
  },

  // Health check
  async checkHealth(id: number): Promise<{ health_status: string }> {
    const response = await axiosInstance.post(`/api/agents/${id}/health-check/`);
    return response.data;
  },

  // AI ranking search
  async searchAgents(query: string): Promise<Agent[]> {
    const response = await axiosInstance.get(`/api/agents/search`, { params: { q: query } });
    return response.data;
  },
};
