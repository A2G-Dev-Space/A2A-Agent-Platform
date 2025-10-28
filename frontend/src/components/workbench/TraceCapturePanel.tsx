import { useState, useEffect } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { useApiKeyStore } from '@/store/useApiKeyStore';
import Button from '@/components/common/Button';
import LiveTrace from './LiveTrace';
import { LogEntry } from '@/types';

interface TraceCapturePanelProps {
  traceId: string | null;
  logs: LogEntry[];
  isConnected: boolean;
  onClearLogs?: () => void;
}

export default function TraceCapturePanel({
  traceId,
  logs,
  isConnected,
  onClearLogs,
}: TraceCapturePanelProps) {
  const { activeApiKey, fetchActiveApiKey } = useApiKeyStore();
  const [copied, setCopied] = useState<'endpoint' | 'key' | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:9050';
  const traceEndpoint = traceId
    ? `${API_BASE_URL}/api/log-proxy/${traceId}/chat/completions`
    : '';

  useEffect(() => {
    if (!activeApiKey) {
      fetchActiveApiKey();
    }
  }, [activeApiKey, fetchActiveApiKey]);

  const copyToClipboard = (text: string, type: 'endpoint' | 'key') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="w-96 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-lg mb-1">📡 Agent 설정</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Trace를 캡처하려면 Agent에 아래 정보를 설정하세요
        </p>
      </div>

      {/* Settings */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Trace Endpoint */}
        <div>
          <label className="block text-sm font-medium mb-2">Trace Endpoint</label>
          <div className="relative">
            <input
              type="text"
              value={traceEndpoint}
              readOnly
              className="w-full px-3 py-2 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-mono"
            />
            <button
              onClick={() => copyToClipboard(traceEndpoint, 'endpoint')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {copied === 'endpoint' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* API Key */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">API Key</label>
            {!activeApiKey && (
              <button
                onClick={() => fetchActiveApiKey()}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
              >
                Generate Key
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={activeApiKey?.key || 'No API Key'}
              readOnly
              className="w-full px-3 py-2 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-mono"
            />
            {activeApiKey && (
              <button
                onClick={() => copyToClipboard(activeApiKey.key, 'key')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                {copied === 'key' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
          />
          <span className="text-gray-600 dark:text-gray-400">
            {isConnected ? 'Live Trace Active' : 'Waiting for connection'}
          </span>
        </div>

        {/* Live Trace */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Live Trace</label>
            {logs.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearLogs}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <LiveTrace logs={logs} />
        </div>
      </div>
    </div>
  );
}
