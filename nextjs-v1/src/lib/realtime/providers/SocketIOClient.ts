import { io, Socket } from 'socket.io-client';
import { RealtimeClientProvider, RealtimeEventType } from '../types';

export class SocketIOClient implements RealtimeClientProvider {
  private socket: Socket | null = null;
  private connected = false;
  private eventHandlers: Map<string, Set<(eventType: RealtimeEventType, data: any) => void>> = new Map();
  readonly EVENT_TYPES = RealtimeEventType;

  constructor(private serverUrl: string) {}

  async connect(): Promise<void> {
    if (this.connected) return;

    return new Promise((resolve, reject) => {
      try {
        console.log(`Connecting to Socket.IO server at: ${this.serverUrl}`);
        
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
          forceNew: true,
          withCredentials: true,
        });

        this.socket.on('connect', () => {
          console.log('Socket.IO connected with ID:', this.socket?.id);
          this.connected = true;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket.IO connection error:', error.message || error);
          reject(error);
        });

        this.socket.on('error', (error) => {
          console.error('Socket.IO error:', error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Socket.IO disconnected:', reason);
          this.connected = false;
        });

        // Set up listeners for all event types
        Object.values(RealtimeEventType).forEach((eventType) => {
          this.socket?.on(eventType, (data) => {
            this.handleEvent(eventType, data);
          });
        });
      } catch (error) {
        console.error('Error initializing Socket.IO:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (!this.connected || !this.socket) return;
    this.socket.disconnect();
    this.connected = false;
    this.socket = null;
  }

  subscribe(channel: string, callback: (eventType: RealtimeEventType, data: any) => void): void {
    if (!this.socket) {
      throw new Error('Socket.IO not connected. Call connect() first.');
    }

    // Join the channel/room
    this.socket.emit('join-channel', channel);

    // Store the callback for this channel
    if (!this.eventHandlers.has(channel)) {
      this.eventHandlers.set(channel, new Set());
    }
    this.eventHandlers.get(channel)?.add(callback);
  }

  unsubscribe(channel: string, callback?: (eventType: RealtimeEventType, data: any) => void): void {
    if (!this.socket) return;

    // Leave the channel/room
    this.socket.emit('leave-channel', channel);

    // Remove the specific callback or all callbacks for this channel
    if (callback && this.eventHandlers.has(channel)) {
      this.eventHandlers.get(channel)?.delete(callback);
    } else if (!callback) {
      this.eventHandlers.delete(channel);
    }
  }

  private handleEvent(eventType: RealtimeEventType, data: any): void {
    // Call all registered callbacks for all channels
    this.eventHandlers.forEach((callbacks) => {
      callbacks.forEach((callback) => {
        try {
          callback(eventType, data);
        } catch (error) {
          console.error('Error in Socket.IO event handler:', error);
        }
      });
    });
  }
} 