import Pusher, { Channel } from 'pusher-js';
import { RealtimeClientProvider, RealtimeEventType } from '../types';

export class PusherClient implements RealtimeClientProvider {
  private pusher: Pusher | null = null;
  private channels: Map<string, Channel> = new Map();
  private eventHandlers: Map<string, Set<(eventType: RealtimeEventType, data: any) => void>> = new Map();
  readonly EVENT_TYPES = RealtimeEventType;

  constructor(private config: {
    key: string;
    cluster: string;
    forceTLS?: boolean;
  }) {}

  // Helper method to sanitize channel names for Pusher
  private sanitizeChannelName(channel: string): string {
    // Pusher channels can only have characters, numbers, underscores and hyphens
    // and must be <= 164 characters
    // Replace any invalid chars, and prefix with 'presence-' or 'private-' if needed
    let sanitized = channel.replace(/[^A-Za-z0-9_\-=@,.;]/g, '-');
    
    // Special handling for conversation channels that use IDs
    if (channel.startsWith('conversation:')) {
      sanitized = 'conv-' + channel.split(':')[1];
    } else if (channel.includes('@')) {
      // If it's an email, encode it properly
      sanitized = 'user-' + channel.replace('@', '-at-');
    }
    
    console.log(`Pusher sanitized channel name: ${channel} -> ${sanitized}`);
    return sanitized;
  }

  async connect(): Promise<void> {
    if (this.pusher) return;

    return new Promise((resolve) => {
      console.log(`Connecting to Pusher with key ${this.config.key} and cluster ${this.config.cluster}`);
      this.pusher = new Pusher(this.config.key, {
        cluster: this.config.cluster,
        forceTLS: this.config.forceTLS ?? true,
      });

      // Add global connection event listeners
      this.pusher.connection.bind('connected', () => {
        console.log('Pusher connected successfully');
      });
      
      this.pusher.connection.bind('error', (err: any) => {
        console.error('Pusher connection error:', err);
      });

      // Pusher doesn't have a specific "connected" event like Socket.IO
      // It connects automatically when you call subscribe
      resolve();
    });
  }

  disconnect(): void {
    if (!this.pusher) return;

    // Unsubscribe from all channels
    this.channels.forEach((channel, channelName) => {
      this.pusher?.unsubscribe(channelName);
    });

    this.channels.clear();
    this.eventHandlers.clear();
    this.pusher.disconnect();
    this.pusher = null;
  }

  subscribe(channelName: string, callback: (eventType: RealtimeEventType, data: any) => void): void {
    if (!this.pusher) {
      throw new Error('Pusher not connected. Call connect() first.');
    }

    const sanitizedChannelName = this.sanitizeChannelName(channelName);
    
    // Get or create channel
    let channel = this.channels.get(sanitizedChannelName);
    if (!channel) {
      console.log(`Subscribing to Pusher channel: ${sanitizedChannelName}`);
      channel = this.pusher.subscribe(sanitizedChannelName);
      this.channels.set(sanitizedChannelName, channel);
      
      // Add channel-specific event listeners for debugging
      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`Successfully subscribed to Pusher channel: ${sanitizedChannelName}`);
      });
      
      channel.bind('pusher:subscription_error', (error: any) => {
        console.error(`Failed to subscribe to Pusher channel ${sanitizedChannelName}:`, error);
      });
    }

    // Store the callback for this channel
    if (!this.eventHandlers.has(sanitizedChannelName)) {
      this.eventHandlers.set(sanitizedChannelName, new Set());
    }
    this.eventHandlers.get(sanitizedChannelName)?.add(callback);

    // Bind to all event types
    Object.values(RealtimeEventType).forEach((eventType) => {
      // Use the exact string value of the event enum member
      const eventName = eventType as string;
      console.log(`Binding to event "${eventName}" on channel "${sanitizedChannelName}"`);
      
      // Bind using the string event name
      channel.bind(eventName, (data: any) => {
        console.log(`Received Pusher event "${eventName}" on channel "${sanitizedChannelName}":`, data);
        // Find all callbacks for this channel and call them
        const callbacks = this.eventHandlers.get(sanitizedChannelName);
        if (callbacks) {
          callbacks.forEach((cb) => {
            try {
              // Pass the original enum type back to the callback
              cb(eventType as RealtimeEventType, data);
            } catch (error) {
              console.error('Error in Pusher event handler:', error);
            }
          });
        }
      });
    });
  }

  unsubscribe(channelName: string, callback?: (eventType: RealtimeEventType, data: any) => void): void {
    if (!this.pusher) return;

    const sanitizedChannelName = this.sanitizeChannelName(channelName);
    
    const channel = this.channels.get(sanitizedChannelName);
    if (!channel) return;

    if (callback && this.eventHandlers.has(sanitizedChannelName)) {
      // Remove specific callback
      this.eventHandlers.get(sanitizedChannelName)?.delete(callback);
      
      // If no callbacks left, unsubscribe from the channel
      if (this.eventHandlers.get(sanitizedChannelName)?.size === 0) {
        console.log(`Unsubscribing from Pusher channel: ${sanitizedChannelName}`);
        this.pusher.unsubscribe(sanitizedChannelName);
        this.channels.delete(sanitizedChannelName);
        this.eventHandlers.delete(sanitizedChannelName);
      }
    } else {
      // Unbind all events and unsubscribe
      Object.values(RealtimeEventType).forEach((eventType) => {
        channel.unbind(eventType);
      });
      
      console.log(`Unsubscribing from Pusher channel: ${sanitizedChannelName}`);
      this.pusher.unsubscribe(sanitizedChannelName);
      this.channels.delete(sanitizedChannelName);
      this.eventHandlers.delete(sanitizedChannelName);
    }
  }
} 