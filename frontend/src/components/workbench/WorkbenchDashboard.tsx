import React, { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AgentCard } from '@/components/common/AgentCard'
import { AddAgentModal } from './AddAgentModal'
import { useAgentStore } from '@/stores/agentStore'
import { useAuthStore } from '@/stores/authStore'
import { type Agent, AgentStatus } from '@/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export const WorkbenchDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { agents, fetchAgents, deleteAgent, isLoading } = useAgentStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [myAgents, setMyAgents] = useState<Agent[]>([])

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    // Filter agents for current user in development mode
    if (user && agents && Array.isArray(agents) && agents.length > 0) {
      const filtered = agents.filter(
        agent => agent.owner_id === user.username &&
        agent.status === AgentStatus.DEVELOPMENT
      )
      setMyAgents(filtered)
    }
  }, [agents, user])

  const loadAgents = async () => {
    try {
      await fetchAgents({ status: AgentStatus.DEVELOPMENT })
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const handleAgentClick = (agent: Agent) => {
    navigate(`/workbench/${agent.id}`)
  }

  const handleEditAgent = (_agent: Agent) => {
    // TODO: Implement edit functionality
    toast('Edit functionality coming soon', { icon: 'ℹ️' })
  }

  const handleDeleteAgent = async (agent: Agent) => {
    if (window.confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      try {
        await deleteAgent(agent.id)
        toast.success('Agent deleted successfully')
      } catch (error) {
        toast.error('Failed to delete agent')
      }
    }
  }

  const filteredAgents = myAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-2">
          My Workbench
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Develop and test your AI agents
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search your agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 border-purple-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading agents...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Add New Agent Card */}
          <div
            onClick={() => setShowAddModal(true)}
            className={clsx(
              'border-2 border-dashed border-purple-300 dark:border-purple-700',
              'rounded-lg p-6 cursor-pointer transition-all duration-200',
              'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20',
              'flex flex-col items-center justify-center min-h-[200px]',
              'group'
            )}
          >
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus size={32} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
              Create New Agent
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              Start building your AI agent
            </p>
          </div>

          {/* Existing Agents */}
          {filteredAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              mode="workbench"
              onClick={() => handleAgentClick(agent)}
              onEdit={() => handleEditAgent(agent)}
              onDelete={() => handleDeleteAgent(agent)}
            />
          ))}

          {/* Empty State */}
          {filteredAgents.length === 0 && searchQuery && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No agents found matching "{searchQuery}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Agent Modal */}
      <AddAgentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadAgents()
          setShowAddModal(false)
        }}
      />
    </div>
  )
}