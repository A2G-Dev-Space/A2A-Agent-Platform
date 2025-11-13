import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { adminAPI } from '../../services/api';

interface ComprehensiveStatistics {
  total_users: number;
  active_agents: number;
  agents_in_dev: number;
  user_monthly_growth: Array<{ month: string; count: number }>;
  agent_monthly_growth: Array<{
    month: string;
    total_count: number;
    deployed_count: number;
    development_count: number;
  }>;
  token_monthly_usage: Array<{
    month: string;
    total_tokens: number;
    request_tokens: number;
    response_tokens: number;
    call_count: number;
  }>;
  agent_token_usage: Array<{
    trace_id: string;
    agent_name: string;
    owner_id: string;
    agent_display_name: string;
    model: string;
    provider: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    call_count: number;
  }>;
  model_usage_stats: Array<{
    model: string;
    provider: string;
    total_tokens: number;
    call_count: number;
    unique_users: number;
  }>;
}

interface UserTokenUsage {
  user_id: number;
  total_tokens: number;
  total_calls: number;
  usage_by_model: Array<{
    model: string;
    provider: string;
    total_tokens: number;
    request_tokens: number;
    response_tokens: number;
    call_count: number;
    avg_latency_ms: number;
  }>;
}

const StatisticsPage: React.FC = () => {
  const { t } = useTranslation();

  // State for statistics data
  const [stats, setStats] = useState<ComprehensiveStatistics | null>(null);
  const [userUsage, setUserUsage] = useState<UserTokenUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters
  const [monthsRange, setMonthsRange] = useState(12);
  const [topKUsers, setTopKUsers] = useState(5);
  const [topKAgents, setTopKAgents] = useState(10);
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [agentGrowthFilter, setAgentGrowthFilter] = useState<'all' | 'deployed'>('all');
  const [searchUserId, setSearchUserId] = useState<string>('');
  const [globalGroupBy, setGlobalGroupBy] = useState<'week' | 'month'>('month');
  const [selectedAgentForToken, setSelectedAgentForToken] = useState<string>('all');

  // Fetch comprehensive statistics with user growth
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await adminAPI.get<ComprehensiveStatistics>(
          `/statistics/comprehensive/?months=${monthsRange}&group_by=${globalGroupBy}&top_k_users=${topKUsers}&top_k_agents=${topKAgents}`
        );
        setStats(response.data);
      } catch (err: any) {
        console.error('Failed to fetch statistics:', err);
        setError(err.response?.data?.detail || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [monthsRange, globalGroupBy, topKUsers, topKAgents]);

  // Fetch token usage separately when selected agent changes
  useEffect(() => {
    const fetchTokenUsage = async () => {
      try {
        const response = await adminAPI.get<{ data: Array<{
          month: string;
          total_tokens: number;
          request_tokens: number;
          response_tokens: number;
          call_count: number;
        }> }>(
          `/llm-proxy-service/api/v1/statistics/monthly-token-usage?months=${monthsRange}&group_by=${globalGroupBy}&trace_id=${selectedAgentForToken}`
        );

        setStats(prevStats => prevStats ? {
          ...prevStats,
          token_monthly_usage: response.data.data
        } : null);
      } catch (err: any) {
        console.error('Failed to fetch token usage:', err);
      }
    };

    // Fetch when agent filter changes
    if (stats) {
      fetchTokenUsage();
    }
  }, [selectedAgentForToken, monthsRange, globalGroupBy, stats?.total_users]);

  // Fetch user-specific token usage when searching
  useEffect(() => {
    const fetchUserUsage = async () => {
      if (searchUserId && !isNaN(Number(searchUserId))) {
        try {
          const response = await fetch(
            `http://localhost:9050/api/v1/statistics/user-usage/${searchUserId}`
          );
          if (response.ok) {
            const data = await response.json();
            setUserUsage(data);
          } else {
            setUserUsage(null);
          }
        } catch (err) {
          console.error('Failed to fetch user usage:', err);
          setUserUsage(null);
        }
      } else {
        setUserUsage(null);
      }
    };

    const debounce = setTimeout(fetchUserUsage, 500);
    return () => clearTimeout(debounce);
  }, [searchUserId]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600 dark:text-slate-400">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  // Filter agent token usage by selected model
  const filteredAgentUsage = selectedModel === 'all'
    ? stats.agent_token_usage
    : stats.agent_token_usage.filter(item => item.model === selectedModel);

  // Filter agent growth data based on selected filter
  const agentGrowthData = stats.agent_monthly_growth.map(item => ({
    month: item.month,
    count: agentGrowthFilter === 'deployed' ? item.deployed_count : item.total_count
  }));

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {t('settings.statistics.title')}
        </h3>

        {/* Global Controls */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>Months:</span>
            <select
              value={monthsRange}
              onChange={(e) => setMonthsRange(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-900 dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-100"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>1 year</option>
              <option value={24}>2 years</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>Group by:</span>
            <select
              value={globalGroupBy}
              onChange={(e) => setGlobalGroupBy(e.target.value as 'week' | 'month')}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-900 dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-100"
            >
              <option value="month">Monthly</option>
              <option value="week">Weekly</option>
            </select>
          </label>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1f2937]">
          <p className="text-base font-medium leading-normal text-slate-600 dark:text-slate-400">
            {t('settings.statistics.totalUsers')}
          </p>
          <p className="text-3xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white">
            {stats.total_users.toLocaleString()}
          </p>
        </div>
        <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1f2937]">
          <p className="text-base font-medium leading-normal text-slate-600 dark:text-slate-400">
            {t('settings.statistics.activeAgents')}
          </p>
          <p className="text-3xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white">
            {stats.active_agents.toLocaleString()}
          </p>
        </div>
        <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#1f2937]">
          <p className="text-base font-medium leading-normal text-slate-600 dark:text-slate-400">
            {t('settings.statistics.agentsInDev')}
          </p>
          <p className="text-3xl font-bold leading-tight tracking-tight text-slate-800 dark:text-white">
            {stats.agents_in_dev.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Monthly Growth Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Monthly Growth */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1f2937]">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            User Growth (Cumulative)
          </h3>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.user_monthly_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  name="Users"
                  dot={{ fill: '#60a5fa', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Agent Monthly Growth */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1f2937]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Agent Growth (Cumulative)
            </h3>
            <select
              value={agentGrowthFilter}
              onChange={(e) => setAgentGrowthFilter(e.target.value as 'all' | 'deployed')}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-100"
            >
              <option value="all">Development + Deployed</option>
              <option value="deployed">Deployed Only</option>
            </select>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={agentGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#34d399"
                  strokeWidth={3}
                  name="Agents"
                  dot={{ fill: '#34d399', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Token Usage Monthly Growth */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1f2937]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            LLM Token Usage (Cumulative)
          </h3>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>Agent:</span>
            <select
              value={selectedAgentForToken}
              onChange={(e) => setSelectedAgentForToken(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-900 dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-100"
            >
              <option value="all">All Agents</option>
              {stats.agent_token_usage.map((agent) => (
                <option key={agent.trace_id} value={agent.trace_id}>
                  {agent.agent_display_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.token_monthly_usage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Legend wrapperStyle={{ color: '#cbd5e1' }} />
              <Line
                type="monotone"
                dataKey="total_tokens"
                stroke="#a78bfa"
                strokeWidth={3}
                name="Total Tokens"
                dot={{ fill: '#a78bfa', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="request_tokens"
                stroke="#22d3ee"
                strokeWidth={3}
                name="Request Tokens"
                dot={{ fill: '#22d3ee', r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="response_tokens"
                stroke="#fbbf24"
                strokeWidth={3}
                name="Response Tokens"
                dot={{ fill: '#fbbf24', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Token Usage Section (Unified) */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1f2937]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Agent Token Usage
          </h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span>Top K:</span>
              <input
                type="range"
                min="1"
                max="50"
                value={topKAgents}
                onChange={(e) => setTopKAgents(Number(e.target.value))}
                className="w-24"
              />
              <span className="w-8 text-center">{topKAgents}</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span>Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-slate-900 dark:border-slate-700 dark:bg-[#1f2937] dark:text-slate-100"
              >
                <option value="all">All Models</option>
                {stats.model_usage_stats.map((model) => (
                  <option key={`${model.model}-${model.provider}`} value={model.model}>
                    {model.model} ({model.provider})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filteredAgentUsage.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Agent</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Model</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-600 dark:text-slate-400">Prompt Tokens</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-600 dark:text-slate-400">Completion Tokens</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-600 dark:text-slate-400">Total Tokens</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-600 dark:text-slate-400">LLM Calls</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgentUsage.map((agent, idx) => (
                  <tr
                    key={`${agent.trace_id}-${agent.model}`}
                    className={idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800' : ''}
                  >
                    <td className="px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                      {agent.agent_display_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
                      {agent.model}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-800 dark:text-slate-100">
                      {agent.prompt_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-800 dark:text-slate-100">
                      {agent.completion_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {agent.total_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-600 dark:text-slate-400">
                      {agent.call_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 text-center text-slate-600 dark:text-slate-400">
            No agent token usage data available
          </div>
        )}
      </div>

      {/* Model Usage Stats Table */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#1f2937]">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Model Usage Statistics
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Model</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-600 dark:text-slate-400">Provider</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-600 dark:text-slate-400">Total Tokens</th>
                <th className="px-4 py-2 text-right text-sm font-medium text-slate-600 dark:text-slate-400">LLM Calls</th>
              </tr>
            </thead>
            <tbody>
              {stats.model_usage_stats.map((model, idx) => (
                <tr
                  key={`${model.model}-${model.provider}`}
                  className={idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800' : ''}
                >
                  <td className="px-4 py-2 text-sm text-slate-800 dark:text-slate-100">{model.model}</td>
                  <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">{model.provider}</td>
                  <td className="px-4 py-2 text-right text-sm text-slate-800 dark:text-slate-100">
                    {model.total_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-slate-800 dark:text-slate-100">
                    {model.call_count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
