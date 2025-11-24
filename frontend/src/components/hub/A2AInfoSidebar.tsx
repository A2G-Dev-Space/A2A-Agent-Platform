import React, { useState, useEffect } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { Agent } from '@/types';
import { copyToClipboard } from '@/utils/clipboard';
import { getGatewayBaseUrl } from '@/config/api';

interface A2AEndpoint {
  name: string;
  url: string;
  agentCardUrl: string;
  type?: 'team' | 'agent';
  resourceId?: string;
}

interface A2AInfoSidebarProps {
  agent: Agent;
}

export const A2AInfoSidebar: React.FC<A2AInfoSidebarProps> = ({ agent }) => {
  const [endpoints, setEndpoints] = useState<A2AEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['endpoints']));

  // Use absolute URL with HOST_IP and GATEWAY_PORT
  const API_BASE_URL = getGatewayBaseUrl();

  useEffect(() => {
    fetchA2AEndpoints();
  }, [agent.id]);

  const fetchA2AEndpoints = async () => {
    setIsLoading(true);
    try {
      const endpointsList: A2AEndpoint[] = [];

      if (agent.framework === 'ADK') {
        // ADK: Single endpoint
        endpointsList.push({
          name: agent.name,
          url: `${API_BASE_URL}/api/v1/a2a/${agent.name}`,
          agentCardUrl: `${API_BASE_URL}/api/v1/a2a/${agent.name}/.well-known/agent-card.json`,
        });
      } else if (agent.framework === 'Langchain(custom)') {
        // Langchain: Single endpoint
        endpointsList.push({
          name: agent.name,
          url: `${API_BASE_URL}/api/v1/a2a/${encodeURIComponent(agent.name)}`,
          agentCardUrl: `${API_BASE_URL}/api/v1/a2a/${encodeURIComponent(agent.name)}/.well-known/agent-card.json`,
        });
      } else if (agent.framework === 'Agno') {
        // Agno: Fetch teams and agents from original endpoint
        if (agent.agno_os_endpoint) {
          try {
            // Fetch teams
            const teamsRes = await fetch(`${agent.agno_os_endpoint}/teams`);
            if (teamsRes.ok) {
              const teams = await teamsRes.json();
              teams.forEach((team: any) => {
                endpointsList.push({
                  name: `${agent.name} (team: ${team.name})`,
                  url: `${API_BASE_URL}/api/v1/a2a/${agent.name}-team-${team.id}`,
                  agentCardUrl: `${API_BASE_URL}/api/v1/a2a/${agent.name}-team-${team.id}/.well-known/agent-card.json`,
                  type: 'team',
                  resourceId: team.id,
                });
              });
            }

            // Fetch agents
            const agentsRes = await fetch(`${agent.agno_os_endpoint}/agents`);
            if (agentsRes.ok) {
              const agents = await agentsRes.json();
              agents.forEach((agentItem: any) => {
                endpointsList.push({
                  name: `${agent.name} (agent: ${agentItem.name})`,
                  url: `${API_BASE_URL}/api/v1/a2a/${agent.name}-agent-${agentItem.id}`,
                  agentCardUrl: `${API_BASE_URL}/api/v1/a2a/${agent.name}-agent-${agentItem.id}/.well-known/agent-card.json`,
                  type: 'agent',
                  resourceId: agentItem.id,
                });
              });
            }
          } catch (error) {
            console.error('[A2AInfoSidebar] Failed to fetch Agno resources:', error);
          }
        }
      }

      setEndpoints(endpointsList);
    } catch (error) {
      console.error('[A2AInfoSidebar] Failed to fetch A2A endpoints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      console.error('Failed to copy text');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const generateCurlCommand = (endpoint: A2AEndpoint): string => {
    return `curl -X POST "${endpoint.url}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": "req-001",
    "method": "message/send",
    "params": {
      "message": {
        "messageId": "msg-001",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "Hello!"
          }
        ]
      }
    }
  }'`;
  };

  if (isLoading) {
    return (
      <aside className="w-96 border-l flex items-center justify-center"
        style={{
          backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff',
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
        }}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading A2A info...</p>
      </aside>
    );
  }

  return (
    <aside className="w-96 border-l flex flex-col overflow-y-auto"
      style={{
        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff',
        borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b"
        style={{
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
        }}
      >
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">A2A Protocol Info</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Framework: {agent.framework}</p>
      </div>

      {/* Endpoints Section */}
      <div className="border-b"
        style={{
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
        }}
      >
        <button
          onClick={() => toggleSection('endpoints')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            Exposed Endpoints ({endpoints.length})
          </span>
          {expandedSections.has('endpoints') ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>

        {expandedSections.has('endpoints') && (
          <div className="px-4 pb-4 space-y-3">
            {endpoints.map((endpoint, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {endpoint.name}
                    </p>
                    {endpoint.type && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {endpoint.type}
                      </span>
                    )}
                  </div>
                </div>

                {/* A2A Endpoint URL */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    A2A Endpoint:
                  </label>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded overflow-x-auto whitespace-nowrap text-gray-800 dark:text-gray-200">
                      {endpoint.url}
                    </code>
                    <button
                      onClick={() => handleCopy(endpoint.url, `url-${idx}`)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Copy URL"
                    >
                      {copiedId === `url-${idx}` ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Agent Card URL */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Agent Card:
                  </label>
                  <div className="flex items-center gap-1">
                    <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded overflow-x-auto whitespace-nowrap text-gray-800 dark:text-gray-200">
                      {endpoint.agentCardUrl}
                    </code>
                    <button
                      onClick={() => handleCopy(endpoint.agentCardUrl, `card-${idx}`)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Copy Agent Card URL"
                    >
                      {copiedId === `card-${idx}` ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Example curl Section */}
      {endpoints.length > 0 && (
        <div className="border-b"
          style={{
            borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
          }}
        >
          <button
            onClick={() => toggleSection('curl')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              Example curl Command
            </span>
            {expandedSections.has('curl') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {expandedSections.has('curl') && (
            <div className="px-4 pb-4">
              <div className="relative">
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                  <code>{generateCurlCommand(endpoints[0])}</code>
                </pre>
                <button
                  onClick={() => handleCopy(generateCurlCommand(endpoints[0]), 'curl')}
                  className="absolute top-2 right-2 p-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                  title="Copy curl command"
                >
                  {copiedId === 'curl' ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                This is an example using the first endpoint. Adjust the URL for other endpoints.
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
