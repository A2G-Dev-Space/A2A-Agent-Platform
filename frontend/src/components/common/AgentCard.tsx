import { Agent, AgentFramework } from '@/types';
import { Bot, Sparkles, Zap, Code } from 'lucide-react';
import { HEALTH_STATUS } from '@/utils/constants';
import { formatRelativeTime } from '@/utils/helpers';
import Card from '@/components/common/Card';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
  mode?: 'workbench' | 'hub';
}

const FRAMEWORK_ICONS: Record<AgentFramework, any> = {
  Agno: Sparkles,
  ADK: Bot,
  Langchain: Zap,
  Custom: Code,
};

export default function AgentCard({ agent, onClick, mode = 'workbench' }: AgentCardProps) {
  const Icon = FRAMEWORK_ICONS[agent.framework];
  const healthInfo = HEALTH_STATUS[agent.health_status];

  return (
    <Card onClick={onClick} hover className="group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              mode === 'workbench'
                ? 'bg-purple-100 dark:bg-purple-900'
                : 'bg-sky-100 dark:bg-sky-900'
            }`}
            style={{ backgroundColor: agent.card_color }}
          >
            <Icon className="w-6 h-6 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {agent.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                {agent.framework}
              </span>
              <span className={healthInfo.color}>{healthInfo.icon}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {agent.description}
      </p>

      {/* Skills */}
      {agent.skill_kr && (
        <div className="flex flex-wrap gap-2 mb-3">
          {agent.skill_kr.split(',').slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
            >
              {skill.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-200 dark:border-gray-700">
        <span>{agent.owner_username_kr || agent.owner_username}</span>
        <span>{formatRelativeTime(agent.created_at)}</span>
      </div>

      {/* Status Badge */}
      {agent.status === 'PRODUCTION' && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
            LIVE
          </span>
        </div>
      )}
    </Card>
  );
}
