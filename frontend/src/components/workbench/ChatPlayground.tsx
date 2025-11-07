import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Send, User, Bot, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/authStore';
import { type Agent, AgentFramework } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPlaygroundProps {
  sessionId: string;
  agentName: string;
  agent: Agent;
}

export const ChatPlayground: React.FC<ChatPlaygroundProps> = ({ sessionId, agentName, agent }) => {
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Configuration state
  const [showConfig, setShowConfig] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [useCustomEndpoint, setUseCustomEndpoint] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedAgnoAgent, setSelectedAgnoAgent] = useState('');
  const [agnoTeams, setAgnoTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [agnoAgents, setAgnoAgents] = useState<Array<{ id: string; name: string }>>([]);

  // Use ref to track streaming message without causing re-renders
  const streamingMessageRef = useRef('');

  // WebSocket message handler - wrapped in useCallback to prevent reconnection loop
  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === 'stream_start') {
      setIsStreaming(true);
      setStreamingMessage('');
      streamingMessageRef.current = '';
    } else if (data.type === 'token') {
      streamingMessageRef.current += data.content;
      setStreamingMessage(streamingMessageRef.current);
    } else if (data.type === 'stream_end') {
      setIsStreaming(false);
      // Add complete assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: streamingMessageRef.current,
          timestamp: new Date(),
        },
      ]);
      setStreamingMessage('');
      streamingMessageRef.current = '';
    } else if (data.type === 'error') {
      console.error('WebSocket error:', data.error);
      setIsStreaming(false);
    }
  }, []);

  const handleWebSocketError = useCallback((error: Event) => {
    console.error('WebSocket connection error:', error);
  }, []);

  // WebSocket connection
  const wsUrl = accessToken
    ? `ws://localhost:9050/ws/chat/${sessionId}?token=${encodeURIComponent(accessToken)}`
    : null;

  const { isConnected, sendMessage } = useWebSocket(wsUrl, {
    reconnect: true,
    reconnectInterval: 3000,
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError,
  });

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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Send to WebSocket (sendMessage handles connection check internally)
    sendMessage({
      type: 'chat_message',
      content: inputValue.trim(),
    });

    setInputValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearSession = () => {
    setMessages([]);
    setStreamingMessage('');
    setIsStreaming(false);
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

  return (
    <div className="flex flex-col bg-surface-light dark:bg-surface-dark md:col-span-2 rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border-light dark:border-border-dark px-4">
        <div className="flex flex-col">
          <h2 className="text-base font-bold">{t('workbench.chatPlayground')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{agentName}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <span className="text-xs text-red-500">{t('workbench.disconnected')}</span>
          )}
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
        <div className="border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark/50 px-4 py-3">
          <div className="flex flex-col gap-4">
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
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded">
                <code className="text-xs text-gray-700 dark:text-gray-300">
                  http://localhost:9050/api/llm/agent/{agent.id}/chat
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`http://localhost:9050/api/llm/agent/${agent.id}/chat`);
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 p-1"
                  title="Copy to clipboard"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                Use this endpoint with your platform API key for LLM access
              </p>
            </div>

            {/* Custom Endpoint Input (All Frameworks) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use-custom-endpoint"
                  checked={useCustomEndpoint}
                  onChange={(e) => setUseCustomEndpoint(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="use-custom-endpoint" className="text-sm font-medium text-text-light dark:text-text-dark">
                  Use Custom Endpoint
                </label>
              </div>
              {useCustomEndpoint && (
                <input
                  type="url"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="https://api.example.com/chat"
                  className="form-input w-full rounded-lg border-border-light bg-background-light p-2 text-sm placeholder:text-gray-400 focus:border-primary-dark focus:outline-none focus:ring-1 focus:ring-primary-dark dark:border-border-dark dark:bg-background-dark dark:text-white dark:focus:border-primary"
                />
              )}
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
                    {message.role === 'user' ? t('workbench.you') : agentName}
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
