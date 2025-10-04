import { useEffect, useRef, useState, useCallback } from "react";

interface UseWebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useWebSocket(url?: string, options: UseWebSocketOptions = {}) {
  const {
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
    onMessage,
    onError,
    onOpen,
    onClose
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'Connecting' | 'Connected' | 'Disconnected' | 'Error'>('Disconnected');
  const [reconnectCount, setReconnectCount] = useState(0);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const socketRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!url) {
      setConnectionStatus('Disconnected');
      return;
    }

    // Don't create new connection if already connecting or connected
    if (socketRef.current?.readyState === WebSocket.CONNECTING ||
        socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = url.startsWith('ws') ? url : `${protocol}//${window.location.host}${url}`;

    setConnectionStatus('Connecting');

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('Connected');
        setSocket(ws);
        setReconnectCount(0);
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('Disconnected');
        setSocket(null);
        socketRef.current = null;
        onClose?.();

        // Attempt reconnection
        if (reconnect && shouldReconnectRef.current && reconnectCount < reconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectCount(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.warn('WebSocket error:', error);
        setConnectionStatus('Error');
        onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('Error');
    }
  }, [url, reconnect, reconnectInterval, reconnectAttempts, reconnectCount, onMessage, onError, onOpen, onClose]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  return {
    socket,
    lastMessage,
    connectionStatus,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
