import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Globe, Users, AlertCircle, Loader2 } from 'lucide-react';
import type { Agent } from '@/types';
import { AgentStatus, AgentFramework } from '@/types';
import { agentService } from '@/services/agentService';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  onDeploySuccess: () => void;
}

// Helper function to get framework-specific endpoint
const getAgentEndpoint = (agent: Agent): string | undefined => {
  switch (agent.framework) {
    case AgentFramework.AGNO:
      return agent.agno_os_endpoint;
    case AgentFramework.ADK:
      return agent.a2a_endpoint;
    case AgentFramework.LANGCHAIN:
      return agent.langchain_config?.endpoint;
    default:
      return agent.a2a_endpoint;
  }
};

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  onClose,
  agent,
  onDeploySuccess
}) => {
  const { t } = useTranslation();
  const [deployScope, setDeployScope] = useState<'team' | 'public'>('team');
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentEndpoint = getAgentEndpoint(agent);

  const isDeployed = [
    AgentStatus.DEPLOYED_TEAM,
    AgentStatus.DEPLOYED_ALL,
    AgentStatus.PRODUCTION
  ].includes(agent.status);

  const handleDeploy = async () => {
    setError(null);
    setIsDeploying(true);

    try {
      if (isDeployed) {
        // Undeploy
        await agentService.undeployAgent(agent.id);
        onDeploySuccess();
        onClose();
      } else {
        // Deploy
        await agentService.deployAgent(agent.id, deployScope);
        onDeploySuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || t('workbench.deployModal.deploymentFailed'));
    } finally {
      setIsDeploying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg rounded-lg bg-panel-light dark:bg-panel-dark border border-border-light dark:border-border-dark p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {isDeployed ? t('workbench.deployModal.undeployAgent') : t('workbench.deployModal.deployAgent')}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-background-light dark:hover:bg-background-dark"
          >
            <X className="h-5 w-5 text-text-light-secondary dark:text-text-dark-secondary" />
          </button>
        </div>

        {/* Agent Info */}
        <div className="mb-6 rounded-lg bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark p-4">
          <div className="mb-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
            {t('workbench.deployModal.agentInformation')}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{t('workbench.deployModal.name')}</span>
              <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                {agent.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{t('workbench.deployModal.framework')}</span>
              <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                {agent.framework}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{t('workbench.deployModal.endpoint')}</span>
              <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                {agentEndpoint || t('workbench.deployModal.notConfigured')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{t('workbench.deployModal.currentStatus')}</span>
              <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                {agent.status}
              </span>
            </div>
          </div>
        </div>

        {/* Deploy Scope Selection (only for deployment) */}
        {!isDeployed && (
          <div className="mb-6">
            <div className="mb-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {t('workbench.deployModal.deploymentScope')}
            </div>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center rounded-lg border-2 border-border-light dark:border-border-dark p-3 hover:bg-background-light dark:hover:bg-background-dark">
                <input
                  type="radio"
                  value="team"
                  checked={deployScope === 'team'}
                  onChange={(e) => setDeployScope(e.target.value as 'team' | 'public')}
                  className="mr-3"
                />
                <Users className="mr-2 h-5 w-5" style={{ color: '#EA2831' }} />
                <div className="flex-1">
                  <div className="font-medium text-text-light-primary dark:text-text-dark-primary">{t('workbench.deployModal.teamOnly')}</div>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {t('workbench.deployModal.teamOnlyDesc')}
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-center rounded-lg border-2 border-border-light dark:border-border-dark p-3 hover:bg-background-light dark:hover:bg-background-dark">
                <input
                  type="radio"
                  value="public"
                  checked={deployScope === 'public'}
                  onChange={(e) => setDeployScope(e.target.value as 'team' | 'public')}
                  className="mr-3"
                />
                <Globe className="mr-2 h-5 w-5" style={{ color: '#359EFF' }} />
                <div className="flex-1">
                  <div className="font-medium text-text-light-primary dark:text-text-dark-primary">{t('workbench.deployModal.public')}</div>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {t('workbench.deployModal.publicDesc')}
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Warning/Info Messages */}
        {!isDeployed && !agentEndpoint && (
          <div className="mb-4 flex items-start rounded-lg bg-yellow-50 p-3 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
            <AlertCircle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium">{t('workbench.deployModal.endpointNotConfigured')}</div>
              <div>{t('workbench.deployModal.endpointNotConfiguredDesc')}</div>
            </div>
          </div>
        )}

        {isDeployed && (
          <div className="mb-4 flex items-start rounded-lg bg-blue-50 p-3 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <AlertCircle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium">{t('workbench.deployModal.agentCurrentlyDeployed')}</div>
              <div>{t('workbench.deployModal.undeployingWill')}</div>
              <ul className="mt-1 list-inside list-disc">
                <li>{t('workbench.deployModal.removeFromHub')}</li>
                <li>{t('workbench.deployModal.stopStatistics')}</li>
                <li>{t('workbench.deployModal.enableWorkbench')}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-start rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-900/20 dark:text-red-300">
            <AlertCircle className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeploying}
            className="rounded-lg border-2 border-border-light dark:border-border-dark px-4 py-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary hover:bg-background-light dark:hover:bg-background-dark disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleDeploy}
            disabled={isDeploying || (!isDeployed && !agentEndpoint)}
            className={`
              flex items-center rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors
              ${isDeployed
                ? 'bg-panel-light dark:bg-panel-dark hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'text-white hover:opacity-90'}
            `}
            style={isDeployed ? {
              borderColor: '#EA2831',
              color: '#EA2831'
            } : {
              backgroundColor: '#EA2831',
              borderColor: '#EA2831'
            }}
          >
            {isDeploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeployed ? t('workbench.deployModal.undeployAgent') : t('workbench.deployModal.deployAgent')}
          </button>
        </div>
      </div>
    </div>
  );
};