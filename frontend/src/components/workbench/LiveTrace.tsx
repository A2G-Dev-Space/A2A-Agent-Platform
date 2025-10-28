import { LogEntry, LogType } from '@/types';
import { LOG_TYPE_COLORS } from '@/utils/constants';
import { formatRelativeTime } from '@/utils/helpers';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface LiveTraceProps {
  logs: LogEntry[];
}

function LogItem({ log }: { log: LogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = LOG_TYPE_COLORS[log.log_type];

  return (
    <div className={`${colors.bg} ${colors.border} p-3 rounded-lg mb-2`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start justify-between text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span>{colors.icon}</span>
            <span className="font-semibold text-sm">{log.log_type}</span>
            {log.agent_id && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({log.agent_id})
              </span>
            )}
          </div>
          {log.log_type === 'LLM' && log.model && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Model: {log.model}
            </div>
          )}
          {log.log_type === 'TOOL' && log.tool_name && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Tool: {log.tool_name}
            </div>
          )}
          {log.log_type === 'AGENT_TRANSFER' && log.to_agent_id && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {log.from_agent_id} → {log.to_agent_id}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {log.latency_ms && <span>{log.latency_ms}ms</span>}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 space-y-2 text-sm">
          {log.log_type === 'LLM' && (
            <>
              {log.prompt && (
                <div>
                  <div className="font-semibold text-xs text-gray-500 mb-1">Prompt:</div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto custom-scrollbar">
                    {log.prompt}
                  </div>
                </div>
              )}
              {log.completion && (
                <div>
                  <div className="font-semibold text-xs text-gray-500 mb-1">Completion:</div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto custom-scrollbar">
                    {log.completion}
                  </div>
                </div>
              )}
              {log.tokens_used && (
                <div className="text-xs text-gray-600">
                  Tokens: {log.tokens_used}
                </div>
              )}
            </>
          )}

          {log.log_type === 'TOOL' && (
            <>
              {log.tool_input && (
                <div>
                  <div className="font-semibold text-xs text-gray-500 mb-1">Input:</div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded text-xs font-mono">
                    {JSON.stringify(log.tool_input, null, 2)}
                  </div>
                </div>
              )}
              {log.tool_output && (
                <div>
                  <div className="font-semibold text-xs text-gray-500 mb-1">Output:</div>
                  <div className="bg-white dark:bg-gray-800 p-2 rounded text-xs font-mono max-h-32 overflow-y-auto custom-scrollbar">
                    {log.tool_output}
                  </div>
                </div>
              )}
            </>
          )}

          {log.log_type === 'AGENT_TRANSFER' && log.transfer_reason && (
            <div>
              <div className="font-semibold text-xs text-gray-500 mb-1">Reason:</div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded text-xs">
                {log.transfer_reason}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
            {formatRelativeTime(log.timestamp)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveTrace({ logs }: LiveTraceProps) {
  if (logs.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">No trace logs yet</p>
        <p className="text-xs mt-2">
          Start chatting to see live traces from your agent
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
      {logs.map((log) => (
        <LogItem key={log.id} log={log} />
      ))}
    </div>
  );
}
