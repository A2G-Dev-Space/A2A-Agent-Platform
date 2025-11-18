import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Trash2,
  Send,
  Phone,
  Wrench,
  FileText,
  ArrowRightLeft,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/authStore';

interface LogEntry {
  log_id: number;
  timestamp: string;
  service_name: string;
  agent_id?: string;
  level: string;
  message: string;
  log_type?: string;  // LLM, TOOL, AGENT, AGENT_TRANSFER
  metadata?: Record<string, any>;
  is_transfer: boolean;
}

interface TraceViewProps {
  traceId: string | null;
}

// Log type icons and colors (returns actual color values for inline styles)
const getLogIcon = (log: LogEntry) => {
  const { log_type, message, is_transfer, metadata } = log;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Agent transfer
  if (is_transfer || log_type === 'AGENT_TRANSFER') {
    return {
      Icon: ArrowRightLeft,
      label: 'Agent Transfer',
      color: isDark ? '#f9a8d4' : '#ec4899',
      bg: isDark ? 'rgba(236, 72, 153, 0.2)' : '#fce7f3'
    };
  }

  // LLM events
  if (log_type === 'LLM') {
    // Check metadata.event_type for more specific type
    const eventType = metadata?.event_type;
    if (eventType === 'llm_request' || message.toLowerCase().includes('request')) {
      return {
        Icon: Send,
        label: 'Send to LLM',
        color: isDark ? '#93c5fd' : '#2563eb',
        bg: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe'
      };
    } else if (eventType === 'llm_response' || message.toLowerCase().includes('response')) {
      return {
        Icon: Phone,
        label: 'Receive from LLM',
        color: isDark ? '#c4b5fd' : '#9333ea',
        bg: isDark ? 'rgba(147, 51, 234, 0.2)' : '#ede9fe'
      };
    }
    // Default LLM
    return {
      Icon: Send,
      label: 'LLM Event',
      color: isDark ? '#93c5fd' : '#2563eb',
      bg: isDark ? 'rgba(37, 99, 235, 0.2)' : '#dbeafe'
    };
  }

  // Tool events
  if (log_type === 'TOOL' || message.toLowerCase().includes('tool')) {
    // Check metadata.event_type for more specific type
    const eventType = metadata?.event_type;

    // Tool Response
    if (eventType === 'tool_response' || message.toLowerCase().includes('response') || message.toLowerCase().includes('result')) {
      return {
        Icon: CheckCircle,
        label: 'Tool Response',
        color: isDark ? '#5eead4' : '#0d9488',
        bg: isDark ? 'rgba(13, 148, 136, 0.2)' : '#ccfbf1'
      };
    }

    // Tool Use (default)
    return {
      Icon: Wrench,
      label: 'Tool Use',
      color: isDark ? '#86efac' : '#16a34a',
      bg: isDark ? 'rgba(22, 163, 74, 0.2)' : '#dcfce7'
    };
  }

  // Default
  return {
    Icon: FileText,
    label: 'Event',
    color: isDark ? '#d1d5db' : '#4b5563',
    bg: isDark ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6'
  };
};

// Level icons and colors
const getLevelIcon = (level: string) => {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return { Icon: XCircle, color: 'text-red-500' };
    case 'WARNING':
    case 'WARN':
      return { Icon: AlertTriangle, color: 'text-yellow-500' };
    case 'INFO':
      return { Icon: Info, color: 'text-blue-500' };
    default:
      return { Icon: Info, color: 'text-gray-500' };
  }
};

