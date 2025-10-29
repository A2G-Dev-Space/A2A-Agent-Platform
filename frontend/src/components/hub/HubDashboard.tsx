import React, { useEffect, useState } from 'react'
import { Search, Filter, TrendingUp, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AgentCard } from '@/components/common/AgentCard'
import { useAgentStore } from '@/stores/agentStore'
import { type Agent, AgentStatus, AgentFramework } from '@/types'
import clsx from 'clsx'

export const HubDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { agents, recommendations, fetchAgents, getRecommendations, isLoading } = useAgentStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFramework, setSelectedFramework] = useState<AgentFramework | 'ALL'>('ALL')
  const [showFilters, setShowFilters] = useState(false)
  const [productionAgents, setProductionAgents] = useState<Agent[]>([])

  useEffect(() => {
    loadProductionAgents()
  }, [])

  useEffect(() => {
    // Filter only production agents
    if (agents && Array.isArray(agents)) {
      const filtered = agents.filter(agent =>
        agent.status === AgentStatus.PRODUCTION && agent.is_public
      )
      setProductionAgents(filtered)
    }
  }, [agents])

  useEffect(() => {
    // Get AI recommendations when search query changes
    if (searchQuery.length > 2) {
      const debounceTimer = setTimeout(() => {
        getRecommendations(searchQuery, 5)
      }, 500)
      return () => clearTimeout(debounceTimer)
    }
  }, [searchQuery])

  const loadProductionAgents = async () => {
    try {
      await fetchAgents({ status: AgentStatus.PRODUCTION })
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const handleAgentClick = (agent: Agent) => {
    navigate(`/hub/${agent.id}`)
  }

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await getRecommendations(searchQuery, 10)
    }
  }

  // Filter agents based on search and framework
  const filteredAgents = productionAgents.filter(agent => {
    const matchesSearch = !searchQuery ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.capabilities?.skills?.some(skill =>
        skill.toLowerCase().includes(searchQuery.toLowerCase())
      )

    const matchesFramework = selectedFramework === 'ALL' ||
      agent.framework === selectedFramework

    return matchesSearch && matchesFramework
  })

  // Combine recommendations with filtered agents
  const displayAgents = searchQuery && recommendations.length > 0
    ? recommendations.map(rec =>
        productionAgents.find(a => a.id === rec.agent_id)
      ).filter(Boolean) as Agent[]
    : filteredAgents

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-sky-700 dark:text-sky-300 mb-2">
          Agent Hub
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and use production-ready AI agents
        </p>
      </div>

      {/* Search Section */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="What kind of agent are you looking for?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 text-lg"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Sparkles size={20} />
              AI Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'px-4 py-3 border rounded-lg transition-colors flex items-center gap-2',
                showFilters
                  ? 'bg-sky-100 dark:bg-sky-900 border-sky-300 dark:border-sky-700'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Filter size={20} />
            </button>
          </div>

          {/* AI Recommendations Badge */}
          {searchQuery && recommendations.length > 0 && (
            <div className="absolute -bottom-6 left-0 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                AI found {recommendations.length} relevant agents
              </span>
            </div>
          )}
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-fadeIn">
            <h3 className="text-sm font-semibold mb-3">Filter by Framework</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedFramework('ALL')}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  selectedFramework === 'ALL'
                    ? 'bg-sky-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                )}
              >
                All Frameworks
              </button>
              {Object.values(AgentFramework).map(framework => (
                <button
                  key={framework}
                  onClick={() => setSelectedFramework(framework)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    selectedFramework === framework
                      ? 'bg-sky-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  {framework}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 border-sky-500 mx-auto mb-4" />
            <p className="text-gray-500">Loading agents...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Recommendations Section */}
          {searchQuery && recommendations.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="text-yellow-500" size={20} />
                AI Recommendations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayAgents.slice(0, 6).map(agent => (
                  <div key={agent.id} className="relative">
                    <AgentCard
                      agent={agent}
                      mode="hub"
                      onClick={() => handleAgentClick(agent)}
                    />
                    {/* Similarity Score Badge */}
                    {recommendations.find(r => r.agent_id === agent.id) && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 rounded text-xs font-medium text-yellow-700 dark:text-yellow-300">
                        {Math.round(
                          recommendations.find(r => r.agent_id === agent.id)!.similarity_score * 100
                        )}% Match
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Agents Section */}
          {(!searchQuery || recommendations.length === 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  mode="hub"
                  onClick={() => handleAgentClick(agent)}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {displayAgents.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Search size={40} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No agents found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? `No agents match "${searchQuery}"`
                  : 'No production agents available'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}