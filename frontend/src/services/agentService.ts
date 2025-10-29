import { apiClient } from './api'
import { type Agent, type AgentStatus, type AgentFramework, type RecommendationRequest, type AgentRecommendation } from '@/types'

const AGENT_BASE = '/agents'

export const agentService = {
  // Get agents with optional filters
  getAgents: async (filters?: {
    status?: AgentStatus
    framework?: AgentFramework
    department?: string
  }): Promise<{ agents: Agent[], total: number }> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.framework) params.append('framework', filters.framework)
    if (filters?.department) params.append('department', filters.department)

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

  // Update agent
  updateAgent: async (id: number, data: Partial<Agent>): Promise<Agent> => {
    return apiClient.patch(`${AGENT_BASE}/${id}/`, data)
  },

  // Delete agent
  deleteAgent: async (id: number): Promise<void> => {
    return apiClient.delete(`${AGENT_BASE}/${id}/`)
  },

  // Update agent status
  updateAgentStatus: async (id: number, status: AgentStatus): Promise<Agent> => {
    return apiClient.patch(`${AGENT_BASE}/${id}/status/`, { status })
  },

  // A2A Registration
  registerA2AAgent: async (data: {
    name: string
    framework: AgentFramework
    endpoint: string
    capabilities: any
  }) => {
    return apiClient.post(`${AGENT_BASE}/a2a/register/`, data)
  },

  // Execute agent
  executeAgent: async (agentId: number, data: {
    task: string
    context?: any
    parameters?: any
  }) => {
    return apiClient.post(`${AGENT_BASE}/${agentId}/execute/`, data)
  },

  // Get agent recommendations (Top-K)
  getRecommendations: async (request: RecommendationRequest): Promise<{
    recommendations: AgentRecommendation[]
  }> => {
    return apiClient.post(`${AGENT_BASE}/recommend/`, request)
  },

  // Health check
  checkAgentHealth: async (id: number) => {
    return apiClient.get(`${AGENT_BASE}/${id}/health/`)
  },

  // Get agent capabilities
  getAgentCapabilities: async (id: number) => {
    return apiClient.get(`${AGENT_BASE}/${id}/capabilities/`)
  },

  // Test agent connection
  testAgentConnection: async (endpoint: string, framework: AgentFramework) => {
    return apiClient.post(`${AGENT_BASE}/test-connection/`, { endpoint, framework })
  },
}