import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, PhoneIncoming, Wrench, FileText, ArrowRightLeft, Trash2 } from 'lucide-react';

interface TraceEvent {
  log_id: number;
  timestamp: string;
  log_type: string;
  event_type?: string;
  message: string;
  metadata?: any;
  agent_id?: string;
}

interface TracePanelProps {
  traceId: string | null;
  sessionId: string;
}

// Event type configuration with colors and icons (function to support i18n)
const getEventConfig = (t: (key: string) => string) => ({
  // LLM Events
  llm_request: {
    label: t('workbench.trace.sendToLLM'),
    color: 'blue',
    icon: Send,
    bgLight: 'bg-blue-100',
    bgDark: 'bg-blue-900/50',
    textLight: 'text-blue-600',
    textDark: 'text-blue-300',
  },
  llm_response: {
    label: t('workbench.trace.receiveFromLLM'),
    color: 'purple',
    icon: PhoneIncoming,
    bgLight: 'bg-purple-100',
    bgDark: 'bg-purple-900/50',
    textLight: 'text-purple-600',
    textDark: 'text-purple-300',
  },
  // Tool Events
  tool_call: {
    label: t('workbench.trace.toolUse'),
    color: 'green',
    icon: Wrench,
    bgLight: 'bg-green-100',
    bgDark: 'bg-green-900/50',
    textLight: 'text-green-600',
    textDark: 'text-green-300',
  },
  tool_result: {
    label: t('workbench.trace.toolResult'),
    color: 'yellow',
    icon: FileText,
    bgLight: 'bg-yellow-100',
    bgDark: 'bg-yellow-900/50',
    textLight: 'text-yellow-600',
    textDark: 'text-yellow-400',
  },
  // Agent Events
  agent_transfer: {
    label: t('workbench.trace.agentTransfer'),
    color: 'pink',
    icon: ArrowRightLeft,
    bgLight: 'bg-pink-100',
    bgDark: 'bg-pink-900/50',
    textLight: 'text-pink-600',
    textDark: 'text-pink-400',
  },
});

// Get agent color based on agent_id
const getAgentColor = (agentId: string | undefined): string => {
  if (!agentId) return 'gray';

  // Hash agent_id to a consistent color
  const colors = ['red', 'orange', 'amber', 'lime', 'emerald', 'teal', 'cyan', 'sky', 'indigo', 'violet', 'fuchsia', 'rose'];
  const hash = agentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export const TracePanel: React.FC<TracePanelProps> = ({ traceId }) => {
  const { t } = useTranslation();
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const EVENT_CONFIG = getEventConfig(t);

  // Auto-scroll to bottom
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [events]);

  // WebSocket connection
  useEffect(() => {
    if (!traceId) {
      console.log('[TracePanel] No trace_id, skipping WebSocket connection');
      return;
    }

    // Close existing connection
    if (ws.current) {
      ws.current.close();
    }

    // Get access token from localStorage (Zustand persist)
    const authStorage = localStorage.getItem('auth-storage');
    let accessToken = '';
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        accessToken = parsed.state?.accessToken || '';
      } catch (e) {
        console.error('[TracePanel] Failed to parse auth storage:', e);
      }
    }

    if (!accessToken) {
      console.error('[TracePanel] No access token found');
      return;
    }

    // Connect to Tracing Service WebSocket
    const HOST_IP = import.meta.env.VITE_HOST_IP || 'localhost';
    const wsUrl = `ws://${HOST_IP}:8004/ws/trace/${traceId}?token=${accessToken}`;
    console.log('[TracePanel] Connecting to WebSocket:', wsUrl);

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('[TracePanel] WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[TracePanel] Received event:', data);

        if (data.type === 'pong') {
          return; // Ignore pong messages
        }

        // Add new event to list
        setEvents((prev) => [...prev, data]);
      } catch (e) {
        console.error('[TracePanel] Failed to parse WebSocket message:', e);
      }
    };

    ws.current.onerror = (error) => {
      console.error('[TracePanel] WebSocket error:', error);
      setIsConnected(false);
    };

    ws.current.onclose = () => {
      console.log('[TracePanel] WebSocket closed');
      setIsConnected(false);
    };

    // Send ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [traceId]);

  const handleClear = () => {
    setEvents([]);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Map log_type to event_type for display
  const getEventType = (event: TraceEvent): string => {
    // Check metadata.event_type first (from LLM Proxy)
    if (event.metadata?.event_type) {
      return event.metadata.event_type;
    }

    // Map log_type to event_type
    if (event.log_type === 'LLM') {
      // Check message for request vs response
      if (event.message.includes('Request')) {
        return 'llm_request';
      } else if (event.message.includes('Response')) {
        return 'llm_response';
      }
    } else if (event.log_type === 'TOOL') {
      if (event.message.includes('Tool Call')) {
        return 'tool_call';
      } else if (event.message.includes('Tool Result')) {
        return 'tool_result';
      }
    } else if (event.log_type === 'AGENT_TRANSFER') {
      return 'agent_transfer';
    }

    return 'llm_request'; // Default
  };

  return (
    <div className="flex flex-col bg-panel-light dark:bg-panel-dark rounded-lg border border-border-light dark:border-border-dark overflow-hidden h-full">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border-light dark:border-border-dark px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold">{t('workbench.trace.title')}</h2>
          {isConnected && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('workbench.trace.live')}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleClear}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/10 transition-colors"
          title={t('workbench.trace.clearTrace')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-4">
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {traceId ? t('workbench.trace.waitingForEvents') : t('workbench.trace.noTraceId')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map((event, index) => {
              const eventType = getEventType(event);
              const config = EVENT_CONFIG[eventType as keyof typeof EVENT_CONFIG] || EVENT_CONFIG.llm_request;
              const Icon = config.icon;
              const agentColor = getAgentColor(event.agent_id);

              return (
                <div key={`${event.log_id}-${index}`} className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${config.bgLight} dark:${config.bgDark}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${config.textLight} dark:${config.textDark}`} />
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-xs text-text-light-primary dark:text-text-dark-primary">
                        {config.label}
                      </p>
                      {event.agent_id && (
                        <span
                          className={`inline-flex items-center rounded-full bg-${agentColor}-100 dark:bg-${agentColor}-900/30 px-2 py-0.5 text-[10px] font-semibold text-${agentColor}-700 dark:text-${agentColor}-300`}
                        >
                          {event.agent_id}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatTimestamp(event.timestamp)}
                    </span>
                    {event.message && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {event.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={eventsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};
