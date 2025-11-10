import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowLeft } from 'lucide-react';
import { agentService, type GetAgentsResponse } from '@/services/agentService';
import { chatService } from '@/services/chatService';
import { type Agent, AgentStatus } from '@/types';
import AddAgentModal from './AddAgentModal';
import { AgentCard } from './AgentCard';
import { ChatPlayground } from './ChatPlayground';
import { TraceView } from './TraceView';

export const WorkbenchDashboard: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);

  // Fetch development agents
  const { data: developmentAgents, isLoading } = useQuery({
    queryKey: ['developmentAgents'],
    queryFn: () => agentService.getAgents({ status: AgentStatus.DEVELOPMENT }),
    select: (data: GetAgentsResponse) => data.agents,
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (agentId: number) => {
      const response = await chatService.createSession(agentId);
      return response;
    },
    onSuccess: (data) => {
      setSessionId(data.id);
      setTraceId(data.trace_id);
    },
    onError: (error) => {
      console.error('Failed to create session:', error);
    },
  });

  // Delete agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: number) => {
      await agentService.deleteAgent(agentId);
    },
    onSuccess: () => {
      // Invalidate and refetch the agents list
      queryClient.invalidateQueries({ queryKey: ['developmentAgents'] });

      // If the deleted agent was selected, go back to grid view
      if (selectedAgent) {
        setSelectedAgent(null);
        setSessionId(null);
        setTraceId(null);
      }
    },
    onError: (error: any) => {
      console.error('Failed to delete agent:', error);
      alert(`Failed to delete agent: ${error.message || 'Unknown error'}`);
    },
  });

  // Create session when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      createSessionMutation.mutate(selectedAgent.id);
    } else {
      setSessionId(null);
      setTraceId(null);
    }
  }, [selectedAgent]);

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
  };

  const handleBackToGrid = () => {
    setSelectedAgent(null);
    setSessionId(null);
    setTraceId(null);
  };

  const handleEdit = (agent: Agent) => {
    console.log('Edit agent:', agent);
  };

  const handleDelete = (agent: Agent) => {
    // Show confirmation dialog before deletion
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${agent.name}"?\n\n` +
      `This will permanently remove the agent and all associated data including:\n` +
      `- Agent configuration\n` +
      `- Chat history\n` +
      `- Trace logs\n\n` +
      `This action cannot be undone.`
    );

    if (confirmDelete) {
      deleteAgentMutation.mutate(agent.id);
    }
  };

  const handleDeploy = (agent: Agent) => {
    console.log('Deploy/undeploy agent:', agent);
  };

  // Default view: Grid layout
  if (!selectedAgent) {
    return (
      <div className="flex flex-col flex-1 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-gray-900 dark:text-white text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em]">
            My Development Agents
          </h1>
        </div>

        {/* Grid of Agent Cards */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 sm:gap-6">
          {/* Add New Agent Card */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="flex min-h-[198px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-black/20 text-gray-500 dark:text-gray-400 transition-all hover:border-primary hover:text-primary dark:hover:border-primary/50 dark:hover:text-primary"
          >
            <Plus className="h-12 w-12" />
            <p className="text-base font-semibold">Add New Agent</p>
          </div>

          {/* Agent Cards */}
          {isLoading ? (
            <p className="col-span-full text-center text-gray-500">Loading agents...</p>
          ) : (
            developmentAgents?.map((agent: Agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={handleAgentClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDeploy={handleDeploy}
              />
            ))
          )}
        </div>

        <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    );
  }

  // Agent selected view: Chat + Trace (2-column)
  return (
    <div className="fixed inset-0 flex flex-col" style={{ marginLeft: '240px', marginTop: '64px' }}>
      {/* Back button */}
      <div className="px-4 sm:px-6">
        <div className="flex items-center gap-3 h-16 border-b border-border-light dark:border-border-dark">
          <button
            onClick={handleBackToGrid}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-dark dark:hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Agents</span>
          </button>
          <div className="h-6 w-px bg-border-light dark:bg-border-dark" />
          <h2 className="text-base font-bold">{selectedAgent.name}</h2>
        </div>
      </div>

      {/* Chat + Trace Grid */}
      <main className="flex-1 px-4 sm:px-6 py-4 overflow-hidden">
        <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-3">
          {sessionId && traceId ? (
            <>
              <ChatPlayground sessionId={sessionId} agentName={selectedAgent.name} agent={selectedAgent} />
              <TraceView traceId={traceId} />
            </>
          ) : (
            <div className="col-span-full flex items-center justify-center bg-background-light dark:bg-background-dark rounded-lg">
              <div className="text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  {t('workbench.creatingSession') || 'Creating session...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <AddAgentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
