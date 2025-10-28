import { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgentCard from '@/components/common/AgentCard';
import AddAgentModal from '@/components/workbench/AddAgentModal';
import Button from '@/components/common/Button';
import { agentService } from '@/api/agentService';
import { Agent } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';

export default function WorkbenchDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAgents = async () => {
    try {
      setIsRefreshing(true);
      const data = await agentService.getAgents();
      // Filter to show only user's own agents
      const myAgents = data.filter((agent) => agent.owner_user_id === user?.user_id);
      setAgents(myAgents);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleAgentCreated = () => {
    setIsModalOpen(false);
    fetchAgents();
  };

  const handleAgentClick = (agent: Agent) => {
    navigate(`/workbench/playground/${agent.agent_id}`);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (window.confirm('이 에이전트를 삭제하시겠습니까?')) {
      try {
        await agentService.deleteAgent(agentId);
        fetchAgents();
      } catch (error) {
        console.error('Failed to delete agent:', error);
        alert('에이전트 삭제에 실패했습니다.');
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-300">
          My Workbench
        </h1>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchAgents}
          loading={isRefreshing}
          className="text-purple-600 dark:text-purple-400"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* New Agent Card */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
          >
            <Plus className="w-12 h-12 text-purple-500 dark:text-purple-400 mb-2" />
            <p className="text-purple-700 dark:text-purple-300 font-medium">
              새 에이전트 만들기
            </p>
          </div>

          {/* Agent Cards */}
          {agents.map((agent) => (
            <AgentCard
              key={agent.agent_id}
              agent={agent}
              mode="workbench"
              onClick={() => handleAgentClick(agent)}
              onDelete={() => handleDeleteAgent(agent.agent_id)}
            />
          ))}
        </div>
      )}

      {/* Add Agent Modal */}
      <AddAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAgentCreated}
      />
    </div>
  );
}
