import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(url: string | null, options: UseWebSocketOptions = {}) {
  const {
    onOpen,
    onMessage,
    onClose,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shouldReconnectRef = useRef(reconnect);

  const connect = useCallback(() => {
    if (!url) {
      console.log('[useWebSocket] No URL provided, skipping connection');
      return;
    }

    console.log('[useWebSocket] Creating WebSocket connection to:', url);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      console.log('[useWebSocket] wsRef.current set:', wsRef.current !== null);

      ws.onopen = () => {
        console.log('[useWebSocket] onopen fired, url:', url, 'readyState:', ws.readyState, 'wsRef.current:', wsRef.current !== null);
        setIsConnected(true);
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Only clear wsRef if this is still the current WebSocket
        if (wsRef.current === ws) {
          setIsConnected(false);
          wsRef.current = null;
          onClose?.();

          // Auto-reconnect
          if (shouldReconnectRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('Attempting to reconnect...');
              connect();
            }, reconnectInterval);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
    }
  }, [url, onOpen, onMessage, onClose, onError, reconnectInterval]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((data: any) => {
    console.log('[useWebSocket] sendMessage called, readyState:', wsRef.current?.readyState, 'OPEN:', WebSocket.OPEN);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[useWebSocket] Sending message:', data);
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[useWebSocket] WebSocket not ready, readyState:', wsRef.current?.readyState);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      shouldReconnectRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
