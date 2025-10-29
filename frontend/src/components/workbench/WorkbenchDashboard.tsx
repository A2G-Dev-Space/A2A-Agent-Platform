import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '@/stores/agentStore'
import { useAuthStore } from '@/stores/authStore'
import { type Agent, AgentStatus } from '@/types'
import { AddAgentModal } from './AddAgentModal'
import toast from 'react-hot-toast'

const AgentListPanel = ({ agents, onSelectAgent, selectedAgent, onNewAgent }) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="col-span-1 flex flex-col bg-surface-light dark:bg-surface-dark lg:col-span-1">
      <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark p-4">
        <h2 className="text-base font-bold">Agents</h2>
        <button
          onClick={onNewAgent}
          className="flex min-w-0 max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 bg-primary/80 text-primary-dark gap-2 text-sm font-bold hover:bg-primary"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span className="truncate">New Agent</span>
        </button>
      </div>
      <div className="border-b border-border-light dark:border-border-dark p-4">
        <label className="flex h-10 w-full flex-col">
          <div className="flex w-full flex-1 items-stretch rounded-lg">
            <div className="flex items-center justify-center rounded-l-lg border border-r-0 border-border-light bg-background-light pl-3 text-gray-400 dark:border-border-dark dark:bg-background-dark">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input
              className="form-input h-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg border border-l-0 border-border-light bg-background-light p-2 text-sm placeholder:text-gray-400 focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark dark:border-border-dark dark:bg-background-dark dark:text-white dark:focus:border-primary-dark"
              placeholder="Filter agents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </label>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filteredAgents.map(agent => (
          <div
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className={`flex cursor-pointer items-center justify-between rounded-lg p-3 ${selectedAgent?.id === agent.id ? 'bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
          >
            <div className="flex flex-col">
              <p className={`font-semibold text-sm ${selectedAgent?.id === agent.id ? 'font-bold' : ''}`}>{agent.name}</p>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-dark dark:text-primary">{agent.status}</span>
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/10">
              <span className="material-symbols-outlined text-xl">more_vert</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const ChatPlaygroundPanel = ({ selectedAgent }) => {
  if (!selectedAgent) {
    return (
      <div className="col-span-1 flex flex-col bg-background-light dark:bg-background-dark md:col-span-2 lg:col-span-2">
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-4">
            <span className="material-symbols-outlined text-5xl mb-2">chat</span>
            <p className="font-bold">Select an agent</p>
            <p className="text-sm">Select an agent from the list to start a new chat session.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="col-span-1 flex flex-col bg-background-light dark:bg-background-dark md:col-span-2 lg:col-span-2">
      <div className="flex h-16 items-center justify-between border-b border-border-light dark:border-border-dark p-4">
        <h2 className="text-base font-bold">Chat Playground: {selectedAgent.name}</h2>
        <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 text-gray-600 dark:text-gray-300 gap-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/10 border border-border-light dark:border-border-dark">
          <span className="material-symbols-outlined text-lg">refresh</span>
          <span className="truncate">Clear Session</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {/* Placeholder for chat messages */}
        <div className="flex items-start gap-4">
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBshepXOM1JSuIOC14Y9n-KJxgo65jxWmcdtcdwNaowr5q7HFnsShE3hVm-SJ_D-ux8lXQjBamKvthXENg8lbvBOw3Y5hKzhMIGRP8Wl5Le89alLO78yAp-TOXU4xAItTAv9CtC1LPz5Msq_HKeUvNr_OiFN_Z41fces5H7OygUrXAxGbyr0ZmdlrNF53-1Y88DUgYBeV_X92lFOyNueVDjtpfsDEf-gXzPK6pG9sFfYsOYrpxjoXaMyKxdvB5ZOWw6eKQ8ghIAsKZc")'}}></div>
            <div className="flex flex-col gap-1">
                <p className="font-bold text-sm">You</p>
                <div className="rounded-lg rounded-tl-none bg-surface-light dark:bg-surface-dark p-3 text-sm leading-relaxed">
                    <p>Hello, I'm having an issue with my recent order #12345. Can you help me track it?</p>
                </div>
            </div>
        </div>
      </div>
      <div className="border-t border-border-light dark:border-border-dark p-4">
        <div className="relative">
          <textarea className="form-input w-full resize-none rounded-lg border-border-light bg-surface-light p-3 pr-24 text-sm placeholder:text-gray-400 focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark dark:border-border-dark dark:bg-surface-dark dark:text-white dark:focus:border-primary" placeholder="Type your message..." rows="2"></textarea>
          <button className="absolute bottom-2 right-2 flex min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 w-16 bg-primary/80 text-primary-dark hover:bg-primary">
            <span className="material-symbols-outlined text-xl">send</span>
          </button>
        </div>
      </div>
    </div>
  )
}

const LogsPanel = ({ selectedAgent }) => {
    return (
        <div className="col-span-1 flex flex-col bg-surface-light dark:bg-surface-dark lg:col-span-1">
            <div className="flex h-16 items-center justify-between border-b border-border-light dark:border-border-dark p-4">
                <h2 className="text-base font-bold">Logs</h2>
                <button className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/10">
                    <span className="material-symbols-outlined text-xl">delete_sweep</span>
                </button>
            </div>
            <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark p-2">
                <button className="flex-1 rounded-md px-2 py-1 text-xs font-bold bg-primary/20 text-primary-dark dark:text-primary">All</button>
                <button className="flex-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-100 dark:hover:bg-white/5 text-green-600 dark:text-green-400">Info</button>
                <button className="flex-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-100 dark:hover:bg-white/5 text-yellow-600 dark:text-yellow-400">Warn</button>
                <button className="flex-1 rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-100 dark:hover:bg-white/5 text-red-600 dark:text-red-400">Error</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                {/* Placeholder for logs */}
                <div className="flex items-start gap-2">
                    <span className="text-gray-500">14:32:01</span>
                    <span className="font-bold text-green-500">INFO</span>
                    <p className="break-all">Session started for agent '{selectedAgent?.name || '...'}'.</p>
                </div>
            </div>
        </div>
    )
}


export const WorkbenchDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const { agents, fetchAgents } = useAgentStore()
  const [myAgents, setMyAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const loadAgents = async () => {
    try {
      await fetchAgents({ status: AgentStatus.DEVELOPMENT })
    } catch (error) {
      console.error('Failed to load agents:', error)
      toast.error('Failed to load agents')
    }
  }

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    if (user && agents && Array.isArray(agents)) {
      const filtered = agents.filter(
        agent => agent.owner_id === user.username && agent.status === AgentStatus.DEVELOPMENT
      )
      setMyAgents(filtered)
      if (!selectedAgent && filtered.length > 0) {
        setSelectedAgent(filtered[0])
      }
    }
  }, [agents, user])

  return (
    <div className="grid flex-1 grid-cols-1 gap-px overflow-y-auto bg-border-light dark:bg-border-dark md:grid-cols-3 lg:grid-cols-4">
      <AgentListPanel
        agents={myAgents}
        onSelectAgent={setSelectedAgent}
        selectedAgent={selectedAgent}
        onNewAgent={() => setShowAddModal(true)}
      />
      <ChatPlaygroundPanel selectedAgent={selectedAgent} />
      <LogsPanel selectedAgent={selectedAgent} />

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