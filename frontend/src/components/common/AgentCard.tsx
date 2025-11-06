import React from 'react';
import { type Agent } from '@/types';
import { Card, Badge, Button } from '@/components/ui';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick }) => {
  return (
    <Card className="group hover:border-hub-accent dark:hover:border-hub-accent-dark hover:shadow-xl transition-all duration-300">
      <Card.Body className="flex flex-col h-full">
        {/* Header: Logo + Name */}
        <div className="flex items-center gap-4 mb-3">
          <div className="size-12 rounded-lg bg-hub-accent-light dark:bg-hub-accent/20 flex items-center justify-center overflow-hidden">
            {agent.logo_url ? (
              <img src={agent.logo_url} alt={agent.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-2xl text-hub-accent">smart_toy</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-light-primary dark:text-text-dark-primary font-bold truncate">
              {agent.name}
            </p>
            {agent.version && (
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                v{agent.version}
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
        <div className="flex items-center gap-4 mb-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
          {agent.status && (
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="capitalize">{agent.status}</span>
            </div>
          )}
          {agent.framework && (
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">category</span>
              <span>{agent.framework}</span>
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
          Start Chat
        </Button>
      </Card.Body>
    </Card>
  );
};

export default AgentCard;