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
} from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/authStore';

interface LogEntry {
  log_id: number;
  timestamp: string;
  service_name: string;
  agent_id?: number;
  level: string;
  message: string;
  metadata?: Record<string, any>;
  is_transfer: boolean;
}

interface TraceViewProps {
  traceId: string;
}

// Log type icons and colors
const getLogIcon = (message: string, isTransfer: boolean) => {
  if (isTransfer) return { Icon: ArrowRightLeft, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-100 dark:bg-pink-900/50' };

  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('llm') || lowerMsg.includes('calling agent')) {
    return { Icon: Send, color: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/50' };
  }
  if (lowerMsg.includes('receive') || lowerMsg.includes('response')) {
    return { Icon: Phone, color: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/50' };
  }
  if (lowerMsg.includes('tool')) {
    return { Icon: Wrench, color: 'text-green-600 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/50' };
  }

  return { Icon: FileText, color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800/50' };
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

const LogEntryItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { Icon, color, bg } = getLogIcon(log.message, log.is_transfer);
  const { Icon: LevelIcon, color: levelColor } = getLevelIcon(log.level);
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <div className="flex flex-col gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Icon */}
        <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${bg}`}>
          <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${color}`} />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-xs sm:text-sm text-text-light dark:text-text-dark truncate">
              {log.message}
            </p>
            <LevelIcon className={`h-3 w-3 flex-shrink-0 ${levelColor}`} />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span>•</span>
            <span className="truncate">{log.service_name}</span>
            {log.agent_id && (
              <>
                <span>•</span>
                <span>Agent {log.agent_id}</span>
              </>
            )}
          </div>

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
  );
};

export const TraceView: React.FC<TraceViewProps> = ({ traceId }) => {
  const { t } = useTranslation();
  const { accessToken } = useAuthStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // WebSocket connection for real-time logs
  const wsUrl = accessToken
    ? `ws://localhost:9050/ws/trace/${traceId}?token=${encodeURIComponent(accessToken)}`
    : null;

  const { isConnected } = useWebSocket(wsUrl, {
    onMessage: (data) => {
      if (data.type === 'log_entry' && data.log) {
        setLogs((prev) => [...prev, data.log]);
      }
    },
    onError: (error) => {
      console.error('Trace WebSocket error:', error);
    },
  });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  // Detect manual scroll to disable auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    setAutoScroll(isAtBottom);
  };

  return (
    <div className="flex flex-col bg-surface-light dark:bg-surface-dark md:col-span-1 rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border-light dark:border-border-dark px-4">
        <div className="flex flex-col">
          <h2 className="text-base font-bold">{t('workbench.trace')}</h2>
          <div className="flex items-center gap-2 text-xs">
            {isConnected ? (
              <span className="text-green-500">{t('workbench.connected')}</span>
            ) : (
              <span className="text-red-500">{t('workbench.disconnected')}</span>
            )}
            <span className="text-gray-500 dark:text-gray-400">• {logs.length} logs</span>
          </div>
        </div>
        <button
          onClick={handleClearLogs}
          className="flex cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-3 text-gray-600 dark:text-gray-300 gap-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-white/10 border border-border-light dark:border-border-dark transition-colors"
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
              logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
