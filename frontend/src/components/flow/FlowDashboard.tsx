import React, { useState, useEffect } from 'react'
import { Play, ChevronDown, ChevronUp, X, Zap, Bot, CheckCircle, Loader } from 'lucide-react'
import { useAgentStore } from '@/stores/agentStore'
import { useAuthStore } from '@/stores/authStore'
import { type Agent, AgentStatus } from '@/types'
import { chatService } from '@/services/chatService'
import { agentService } from '@/services/agentService'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface FlowExecution {
  agent: Agent
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: string
  error?: string
}

export const FlowDashboard: React.FC = () => {
  const { agents, fetchAgents, getRecommendations } = useAgentStore()
  const { user } = useAuthStore()
  const [selectedAgents, setSelectedAgents] = useState<Agent[]>([])
  const [autoSelect, setAutoSelect] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [executions, setExecutions] = useState<FlowExecution[]>([])
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    // Filter production agents
    const productionAgents = agents.filter(
      agent => agent.status === AgentStatus.PRODUCTION && agent.is_public
    )
    setAvailableAgents(productionAgents)
  }, [agents])

  const loadAgents = async () => {
    try {
      await fetchAgents({ status: AgentStatus.PRODUCTION })
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  const handleAutoSelect = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query first')
      return
    }

    try {
      // Get AI recommendations
      await getRecommendations(query, 3)
      // The recommendations will be in the store, we need to map them to agents
      // For now, just select the first 3 agents as a demo
      const autoSelected = availableAgents.slice(0, 3)
      setSelectedAgents(autoSelected)
      toast.success(`Auto-selected ${autoSelected.length} agents`)
    } catch (error) {
      toast.error('Failed to auto-select agents')
    }
  }

  const handleAgentToggle = (agent: Agent) => {
    setSelectedAgents(prev => {
      const isSelected = prev.some(a => a.id === agent.id)
      if (isSelected) {
        return prev.filter(a => a.id !== agent.id)
      } else {
        return [...prev, agent]
      }
    })
  }

  const handleRunFlow = async () => {
    if (!query.trim()) {
      toast.error('Please enter a query')
      return
    }

    if (selectedAgents.length === 0) {
      toast.error('Please select at least one agent')
      return
    }

    setIsRunning(true)
    setExecutions(selectedAgents.map(agent => ({
      agent,
      status: 'pending'
    })))

    // Simulate sequential execution
    for (let i = 0; i < selectedAgents.length; i++) {
      const agent = selectedAgents[i]

      // Update status to running
      setExecutions(prev => prev.map((exec, idx) =>
        idx === i ? { ...exec, status: 'running' } : exec
      ))

      try {
        // Create a session and execute
        const session = await chatService.createSession(agent.id, `Flow: ${query}`)
        const result = await agentService.executeAgent(agent.id, {
          task: query,
          context: {
            user_id: user?.username,
            session_id: session.id,
            flow_mode: true
          }
        })

        // Update with result
        setExecutions(prev => prev.map((exec, idx) =>
          idx === i
            ? { ...exec, status: 'completed', result: JSON.stringify(result) }
            : exec
        ))
      } catch (error: any) {
        // Update with error
        setExecutions(prev => prev.map((exec, idx) =>
          idx === i
            ? { ...exec, status: 'error', error: error.message }
            : exec
        ))
      }

      // Small delay between agents
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
    toast.success('Flow execution completed')
  }

  const getStatusIcon = (status: FlowExecution['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-gray-300" />
      case 'running':
        return <Loader size={16} className="animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />
      case 'error':
        return <X size={16} className="text-red-500" />
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Zap size={32} className="text-teal-600" />
          <h1 className="text-3xl font-bold text-teal-700 dark:text-teal-300">
            Agent Flow
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Orchestrate multiple agents to solve complex tasks
        </p>
      </div>

      {/* Agent Selection */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="font-medium">
              {selectedAgents.length > 0
                ? `${selectedAgents.length} agents selected`
                : 'Select Agents'}
            </span>
            {dropdownOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto animate-fadeIn">
              {/* Auto-select option */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSelect}
                    onChange={(e) => {
                      setAutoSelect(e.target.checked)
                      if (e.target.checked) {
                        handleAutoSelect()
                      }
                    }}
                    className="w-4 h-4 text-teal-600"
                  />
                  <span className="font-medium">Auto-select (AI recommends)</span>
                </label>
              </div>

              {/* Agent list */}
              <div className="p-4 space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Available Agents ({availableAgents.length})
                </p>
                {availableAgents.map(agent => (
                  <label
                    key={agent.id}
                    className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.some(a => a.id === agent.id)}
                      onChange={() => handleAgentToggle(agent)}
                      className="w-4 h-4 text-teal-600 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot size={16} className="text-gray-400" />
                        <span className="font-medium">{agent.name}</span>
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded-full',
                          'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        )}>
                          {agent.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {agent.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  Selected: {selectedAgents.length} agents
                </span>
                <button
                  onClick={() => setDropdownOpen(false)}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected agents display */}
        {selectedAgents.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedAgents.map(agent => (
              <div
                key={agent.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full text-sm"
              >
                <span>{agent.name}</span>
                <button
                  onClick={() => handleAgentToggle(agent)}
                  className="hover:text-teal-900 dark:hover:text-teal-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Query Input */}
      <div className="max-w-3xl mx-auto mb-8">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What would you like the agents to do?"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          rows={4}
        />
        <button
          onClick={handleRunFlow}
          disabled={isRunning || selectedAgents.length === 0 || !query.trim()}
          className={clsx(
            'mt-4 px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 mx-auto',
            isRunning || selectedAgents.length === 0 || !query.trim()
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700 text-white hover:shadow-lg transform hover:scale-[1.02]'
          )}
        >
          {isRunning ? (
            <>
              <Loader size={20} className="animate-spin" />
              Running Flow...
            </>
          ) : (
            <>
              <Play size={20} />
              Run Flow
            </>
          )}
        </button>
      </div>

      {/* Execution Results */}
      {executions.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">Execution Progress</h2>
          <div className="space-y-3">
            {executions.map((exec, index) => (
              <div
                key={index}
                className={clsx(
                  'p-4 rounded-lg border transition-all duration-200',
                  exec.status === 'running' && 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20',
                  exec.status === 'completed' && 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20',
                  exec.status === 'error' && 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20',
                  exec.status === 'pending' && 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                )}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(exec.status)}
                  <div className="flex-1">
                    <h3 className="font-medium flex items-center gap-2">
                      {exec.agent.name}
                      {exec.status === 'running' && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          Processing...
                        </span>
                      )}
                    </h3>
                    {exec.result && (
                      <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-sm">
                        <pre className="whitespace-pre-wrap break-words">
                          {exec.result}
                        </pre>
                      </div>
                    )}
                    {exec.error && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                        Error: {exec.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}