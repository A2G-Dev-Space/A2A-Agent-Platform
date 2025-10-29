import React from 'react'
import { Settings as SettingsIcon, X, Bot } from 'lucide-react'
import { type Agent, HealthStatus } from '@/types'
import clsx from 'clsx'

interface AgentCardProps {
  agent: Agent
  mode: 'workbench' | 'hub' | 'flow'
  onEdit?: () => void
  onDelete?: () => void
  onClick?: () => void
  isSelected?: boolean
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  mode,
  onEdit,
  onDelete,
  onClick,
  isSelected,
}) => {
  const defaultColors = {
    workbench: '#E9D5FF', // Pastel purple
    hub: '#E0F2FE', // Pastel blue
    flow: '#CCFBF1', // Pastel teal
  }

  const cardBgColor = agent.card_color || defaultColors[mode]

  const getHealthStatusIcon = () => {
    switch (agent.health_status) {
      case HealthStatus.HEALTHY:
        return <span className="text-green-500">🟢</span>
      case HealthStatus.UNHEALTHY:
        return <span className="text-red-500">🔴</span>
      case HealthStatus.UNKNOWN:
      default:
        return <span className="text-gray-400">⚪</span>
    }
  }

  const isDisabled = agent.status === 'DEPRECATED'

  return (
    <div
      className={clsx(
        'relative rounded-lg p-4 transition-all duration-200 cursor-pointer group',
        'hover:shadow-lg hover:-translate-y-1',
        isSelected && 'ring-2 ring-purple-500',
        isDisabled && 'opacity-60'
      )}
      style={{ backgroundColor: cardBgColor }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Logo/Icon */}
          <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-sm">
            {agent.logo_url ? (
              <img
                src={agent.logo_url}
                alt={agent.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Bot size={24} className="text-gray-600 dark:text-gray-400" />
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-lg line-clamp-2 flex-1">
            {agent.title || agent.name}
          </h3>
        </div>

        {/* Action buttons for Workbench mode */}
        {mode === 'workbench' && (
          <div className={clsx(
            'flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'
          )}>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors"
                title="Edit"
              >
                <SettingsIcon size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors text-red-500"
                title="Delete"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Health status for production agents */}
        {agent.status === 'PRODUCTION' && (
          <div className="flex items-center gap-1 text-sm">
            {getHealthStatusIcon()}
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {agent.health_status}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3 mb-3">
        {agent.description}
      </p>

      {/* Capabilities/Tags */}
      {agent.capabilities?.skills && agent.capabilities.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {agent.capabilities.skills.slice(0, 5).map((skill, index) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 bg-white/50 dark:bg-gray-800/50 rounded-full text-gray-700 dark:text-gray-300"
            >
              {skill}
            </span>
          ))}
          {agent.capabilities.skills.length > 5 && (
            <span className="text-xs px-2 py-0.5 text-gray-500">
              +{agent.capabilities.skills.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="border-t border-gray-300/30 dark:border-gray-700/30 pt-2 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
        <span>{agent.owner_username || agent.owner_id}</span>
        <div className="flex items-center gap-2">
          {agent.department && <span>{agent.department}</span>}
          <span className={clsx(
            'px-1.5 py-0.5 rounded text-xs font-medium',
            agent.framework === 'Agno' && 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
            agent.framework === 'ADK' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
            agent.framework === 'Langchain' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
            agent.framework === 'Custom' && 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          )}>
            {agent.framework}
          </span>
        </div>
      </div>

      {/* Status Badge */}
      {agent.status !== 'PRODUCTION' && (
        <div className={clsx(
          'absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium',
          agent.status === 'DEVELOPMENT' && 'bg-yellow-100 text-yellow-700',
          agent.status === 'STAGING' && 'bg-blue-100 text-blue-700',
          agent.status === 'DEPRECATED' && 'bg-red-100 text-red-700'
        )}>
          {agent.status}
        </div>
      )}

      {/* Disabled Overlay */}
      {isDisabled && (
        <div className="absolute inset-0 bg-gray-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <span className="bg-gray-800 text-white px-3 py-1 rounded text-sm">
            Deprecated
          </span>
        </div>
      )}
    </div>
  )
}