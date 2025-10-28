import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw } from 'lucide-react';
import AgentCard from '@/components/common/AgentCard';
import Button from '@/components/common/Button';
import { agentService } from '@/api/agentService';
import { Agent } from '@/types';

export default function HubDashboard() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchPublicAgents();
  }, []);

  const fetchPublicAgents = async () => {
    try {
      setIsLoading(true);
      const data = await agentService.getAgents();
      // Show only public agents
      const publicAgents = data.filter((agent) => agent.visibility === 'PUBLIC');
      setAgents(publicAgents);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPublicAgents();
      return;
    }

    try {
      setIsSearching(true);
      const results = await agentService.searchAgents(searchQuery);
      setAgents(results);
    } catch (error) {
      console.error('Failed to search agents:', error);
      alert('에이전트 검색에 실패했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAgentClick = (agent: Agent) => {
    navigate(`/hub/playground/${agent.agent_id}`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sky-700 dark:text-sky-300">Agent Hub</h1>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchPublicAgents}
          loading={isLoading && !isSearching}
          className="text-sky-600 dark:text-sky-400"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl mb-8">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="어떤 에이전트를 찾고 있나요? (예: 데이터 분석, 코드 리뷰, 번역)"
          className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-600"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        {searchQuery && (
          <Button
            onClick={handleSearch}
            loading={isSearching}
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            검색
          </Button>
        )}
      </div>

      {/* Agent Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-500 dark:text-gray-400">
            {searchQuery ? (
              <>
                <p className="text-lg mb-2">검색 결과가 없습니다</p>
                <p className="text-sm">다른 검색어로 시도해보세요</p>
              </>
            ) : (
              <>
                <p className="text-lg mb-2">공개된 에이전트가 없습니다</p>
                <p className="text-sm">에이전트가 공개되면 여기에 표시됩니다</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {searchQuery && (
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {agents.length}개의 에이전트를 찾았습니다
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <AgentCard
                key={agent.agent_id}
                agent={agent}
                mode="hub"
                onClick={() => handleAgentClick(agent)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
