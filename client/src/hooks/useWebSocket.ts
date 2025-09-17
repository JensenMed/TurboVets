import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!isAuthenticated || !user?.organizationId) {
      console.log('WebSocket: Not connecting - user not authenticated or no organization');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connected');
      return;
    }

    try {
      // Create WebSocket connection - authentication will be handled server-side via session
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;
      
      console.log('WebSocket: Attempting to connect to', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket: Connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send ping to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket: Received message', message);
          setLastMessage(message);

          // Handle different message types
          switch (message.type) {
            case 'connection':
              if (message.status === 'authenticated') {
                console.log('WebSocket: Authenticated successfully', {
                  userId: message.userId,
                  organizationId: message.organizationId
                });
              }
              break;
            
            case 'notification':
              // Display notification as toast
              const notification = message.notification;
              toast({
                title: notification.title,
                description: notification.message,
                variant: notification.type === 'error' ? 'destructive' : 'default',
              });
              break;
            
            case 'pong':
              // Response to ping - connection is alive
              break;
            
            default:
              console.log('WebSocket: Unknown message type', message.type);
          }
        } catch (error) {
          console.error('WebSocket: Error parsing message', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket: Connection closed', { code: event.code, reason: event.reason });
        setIsConnected(false);
        wsRef.current = null;

        // Only attempt reconnection for certain close codes and if authenticated
        if (isAuthenticated && user?.organizationId && 
            event.code !== 1008 && // Don't reconnect if authentication failed
            event.code !== 1011 && // Don't reconnect if server error during auth
            reconnectAttempts.current < maxReconnectAttempts) {
          
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`WebSocket: Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket: Connection error', error);
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket: Failed to create connection', error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      console.log('WebSocket: Disconnecting');
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttempts.current = 0;
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket: Cannot send message - not connected');
      return false;
    }
  };

  // Connect when user is authenticated and has organization
  useEffect(() => {
    if (isAuthenticated && user?.organizationId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user?.organizationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}