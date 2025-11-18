import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { agentService, type AgentSearchResponse, type GetAgentsResponse } from '@/services/agentService';
import { type Agent, AgentStatus } from '@/types';
import AgentCard from '../common/AgentCard';
import { HubChat } from './HubChat';

// This component remains local as it's specific to the top picks section's style
const TopPickCard: React.FC<{ agent: Agent; onClick?: () => void }> = ({ agent, onClick }) => {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 w-72 flex-shrink-0 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div
        className="w-full bg-center bg-no-repeat aspect-[16/9] bg-cover rounded-t-xl"
        style={{ backgroundImage: `url(${agent.logo_url})` }}
      ></div>
      <div className="flex flex-col flex-1 justify-between p-4 pt-0">
        <div>
          <p className="text-slate-800 dark:text-white text-base font-bold">{agent.name}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-2">{agent.description}</p>
        </div>
        <button
          onClick={onClick}
          className="flex mt-4 min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-hub-accent hover:bg-hub-accent-dark text-white text-sm font-bold transition-colors"
        >
          <span>Launch</span>
        </button>
      </div>
    </div>
  );
};

export const HubDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Fetch top picks using the new search endpoint.
  const { data: topPicks, isLoading: isLoadingTopPicks } = useQuery({
    queryKey: ['topPicksAgents'],
    queryFn: () => agentService.searchAgents('popular'),
    select: (data: AgentSearchResponse) => data.agents,
  });

  // Fetch all deployed agents (DEPLOYED_ALL, DEPLOYED_TEAM, PRODUCTION)
  const { data: productionAgents, isLoading: isLoadingAgents } = useQuery({
    queryKey: ['productionAgents'],
    queryFn: async () => {
      // Get agents with each deployed status and combine them
      const [deployedAll, deployedTeam, production] = await Promise.all([
        agentService.getAgents({ status: AgentStatus.DEPLOYED_ALL }),
        agentService.getAgents({ status: AgentStatus.DEPLOYED_TEAM }),
        agentService.getAgents({ status: AgentStatus.PRODUCTION }),
      ]);

      // Combine all agents and remove duplicates by id
      const allAgents = [
        ...deployedAll.agents,
        ...deployedTeam.agents,
        ...production.agents,
      ];

      const uniqueAgents = Array.from(
        new Map(allAgents.map(agent => [agent.id, agent])).values()
      );

      return { agents: uniqueAgents, total: uniqueAgents.length };
    },
    select: (data: GetAgentsResponse) => data.agents,
  });

  // Filter logic now uses the data from useQuery
  const filteredAgents = (productionAgents || []).filter((agent: Agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.description && agent.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // If an agent is selected, show HubChat with absolute positioning to fill parent main
  if (selectedAgent) {
    return (
      <div className="absolute inset-0 z-10 bg-background-light dark:bg-background-dark">
        <HubChat agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-tighter">{t('hub.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{t('hub.subtitle')}</p>
      </div>
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          className="w-full h-14 pl-12 pr-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-gray-700 focus:ring-2 focus:ring-hub-accent focus:border-hub-accent transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-200"
          placeholder={t('hub.searchPlaceholder')}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight mb-4">{t('hub.topPicks')}</h2>
      <div className="mb-12 overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-stretch pb-4 gap-6">
          {isLoadingTopPicks ? (
            <p>Loading recommendations...</p>
          ) : (
            topPicks?.map((agent: Agent) => (
              <TopPickCard
                key={agent.id}
                agent={agent}
                onClick={() => setSelectedAgent(agent)}
              />
            ))
          )}
        </div>
      </div>

      <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight mb-6">{t('hub.allAgents')}</h2>
      {isLoadingAgents ? (
         <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAgents.map((agent: Agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      )}
    </div>
  );
};