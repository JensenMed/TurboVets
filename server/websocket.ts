import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { parse as parseCookie } from "cookie";
import { storage } from "./storage";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  organizationId?: string;
  isAuthenticated?: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private connections: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private sessionStore: any;

  constructor(server: Server) {
    // Initialize session store for WebSocket authentication
    const pgStore = connectPg(session);
    this.sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: 7 * 24 * 60 * 60 * 1000, // 1 week
      tableName: "sessions",
    });

    this.wss = new WebSocketServer({ 
      server,
      path: '/api/ws',
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    try {
      // Validate origin/host for security
      const allowedOrigins = process.env.REPLIT_DOMAINS?.split(',').map(domain => 
        [`https://${domain}`, `http://${domain}`]
      ).flat() || [];
      
      if (info.origin && !allowedOrigins.includes(info.origin)) {
        console.warn(`WebSocket connection denied: invalid origin ${info.origin}`);
        return false;
      }

      // Extract session ID from cookies for later validation
      const cookies = parseCookie(info.req.headers.cookie || '');
      const sessionId = cookies['connect.sid'];
      
      if (!sessionId) {
        console.warn('WebSocket connection denied: no session cookie');
        return false;
      }

      // Store session ID for async validation in connection handler
      (info.req as any).sessionId = sessionId;
      return true;
    } catch (error) {
      console.error('WebSocket verifyClient error:', error);
      return false;
    }
  }

  private async handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    try {
      // Get session ID from request (set in verifyClient)
      const sessionId = (request as any).sessionId;
      if (!sessionId) {
        console.warn('WebSocket connection denied: no session ID');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Decode session ID (remove 's:' prefix and signature)
      const decodedSessionId = sessionId.startsWith('s:') ? 
        sessionId.slice(2).split('.')[0] : sessionId;

      // Validate session asynchronously
      const sessionData = await new Promise<any>((resolve, reject) => {
        this.sessionStore.get(decodedSessionId, (err: any, data: any) => {
          if (err || !data) {
            reject(new Error('Invalid session'));
            return;
          }
          resolve(data);
        });
      });

      // Check if user is authenticated in session
      if (!sessionData.passport?.user?.claims) {
        console.warn('WebSocket connection denied: user not authenticated in session');
        ws.close(1008, 'Authentication required');
        return;
      }

      const userClaims = sessionData.passport.user.claims;
      const userId = userClaims.sub;
      
      // Get user from database to get organization info
      const user = await storage.getUser(userId);
      if (!user || !user.organizationId) {
        console.warn('WebSocket connection denied: user not found or no organization');
        ws.close(1008, 'User not found or not associated with organization');
        return;
      }

      // Set authenticated user data from server-side validation
      ws.userId = userId;
      ws.organizationId = user.organizationId;
      ws.isAuthenticated = true;

      console.log(`Authenticated WebSocket connection for user ${userId} in org ${user.organizationId}`);
      
      // Add to connections immediately since authentication is server-side
      this.addConnection(ws);

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

      // Send initial connection confirmation with authenticated status
      this.sendMessage(ws, {
        type: 'connection',
        status: 'authenticated',
        userId: userId,
        organizationId: user.organizationId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('WebSocket connection setup error:', error);
      ws.close(1011, 'Server error during authentication');
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: any) {
    // Only allow messages from authenticated connections
    if (!ws.isAuthenticated) {
      ws.close(1008, 'Authentication required');
      return;
    }

    switch (message.type) {
      case 'ping':
        this.sendMessage(ws, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
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