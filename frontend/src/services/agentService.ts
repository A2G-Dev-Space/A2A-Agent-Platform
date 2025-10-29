import { apiClient } from './api'
import { type Agent, type AgentStatus, type AgentFramework, type RecommendationRequest, type AgentRecommendation } from '@/types'

const AGENT_BASE = '/agents'

export const agentService = {
  // Get agents with optional filters (including Access Control)
  getAgents: async (filters?: {
    status?: AgentStatus
    framework?: AgentFramework
    department?: string
    visibility?: 'public' | 'private' | 'team'
    only_mine?: boolean
  }): Promise<{ agents: Agent[], total: number }> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.framework) params.append('framework', filters.framework)
    if (filters?.department) params.append('department', filters.department)
    if (filters?.visibility) params.append('visibility', filters.visibility)
    if (filters?.only_mine) params.append('only_mine', 'true')

    return apiClient.get(`${AGENT_BASE}/?${params.toString()}`)
  },

  // Get single agent by ID
  getAgentById: async (id: number): Promise<Agent> => {
    return apiClient.get(`${AGENT_BASE}/${id}/`)
  },

  // Create new agent
  createAgent: async (data: Partial<Agent>): Promise<Agent> => {
    return apiClient.post(`${AGENT_BASE}/`, data)
  },

  // Update agent (includes status update)
  updateAgent: async (id: number, data: Partial<Agent>): Promise<Agent> => {
    return apiClient.patch(`${AGENT_BASE}/${id}/`, data)
  },

  // Delete agent
  deleteAgent: async (id: number): Promise<void> => {
    return apiClient.delete(`${AGENT_BASE}/${id}/`)
  },
}