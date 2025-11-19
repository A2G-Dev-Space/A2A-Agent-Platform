import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, Bot, Trash2, ChevronDown, ChevronUp, X, AlertCircle, User, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { type Agent } from '@/types';
import type { ChatAdapter, SystemEvent } from '@/adapters/chat';
import { HubAgnoChatAdapter } from '@/adapters/chat';
import { MessageContent } from '@/components/chat/MessageContent';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  systemEvents?: SystemEvent[];
  reasoningContent?: string;
}

interface HubSession {
  id: string;
  agent_id: number;
  session_name: string;
  message_count: number;
  created_at: string;
  last_message_at: string;
}

interface HubChatAgnoProps {
  agent: Agent;
  onClose?: () => void;
}

export const HubChatAgno: React.FC<HubChatAgnoProps> = ({ agent, onClose }) => {
  const { t } = useTranslation();
  const { accessToken: storeAccessToken } = useAuthStore();
  const accessToken = storeAccessToken || localStorage.getItem('accessToken');

  // Session state
  const [sessions, setSessions] = useState<HubSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [expandedSystemMessages, setExpandedSystemMessages] = useState<Set<string>>(new Set());
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());

  // Agno-specific: team/agent selection
  const [agnoResources, setAgnoResources] = useState<Array<{ id: string; name: string; type: 'team' | 'agent' }>>(() => {
    const stored = localStorage.getItem(`agno_resources_${agent.id}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('[HubChatAgno] Failed to parse stored agnoResources:', error);
      }
    }
    return [];
  });
  const [selectedResource, setSelectedResource] = useState(() => {
    const stored = localStorage.getItem(`agno_selected_resource_${agent.id}`);
    return stored || '';
  });
  const [isLoadingResources, setIsLoadingResources] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatAdapterRef = useRef<ChatAdapter | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9050';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [messages, streamingMessage]);

  // Load sessions for this agent
  useEffect(() => {
    loadSessions();
  }, [agent.id, accessToken]);

  // Auto-fetch teams and agents when component mounts
  useEffect(() => {
    if (agent.agno_os_endpoint && agnoResources.length === 0) {
      fetchTeamsAndAgents();
    }
  }, [agent.agno_os_endpoint]);

  // Save agnoResources to localStorage
  useEffect(() => {
    if (agnoResources.length > 0) {
      localStorage.setItem(`agno_resources_${agent.id}`, JSON.stringify(agnoResources));
      console.log('[HubChatAgno] Saved agno resources to localStorage:', agnoResources.length, 'resources');
    }
  }, [agnoResources, agent.id]);

  // Save selectedResource to localStorage
  useEffect(() => {
    if (selectedResource) {
      localStorage.setItem(`agno_selected_resource_${agent.id}`, selectedResource);
      console.log('[HubChatAgno] Saved selected resource to localStorage:', selectedResource);
    }
  }, [selectedResource, agent.id]);

  // Validate selectedResource when agnoResources change
  useEffect(() => {
    if (agnoResources.length > 0 && selectedResource) {
      const exists = agnoResources.some((r) => r.id === selectedResource);
      if (!exists) {
        console.log('[HubChatAgno] Stored resource no longer exists, clearing selection');
        setSelectedResource('');
        localStorage.removeItem(`agno_selected_resource_${agent.id}`);
      }
    }
  }, [agnoResources, selectedResource, agent.id]);

  // Initialize chat adapter
  useEffect(() => {
    if (!accessToken) return;

    try {
      const adapter = new HubAgnoChatAdapter();

      const resourceId = selectedResource || undefined;
      const resourceType = resourceId
        ? agnoResources.find((r) => r.id === resourceId)?.type
        : undefined;

      adapter.initialize({
        agentId: agent.id,
        agentEndpoint: agent.agno_os_endpoint || '',
        apiBaseUrl: API_BASE_URL,
        accessToken: accessToken,
        sessionId: currentSessionId || undefined,
        selectedResource: resourceId,
        selectedResourceType: resourceType,
      });

      chatAdapterRef.current = adapter;
      console.log('[HubChatAgno] Chat adapter initialized:', {
        framework: agent.framework,
        sessionId: currentSessionId,
        selectedResource: resourceId,
        selectedResourceType: resourceType,
      });
    } catch (error) {
      console.error('[HubChatAgno] Failed to create chat adapter:', error);
    }

    return () => {
      if (chatAdapterRef.current) {
        chatAdapterRef.current.dispose();
        chatAdapterRef.current = null;
      }
    };
  }, [agent.id, agent.framework, accessToken, currentSessionId, API_BASE_URL, selectedResource, agnoResources]);

  const fetchTeamsAndAgents = async () => {
    if (!agent.agno_os_endpoint) {
      console.warn('[HubChatAgno] No agno_os_endpoint configured');
      return;
    }

    setIsLoadingResources(true);
    const resources: Array<{ id: string; name: string; type: 'team' | 'agent' }> = [];

    try {
      // Fetch teams
      try {
        const teamsRes = await fetch(`${agent.agno_os_endpoint}/teams`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const teams = teamsData.map((team: any) => ({
            id: team.id,
            name: team.name || team.id,
            type: 'team' as const,
          }));
          resources.push(...teams);
          console.log('[HubChatAgno] Loaded teams:', teams.length);
        }
      } catch (error) {
        console.warn('[HubChatAgno] Failed to load teams:', error);
      }

      // Fetch agents
      try {
        const agentsRes = await fetch(`${agent.agno_os_endpoint}/agents`);
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json();
          const agents = agentsData.map((agentItem: any) => ({
            id: agentItem.id,
            name: agentItem.name || agentItem.id,
            type: 'agent' as const,
          }));
          resources.push(...agents);
          console.log('[HubChatAgno] Loaded agents:', agents.length);
        }
      } catch (error) {
        console.warn('[HubChatAgno] Failed to load agents:', error);
      }

      setAgnoResources(resources);
      console.log('[HubChatAgno] Combined resources:', resources.length);
    } catch (error) {
      console.error('[HubChatAgno] Error fetching teams and agents:', error);
    } finally {
      setIsLoadingResources(false);
    }
  };

  const loadSessions = async () => {
    if (!accessToken) return;

    setIsLoadingSessions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hub/sessions?agent_id=${agent.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken!}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        console.log('[HubChatAgno] Loaded sessions:', data.sessions?.length);
      }
    } catch (error) {
      console.error('[HubChatAgno] Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    if (!accessToken) return;

    setIsLoadingMessages(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hub/sessions/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${accessToken!}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const loadedMessages = (data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(loadedMessages);
        console.log('[HubChatAgno] Loaded messages:', loadedMessages.length);
      }
    } catch (error) {
      console.error('[HubChatAgno] Failed to load messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    console.log('[HubChatAgno] Starting new chat');
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    loadSessionMessages(sessionId);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!accessToken || !confirm('Delete this conversation?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/hub/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken!}`,
        },
      });

      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          handleNewChat();
        }
        console.log('[HubChatAgno] Deleted session:', sessionId);
      }
    } catch (error) {
      console.error('[HubChatAgno] Failed to delete session:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming || !chatAdapterRef.current) return;

    // Check if team/agent is selected
    if (!selectedResource) {
      alert('Please select a team or agent first');
      return;
    }

    const userMessageContent = inputValue.trim();

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsStreaming(true);
    setStreamingMessage('');
    setStreamingReasoning('');

    // Create system events container for Agno
    let systemEventsMessageId: string | null = null;
    if (chatAdapterRef.current?.supportsStreaming()) {
      systemEventsMessageId = `system-${Date.now()}`;
      const systemEventsMessage: Message = {
        id: systemEventsMessageId,
        role: 'system',
        content: 'System Events',
        timestamp: new Date(),
        systemEvents: [],
      };

      setMessages((prev) => [...prev, systemEventsMessage]);
      setExpandedSystemMessages((prev) => new Set(prev).add(systemEventsMessageId!));
    }

    try {
      const conversationHistory = messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      await chatAdapterRef.current.sendMessage(
        { content: userMessageContent },
        {
          onChunk: (chunk) => {
            setStreamingMessage(chunk.content);
            if (chunk.reasoningContent) {
              setStreamingReasoning(chunk.reasoningContent);
            }
          },
          onComplete: (response) => {
            setMessages((prev) => [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: response.content,
                timestamp: response.timestamp,
                reasoningContent: response.reasoningContent,
              },
            ]);

            setStreamingMessage('');
            setStreamingReasoning('');
            setIsStreaming(false);

            // Reload sessions to update message count
            loadSessions();
          },
          onError: (error) => {
            console.error('[HubChatAgno] Chat error:', error);
            setIsStreaming(false);
            alert(`Chat error: ${error.message}`);
          },
          onSystemEvent: (event) => {
            if (systemEventsMessageId) {
              console.log('[HubChatAgno] System event:', event.event, event.data);

              // Merge events (like ChatPlaygroundAgno)
              const mergeableEvents = ['RunContent', 'TeamRunContent'];
              const isMergeable = mergeableEvents.includes(event.event);

              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== systemEventsMessageId) return msg;

                  const existingEvents = msg.systemEvents || [];

                  if (isMergeable) {
                    const existingIndex = existingEvents.findIndex((e) => e.event === event.event);

                    if (existingIndex >= 0) {
                      const updated = [...existingEvents];
                      const existing = updated[existingIndex];
                      updated[existingIndex] = {
                        ...existing,
                        data: {
                          ...existing.data,
                          count: (existing.data.count || 1) + 1,
                          lastUpdate: event.timestamp,
                        },
                        timestamp: event.timestamp,
                      };
                      return { ...msg, systemEvents: updated };
                    }
                  }

                  return { ...msg, systemEvents: [...existingEvents, event] };
                })
              );
            }
          },
        },
        conversationHistory
      );
    } catch (error) {
      console.error('[HubChatAgno] Failed to send message:', error);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) {
      return 'Previous 7 Days';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const dateLabel = formatDate(session.last_message_at);
    if (!groups[dateLabel]) {
      groups[dateLabel] = [];
    }
    groups[dateLabel].push(session);
    return groups;
  }, {} as Record<string, HubSession[]>);

  return (
    <div className="flex w-full h-full overflow-hidden" style={{ backgroundColor: 'var(--color-background-light)' }}>
      {/* Session Sidebar */}
      <aside className="w-72 flex flex-col h-full border-r shrink-0"
        style={{
          backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff',
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
        }}
      >
        {/* New Chat Button */}
        <div className="p-4 border-b"
          style={{
            borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
          }}
        >
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors"
            style={{
              borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.2)' : '#cbd5e1',
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#475569',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoadingSessions ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No conversations yet</p>
          ) : (
            Object.entries(groupedSessions).map(([dateLabel, sessionGroup]) => (
              <div key={dateLabel} className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-1"
                  style={{
                    color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#64748b' : '#94a3b8',
                  }}
                >
                  {dateLabel}
                </p>
                {sessionGroup.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className="group relative block p-3 rounded-lg cursor-pointer transition-colors"
                    style={{
                      backgroundColor: currentSessionId === session.id
                        ? (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(2, 132, 199, 0.2)' : '#E0F2FE')
                        : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (currentSessionId !== session.id) {
                        e.currentTarget.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentSessionId !== session.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate"
                          style={{
                            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#1e293b',
                          }}
                        >
                          {session.session_name || 'New Conversation'}
                        </p>
                        <p className="text-xs mt-1"
                          style={{
                            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b',
                          }}
                        >
                          {session.message_count} messages
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3 text-red-500 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full flex-1">
        {/* Agent Header */}
        <div className="relative text-center pt-8 pb-6 border-b shrink-0"
          style={{
            borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
          }}
        >
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          <h1 className="text-3xl font-bold"
            style={{
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f9fafb' : '#111827',
            }}
          >
            {agent.name}
          </h1>
          <p className="mt-1"
            style={{
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#9ca3af' : '#6b7280',
            }}
          >
            {agent.description}
          </p>

          {/* Team/Agent Selector */}
          {agnoResources.length > 0 && (
            <div className="mt-4 max-w-md mx-auto">
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff',
                  borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#4b5563' : '#d1d5db',
                  color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#e5e7eb' : '#1f2937',
                }}
              >
                <option value="">-- Select a team or agent --</option>
                {agnoResources.map((resource) => (
                  <option key={`${resource.type}-${resource.id}`} value={resource.id}>
                    {resource.name} ({resource.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* No Resources Warning */}
          {!isLoadingResources && agnoResources.length === 0 && (
            <div className="mt-4 max-w-md mx-auto p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-300">
                <AlertCircle className="h-4 w-4" />
                <span>No teams or agents available. Check agent endpoint configuration.</span>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isLoadingMessages ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Bot className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedResource ? 'Start a conversation' : 'Please select a team or agent first'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                // System events section
                if (message.role === 'system' && message.systemEvents !== undefined) {
                  const isExpanded = expandedSystemMessages.has(message.id);

                  return (
                    <div key={message.id} className="my-2">
                      <button
                        onClick={() => {
                          setExpandedSystemMessages((prev) => {
                            const next = new Set(prev);
                            if (next.has(message.id)) {
                              next.delete(message.id);
                            } else {
                              next.add(message.id);
                            }
                            return next;
                          });
                        }}
                        className="flex items-center gap-2 text-sm transition-colors w-full"
                        style={{
                          color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#9ca3af' : '#6b7280',
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                        <span>System Events ({message.systemEvents.length})</span>
                      </button>

                      {isExpanded && message.systemEvents.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 justify-center">
                          {message.systemEvents.map((event, idx) => (
                            <div
                              key={`${message.id}-event-${idx}`}
                              className="px-3 py-1 rounded-full text-xs font-semibold"
                              style={{
                                backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(147, 51, 234, 0.2)' : '#ede9fe',
                                color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#c4b5fd' : '#9333ea',
                              }}
                              title={`${event.event}\n${new Date(event.timestamp).toLocaleTimeString()}`}
                            >
                              {event.event}
                              {event.data?.count && event.data.count > 1 && (
                                <span className="ml-1 opacity-75">×{event.data.count}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // User and Assistant messages
                return (
                  <div
                    key={message.id}
                    className={`flex gap-4 ${message.role === 'assistant' ? 'justify-end' : ''}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="size-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                        style={{
                          backgroundColor: agent.logo_url
                            ? 'transparent'
                            : (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
                        }}
                      >
                        {agent.logo_url ? (
                          <img src={agent.logo_url} alt={agent.name} className="size-10 rounded-lg object-cover" />
                        ) : (
                          <Bot className="h-6 w-6"
                            style={{
                              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#fca5a5' : '#ef4444',
                            }}
                          />
                        )}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className={`p-4 rounded-lg prose prose-slate dark:prose-invert prose-p:my-2 prose-headings:my-3 max-w-none ${
                        message.role === 'user' ? 'rounded-br-none' : 'rounded-tl-none'
                      }`}
                        style={{
                          backgroundColor: message.role === 'user'
                            ? '#0284c7'
                            : (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(2, 132, 199, 0.1)' : '#E0F2FE'),
                          color: message.role === 'user'
                            ? '#ffffff'
                            : (document.documentElement.getAttribute('data-theme') === 'dark' ? '#e2e8f0' : '#1e293b'),
                        }}
                      >
                        {/* Thinking section for assistant messages */}
                        {message.role === 'assistant' && message.reasoningContent && (
                          <div className="mb-3">
                            <button
                              onClick={() => {
                                setExpandedThinking((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(message.id)) {
                                    next.delete(message.id);
                                  } else {
                                    next.add(message.id);
                                  }
                                  return next;
                                });
                              }}
                              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md transition-all hover:opacity-80"
                              style={{
                                backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
                                  ? 'rgba(147, 51, 234, 0.2)'
                                  : 'rgba(147, 51, 234, 0.1)',
                                color: document.documentElement.getAttribute('data-theme') === 'dark'
                                  ? '#c4b5fd'
                                  : '#7c3aed',
                              }}
                            >
                              {expandedThinking.has(message.id) ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronUp className="h-3 w-3" />
                              )}
                              <span>Thinking</span>
                            </button>

                            {expandedThinking.has(message.id) && (
                              <div
                                className="mt-2 p-3 rounded-md text-xs leading-relaxed whitespace-pre-wrap"
                                style={{
                                  backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
                                    ? 'rgba(147, 51, 234, 0.1)'
                                    : 'rgba(147, 51, 234, 0.05)',
                                  borderLeft: `3px solid ${document.documentElement.getAttribute('data-theme') === 'dark' ? '#c4b5fd' : '#7c3aed'}`,
                                  color: document.documentElement.getAttribute('data-theme') === 'dark'
                                    ? '#e5e7eb'
                                    : '#374151',
                                }}
                              >
                                {message.reasoningContent}
                              </div>
                            )}
                          </div>
                        )}
                        <MessageContent content={message.content} contentType="markdown" />
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="size-10 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#374151' : '#e5e7eb',
                        }}
                      >
                        <User className="h-6 w-6"
                          style={{
                            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#9ca3af' : '#6b7280',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Streaming message */}
              {isStreaming && (
                <div className="flex gap-4">
                  <div className="size-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                    style={{
                      backgroundColor: agent.logo_url
                        ? 'transparent'
                        : (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2'),
                    }}
                  >
                    {agent.logo_url ? (
                      <img src={agent.logo_url} alt={agent.name} className="size-10 rounded-lg object-cover" />
                    ) : (
                      <Bot className="h-6 w-6"
                        style={{
                          color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#fca5a5' : '#ef4444',
                        }}
                      />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="p-4 rounded-lg rounded-tl-none"
                      style={{
                        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(2, 132, 199, 0.1)' : '#E0F2FE',
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#e2e8f0' : '#1e293b',
                      }}
                    >
                      {/* Streaming thinking section */}
                      {streamingReasoning && (
                        <div className="mb-3">
                          <button
                            onClick={() => {
                              setExpandedThinking((prev) => {
                                const next = new Set(prev);
                                if (next.has('streaming')) {
                                  next.delete('streaming');
                                } else {
                                  next.add('streaming');
                                }
                                return next;
                              });
                            }}
                            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md transition-all hover:opacity-80"
                            style={{
                              backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
                                ? 'rgba(147, 51, 234, 0.2)'
                                : 'rgba(147, 51, 234, 0.1)',
                              color: document.documentElement.getAttribute('data-theme') === 'dark'
                                ? '#c4b5fd'
                                : '#7c3aed',
                            }}
                          >
                            {expandedThinking.has('streaming') ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronUp className="h-3 w-3" />
                            )}
                            <span>Thinking...</span>
                            <span className="inline-block h-3 w-1 animate-pulse bg-purple-500" />
                          </button>

                          {expandedThinking.has('streaming') && (
                            <div
                              className="mt-2 p-3 rounded-md text-xs leading-relaxed whitespace-pre-wrap"
                              style={{
                                backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
                                  ? 'rgba(147, 51, 234, 0.1)'
                                  : 'rgba(147, 51, 234, 0.05)',
                                borderLeft: `3px solid ${document.documentElement.getAttribute('data-theme') === 'dark' ? '#c4b5fd' : '#7c3aed'}`,
                                color: document.documentElement.getAttribute('data-theme') === 'dark'
                                  ? '#e5e7eb'
                                  : '#374151',
                              }}
                            >
                              {streamingReasoning}
                              <span className="inline-block h-3 w-1 animate-pulse bg-purple-500 ml-1" />
                            </div>
                          )}
                        </div>
                      )}

                      {streamingMessage ? (
                        <>
                          <MessageContent content={streamingMessage} contentType="markdown" />
                          <span className="inline-block h-4 w-1 animate-pulse ml-1" style={{ backgroundColor: '#0284c7' }} />
                        </>
                      ) : !streamingReasoning ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">{t('chat.waitingForResponse')}</span>
                        </div>
                      ) : (
                        <span className="inline-block h-4 w-1 animate-pulse" style={{ backgroundColor: '#0284c7' }} />
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 shrink-0"
          style={{
            backgroundColor: 'var(--color-background-light)',
          }}
        >
          <div className="relative max-w-4xl mx-auto">
            <div className="flex items-end gap-2 rounded-xl p-2 shadow-sm transition-shadow"
              style={{
                backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff',
                border: '1px solid',
                borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(148, 163, 184, 0.2)' : '#cbd5e1',
              }}
            >
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isStreaming || !selectedResource}
                className="flex-1 bg-transparent border-0 resize-none p-2 focus:ring-0 focus:outline-none max-h-48 disabled:opacity-50"
                placeholder={selectedResource ? "Type your message..." : "Select a team or agent first..."}
                rows={1}
                style={{
                  color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#e2e8f0' : '#1e293b',
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isStreaming || !selectedResource}
                className="size-10 rounded-lg flex items-center justify-center shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#0369a1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#0284c7';
                  }
                }}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
