import { create } from 'zustand'
import { type Agent, type AgentStatus, type AgentFramework, type AgentRecommendation } from '@/types'
import { agentService } from '@/services/agentService'

interface AgentState {
  agents: Agent[]
  selectedAgent: Agent | null
  recommendations: AgentRecommendation[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchAgents: (filters?: {
    status?: AgentStatus
    framework?: AgentFramework
    department?: string
  }) => Promise<void>
  fetchAgentById: (id: number) => Promise<Agent>
  createAgent: (data: Partial<Agent>) => Promise<Agent>
  updateAgent: (id: number, data: Partial<Agent>) => Promise<Agent>
  deleteAgent: (id: number) => Promise<void>
  selectAgent: (agent: Agent | null) => void
  getRecommendations: (query: string, k?: number) => Promise<void>
  clearError: () => void
}

export const useAgentStore = create<AgentState>()((set) => ({
  agents: [],
  selectedAgent: null,
  recommendations: [],
  isLoading: false,
  error: null,

  fetchAgents: async (filters) => {
    try {
      set({ isLoading: true, error: null })
      const response = await agentService.getAgents(filters)
      set({ agents: response.agents, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch agents',
        isLoading: false
      })
      throw error
    }
  },

  fetchAgentById: async (id: number) => {
    try {
      set({ isLoading: true, error: null })
      const agent = await agentService.getAgentById(id)
      set({ selectedAgent: agent, isLoading: false })
      return agent
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch agent',
        isLoading: false
      })
      throw error
    }
  },

  createAgent: async (data: Partial<Agent>) => {
    try {
      set({ isLoading: true, error: null })
      const newAgent = await agentService.createAgent(data)

      // Update local state
      set((state) => ({
        agents: [...state.agents, newAgent],
        isLoading: false
      }))

      return newAgent
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create agent',
        isLoading: false
      })
      throw error
    }
  },

  updateAgent: async (id: number, data: Partial<Agent>) => {
    try {
      set({ isLoading: true, error: null })
      const updatedAgent = await agentService.updateAgent(id, data)

      // Update local state
      set((state) => ({
        agents: state.agents.map(agent =>
          agent.id === id ? updatedAgent : agent
        ),
        selectedAgent: state.selectedAgent?.id === id
          ? updatedAgent
          : state.selectedAgent,
        isLoading: false
      }))

      return updatedAgent
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update agent',
        isLoading: false
      })
      throw error
    }
  },

  deleteAgent: async (id: number) => {
    try {
      set({ isLoading: true, error: null })
      await agentService.deleteAgent(id)

      // Update local state
      set((state) => ({
        agents: state.agents.filter(agent => agent.id !== id),
        selectedAgent: state.selectedAgent?.id === id
          ? null
          : state.selectedAgent,
        isLoading: false
      }))
    } catch (error: any) {
      set({
        error: error.message || 'Failed to delete agent',
        isLoading: false
      })
      throw error
    }
  },

  selectAgent: (agent: Agent | null) => {
    set({ selectedAgent: agent })
  },

  getRecommendations: async (query: string, k: number = 5) => {
    try {
      set({ isLoading: true, error: null })
      const response = await agentService.getRecommendations({ query, k })
      set({ recommendations: response.recommendations, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Failed to get recommendations',
        isLoading: false
      })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))