import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useAgentStore } from '@/stores/agentStore';
import { type Agent } from '@/types';

// This would be a real API call in a real app
const dummyTopPicks: Agent[] = [
  // ... (dummy data)
];

const dummyAllAgents: Agent[] = [
    // ... (dummy data)
];


const TopPickCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 w-72 flex-shrink-0 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div
        className="w-full bg-center bg-no-repeat aspect-[16/9] bg-cover rounded-t-xl"
        style={{ backgroundImage: `url(${agent.avatar_url})` }}
      ></div>
      <div className="flex flex-col flex-1 justify-between p-4 pt-0">
        <div>
          <p className="text-slate-800 dark:text-white text-base font-bold">{agent.name}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{agent.description}</p>
        </div>
        <button className="flex mt-4 min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-hub-accent hover:bg-hub-accent-dark text-white text-sm font-bold transition-colors">
          <span>Launch</span>
        </button>
      </div>
    </div>
  );
};

const AgentCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  return (
    <div className="group flex flex-col p-5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-hub-accent dark:hover:border-hub-accent-dark hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-4 mb-3">
        <div className="size-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
          <img src={agent.avatar_url} alt={agent.name} className="size-8" />
        </div>
        <p className="text-slate-900 dark:text-white font-bold">{agent.name}</p>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex-1">{agent.description}</p>
      <div className="flex items-center gap-2 mb-4">
        {agent.tags?.map((tag) => (
          <span key={tag} className="text-xs font-medium text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/50 px-2 py-1 rounded-full">
            {tag}
          </span>
        ))}
      </div>
      <button className="w-full flex cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-slate-100 dark:bg-slate-800 group-hover:bg-hub-accent group-hover:text-white text-slate-700 dark:text-slate-300 text-sm font-bold transition-colors">
        <span>Start Chat</span>
      </button>
    </div>
  );
};


export const HubDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const { agents, isLoading } = useAgentStore();

  const productionAgents = agents.filter(agent => agent.status === 'PRODUCTION');

  const filteredAgents = productionAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-slate-900 dark:text-white text-4xl font-black tracking-tighter">{t('hub.title')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">{t('hub.subtitle')}</p>
      </div>
      <div className="relative mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full h-14 pl-12 pr-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-hub-accent focus:border-hub-accent transition-shadow placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-200"
          placeholder={t('hub.searchPlaceholder')}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight mb-4">{t('hub.topPicks')}</h2>
      <div className="mb-12 overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-stretch pb-4 gap-6">
          {dummyTopPicks.map(agent => <TopPickCard key={agent.id} agent={agent} />)}
        </div>
      </div>

      <h2 className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight mb-6">{t('hub.allAgents')}</h2>
      {isLoading ? (
         <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAgents.map(agent => <AgentCard key={agent.id} agent={agent} />)}
        </div>
      )}
    </div>
  );
};