// Get agent color based on agent_id (returns actual color values, not Tailwind class names)
const getAgentColor = (agentId: string | undefined) => {
  if (!agentId) return { bg: '#e5e7eb', text: '#6b7280', border: '#d1d5db' };

  // Hash agent_id to a consistent color
  const colorSchemes = [
    { bg: '#fee2e2', text: '#dc2626', border: '#f87171' }, // red
    { bg: '#fed7aa', text: '#ea580c', border: '#fb923c' }, // orange
    { bg: '#fef3c7', text: '#d97706', border: '#fbbf24' }, // amber
    { bg: '#ecfccb', text: '#65a30d', border: '#a3e635' }, // lime
    { bg: '#d1fae5', text: '#059669', border: '#34d399' }, // emerald
    { bg: '#ccfbf1', text: '#0d9488', border: '#2dd4bf' }, // teal
    { bg: '#cffafe', text: '#0891b2', border: '#22d3ee' }, // cyan
    { bg: '#e0f2fe', text: '#0284c7', border: '#38bdf8' }, // sky
    { bg: '#e0e7ff', text: '#4f46e5', border: '#818cf8' }, // indigo
    { bg: '#ede9fe', text: '#7c3aed', border: '#a78bfa' }, // violet
    { bg: '#fae8ff', text: '#c026d3', border: '#e879f9' }, // fuchsia
    { bg: '#ffe4e6', text: '#e11d48', border: '#fb7185' }, // rose
  ];

  const hash = agentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const scheme = colorSchemes[hash % colorSchemes.length];

  // Adjust for dark mode
  if (isDark) {
    return {
      bg: scheme.text + '20', // 20% opacity
      text: scheme.border,
      border: scheme.text + '60' // 60% opacity
    };
  }

  return scheme;
};

const LogEntryItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { Icon, label, color, bg } = getLogIcon(log);
  const { Icon: LevelIcon, color: levelColor } = getLevelIcon(log.level);
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
  const agentColor = getAgentColor(log.agent_id);

  // Replace "Tool Response: None" message text but keep the log entry
  const displayMessage = log.message && /Tool Response:\s*(None|null|undefined)/i.test(log.message)
    ? "" // Empty message when it's just "Tool Response: None"
    : log.message;

  // Check if this is an agent transfer event
  const isAgentTransfer = log.is_transfer || log.log_type === 'AGENT_TRANSFER';

  // Extract target agent from metadata for agent transfers
  const targetAgent = isAgentTransfer && log.metadata
    ? (log.metadata.target_agent || log.metadata.agent_name || log.metadata.member_id || 'unknown')
    : null;

  return (
    <>
      {/* Agent Transfer Divider */}
      {isAgentTransfer && targetAgent && (
        <div className="flex items-center gap-3 py-3 mt-2">
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-workbench-primary, #EA2831)' }} />
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(234, 40, 49, 0.1)',
              color: 'var(--color-workbench-primary, #EA2831)',
              border: '2px solid var(--color-workbench-primary, #EA2831)'
            }}
          >
            <ArrowRightLeft className="h-3 w-3" />
            <span>Transfer to: {targetAgent}</span>
          </div>
          <div className="h-px flex-1" style={{ backgroundColor: 'var(--color-workbench-primary, #EA2831)' }} />
        </div>
      )}

      <div className="flex flex-col gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Icon */}
        <div
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: bg }}
        >
          <Icon
            className="h-3 w-3 sm:h-4 sm:w-4"
            style={{ color: color }}
          />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-xs sm:text-sm text-text-light dark:text-text-dark">
              {label}
            </p>
            {log.level !== 'INFO' && <LevelIcon className={`h-3 w-3 flex-shrink-0 ${levelColor}`} />}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
            {log.service_name && log.service_name !== 'llm-proxy-service' && (
              <>
                <span>•</span>
                <span className="truncate">{log.service_name}</span>
              </>
            )}
          </div>

          {/* Message */}
          {displayMessage && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {displayMessage}
            </p>
          )}

          {/* Metadata toggle */}
          {hasMetadata && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-primary-dark dark:text-primary hover:underline mt-1"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {isExpanded ? 'Hide details' : 'Show details'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded metadata */}
      {isExpanded && hasMetadata && (
        <div className="ml-8 sm:ml-9 p-2 rounded bg-gray-100 dark:bg-gray-800 text-xs">
          <pre className="overflow-x-auto text-gray-700 dark:text-gray-300">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
    </>
  );
};

export const TraceView: React.FC<TraceViewProps> = ({ traceId }) => {
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();

  // Logs will come from tracing service via WebSocket
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [, setIsLoadingHistory] = useState(true);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Load existing trace logs on mount
  useEffect(() => {
    const loadTraceHistory = async () => {
      if (!traceId || !accessToken) {
        setIsLoadingHistory(false);
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:9050/api/tracing/logs/${traceId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log('[TraceView] Loaded trace history:', data.total_logs, 'logs');

          // Convert timestamp strings to Date objects and format properly
          const formattedLogs = data.logs.map((log: any) => ({
            ...log,
            timestamp: typeof log.timestamp === 'string' ? log.timestamp : new Date(log.timestamp).toISOString(),
          }));

          setLogs(formattedLogs);
        } else {
          console.warn('[TraceView] Failed to load trace history:', response.status);
        }
      } catch (error) {
        console.error('[TraceView] Error loading trace history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadTraceHistory();
  }, [traceId, accessToken]);

  // WebSocket connection for real-time logs
  const wsUrl = accessToken
    ? `ws://localhost:9050/ws/trace/${traceId}?token=${encodeURIComponent(accessToken)}`
    : null;

  const { isConnected } = useWebSocket(wsUrl, {
    onMessage: (data) => {
      if (data.type === 'log_entry' && data.log) {
        // Check if log already exists (avoid duplicates)
        setLogs((prev) => {
          const exists = prev.some(log => log.log_id === data.log.log_id);
          if (exists) return prev;
          return [...prev, data.log];
        });
      }
    },
    onError: (error) => {
      console.error('Trace WebSocket error:', error);
    },
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [logs, autoScroll]);

  const handleClearLogs = async () => {
    if (!traceId || !accessToken) {
      console.warn('[TraceView] Cannot clear logs: missing traceId or accessToken');
      return;
    }

    try {
      // Delete logs from backend
      const response = await fetch(
        `http://localhost:9050/api/tracing/traces/${traceId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        console.log('[TraceView] Successfully cleared logs from backend');
        // Clear local state after successful backend deletion
        setLogs([]);
      } else {
        console.error('[TraceView] Failed to clear logs from backend:', response.status);
        // Still clear local state even if backend fails
        setLogs([]);
      }
    } catch (error) {
      console.error('[TraceView] Error clearing logs:', error);
      // Still clear local state even if backend request fails
      setLogs([]);
    }
  };

  // Detect manual scroll to disable auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="flex flex-col bg-surface-light dark:bg-surface-dark md:col-span-1 rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
      {/* Header with red accent */}
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
            {t('workbench.trace.title')}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            {isConnected ? (
              <span style={{ color: 'var(--color-workbench-primary, #EA2831)' }}>
                {t('workbench.connected')}
              </span>
            ) : (
              <span className="text-red-500">{t('workbench.disconnected')}</span>
            )}
            <span className="text-gray-500 dark:text-gray-400">• {logs.length} logs</span>
          </div>
        </div>
        <button
          onClick={handleClearLogs}
          className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 gap-2 text-sm font-medium transition-all"
          style={{
            color: '#6b7280',
            border: '1px solid var(--color-border-light, #e5e7eb)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-workbench-primary, #EA2831)';
            e.currentTarget.style.color = 'var(--color-workbench-primary, #EA2831)';
            e.currentTarget.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark'
              ? 'rgba(234, 40, 49, 0.1)'
              : 'rgba(234, 40, 49, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border-light, #e5e7eb)';
            e.currentTarget.style.color = '#6b7280';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={t('workbench.clearLogs')}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline truncate">{t('workbench.clearLogs')}</span>
        </button>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto px-4 py-3 text-xs" onScroll={handleScroll}>
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t('workbench.noLogs')}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3">
            {logs.map((log) => (
              <LogEntryItem key={log.log_id} log={log} />
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && logs.length > 0 && (
        <div className="border-t border-border-light dark:border-border-dark p-2">
          <button
            onClick={() => {
              setAutoScroll(true);
              logsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
            }}
            className="w-full text-xs text-primary-dark dark:text-primary hover:underline"
          >
            {t('workbench.scrollToBottom')}
          </button>
        </div>
      )}
    </div>
  );
};
