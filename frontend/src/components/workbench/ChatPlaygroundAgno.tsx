import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Send, User, Bot, Settings, ChevronUp, ChevronDown, Copy, Check, HelpCircle, Globe, BookOpen } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';
import { useAuthStore } from '@/stores/authStore';
import { type Agent, AgentStatus } from '@/types';
import { agentService } from '@/services/agentService';
import { getPlatformLlmEndpointUrl } from '@/utils/trace';
import type { ChatAdapter, SystemEvent } from '@/adapters/chat';
import { ChatAdapterFactory } from '@/adapters/chat';
import { MessageContent } from '@/components/chat/MessageContent';
import { WorkflowGuideModal } from './WorkflowGuideModal';
import { downloadExampleCode } from '@/utils/downloadExamples';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  systemEvents?: SystemEvent[];
  reasoningContent?: string; // Optional reasoning/thinking content from <think> tags
}

interface ChatPlaygroundAgnoProps {
  sessionId?: string;
  agentName?: string;
  agent: Agent;
  onTraceIdReceived?: (traceId: string) => void;
}

export const ChatPlaygroundAgno: React.FC<ChatPlaygroundAgnoProps> = ({ agentName, agent, onTraceIdReceived }) => {
  const displayName = agentName || agent.name;
  const { t } = useTranslation();
  const { accessToken: storeAccessToken } = useAuthStore();
  const accessToken = storeAccessToken || localStorage.getItem('accessToken');

  // Check if agent is deployed
  const isDeployed = [
    AgentStatus.DEPLOYED_TEAM,
    AgentStatus.DEPLOYED_ALL,
    AgentStatus.PRODUCTION
  ].includes(agent.status);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedSystemMessages, setExpandedSystemMessages] = useState<Set<string>>(new Set());
  const [expandedEventDetails, setExpandedEventDetails] = useState<Set<string>>(new Set());
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use agent's trace_id directly
  const traceId = agent.trace_id || null;
  const platformLlmEndpoint = traceId ? getPlatformLlmEndpointUrl(traceId) : null;

  // Configuration state
  const [showConfig, setShowConfig] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);
  const [agentEndpoint, setAgentEndpoint] = useState(agent.agno_os_endpoint || '');
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);
  const [showCorsExample, setShowCorsExample] = useState(false);

  // Agno-specific state
  const [selectedResource, setSelectedResource] = useState(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(`agno_selected_resource_${agent.id}`);
    return stored || '';
  });
  const [agnoResources, setAgnoResources] = useState<Array<{ id: string; name: string; type: 'team' | 'agent' }>>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(`agno_resources_${agent.id}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('[ChatPlaygroundAgno] Failed to parse stored agnoResources:', error);
      }
    }
    return [];
  });
  const [agentEndpointStatus, setAgentEndpointStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  // const [showAgnoGuidePopup, setShowAgnoGuidePopup] = useState(false); // TODO: Implement guide popup

  // Available LLMs (healthy & active)
  const [availableLlms, setAvailableLlms] = useState<Array<{ id: number; name: string; provider: string }>>([]);

  // Chat adapter
  const chatAdapterRef = useRef<ChatAdapter | null>(null);

  // API base URL - use empty string in dev (relative paths), VITE_API_URL in production
  const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

  // Agent session ID
  const [agentSessionId, setAgentSessionId] = useState<string>('');

  useEffect(() => {
    const storageKey = `agent-session-${agent.id}`;
    let storedSessionId = localStorage.getItem(storageKey);

    if (!storedSessionId) {
      storedSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(storageKey, storedSessionId);
      console.log('[ChatPlaygroundAgno] Created new agent sessionId:', storedSessionId);
    } else {
      console.log('[ChatPlaygroundAgno] Using existing agent sessionId:', storedSessionId);
    }

    setAgentSessionId(storedSessionId);
  }, [agent.id]);

  // Check if this is the first visit and show workflow guide
  useEffect(() => {
    const workflowSeenKey = `workbench-workflow-seen-${agent.framework}`;
    const hasSeenWorkflow = localStorage.getItem(workflowSeenKey);

    if (!hasSeenWorkflow) {
      // Show workflow guide after a short delay
      const timer = setTimeout(() => {
        setShowWorkflowGuide(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [agent.framework]);

  // Download example code handler
  const handleDownloadExamples = async () => {
    try {
      await downloadExampleCode(agent.framework);
    } catch (error) {
      console.error('Failed to download example code:', error);
    }
  };

  // Load messages from backend
  useEffect(() => {
    const loadMessages = async () => {
      if (!accessToken) {
        console.log('[ChatPlaygroundAgno] No access token available, skipping message load');
        setIsMessagesLoaded(true);
        return;
      }

      console.log('[ChatPlaygroundAgno] Loading messages from backend');

      try {
        const response = await fetch(`${API_BASE_URL}/api/workbench/messages/${agent.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            const loadedMessages = data.messages.map((msg: any) => ({
              id: msg.id || `msg-${Date.now()}-${Math.random()}`,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              systemEvents: msg.systemEvents,
            }));
            console.log(`[ChatPlaygroundAgno] Loaded ${loadedMessages.length} messages from backend`);
            setMessages(loadedMessages);
            setIsMessagesLoaded(true);
          } else {
            console.log('[ChatPlaygroundAgno] No messages found in backend response');
            setIsMessagesLoaded(true);
          }
        } else {
          console.error('[ChatPlaygroundAgno] Failed to load messages:', response.status, response.statusText);
          setIsMessagesLoaded(true);
        }
      } catch (error) {
        console.error('[ChatPlaygroundAgno] Failed to load messages from backend:', error);
        setIsMessagesLoaded(true);
      }
    };

    loadMessages();
  }, [agent.id, accessToken, API_BASE_URL]);

  // Save messages to backend
  useEffect(() => {
    if (!isMessagesLoaded) {
      console.log('[ChatPlaygroundAgno] Skipping save - initial load not complete');
      return;
    }

    const saveMessages = async () => {
      if (!accessToken) {
        console.log('[ChatPlaygroundAgno] No access token available, skipping message save');
        return;
      }

      console.log(`[ChatPlaygroundAgno] Saving ${messages.length} messages to backend`);

      try {
        const response = await fetch(`${API_BASE_URL}/api/workbench/messages/${agent.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(messages),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[ChatPlaygroundAgno] Messages saved successfully:', data);
        } else {
          console.error('[ChatPlaygroundAgno] Failed to save messages:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('[ChatPlaygroundAgno] Failed to save messages to backend:', error);
      }
    };

    const timer = setTimeout(saveMessages, 500);
    return () => clearTimeout(timer);
  }, [messages, agent.id, accessToken, API_BASE_URL, isMessagesLoaded]);

  // Initialize chat adapter
  useEffect(() => {
    if (!accessToken || !agentSessionId) {
      console.log('[ChatPlaygroundAgno] No access token or sessionId, skipping adapter initialization');
      return;
    }

    console.log('[ChatPlaygroundAgno] Initializing chat adapter for Agno framework');

    try {
      const adapter = ChatAdapterFactory.createAdapter(agent.framework);

      // For Agno, pass selectedResource and its type if available
      const resourceId = selectedResource || undefined;
      const resourceType = resourceId
        ? agnoResources.find((r) => r.id === resourceId)?.type
        : undefined;

      adapter.initialize({
        agentId: agent.id,
        agentEndpoint: agent.agno_os_endpoint || '',
        apiBaseUrl: API_BASE_URL,
        accessToken: accessToken,
        sessionId: undefined, // Workbench mode
        selectedResource: resourceId,
        selectedResourceType: resourceType,
      });

      chatAdapterRef.current = adapter;
      console.log('[ChatPlaygroundAgno] Chat adapter initialized:', {
        sessionId: agentSessionId,
        selectedResource: resourceId,
        selectedResourceType: resourceType,
        framework: agent.framework,
      });
    } catch (error) {
      console.error('[ChatPlaygroundAgno] Failed to create chat adapter:', error);
    }

    return () => {
      if (chatAdapterRef.current) {
        console.log('[ChatPlaygroundAgno] Disposing chat adapter');
        chatAdapterRef.current.dispose();
        chatAdapterRef.current = null;
      }
    };
  }, [agent.id, agent.framework, accessToken, agentSessionId, API_BASE_URL, selectedResource, agnoResources]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [messages, streamingMessage]);

  // Save selectedResource to localStorage whenever it changes
  useEffect(() => {
    if (selectedResource) {
      localStorage.setItem(`agno_selected_resource_${agent.id}`, selectedResource);
      console.log('[ChatPlaygroundAgno] Saved selected resource to localStorage:', selectedResource);
    }
  }, [selectedResource, agent.id]);

  // Save agnoResources to localStorage whenever they change
  useEffect(() => {
    if (agnoResources.length > 0) {
      localStorage.setItem(`agno_resources_${agent.id}`, JSON.stringify(agnoResources));
      console.log('[ChatPlaygroundAgno] Saved agno resources to localStorage:', agnoResources.length, 'resources');
    }
  }, [agnoResources, agent.id]);

  // Validate selectedResource when agnoResources are loaded
  useEffect(() => {
    if (agnoResources.length > 0 && selectedResource) {
      // Check if the stored resource still exists
      const exists = agnoResources.some((r) => r.id === selectedResource);
      if (!exists) {
        console.log('[ChatPlaygroundAgno] Stored resource no longer exists, clearing selection');
        setSelectedResource('');
        localStorage.removeItem(`agno_selected_resource_${agent.id}`);
      } else {
        console.log('[ChatPlaygroundAgno] Restored selected resource from localStorage:', selectedResource);
      }
    }
  }, [agnoResources, selectedResource, agent.id]);

  // Fetch available LLMs (healthy & active)
  useEffect(() => {
    const fetchAvailableLlms = async () => {
      if (!accessToken) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/public/llm-models/`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const llms = await response.json();
          setAvailableLlms(llms.map((llm: any) => ({
            id: llm.id,
            name: llm.name,
            provider: llm.provider,
          })));
          console.log('[ChatPlaygroundAgno] Loaded available LLMs:', llms.length);
        }
      } catch (error) {
        console.error('[ChatPlaygroundAgno] Failed to fetch LLMs:', error);
      }
    };

    fetchAvailableLlms();
  }, [accessToken, API_BASE_URL]);

  // Send trace_id to parent
  useEffect(() => {
    if (traceId && onTraceIdReceived) {
      onTraceIdReceived(traceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsStreaming(true);
    setStreamingMessage('');

    // Create system events container message for Agno
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
            console.log('[ChatPlaygroundAgno] Received chunk, content:', chunk.content.length, 'reasoning:', chunk.reasoningContent?.length || 0);
            setStreamingMessage(chunk.content);
            if (chunk.reasoningContent) {
              setStreamingReasoning(chunk.reasoningContent);
            }
          },
          onComplete: (response) => {
            console.log('[ChatPlaygroundAgno] Message complete, content:', response.content.length, 'reasoning:', response.reasoningContent?.length || 0);

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
          },
          onError: (error) => {
            console.error('[ChatPlaygroundAgno] Chat error:', error);
            setIsStreaming(false);
            alert(`Chat error: ${error.message}`);
          },
          onSystemEvent: (event) => {
            if (systemEventsMessageId) {
              console.log('[ChatPlaygroundAgno] System event:', event.event, event.data);

              // Events that should be merged when they repeat
              const mergeableEvents = ['RunContent', 'TeamRunContent'];
              const isMergeable = mergeableEvents.includes(event.event);

              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id !== systemEventsMessageId) return msg;

                  const existingEvents = msg.systemEvents || [];

                  if (isMergeable) {
                    // Find existing event of same type
                    const existingIndex = existingEvents.findIndex((e) => e.event === event.event);

                    if (existingIndex >= 0) {
                      // Update existing event (merge occurrences)
                      const updated = [...existingEvents];
                      const existing = updated[existingIndex];
                      updated[existingIndex] = {
                        ...existing,
                        data: {
                          ...existing.data,
                          count: (existing.data.count || 1) + 1, // Track occurrence count
                          lastUpdate: event.timestamp,
                        },
                        timestamp: event.timestamp, // Update to latest timestamp
                      };
                      return { ...msg, systemEvents: updated };
                    }
                  }

                  // Add new event
                  return { ...msg, systemEvents: [...existingEvents, event] };
                })
              );
            }
          },
        },
        conversationHistory
      );
    } catch (error) {
      console.error('[ChatPlaygroundAgno] Failed to send message:', error);
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
    if (chatAdapterRef.current) {
      chatAdapterRef.current.cancel();
    }

    setMessages([]);
    setStreamingMessage('');
    setIsStreaming(false);

    const storageKey = `agent-session-${agent.id}`;
    localStorage.removeItem(storageKey);
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(storageKey, newSessionId);
    setAgentSessionId(newSessionId);
    console.log('[ChatPlaygroundAgno] Created new agent sessionId after clear:', newSessionId);

    if (accessToken) {
      try {
        await fetch(`${API_BASE_URL}/api/workbench/messages/${agent.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify([]),
        });
        console.log('[ChatPlaygroundAgno] Session cleared from backend');
      } catch (error) {
        console.error('[ChatPlaygroundAgno] Failed to clear session from backend:', error);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    const success = await copyToClipboard(content);
    if (success) {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } else {
      console.error('Failed to copy message');
    }
  };

  const handleSaveEndpoint = async () => {
    if (!agentEndpoint.trim()) {
      return;
    }

    setIsSavingEndpoint(true);

    try {
      await agentService.updateAgent(agent.id, {
        agno_os_endpoint: agentEndpoint.trim()
      });

      agent.agno_os_endpoint = agentEndpoint.trim();

      console.log('Agent endpoint saved successfully');
      setTimeout(() => setIsSavingEndpoint(false), 500);
    } catch (error) {
      console.error('Error saving agent endpoint:', error);
      setIsSavingEndpoint(false);
    }
  };

  // Agno-specific: Test connection and fetch teams/agents
  const handleTestAgentEndpoint = async () => {
    if (!agentEndpoint.trim()) {
      setAgentEndpointStatus('error');
      return;
    }

    setAgentEndpointStatus('testing');

    try {
      const response = await fetch(`${API_BASE_URL}/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          agno_os_endpoint: agentEndpoint,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ChatPlaygroundAgno] Endpoint validation successful:', data);

        // For Agno, fetch teams and agents
        const resources: Array<{ id: string; name: string; type: 'team' | 'agent' }> = [];

        // Try to fetch teams
        try {
          const teamsRes = await fetch(`${agentEndpoint}/teams`);
          if (teamsRes.ok) {
            const teamsData = await teamsRes.json();
            const teams = teamsData.map((team: any) => ({
              id: team.id,
              name: team.name || team.id,
              type: 'team' as const,
            }));
            resources.push(...teams);
            console.log('[ChatPlaygroundAgno] Loaded teams:', teams);
          }
        } catch (error) {
          console.warn('[ChatPlaygroundAgno] Failed to load teams:', error);
        }

        // Try to fetch agents
        try {
          const agentsRes = await fetch(`${agentEndpoint}/agents`);
          if (agentsRes.ok) {
            const agentsData = await agentsRes.json();
            const agents = agentsData.map((agentItem: any) => ({
              id: agentItem.id,
              name: agentItem.name || agentItem.id,
              type: 'agent' as const,
            }));
            resources.push(...agents);
            console.log('[ChatPlaygroundAgno] Loaded agents:', agents);
          }
        } catch (error) {
          console.warn('[ChatPlaygroundAgno] Failed to load agents:', error);
        }

        setAgnoResources(resources);
        console.log('[ChatPlaygroundAgno] Combined resources:', resources);

        setAgentEndpointStatus('success');
        setTimeout(() => setAgentEndpointStatus('idle'), 3000);
      } else {
        const errorData = await response.json();
        console.error('[ChatPlaygroundAgno] Endpoint validation failed:', errorData);
        alert(`Connection failed: ${errorData.detail || 'Please check the endpoint and ensure the agent is running.'}`);
        setAgentEndpointStatus('error');
        setTimeout(() => setAgentEndpointStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('[ChatPlaygroundAgno] Error testing agent endpoint:', error);
      alert(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAgentEndpointStatus('error');
      setTimeout(() => setAgentEndpointStatus('idle'), 3000);
    }
  };

  // Show deployment notice if agent is deployed
  if (isDeployed) {
    return (
      <div className="flex flex-col bg-panel-light dark:bg-panel-dark md:col-span-2 rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
        <div
          className="flex h-16 items-center justify-between px-4"
          style={{
            borderBottom: '2px solid',
            borderColor: 'var(--color-workbench-primary, #EA2831)',
            backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
              ? 'rgba(234, 40, 49, 0.05)'
              : 'rgba(234, 40, 49, 0.02)'
          }}
        >
          <div className="flex flex-col">
            <h2 className="text-base font-bold" style={{ color: 'var(--color-workbench-primary, #EA2831)' }}>
              {t('workbench.chatPlayground')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{displayName}</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mb-4 mx-auto w-20 h-20 rounded-full bg-gray-100 dark:bg-background-dark flex items-center justify-center">
              <Globe className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Agent is Deployed
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              This agent is currently deployed to {agent.status === AgentStatus.DEPLOYED_TEAM ? 'your team' : 'all users'} in Hub.
              Workbench chat is disabled for deployed agents.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              To use Workbench features, please undeploy the agent first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-panel-light dark:bg-panel-dark md:col-span-2 rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
      {/* Header */}
      <div
        className="flex h-16 items-center justify-between px-4"
        style={{
          borderBottom: '2px solid',
          borderColor: 'var(--color-workbench-primary, #EA2831)',
          backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
            ? 'rgba(234, 40, 49, 0.05)'
            : 'rgba(234, 40, 49, 0.02)'
        }}
      >
        <div className="flex flex-col">
          <h2 className="text-base font-bold" style={{ color: 'var(--color-workbench-primary, #EA2831)' }}>
            {t('workbench.chatPlayground')}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWorkflowGuide(true)}
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 w-9 transition-all"
            style={{
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#9ca3af' : '#6b7280',
              backgroundColor: 'transparent',
              border: '1px solid',
              borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2938' : '#e5e7eb'
            }}
            title="Workflow Guide"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 w-9 transition-all"
            style={{
              color: showGuide ? 'var(--color-workbench-primary, #EA2831)' : (document.documentElement.getAttribute('data-theme') === 'dark' ? '#9ca3af' : '#6b7280'),
              backgroundColor: showGuide
                ? (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(234, 40, 49, 0.1)' : 'rgba(234, 40, 49, 0.08)')
                : 'transparent',
              border: '1px solid',
              borderColor: showGuide
                ? 'var(--color-workbench-primary, #EA2831)'
                : (document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2938' : '#e5e7eb')
            }}
            title="Playground Guide"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 w-9 transition-all"
            style={{
              color: showConfig ? 'var(--color-workbench-primary, #EA2831)' : (document.documentElement.getAttribute('data-theme') === 'dark' ? '#9ca3af' : '#6b7280'),
              backgroundColor: showConfig
                ? (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(234, 40, 49, 0.1)' : 'rgba(234, 40, 49, 0.08)')
                : 'transparent',
              border: '1px solid',
              borderColor: showConfig
                ? 'var(--color-workbench-primary, #EA2831)'
                : (document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2938' : '#e5e7eb')
            }}
            title="Configuration"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleClearSession}
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 gap-2 text-sm font-medium transition-all"
            style={{
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#9ca3af' : '#6b7280',
              border: '1px solid',
              borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2938' : '#e5e7eb'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-workbench-primary, #EA2831)';
              e.currentTarget.style.color = 'var(--color-workbench-primary, #EA2831)';
              e.currentTarget.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark'
                ? 'rgba(234, 40, 49, 0.1)'
                : 'rgba(234, 40, 49, 0.05)';
            }}
            onMouseLeave={(e) => {
              const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
              e.currentTarget.style.borderColor = isDark ? '#2d2938' : '#e5e7eb';
              e.currentTarget.style.color = isDark ? '#9ca3af' : '#6b7280';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline truncate">{t('workbench.clearSession')}</span>
          </button>
        </div>
      </div>

      {/* Guide Panel - omitted for brevity, same as ADK version */}
      {showGuide && (
        <div className="border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark/50 px-4 py-3 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-workbench-primary, #EA2831)' }}>
                {t('workbench.guide.title')}
              </h3>
              <button
                onClick={() => setShowGuide(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              <p>{t('workbench.guide.intro')}</p>
            </div>

            {/* Text Formatting */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.textFormatting.title')}
              </h4>

              {/* Basic Formatting Example */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>{t('workbench.guide.textFormatting.basicLabel')}</strong>
                </p>
                {/* Source code */}
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{`${t('workbench.guide.textFormatting.boldExample')}\n${t('workbench.guide.textFormatting.italicExample')}\n${t('workbench.guide.textFormatting.strikeExample')}\n${t('workbench.guide.textFormatting.codeExample')}`}</code>
                  </pre>
                </div>
                {/* Preview */}
                <div className="bg-white dark:bg-panel-dark p-3 rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={`${t('workbench.guide.textFormatting.boldExample')}\n\n${t('workbench.guide.textFormatting.italicExample')}\n\n${t('workbench.guide.textFormatting.strikeExample')}\n\n${t('workbench.guide.textFormatting.codeExample')}`} />
                </div>
              </div>

              {/* Task Lists Example */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>{t('workbench.guide.textFormatting.taskListsLabel')}</strong>
                </p>
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{t('workbench.guide.textFormatting.taskExample')}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-panel-dark p-3 rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={t('workbench.guide.textFormatting.taskExample')} />
                </div>
              </div>
            </div>

            {/* Code Blocks */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.codeBlocks.title')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>{t('workbench.guide.codeBlocks.featuresLabel')}</strong>
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-3">
                <li>{t('workbench.guide.codeBlocks.feature1')}</li>
                <li>{t('workbench.guide.codeBlocks.feature2')}</li>
                <li>{t('workbench.guide.codeBlocks.feature3')}</li>
                <li>{t('workbench.guide.codeBlocks.feature4')}</li>
                <li>{t('workbench.guide.codeBlocks.feature5')}</li>
              </ul>

              {/* Python Example */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Python {t('workbench.guide.codeBlocks.exampleLabel')}</strong>
                </p>
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{t('workbench.guide.codeBlocks.pythonExample')}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-panel-dark rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={t('workbench.guide.codeBlocks.pythonExample')} />
                </div>
              </div>

              {/* Diff Example */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>{t('workbench.guide.codeBlocks.diffLabel')}</strong> {t('workbench.guide.codeBlocks.diffNote')}
                </p>
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{t('workbench.guide.codeBlocks.diffExample')}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-panel-dark rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={t('workbench.guide.codeBlocks.diffExample')} />
                </div>
              </div>
            </div>

            {/* Mathematics */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.math.title')}
              </h4>

              {/* Inline Math Example */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>{t('workbench.guide.math.inlineLabel')}</strong>
                </p>
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{t('workbench.guide.math.inlineExample')}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-panel-dark p-3 rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={t('workbench.guide.math.inlineExample')} />
                </div>
              </div>

              {/* Display Math Example */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>{t('workbench.guide.math.displayLabel')}</strong>
                </p>
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{t('workbench.guide.math.displayExample')}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-panel-dark p-3 rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={t('workbench.guide.math.displayExample')} />
                </div>
              </div>
            </div>

            {/* Diagrams */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.diagrams.title')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>{t('workbench.guide.diagrams.supportedLabel')}</strong>
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-3">
                <li><strong>Flowchart:</strong> {t('workbench.guide.diagrams.flowchart')}</li>
                <li><strong>Sequence:</strong> {t('workbench.guide.diagrams.sequence')}</li>
                <li><strong>Class:</strong> {t('workbench.guide.diagrams.class')}</li>
                <li><strong>State:</strong> {t('workbench.guide.diagrams.state')}</li>
                <li><strong>ER:</strong> {t('workbench.guide.diagrams.er')}</li>
                <li><strong>Gantt:</strong> {t('workbench.guide.diagrams.gantt')}</li>
                <li><strong>Pie:</strong> {t('workbench.guide.diagrams.pie')}</li>
              </ul>

              {/* Flowchart Example */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>{t('workbench.guide.diagrams.exampleLabel')}</strong>
                </p>
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{t('workbench.guide.diagrams.flowchartExample')}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-panel-dark rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={t('workbench.guide.diagrams.flowchartExample')} />
                </div>
              </div>

              {/* Sequence Diagram Example */}
              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Sequence Diagram:</strong>
                </p>
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{t('workbench.guide.diagrams.sequenceExample')}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-panel-dark rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={t('workbench.guide.diagrams.sequenceExample')} />
                </div>
              </div>
            </div>

            {/* Tables */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.tables.title')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>{t('workbench.guide.tables.featuresLabel')}</strong> {t('workbench.guide.tables.featuresText')}
              </p>

              <div className="mb-3">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <strong>{t('workbench.guide.tables.exampleLabel')}</strong>
                </p>
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{t('workbench.guide.tables.tableExample')}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-panel-dark p-3 rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={t('workbench.guide.tables.tableExample')} />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.images.title')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>{t('workbench.guide.images.featuresLabel')}</strong> {t('workbench.guide.images.featuresText')}
              </p>
            </div>

            {/* Links & Lists */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.links.title')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('workbench.guide.links.markdownLabel')} <code className="text-xs bg-gray-100 dark:bg-background-dark px-1 py-0.5 rounded">[링크](https://example.com)</code>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                <strong>{t('workbench.guide.links.autoLinkLabel')}</strong> {t('workbench.guide.links.autoLinkText')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('workbench.guide.links.unorderedLabel')} <code className="text-xs bg-gray-100 dark:bg-background-dark px-1 py-0.5 rounded">- 항목</code>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('workbench.guide.links.orderedLabel')} <code className="text-xs bg-gray-100 dark:bg-background-dark px-1 py-0.5 rounded">1. 항목</code>
              </p>
            </div>

            {/* Blockquotes */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.blockquotes.title')}
              </h4>

              <div className="mb-3">
                <div className="mb-2">
                  <pre className="text-xs bg-gray-100 dark:bg-background-dark p-2 rounded border border-gray-300 dark:border-border-dark overflow-x-auto">
                    <code>{t('workbench.guide.blockquotes.example')}</code>
                  </pre>
                </div>
                <div className="bg-white dark:bg-panel-dark p-3 rounded border border-gray-300 dark:border-border-dark">
                  <MessageContent content={t('workbench.guide.blockquotes.example')} />
                </div>
              </div>
            </div>

            {/* Best Practices */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.bestPractices.title')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>{t('workbench.guide.bestPractices.forAgentsLabel')}</strong>
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-3">
                <li>{t('workbench.guide.bestPractices.tip1')}</li>
                <li>{t('workbench.guide.bestPractices.tip2')}</li>
                <li>{t('workbench.guide.bestPractices.tip3')}</li>
                <li>{t('workbench.guide.bestPractices.tip4')}</li>
                <li>{t('workbench.guide.bestPractices.tip5')}</li>
              </ul>
            </div>

            {/* Quick Reference */}
            <div className="border-t border-gray-200 dark:border-border-dark pt-4">
              <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                {t('workbench.guide.quickReference.title')}
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-300 dark:border-border-dark">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-background-dark">
                      <th className="border border-gray-300 dark:border-border-dark px-3 py-2 text-left">
                        {t('workbench.guide.quickReference.featureCol')}
                      </th>
                      <th className="border border-gray-300 dark:border-border-dark px-3 py-2 text-left">
                        {t('workbench.guide.quickReference.useCaseCol')}
                      </th>
                      <th className="border border-gray-300 dark:border-border-dark px-3 py-2 text-left">
                        {t('workbench.guide.quickReference.exampleCol')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-300">
                    <tr>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.codeBlock')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.codeBlockUse')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.codeBlockEx')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.diff')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.diffUse')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.diffEx')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.latex')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.latexUse')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.latexEx')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.flowchart')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.flowchartUse')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.flowchartEx')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.sequence')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.sequenceUse')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.sequenceEx')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.table')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.tableUse')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.tableEx')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.blockquote')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.blockquoteUse')}
                      </td>
                      <td className="border border-gray-300 dark:border-border-dark px-3 py-2">
                        {t('workbench.guide.quickReference.blockquoteEx')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-200 dark:border-border-dark">
              {t('workbench.guide.footer')}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Panel - Agno-specific (includes team/agent selector) */}
      {showConfig && (
        <div className="border-b border-border-light dark:border-border-dark bg-panel-light dark:bg-panel-dark/50 px-4 py-3 max-h-[60vh] overflow-y-auto">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
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

            {/* Available LLM Models */}
            {availableLlms.length > 0 && (
              <div className="border rounded-lg border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3">
                <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                  Available LLM Models
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableLlms.map((llm) => (
                    <span
                      key={llm.id}
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#86efac' : '#16a34a',
                        border: `1px solid ${document.documentElement.getAttribute('data-theme') === 'dark' ? '#16a34a' : '#86efac'}`
                      }}
                    >
                      {llm.name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                  These models are currently healthy and available for use via Platform LLM Proxy.
                </p>
              </div>
            )}

            {/* Platform LLM Proxy Endpoints */}
            <div className="border rounded-lg border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Platform LLM Proxy Endpoint
              </h4>
              {platformLlmEndpoint ? (
                <>
                  <div
                    className="flex items-center justify-between p-2 rounded border"
                    style={{
                      backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff',
                      borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#4b5563' : '#d1d5db'
                    }}
                  >
                    <code
                      className="text-xs break-all"
                      style={{
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#e5e7eb' : '#1f2937'
                      }}
                    >
                      {platformLlmEndpoint}
                    </code>
                    <button
                      onClick={() => {
                        copyToClipboard(platformLlmEndpoint);
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

            {/* Agno OS Endpoint */}
            <div className="border rounded-lg border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                Agno OS Endpoint
              </h4>

              <div className="mb-3">
                <input
                  type="url"
                  value={agentEndpoint}
                  onChange={(e) => setAgentEndpoint(e.target.value)}
                  placeholder="http://localhost:8011"
                  className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  style={{
                    backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff',
                    borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#4b5563' : '#d1d5db',
                    color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#e5e7eb' : '#1f2937'
                  }}
                />
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  Enter your agent's hosted A2A endpoint (e.g., http://localhost:8011)
                </p>
              </div>

              <button
                onClick={handleSaveEndpoint}
                disabled={!agentEndpoint.trim() || isSavingEndpoint}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                style={{
                  backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
                    ? 'rgba(234, 40, 49, 0.1)'
                    : '#ffffff',
                  color: 'var(--color-workbench-primary, #EA2831)',
                  borderWidth: '1px',
                  borderColor: document.documentElement.getAttribute('data-theme') === 'dark'
                    ? 'rgba(234, 40, 49, 0.5)'
                    : 'var(--color-workbench-primary, #EA2831)'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark'
                      ? 'rgba(234, 40, 49, 0.2)'
                      : 'rgba(234, 40, 49, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark'
                    ? 'rgba(234, 40, 49, 0.1)'
                    : '#ffffff';
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

              {/* CORS Warning */}
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
                        {`# Add CORS middleware to your Agno agent`}
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
                  backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
                    ? 'rgba(234, 40, 49, 0.1)'
                    : '#ffffff',
                  color: 'var(--color-workbench-primary, #EA2831)',
                  borderWidth: '1px',
                  borderColor: document.documentElement.getAttribute('data-theme') === 'dark'
                    ? 'rgba(234, 40, 49, 0.5)'
                    : 'var(--color-workbench-primary, #EA2831)'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark'
                      ? 'rgba(234, 40, 49, 0.2)'
                      : 'rgba(234, 40, 49, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark'
                    ? 'rgba(234, 40, 49, 0.1)'
                    : '#ffffff';
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

            {/* Agno Team/Agent Selector */}
            {agent.agno_os_endpoint && agnoResources.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border-light dark:border-border-dark pt-3">
                <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                  Agno Configuration
                </h4>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Select Team or Agent
                  </label>
                  <select
                    value={selectedResource}
                    onChange={(e) => setSelectedResource(e.target.value)}
                    className="form-select w-full rounded-lg border-border-light bg-background-light p-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-background-dark dark:text-white dark:focus:border-primary"
                  >
                    <option value="">-- Select a team or agent --</option>
                    {agnoResources.map((resource) => (
                      <option key={`${resource.type}-${resource.id}`} value={resource.id}>
                        {resource.name} ({resource.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages - includes system events handling */}
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
            {messages.map((message) => {
              // System events section - collapsible
              if (message.role === 'system' && message.systemEvents !== undefined) {
                const isExpanded = expandedSystemMessages.has(message.id);
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

                const toggleExpanded = () => {
                  setExpandedSystemMessages((prev) => {
                    const next = new Set(prev);
                    if (next.has(message.id)) {
                      next.delete(message.id);
                    } else {
                      next.add(message.id);
                    }
                    return next;
                  });
                };

                return (
                  <div key={message.id} className="my-2">
                    <button
                      onClick={toggleExpanded}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors w-full"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                      <span>
                        {t('workbench.systemEvents')} ({message.systemEvents.length})
                      </span>
                    </button>

                    {isExpanded && message.systemEvents.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 justify-center">
                        {message.systemEvents.map((event, idx) => {
                          // Determine event type from event name
                          const eventName = event.event;
                          let eventType = 'unknown';

                          if (eventName.includes('ToolCall')) {
                            eventType = 'tool';
                          } else if (eventName.includes('Started') || eventName.includes('Completed')) {
                            eventType = 'control';
                          } else if (eventName.includes('Content')) {
                            eventType = 'model';
                          } else if (eventName.includes('Error')) {
                            eventType = 'error';
                          }

                          let badgeColor = '';
                          if (eventType === 'tool') {
                            badgeColor = isDark ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7';
                          } else if (eventType === 'control') {
                            badgeColor = isDark ? 'rgba(53, 158, 255, 0.2)' : '#dbeafe';
                          } else if (eventType === 'model') {
                            badgeColor = isDark ? 'rgba(147, 51, 234, 0.2)' : '#ede9fe';
                          } else if (eventType === 'error') {
                            badgeColor = isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2';
                          } else {
                            badgeColor = isDark ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6';
                          }

                          let textColor = '';
                          if (eventType === 'tool') {
                            textColor = isDark ? '#86efac' : '#16a34a';
                          } else if (eventType === 'control') {
                            textColor = isDark ? '#93c5fd' : '#2563eb';
                          } else if (eventType === 'model') {
                            textColor = isDark ? '#c4b5fd' : '#9333ea';
                          } else if (eventType === 'error') {
                            textColor = isDark ? '#fca5a5' : '#dc2626';
                          } else {
                            textColor = isDark ? '#d1d5db' : '#4b5563';
                          }

                          // Get translated event name
                          const translatedEvent = t(`workbench.events.${eventName}`, { defaultValue: eventName });

                          // Count display for merged events
                          const count = event.data?.count;
                          const hasCount = count && count > 1;

                          // Tooltip content
                          const tooltipText = `${eventName}${hasCount ? ` (${count}회)` : ''}\n${new Date(event.timestamp).toLocaleTimeString()}`;

                          // Event detail key for expansion
                          const eventKey = `${message.id}-event-${idx}`;
                          const isDetailExpanded = expandedEventDetails.has(eventKey);

                          const toggleEventDetail = () => {
                            setExpandedEventDetails((prev) => {
                              const next = new Set(prev);
                              if (next.has(eventKey)) {
                                next.delete(eventKey);
                              } else {
                                next.add(eventKey);
                              }
                              return next;
                            });
                          };

                          return (
                            <div key={eventKey} className="flex flex-col gap-1">
                              <button
                                onClick={toggleEventDetail}
                                className="px-3 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all hover:scale-105"
                                style={{
                                  backgroundColor: badgeColor,
                                  color: textColor,
                                }}
                                title={tooltipText}
                              >
                                {translatedEvent}
                                {hasCount && (
                                  <span className="ml-1 opacity-75">×{count}</span>
                                )}
                              </button>

                              {/* Expanded detail view */}
                              {isDetailExpanded && (
                                <div
                                  className="text-[10px] px-3 py-2 rounded-md mt-1"
                                  style={{
                                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)',
                                    border: `1px solid ${badgeColor}`,
                                    color: isDark ? '#d1d5db' : '#374151',
                                  }}
                                >
                                  <div className="font-semibold mb-1">{eventName}</div>
                                  <div className="opacity-75 mb-1">
                                    {new Date(event.timestamp).toLocaleString()}
                                  </div>
                                  {hasCount && (
                                    <div className="opacity-75 mb-1">
                                      Occurrences: {count}
                                    </div>
                                  )}
                                  <div className="mt-2 max-h-32 overflow-auto">
                                    <pre className="whitespace-pre-wrap break-all">
                                      {JSON.stringify(event.data, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // User and Assistant messages
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 sm:gap-4 ${
                    message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                      message.role === 'user'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300'
                    }`}
                  >
                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div
                    className={`flex max-w-[85%] sm:max-w-[75%] flex-col gap-1 ${
                      message.role === 'assistant' ? 'items-start' : 'items-end'
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {message.role === 'user' ? t('workbench.you') : displayName}
                    </p>
                    <div
                      className={`rounded-lg p-3 text-sm leading-relaxed border-2 ${
                        message.role === 'user'
                          ? 'rounded-tr-none'
                          : 'rounded-tl-none'
                      }`}
                      style={{
                        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
                          ? '#1f2937'
                          : '#ffffff',
                        borderColor: message.role === 'user'
                          ? (document.documentElement.getAttribute('data-theme') === 'dark' ? '#EA2831' : 'rgba(234, 40, 49, 0.4)')
                          : (document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(234, 40, 49, 0.6)' : '#EA2831')
                      }}
                    >
                      {/* Thinking section - only for assistant messages with reasoning */}
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
                            <span>Thinking...</span>
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      <button
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        title="Copy message"
                      >
                        {copiedMessageId === message.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming message */}
            {isStreaming && (streamingMessage || streamingReasoning) && (
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex max-w-[85%] sm:max-w-[75%] flex-col gap-1">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{displayName}</p>

                  <div
                    className="rounded-lg rounded-tl-none border-2 p-3 text-sm leading-relaxed"
                    style={{
                      backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark'
                        ? '#1f2937'
                        : '#ffffff',
                      borderColor: document.documentElement.getAttribute('data-theme') === 'dark'
                        ? 'rgba(234, 40, 49, 0.6)'
                        : '#EA2831'
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
                        <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-1" />
                      </>
                    ) : (
                      <span className="inline-block h-4 w-1 animate-pulse bg-primary" />
                    )}
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
            className="form-input w-full resize-none rounded-lg border-border-light bg-panel-light p-3 pr-16 sm:pr-24 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-panel-dark dark:text-white dark:focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t('workbench.typeMessage')}
            rows={1}
            style={{ maxHeight: '200px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isStreaming}
            className="absolute bottom-2 right-2 flex min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 w-12 sm:w-16 bg-primary/80 text-white hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Workflow Guide Modal */}
      <WorkflowGuideModal
        isOpen={showWorkflowGuide}
        onClose={() => setShowWorkflowGuide(false)}
        framework={agent.framework}
        onDownloadExamples={handleDownloadExamples}
      />
    </div>
  );
};
