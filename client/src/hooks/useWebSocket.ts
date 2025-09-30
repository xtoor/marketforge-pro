import { useEffect, useRef, useState } from "react";

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'Connecting' | 'Connected' | 'Disconnected'>('Disconnected');

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    setConnectionStatus('Connecting');
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setConnectionStatus('Connected');
      setSocket(ws);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    ws.onclose = () => {
      setConnectionStatus('Disconnected');
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.warn('WebSocket connection failed, continuing without real-time data:', error);
      setConnectionStatus('Disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  return {
    socket,
    lastMessage,
    connectionStatus,
    sendMessage,
  };
}
