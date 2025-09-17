import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  organizationId?: string;
  isAuthenticated?: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private connections: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/api/ws',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }) {
    // Basic origin verification - in production, you might want more sophisticated checks
    return true;
  }

  private handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    console.log('New WebSocket connection');
    
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
        ws.close(1003, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.removeConnection(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.removeConnection(ws);
    });

    // Send initial connection confirmation
    this.sendMessage(ws, {
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString()
    });
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: any) {
    switch (message.type) {
      case 'auth':
        this.handleAuth(ws, message);
        break;
      case 'ping':
        this.sendMessage(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handleAuth(ws: AuthenticatedWebSocket, message: any) {
    const { userId, organizationId } = message;
    
    if (!userId || !organizationId) {
      ws.close(1008, 'Authentication required');
      return;
    }

    ws.userId = userId;
    ws.organizationId = organizationId;
    ws.isAuthenticated = true;

    this.addConnection(ws);

    this.sendMessage(ws, {
      type: 'auth',
      status: 'authenticated',
      userId,
      organizationId
    });
  }

  private addConnection(ws: AuthenticatedWebSocket) {
    if (!ws.userId || !ws.organizationId) return;

    const orgConnections = this.connections.get(ws.organizationId) || new Set();
    orgConnections.add(ws);
    this.connections.set(ws.organizationId, orgConnections);
  }

  private removeConnection(ws: AuthenticatedWebSocket) {
    if (!ws.organizationId) return;

    const orgConnections = this.connections.get(ws.organizationId);
    if (orgConnections) {
      orgConnections.delete(ws);
      if (orgConnections.size === 0) {
        this.connections.delete(ws.organizationId);
      }
    }
  }

  private sendMessage(ws: AuthenticatedWebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Public methods for sending notifications
  public sendNotificationToUser(userId: string, organizationId: string, notification: any) {
    const orgConnections = this.connections.get(organizationId);
    if (!orgConnections) return;

    Array.from(orgConnections).forEach(ws => {
      if (ws.userId === userId && ws.isAuthenticated) {
        this.sendMessage(ws, {
          type: 'notification',
          notification,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  public broadcastToOrganization(organizationId: string, message: any) {
    const orgConnections = this.connections.get(organizationId);
    if (!orgConnections) return;

    Array.from(orgConnections).forEach(ws => {
      if (ws.isAuthenticated) {
        this.sendMessage(ws, {
          ...message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  public getConnectionCount(): number {
    let count = 0;
    Array.from(this.connections.values()).forEach(connections => {
      count += connections.size;
    });
    return count;
  }
}

export default WebSocketManager;