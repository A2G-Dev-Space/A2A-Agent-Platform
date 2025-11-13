import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Send, User, Bot, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { type Agent, AgentFramework } from '@/types';
import { agentService } from '@/services/agentService';
import { generateFixedTraceId, getPlatformLlmEndpointUrl } from '@/utils/trace';
import type { ChatAdapter } from '@/adapters/chat';
import { ChatAdapterFactory } from '@/adapters/chat';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPlaygroundProps {
  sessionId?: string;  // Optional for workbench mode
  agentName?: string;  // Optional, will use agent.name if not provided
  agent: Agent;
  onTraceIdReceived?: (traceId: string) => void;  // Callback for dynamic trace_id
}

export const ChatPlayground: React.FC<ChatPlaygroundProps> = ({ sessionId, agentName, agent, onTraceIdReceived }) => {
  // Use agent.name if agentName is not provided
  const displayName = agentName || agent.name;
  const { t } = useTranslation();
  const { accessToken, user } = useAuthStore();

  // Messages state - will be loaded from backend
  const [messages, setMessages] = useState<Message[]>([]);

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate fixed trace_id for this user+agent combination
  const traceId = user ? generateFixedTraceId(user.username, agent.id) : null;
  const platformLlmEndpoint = traceId ? getPlatformLlmEndpointUrl(traceId) : null;

  // Configuration state
  const [showConfig, setShowConfig] = useState(false);
  const [agentEndpoint, setAgentEndpoint] = useState(agent.a2a_endpoint || '');
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);
  const [showCorsExample, setShowCorsExample] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedAgnoAgent, setSelectedAgnoAgent] = useState('');
  const [agnoTeams, setAgnoTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [agnoAgents, setAgnoAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [agentEndpointStatus, setAgentEndpointStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [agentEndpointError, setAgentEndpointError] = useState<string>('');

  // Chat adapter for framework-specific communication
  const chatAdapterRef = useRef<ChatAdapter | null>(null);

  // API base URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9050';

  // Load messages from backend when component mounts
  useEffect(() => {
    const loadMessages = async () => {
      if (!accessToken) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/workbench/messages/${agent.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            // Convert timestamp strings back to Date objects
            const loadedMessages = data.messages.map((msg: any) => ({
              id: msg.id || `msg-${Date.now()}-${Math.random()}`,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
            }));
            setMessages(loadedMessages);
          }
        }
      } catch (error) {
        console.error('[ChatPlayground] Failed to load messages from backend:', error);
      }
    };

    loadMessages();
  }, [agent.id, accessToken, API_BASE_URL]);

  // Save messages to backend whenever they change
  useEffect(() => {
    const saveMessages = async () => {
      if (!accessToken || messages.length === 0) return;

      try {
        await fetch(`${API_BASE_URL}/api/workbench/messages/${agent.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(messages),
        });
      } catch (error) {
        console.error('[ChatPlayground] Failed to save messages to backend:', error);
      }
    };

    // Debounce save to avoid too many requests
    const timer = setTimeout(saveMessages, 500);
    return () => clearTimeout(timer);
  }, [messages, agent.id, accessToken, API_BASE_URL]);

  // Initialize chat adapter when component mounts or agent/framework changes
  useEffect(() => {
    if (!accessToken) {
      console.log('[ChatPlayground] No access token, skipping adapter initialization');
      return;
    }

    console.log('[ChatPlayground] Initializing chat adapter for framework:', agent.framework);

    try {
      // Create adapter for the agent's framework
      const adapter = ChatAdapterFactory.createAdapter(agent.framework);

      // Initialize adapter with configuration
      adapter.initialize({
        agentId: agent.id,
        agentEndpoint: agent.a2a_endpoint || '',
        apiBaseUrl: API_BASE_URL,
        accessToken: accessToken,
        sessionId: sessionId,
      });

      chatAdapterRef.current = adapter;
      console.log('[ChatPlayground] Chat adapter initialized successfully');
    } catch (error) {
      console.error('[ChatPlayground] Failed to create chat adapter:', error);
    }

    // Cleanup on unmount or when agent changes
    return () => {
      if (chatAdapterRef.current) {
        console.log('[ChatPlayground] Disposing chat adapter');
        chatAdapterRef.current.dispose();
        chatAdapterRef.current = null;
      }
    };
  }, [agent.id, agent.framework, accessToken, sessionId, API_BASE_URL]);

  // Fetch Agno teams when agent is Agno framework
  useEffect(() => {
    if (agent.framework === AgentFramework.AGNO) {
      // TODO: Fetch teams from Agno API
      // For now, using placeholder data
      setAgnoTeams([
        { id: 'team1', name: 'Team Alpha' },
        { id: 'team2', name: 'Team Beta' },
      ]);
    }
  }, [agent.framework]);

  // Fetch Agno agents when team is selected
  useEffect(() => {
    if (agent.framework === AgentFramework.AGNO && selectedTeam) {
      // TODO: Fetch agents from Agno API based on team
      // For now, using placeholder data
      setAgnoAgents([
        { id: 'agent1', name: 'Agent A' },
        { id: 'agent2', name: 'Agent B' },
      ]);
    }
  }, [agent.framework, selectedTeam]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  // Send trace_id to parent component when available
  useEffect(() => {
    if (traceId && onTraceIdReceived) {
      onTraceIdReceived(traceId);
    }
  }, [traceId, onTraceIdReceived]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming || !chatAdapterRef.current) return;

    const userMessageContent = inputValue.trim();

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Set streaming state
    setIsStreaming(true);
    setStreamingMessage('');

    // Send message via adapter
    try {
      // Build conversation history from existing messages (for Workbench mode)
      const conversationHistory = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      await chatAdapterRef.current.sendMessage(
        { content: userMessageContent },
        {
          onChunk: (chunk) => {
            console.log('[ChatPlayground] Received chunk, length:', chunk.content.length);
            setStreamingMessage(chunk.content);
          },
          onComplete: (response) => {
            console.log('[ChatPlayground] Message complete, length:', response.content.length);
            // Add complete assistant message
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: response.content,
                timestamp: response.timestamp,
              },
            ]);
            setStreamingMessage('');
            setIsStreaming(false);
          },
          onError: (error) => {
            console.error('[ChatPlayground] Chat error:', error);
            setIsStreaming(false);
            // Optionally show error to user
            alert(`Chat error: ${error.message}`);
          },
        },
        conversationHistory // Pass conversation history for context
      );
    } catch (error) {
      console.error('[ChatPlayground] Failed to send message:', error);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearSession = async () => {
    // Cancel any ongoing message
    if (chatAdapterRef.current) {
      chatAdapterRef.current.cancel();
    }

    // Clear messages in state
    setMessages([]);
    setStreamingMessage('');
    setIsStreaming(false);

    // Clear messages in backend
    if (accessToken) {
      try {
        await fetch(`${API_BASE_URL}/api/workbench/clear`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ agent_id: agent.id }),
        });
        console.log('[ChatPlayground] Session cleared from backend');
      } catch (error) {
        console.error('[ChatPlayground] Failed to clear session from backend:', error);
      }
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Save agent endpoint
  const handleSaveEndpoint = async () => {
    if (!agentEndpoint.trim()) {
      return;
    }

    setIsSavingEndpoint(true);

    try {
      await agentService.updateAgent(agent.id, {
        a2a_endpoint: agentEndpoint.trim()
      });

      // Update local agent object
      agent.a2a_endpoint = agentEndpoint.trim();

      console.log('Agent endpoint saved successfully');
      // Show success feedback
      setTimeout(() => setIsSavingEndpoint(false), 500);
    } catch (error) {
      console.error('Error saving agent endpoint:', error);
      setIsSavingEndpoint(false);
    }
  };

  // Test agent endpoint connection
  const handleTestAgentEndpoint = async () => {
    if (!agentEndpoint.trim()) {
      setAgentEndpointStatus('error');
      return;
    }

    setAgentEndpointStatus('testing');

    try {
      // Test A2A agent.json endpoint
      const url = agentEndpoint.endsWith('/')
        ? `${agentEndpoint}.well-known/agent.json`
        : `${agentEndpoint}/.well-known/agent.json`;

      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log('Agent card:', data);
        setAgentEndpointStatus('success');
        setTimeout(() => setAgentEndpointStatus('idle'), 3000);
      } else {
        setAgentEndpointStatus('error');
        setTimeout(() => setAgentEndpointStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Error testing agent endpoint:', error);
      setAgentEndpointStatus('error');
      setTimeout(() => setAgentEndpointStatus('idle'), 3000);
    }
  };

  return (
    <div className="flex flex-col bg-surface-light dark:bg-surface-dark md:col-span-2 rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border-light dark:border-border-dark px-4">
        <div className="flex flex-col">
          <h2 className="text-base font-bold">{t('workbench.chatPlayground')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 w-9 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-border-light dark:border-border-dark transition-colors"
            title="Configuration"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleClearSession}
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 text-gray-600 dark:text-gray-300 gap-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/10 border border-border-light dark:border-border-dark transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline truncate">{t('workbench.clearSession')}</span>
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark/50 px-4 py-3 max-h-[60vh] overflow-y-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-light dark:text-text-dark">
                Configuration
              </h3>
              <button
                onClick={() => setShowConfig(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>

            {/* Framework Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Framework:</span>
              <span className="inline-flex items-center rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-primary">
                {agent.framework}
              </span>
            </div>

            {/* Platform LLM Proxy Endpoints */}
            <div className="border rounded-lg border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Platform LLM Proxy Endpoint
              </h4>
              {platformLlmEndpoint ? (
                <>
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded">
                    <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
                      {platformLlmEndpoint}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(platformLlmEndpoint);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 p-1 ml-2 flex-shrink-0"
                      title="Copy to clipboard"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                    Use this endpoint with your platform API key for LLM access. Includes trace_id for monitoring.
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">Loading trace_id...</p>
              )}
            </div>

            {/* Agent A2A Endpoint */}
            <div className="border rounded-lg border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                Agent A2A Endpoint
              </h4>

              {/* Endpoint Input */}
              <div className="mb-3">
                <input
                  type="url"
                  value={agentEndpoint}
                  onChange={(e) => setAgentEndpoint(e.target.value)}
                  placeholder="http://localhost:8011"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  Enter your agent's hosted A2A endpoint (e.g., http://localhost:8011)
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveEndpoint}
                disabled={!agentEndpoint.trim() || isSavingEndpoint}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                style={{
                  backgroundColor: 'white',
                  color: '#16a34a',
                  borderWidth: '2px',
                  borderColor: '#86efac',
                  borderStyle: 'solid'
                }}
              >
                {isSavingEndpoint && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                <span>{isSavingEndpoint ? 'Saving...' : 'Save Endpoint'}</span>
              </button>

              {/* CORS Warning for localhost endpoints */}
              {agentEndpoint && (agentEndpoint.includes('localhost') || agentEndpoint.includes('127.0.0.1')) && (
                <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-yellow-800 dark:text-yellow-300">⚠️ CORS Configuration Required</p>
                    <button
                      onClick={() => setShowCorsExample(!showCorsExample)}
                      className="text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-200 underline"
                    >
                      {showCorsExample ? 'Hide' : 'Show'} example
                    </button>
                  </div>
                  {showCorsExample && (
                    <>
                      <p className="text-yellow-700 dark:text-yellow-400 mt-1.5 mb-1.5">
                        For localhost testing, enable CORS in your agent server:
                      </p>
                      <code className="block bg-yellow-100 dark:bg-yellow-900/40 p-1.5 rounded text-yellow-900 dark:text-yellow-200 overflow-x-auto whitespace-pre text-[10px] leading-tight">
                        {agent.framework === 'ADK' ? (
                          `# Add to your agent code:\nfrom fastapi.middleware.cors import CORSMiddleware\n\na2a_app.add_middleware(\n  CORSMiddleware,\n  allow_origins=["http://localhost:9060"],\n  allow_credentials=True,\n  allow_methods=["*"],\n  allow_headers=["*"]\n)`
                        ) : agent.framework === 'Agno' ? (
                          `# Add CORS middleware to your Agno agent`
                        ) : (
                          `# Enable CORS for http://localhost:9060`
                        )}
                      </code>
                    </>
                  )}
                </div>
              )}

              {/* Test Connection Button */}
              <button
                onClick={handleTestAgentEndpoint}
                disabled={!agentEndpoint.trim() || agentEndpointStatus === 'testing'}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'white',
                  color: '#16a34a',
                  borderWidth: '2px',
                  borderColor: '#86efac',
                  borderStyle: 'solid'
                }}
              >
                {agentEndpointStatus === 'testing' && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {agentEndpointStatus === 'success' && (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {agentEndpointStatus === 'error' && (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span>
                  {agentEndpointStatus === 'testing' && 'Testing Connection...'}
                  {agentEndpointStatus === 'success' && 'Connected Successfully!'}
                  {agentEndpointStatus === 'error' && 'Connection Failed'}
                  {agentEndpointStatus === 'idle' && 'Test Connection'}
                </span>
              </button>
            </div>

            {/* Agno Team/Agent Selector (Only for Agno Framework) */}
            {agent.framework === AgentFramework.AGNO && (
              <div className="flex flex-col gap-3 border-t border-border-light dark:border-border-dark pt-3">
                <h4 className="text-sm font-semibold text-text-light dark:text-text-dark">
                  Agno Configuration
                </h4>

                {/* Team Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Select Team
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => {
                      setSelectedTeam(e.target.value);
                      setSelectedAgnoAgent(''); // Reset agent selection
                    }}
                    className="form-select w-full rounded-lg border-border-light bg-background-light p-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark dark:border-border-dark dark:bg-background-dark dark:text-white dark:focus:border-primary"
                  >
                    <option value="">-- Select a team --</option>
                    {agnoTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Agent Selector */}
                {selectedTeam && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Select Agent
                    </label>
                    <select
                      value={selectedAgnoAgent}
                      onChange={(e) => setSelectedAgnoAgent(e.target.value)}
                      className="form-select w-full rounded-lg border-border-light bg-background-light p-2 text-sm focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark dark:border-border-dark dark:bg-background-dark dark:text-white dark:focus:border-primary"
                    >
                      <option value="">-- Select an agent --</option>
                      {agnoAgents.map((agnoAgent) => (
                        <option key={agnoAgent.id} value={agnoAgent.id}>
                          {agnoAgent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Bot className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('workbench.startConversation')}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 sm:gap-4 ${
                  message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    message.role === 'user'
                      ? 'bg-primary/20 text-primary-dark dark:text-primary'
                      : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300'
                  }`}
                >
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message bubble */}
                <div
                  className={`flex max-w-[85%] sm:max-w-[75%] flex-col gap-1 ${
                    message.role === 'assistant' ? 'items-start' : 'items-end'
                  }`}
                >
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {message.role === 'user' ? t('workbench.you') : displayName}
                  </p>
                  <div
                    className={`rounded-lg p-3 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'rounded-tr-none bg-primary/20 dark:bg-primary/20 text-text-light dark:text-text-dark'
                        : 'rounded-tl-none bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && streamingMessage && (
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex max-w-[85%] sm:max-w-[75%] flex-col gap-1">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{agentName}</p>
                  <div className="rounded-lg rounded-tl-none bg-surface-light dark:bg-surface-dark p-3 text-sm leading-relaxed">
                    <p className="whitespace-pre-wrap break-words">{streamingMessage}</p>
                    <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-1" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border-light dark:border-border-dark px-4 py-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            className="form-input w-full resize-none rounded-lg border-border-light bg-surface-light p-3 pr-16 sm:pr-24 text-sm placeholder:text-gray-400 focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark dark:border-border-dark dark:bg-surface-dark dark:text-white dark:focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t('workbench.typeMessage')}
            rows={1}
            style={{ maxHeight: '200px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isStreaming}
            className="absolute bottom-2 right-2 flex min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 w-12 sm:w-16 bg-primary/80 text-primary-dark hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
