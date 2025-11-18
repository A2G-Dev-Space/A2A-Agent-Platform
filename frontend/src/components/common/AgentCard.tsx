import React from 'react';
import { useTranslation } from 'react-i18next';
import { type Agent } from '@/types';
import { Card, Badge, Button } from '@/components/ui';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick }) => {
  const { t } = useTranslation();
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

  // Get card background color with dark mode support
  const getCardColor = () => {
    if (!agent.card_color) return isDarkMode ? 'rgba(224, 242, 254, 0.15)' : '#E0F2FE';

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

  // Get framework icon path
  const getFrameworkIcon = () => {
    const framework = agent.framework?.toLowerCase();
    if (framework === 'agno') return '/framework-icons/agno.png';
    if (framework === 'adk') return '/framework-icons/adk.png';
    if (framework === 'langchain' || framework === 'langchain(custom)') return '/framework-icons/langchain.png';
    return null;
  };

  return (
    <Card className="group hover:border-hub-accent dark:hover:border-hub-accent-dark hover:shadow-xl transition-all duration-300">
      <Card.Body className="flex flex-col h-full">
        {/* Header: Logo + Name */}
        <div className="flex items-center gap-4 mb-3">
          <div className="relative">
            <div
              className="size-12 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: getCardColor() }}
            >
              {agent.logo_url ? (
                <img src={agent.logo_url} alt={agent.name} className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-2xl text-gray-700 dark:text-gray-200">smart_toy</span>
              )}
            </div>
            {/* Framework Icon Badge */}
            {getFrameworkIcon() && (
              <div className="absolute -bottom-1 -right-1 size-5 bg-white dark:bg-gray-800 rounded-full p-0.5 border border-gray-200 dark:border-gray-700">
                <img src={getFrameworkIcon()!} alt={agent.framework} className="w-full h-full object-contain" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-light-primary dark:text-text-dark-primary font-bold truncate">
              {agent.name}
            </p>
            {agent.capabilities?.version && (
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                v{agent.capabilities.version}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm mb-4 flex-1 line-clamp-3">
          {agent.description}
        </p>

        {/* Capabilities/Tags */}
        {agent.capabilities?.skills && agent.capabilities.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {agent.capabilities.skills.slice(0, 3).map((skill: string) => (
              <Badge key={skill} variant="info" size="sm">
                {skill}
              </Badge>
            ))}
            {agent.capabilities.skills.length > 3 && (
              <Badge variant="default" size="sm">
                +{agent.capabilities.skills.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-col gap-1 mb-4 text-xs">
          {agent.status && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Status:</span>
              <span className="text-text-light-secondary dark:text-text-dark-secondary">{agent.status}</span>
            </div>
          )}
          {agent.framework && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">Framework:</span>
              <span className="text-text-light-secondary dark:text-text-dark-secondary">{agent.framework}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant="secondary"
          className="w-full group-hover:bg-hub-accent group-hover:text-white group-hover:border-hub-accent dark:group-hover:bg-hub-accent dark:group-hover:border-hub-accent"
          onClick={onClick}
          leftIcon={<span className="material-symbols-outlined">chat</span>}
        >
          {t('hub.startChat')}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default AgentCard;