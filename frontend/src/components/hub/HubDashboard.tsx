import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '@/stores/agentStore'
import { type Agent, AgentStatus } from '@/types'
import toast from 'react-hot-toast'

const TopPickCard = ({ agent, onLaunch }) => (
  <div className="flex flex-col gap-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 w-72 flex-shrink-0 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
    <div className="w-full bg-center bg-no-repeat aspect-[16/9] bg-cover rounded-t-xl" style={{ backgroundImage: `url(${agent.bgUrl})` }}></div>
    <div className="flex flex-col flex-1 justify-between p-4 pt-0">
      <div>
        <p className="text-slate-800 dark:text-white text-base font-bold">{agent.name}</p>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{agent.description}</p>
      </div>
      <button onClick={() => onLaunch(agent)} className="flex mt-4 min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-hub-accent hover:bg-hub-accent-dark text-white text-sm font-bold transition-colors">
        <span>Launch</span>
      </button>
    </div>
  </div>
)

const AgentGridCard = ({ agent, onStartChat }) => {
  const tagColors = [
    'text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/50',
    'text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50',
    'text-rose-600 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/50',
    'text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50',
    'text-teal-600 bg-teal-100 dark:text-teal-300 dark:bg-teal-900/50',
    'text-fuchsia-600 bg-fuchsia-100 dark:text-fuchsia-300 dark:bg-fuchsia-900/50',
  ]

  const iconColors = [
    'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-400',
    'bg-rose-100 dark:bg-rose-900/50 text-rose-500 dark:text-rose-400',
    'bg-teal-100 dark:bg-teal-900/50 text-teal-500 dark:text-teal-400',
    'bg-amber-100 dark:bg-amber-900/50 text-amber-500 dark:text-amber-400',
  ]

  return (
    <div className="group flex flex-col p-5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-hub-accent dark:hover:border-hub-accent-dark hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-4 mb-3">
        <div className={`size-12 rounded-lg flex items-center justify-center ${iconColors[agent.id % iconColors.length]}`}>
          <span className="material-symbols-outlined text-3xl">{agent.icon || 'support_agent'}</span>
        </div>
        <p className="text-slate-900 dark:text-white font-bold">{agent.name}</p>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex-1">{agent.description}</p>
      <div className="flex items-center gap-2 mb-4">
        {agent.tags?.map((tag, index) => (
          <span key={tag} className={`text-xs font-medium px-2 py-1 rounded-full ${tagColors[index % tagColors.length]}`}>{tag}</span>
        ))}
      </div>
      <button onClick={() => onStartChat(agent)} className="w-full flex cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-slate-100 dark:bg-slate-800 group-hover:bg-hub-accent group-hover:text-white text-slate-700 dark:text-slate-300 text-sm font-bold transition-colors">
        <span>Start Chat</span>
      </button>
    </div>
  )
}

export const HubDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { agents, fetchAgents, isLoading } = useAgentStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [productionAgents, setProductionAgents] = useState<Agent[]>([])

  const loadAgents = async () => {
    try {
      await fetchAgents({ status: AgentStatus.PRODUCTION })
    } catch (error) {
      console.error('Failed to load agents:', error)
      toast.error('Failed to load agents')
    }
  }

  useEffect(() => {
    loadAgents()
  }, [])

  useEffect(() => {
    if (agents && Array.isArray(agents)) {
      const filtered = agents.filter(agent => agent.status === AgentStatus.PRODUCTION)
      setProductionAgents(filtered)
    }
  }, [agents])

  const handleAgentClick = (agent: Agent) => {
    navigate(`/workbench?agent=${agent.id}`)
    toast.success(`Navigating to ${agent.name} in Workbench.`)
  }

  const filteredAgents = productionAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topPicks = [
    { id: 1, name: "Customer Support Bot", description: "Handles customer queries instantly.", bgUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAFvpJtfAyetRXQCCQrpijWJzLJ74V_-Sw18ooQYgHRLOR4ucBIwxuctUOQDoTcmrGF8RBTgt62wH579RFUFKU6z2iFxQZK7sCOrfmyivHmMkKbSd1XKfL6W8Y3f4P5Sre2zEMP4w3HurGQgeLDfATMeZw0FH3zUHGhJEJGPsAsuq2rY98REffYQ1npMo85oRIg7oq8TrLNaA17NU4co30acOnSEJSlON_ZqPljnec2d5xjJX8OnJbOfAR3TLBj937JtjPi0a_VdRAV" },
    { id: 2, name: "Sales Assistant", description: "Automates lead qualification and follow-ups.", bgUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAzLn9Pq6SaAKUIE4cbYNnVP_mRClcoufZFaSY6iUOmNgORHCH_eelSJbGPrTn01zx72uMyLxwYSv_WXAAtb5WKs91ji_4qd1ORJX25L14PXKx55nbWRwAZ-SZ5YI2sBOWQ5CJn_NHZv-qJX3wPBAcNFooPNee1WCN6WBLMMKUmiEPRlJkqN_sdgTt-WBRtCUNmun0XVsMMO6xMIAfJ2dYrwqbWmY7pQeidNkDJFClcl068lvPapXAoQdk9YZrb96mqBQmAZCvpwJQ2" },
    { id: 3, name: "Data Analyst AI", description: "Generates deep insights from your data.", bgUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKIVIoNcEJvqr1xrUem2BaBYGeINg2rfzfu-hhz1436AtZKYHroRNuIJtZ0JQeT1DH0shxuZUaOX1kDa1VPgplEIl942ZwoHFZ-2t3k3UuHU-_PAYQv7-U8tmZDEh_hOZDGXOxI2wRb5LhIvunJ63ehlq-sWTQVISAkGvWbd19LUS5k1XGs3UfoWT4gyB_hRc1Q79cXGqkYolJhfH5dSPW3N36efhaxbcWuERDDniDs_tE7huhq2WpIUI0w6JWIO4_qH42vBxtpzzz" },
  ];

  const allAgents = filteredAgents.map(agent => ({
    ...agent,
    icon: 'support_agent',
    tags: ['Support', 'Customer'],
  }));


  return (
    <main className="flex-1 p-6 lg:p-10 bg-background-light dark:bg-background-dark">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-tighter">Agent Hub</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Discover and launch production-ready agents.</p>
        </div>

        <div className="relative mb-10">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            className="w-full h-14 pl-12 pr-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-hub-accent focus:border-hub-accent transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-200"
            placeholder="Search for agents by name, tag, or description..."
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight mb-4">Top Picks for You</h2>
        <div className="mb-12 overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-stretch pb-4 gap-6">
            {topPicks.map(agent => <TopPickCard key={agent.id} agent={agent} onLaunch={handleAgentClick} />)}
          </div>
        </div>

        <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight mb-6">All Agents</h2>
        {isLoading ? (
          <div className="text-center py-10">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allAgents.map(agent => <AgentGridCard key={agent.id} agent={agent} onStartChat={handleAgentClick} />)}
          </div>
        )}
      </div>
    </main>
  )
}