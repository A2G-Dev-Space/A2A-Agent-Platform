import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, Bot, Trash2, X, User, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { type Agent } from '@/types';
import type { ChatAdapter } from '@/adapters/chat';
import { HubADKChatAdapter } from '@/adapters/chat';
import { MessageContent } from '@/components/chat/MessageContent';
import { A2AInfoSidebar } from './A2AInfoSidebar';
import { getGatewayBaseUrl } from '@/config/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface HubSession {
  id: string;
  agent_id: number;
  session_name: string;
  message_count: number;
  created_at: string;
  last_message_at: string;
}

interface HubChatADKProps {
  agent: Agent;
  onClose?: () => void;
}

export const HubChatADK: React.FC<HubChatADKProps> = ({ agent, onClose }) => {
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatAdapterRef = useRef<ChatAdapter | null>(null);

  // Use absolute URL with HOST_IP and GATEWAY_PORT
  const API_BASE_URL = getGatewayBaseUrl();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [messages, streamingMessage]);

  // Load sessions for this agent
  useEffect(() => {
    loadSessions();
  }, [agent.id, accessToken]);

  // Initialize chat adapter
  useEffect(() => {
    if (!accessToken) return;

    try {
      const adapter = new HubADKChatAdapter();

      adapter.initialize({
        agentId: agent.id,
        agentEndpoint: agent.a2a_endpoint || '',
        apiBaseUrl: API_BASE_URL,
        accessToken: accessToken,
        sessionId: currentSessionId || undefined,
      });

      chatAdapterRef.current = adapter;
      console.log('[HubChatADK] Chat adapter initialized:', {
        framework: agent.framework,
        sessionId: currentSessionId,
      });
    } catch (error) {
      console.error('[HubChatADK] Failed to create chat adapter:', error);
    }

    return () => {
      if (chatAdapterRef.current) {
        chatAdapterRef.current.dispose();
        chatAdapterRef.current = null;
      }
    };
  }, [agent.id, agent.framework, accessToken, currentSessionId, API_BASE_URL]);

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
        console.log('[HubChatADK] Loaded sessions:', data.sessions?.length);
      }
    } catch (error) {
      console.error('[HubChatADK] Failed to load sessions:', error);
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
        const loadedMessages = (data.messages || [])
          .filter((msg: any) => msg.role !== 'system') // ADK: filter out system messages
          .map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        setMessages(loadedMessages);
        console.log('[HubChatADK] Loaded messages:', loadedMessages.length);
      }
    } catch (error) {
      console.error('[HubChatADK] Failed to load messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    console.log('[HubChatADK] Starting new chat');
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
        console.log('[HubChatADK] Deleted session:', sessionId);
      }
    } catch (error) {
      console.error('[HubChatADK] Failed to delete session:', error);
    }
  };

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

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      await chatAdapterRef.current.sendMessage(
        { content: userMessageContent },
        {
          onChunk: (chunk) => {
            setStreamingMessage(chunk.content);
          },
          onComplete: (response) => {
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

            // Reload sessions to update message count
            loadSessions();
          },
          onError: (error) => {
            console.error('[HubChatADK] Chat error:', error);
            setIsStreaming(false);
            alert(`Chat error: ${error.message}`);
          },
        },
        conversationHistory
      );
    } catch (error) {
      console.error('[HubChatADK] Failed to send message:', error);
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
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full flex-1 flex-shrink">
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
                <p className="text-gray-500 dark:text-gray-400">Start a conversation</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
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
              ))}

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
                    {streamingMessage ? (
                      <div className="p-4 rounded-lg rounded-tl-none"
                        style={{
                          backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(2, 132, 199, 0.1)' : '#E0F2FE',
                          color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#e2e8f0' : '#1e293b',
                        }}
                      >
                        <MessageContent content={streamingMessage} contentType="markdown" />
                        <span className="inline-block h-4 w-1 animate-pulse ml-1" style={{ backgroundColor: '#0284c7' }} />
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg rounded-tl-none flex items-center gap-2"
                        style={{
                          backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(2, 132, 199, 0.1)' : '#E0F2FE',
                          color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#9ca3af' : '#6b7280',
                        }}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">{t('chat.waitingForResponse')}</span>
                      </div>
                    )}
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
                disabled={isStreaming}
                className="flex-1 bg-transparent border-0 resize-none p-2 focus:ring-0 focus:outline-none max-h-48"
                placeholder="Type your message..."
                rows={1}
                style={{
                  color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#e2e8f0' : '#1e293b',
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isStreaming}
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

      {/* A2A Info Sidebar */}
      <A2AInfoSidebar agent={agent} />
    </div>
  );
};
