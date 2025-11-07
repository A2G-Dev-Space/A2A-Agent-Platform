import React from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2 } from 'lucide-react';
import { type Agent, AgentStatus } from '@/types';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onDeploy: (agent: Agent) => void;
  onClick: (agent: Agent) => void;
}

const getStatusBadge = (status: AgentStatus) => {
  switch (status) {
    case AgentStatus.DEPLOYED_ALL:
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:text-green-200">
          DEPLOY TO ALL
        </span>
      );
    case AgentStatus.DEPLOYED_DEPT:
      return (
        <span className="inline-flex items-center rounded-full bg-sky-100 dark:bg-sky-900 px-2.5 py-0.5 text-xs font-semibold text-sky-800 dark:text-sky-200">
          DEPLOY TO DEPARTMENT
        </span>
      );
    case AgentStatus.DEVELOPMENT:
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-primary">
          DEVELOPMENT
        </span>
      );
  }
};

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit, onDelete, onDeploy, onClick }) => {
  const { t } = useTranslation();
  const isDeployed = agent.status === AgentStatus.DEPLOYED_ALL || agent.status === AgentStatus.DEPLOYED_DEPT;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick(agent);
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black/20 p-4 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
    >
      {/* Header with Icon and Status */}
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 text-2xl">
          {agent.name.charAt(0)}
        </div>
        {getStatusBadge(agent.status)}
      </div>

      {/* Name and Description */}
      <div className="flex flex-col gap-1">
        <p className="text-gray-900 dark:text-white text-base font-bold leading-normal">
          {agent.name}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal line-clamp-2">
          {agent.description || 'No description available'}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(agent);
          }}
          className="flex h-9 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-blue-600 text-white text-sm font-bold leading-normal hover:bg-blue-700 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeploy(agent);
          }}
          className={`flex h-9 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg text-sm font-bold leading-normal transition-colors ${
            isDeployed
              ? 'bg-amber-400 text-gray-900 hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600'
              : 'bg-primary text-gray-900 hover:bg-primary/80'
          }`}
        >
          {isDeployed ? 'UnDeploy' : 'Deploy'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(agent);
          }}
          className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-transparent text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
