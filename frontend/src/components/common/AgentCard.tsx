import React from 'react';
import { type Agent } from '@/types';

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

export default AgentCard;