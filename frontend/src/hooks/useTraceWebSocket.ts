import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { LogEntry } from '@/types';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'wss://localhost:9050';

export function useTraceWebSocket(traceId: string | null, enabled: boolean = true) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!traceId || !enabled) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('No access token found');
      return;
    }

    const newSocket = io(`${WS_BASE_URL}/ws/trace/${traceId}`, {
      query: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('[WebSocket] Connected to trace:', traceId);
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('log', (log: LogEntry) => {
      console.log('[WebSocket] Received log:', log);
      setLogs((prev) => [...prev, log]);
    });

    newSocket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('error', (err: any) => {
      console.error('[WebSocket] Error:', err);
      setError(err.message || 'WebSocket error');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [traceId, enabled]);

  useEffect(() => {
    if (enabled && traceId) {
      const cleanup = connect();
      return cleanup;
    }
  }, [traceId, enabled, connect]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    isConnected,
    error,
    disconnect,
    clearLogs,
  };
}
