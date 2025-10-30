import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, MoreVertical, RefreshCw, Send } from 'lucide-react';
import { agentService, type GetAgentsResponse } from '@/services/agentService';
import { type Agent, AgentStatus } from '@/types';
import AddAgentModal from './AddAgentModal';

const AgentListItem: React.FC<{ agent: Agent; selected: boolean; onClick: () => void }> = ({ agent, selected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center justify-between rounded-lg p-3 ${selected ? 'bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-white/5'}`}
    >
      <div className="flex flex-col">
        <p className={`font-semibold text-sm ${selected ? 'text-primary-dark dark:text-primary' : ''}`}>{agent.name}</p>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-dark dark:text-primary">
          {agent.status}
        </span>
      </div>
      <button className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/10">
        <MoreVertical className="text-xl" />
      </button>
    </div>
  );
};

const ChatPlayground: React.FC = () => {
    return (
        <div className="col-span-1 flex flex-col bg-background-light dark:bg-background-dark md:col-span-2 lg:col-span-2">
            <div className="flex h-16 items-center justify-between border-b border-border-light dark:border-border-dark p-4">
                <h2 className="text-base font-bold">Chat Playground</h2>
                <button className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 text-gray-600 dark:text-gray-300 gap-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/10 border border-border-light dark:border-border-dark">
                    <RefreshCw className="text-lg" />
                    <span className="truncate">Clear Session</span>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                {/* Chat messages will go here */}
            </div>
            <div className="border-t border-border-light dark:border-border-dark p-4">
                <div className="relative">
                    <textarea className="form-input w-full resize-none rounded-lg border-border-light bg-surface-light p-3 pr-24 text-sm placeholder:text-gray-400 focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark dark:border-border-dark dark:bg-surface-dark dark:text-white dark:focus:border-primary" placeholder="Type your message..." rows={2}></textarea>
                    <button className="absolute bottom-2 right-2 flex min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 w-16 bg-primary/80 text-primary-dark hover:bg-primary">
                        <Send className="text-xl" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const TraceView: React.FC = () => {
    return (
        <div className="col-span-1 flex flex-col bg-surface-light dark:bg-surface-dark lg:col-span-1">
            <div className="flex h-16 items-center justify-between border-b border-border-light dark:border-border-dark p-4">
                <h2 className="text-base font-bold">Trace</h2>
                <button className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/10">
                    <MoreVertical className="text-xl" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs">
                {/* Trace content will go here */}
            </div>
        </div>
    )
}

export const WorkbenchDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch development agents using React Query
  const { data: developmentAgents, isLoading } = useQuery({
    queryKey: ['developmentAgents'],
    queryFn: () => agentService.getAgents({ status: AgentStatus.DEVELOPMENT }),
    select: (data: GetAgentsResponse) => data.agents,
  });

  return (
    <div className="grid flex-1 grid-cols-1 gap-px overflow-y-auto bg-border-light dark:bg-border-dark md:grid-cols-3 lg:grid-cols-4">
      <div className="col-span-1 flex flex-col bg-surface-light dark:bg-surface-dark lg:col-span-1">
        <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark p-4">
          <h2 className="text-base font-bold">{t('workbench.agentsTitle')}</h2>
          <button onClick={() => setIsModalOpen(true)} className="flex min-w-0 max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 bg-primary/80 text-primary-dark gap-2 text-sm font-bold hover:bg-primary">
            <Plus className="text-lg" />
            <span className="truncate">{t('workbench.newAgent')}</span>
          </button>
        </div>
        <div className="border-b border-border-light dark:border-border-dark p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('workbench.filterPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? <p>Loading agents...</p> :
                developmentAgents?.map((agent: Agent) => (
                    <AgentListItem
                        key={agent.id}
                        agent={agent}
                        selected={selectedAgent?.id === agent.id}
                        onClick={() => setSelectedAgent(agent)}
                    />
                ))
            }
        </div>
      </div>

      {selectedAgent ? (
        <>
            <ChatPlayground />
            <TraceView />
        </>
      ) : (
        <div className="col-span-3 flex items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="text-center">
                <h2 className="text-2xl font-bold">{t('workbench.noAgentSelectedTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{t('workbench.noAgentSelectedSubtitle')}</p>
            </div>
        </div>
      )}

      <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};