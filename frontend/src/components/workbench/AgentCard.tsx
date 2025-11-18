import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { type Agent, AgentStatus } from '@/types';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onDeploy: (agent: Agent) => void;
  onClick: (agent: Agent) => void;
}

const getStatusBadge = (status: AgentStatus, isDarkMode: boolean, isLightBg: boolean, t: (key: string) => string) => {
  switch (status) {
    case AgentStatus.DEPLOYED_ALL:
      return (
        <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300 border border-green-700/30 dark:border-green-300/30">
          {t('workbench.agentCard.deployedAll')}
        </span>
      );
    case AgentStatus.DEPLOYED_TEAM:
      return (
        <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-700/30 dark:border-blue-300/30">
          {t('workbench.agentCard.deployedTeam')}
        </span>
      );
    case AgentStatus.DEVELOPMENT:
    default:
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
          isDarkMode || !isLightBg
            ? 'bg-white/20 text-white border-white/30'
            : 'bg-gray-800/20 text-gray-800 border-gray-800/30'
        }`}>
          {t('workbench.agentCard.development')}
        </span>
      );
  }
};

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit, onDelete, onDeploy, onClick }) => {
  const { t } = useTranslation();
  const isDeployed = agent.status === AgentStatus.DEPLOYED_ALL ||
                     agent.status === AgentStatus.DEPLOYED_TEAM;
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    // Show error if deployed
    if (isDeployed) {
      alert(t('workbench.agentCard.undeployFirst', { defaultValue: 'Please undeploy the agent first to access the playground' }));
      return;
    }

    onClick(agent);
  };

  // Calculate luminance to determine if color is light or dark
  const isLightColor = (hexColor: string): boolean => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  // Get card background color with dark mode support
  const getCardColor = () => {
    if (!agent.card_color) return isDarkMode ? 'rgba(243, 232, 255, 0.15)' : '#F3E8FF';

    // In dark mode, use the color with reduced opacity for better contrast
    if (isDarkMode) {
      // Convert hex to rgba with 15% opacity
      const hex = agent.card_color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    }

    return agent.card_color;
  };

  // Get text color based on background color
  const getTextColor = () => {
    if (isDarkMode) return 'text-white';
    if (!agent.card_color) return 'text-gray-900';
    return isLightColor(agent.card_color) ? 'text-gray-900' : 'text-white';
  };

  const getSecondaryTextColor = () => {
    if (isDarkMode) return 'text-gray-300';
    if (!agent.card_color) return 'text-gray-700';
    return isLightColor(agent.card_color) ? 'text-gray-700' : 'text-gray-200';
  };

  const getIconBgColor = () => {
    if (isDarkMode) return 'bg-black/20';
    if (!agent.card_color) return 'bg-white/50';
    return isLightColor(agent.card_color) ? 'bg-white/50' : 'bg-black/20';
  };

  const getIconTextColor = () => {
    if (isDarkMode) return 'text-gray-200';
    if (!agent.card_color) return 'text-gray-800';
    return isLightColor(agent.card_color) ? 'text-gray-800' : 'text-gray-200';
  };

  // Button styles following COLOR_MANAGEMENT_GUIDE.md
  const getButtonStyle = () => {
    if (isDarkMode) {
      return {
        backgroundColor: 'rgba(31, 41, 55, 0.9)', // gray-800 with opacity
        color: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.3)'
      };
    }
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      color: '#111827',
      borderColor: 'rgba(17, 24, 39, 0.2)'
    };
  };

  const getButtonHoverStyle = () => {
    if (isDarkMode) {
      return {
        backgroundColor: 'rgba(55, 65, 81, 0.95)' // gray-700
      };
    }
    return {
      backgroundColor: '#ffffff'
    };
  };

  // Undeploy button styles (red/danger)
  const getUndeployButtonStyle = () => {
    if (isDarkMode) {
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.9)', // red-500 with opacity
        color: '#ffffff',
        borderColor: 'rgba(239, 68, 68, 0.5)'
      };
    }
    return {
      backgroundColor: 'rgba(220, 38, 38, 0.9)', // red-600 with opacity
      color: '#ffffff',
      borderColor: 'rgba(220, 38, 38, 0.3)'
    };
  };

  const getUndeployButtonHoverStyle = () => {
    if (isDarkMode) {
      return {
        backgroundColor: 'rgba(220, 38, 38, 0.95)' // red-600
      };
    }
    return {
      backgroundColor: 'rgba(185, 28, 28, 0.95)' // red-700
    };
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex flex-col min-h-[198px] rounded-xl border border-gray-200 dark:border-gray-800 p-4 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
      style={{ backgroundColor: getCardColor() }}
    >
      {/* Header with Logo and Status */}
      <div className={`flex items-center justify-between mb-3 ${isDeployed ? 'opacity-60' : ''}`}>
        {agent.logo_url ? (
          <div className={`h-10 w-10 rounded-lg overflow-hidden ${getIconBgColor()}`}>
            <img src={agent.logo_url} alt={agent.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={`h-10 w-10 rounded-lg ${getIconBgColor()} flex items-center justify-center text-xl font-bold ${getIconTextColor()}`}>
            {agent.name.charAt(0).toUpperCase()}
          </div>
        )}
        {getStatusBadge(agent.status, isDarkMode, agent.card_color ? isLightColor(agent.card_color) : true, t)}
      </div>

      {/* Name and Description */}
      <div className={`flex flex-col gap-1 mb-3 flex-1 ${isDeployed ? 'opacity-60' : ''}`}>
        <p className={`${getTextColor()} text-base font-bold leading-normal`}>
          {agent.name}
        </p>
        <p className={`${getSecondaryTextColor()} text-sm font-normal leading-normal line-clamp-2`}>
          {agent.description || t('workbench.agentCard.noDescription')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isDeployed) {
              alert(t('workbench.agentCard.undeployFirst', { defaultValue: 'Please undeploy the agent first to edit' }));
              return;
            }
            onEdit(agent);
          }}
          className={`flex h-9 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg text-sm font-bold leading-normal transition-colors border ${
            isDeployed ? 'opacity-60' : ''
          }`}
          style={getButtonStyle()}
          onMouseEnter={(e) => {
            const hoverStyle = getButtonHoverStyle();
            e.currentTarget.style.backgroundColor = hoverStyle.backgroundColor;
          }}
          onMouseLeave={(e) => {
            const style = getButtonStyle();
            e.currentTarget.style.backgroundColor = style.backgroundColor;
          }}
        >
          {t('workbench.agentCard.edit')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeploy(agent);
          }}
          className="flex h-9 flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg text-sm font-bold leading-normal transition-colors border"
          style={isDeployed ? getUndeployButtonStyle() : getButtonStyle()}
          onMouseEnter={(e) => {
            const hoverStyle = isDeployed ? getUndeployButtonHoverStyle() : getButtonHoverStyle();
            e.currentTarget.style.backgroundColor = hoverStyle.backgroundColor;
          }}
          onMouseLeave={(e) => {
            const style = isDeployed ? getUndeployButtonStyle() : getButtonStyle();
            e.currentTarget.style.backgroundColor = style.backgroundColor;
          }}
        >
          {isDeployed ? t('workbench.agentCard.undeploy') : t('workbench.agentCard.deploy')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isDeployed) {
              alert(t('workbench.agentCard.undeployFirst', { defaultValue: 'Please undeploy the agent first to delete' }));
              return;
            }
            onDelete(agent);
          }}
          className={`flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg transition-colors border ${
            isDeployed ? 'opacity-60' : ''
          }`}
          style={getButtonStyle()}
          onMouseEnter={(e) => {
            const hoverStyle = getButtonHoverStyle();
            e.currentTarget.style.backgroundColor = hoverStyle.backgroundColor;
          }}
          onMouseLeave={(e) => {
            const style = getButtonStyle();
            e.currentTarget.style.backgroundColor = style.backgroundColor;
          }}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
