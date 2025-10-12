// FILE _________ index.ts _______
import { RealtimeEventType } from '@sraz-sw/fullstack-shared';
import { RealtimeClientProvider } from './types';
import { SocketIOClient } from './providers/SocketIOClient';
import { PusherClient } from './providers/PusherClient';
import config from '../config';

// Keep a singleton instance
let realtimeProvider: RealtimeClientProvider | null = null;

type ProviderType = 'pusher' | 'socketio';

interface ProviderConfig {
  socketio: {
    serverUrl: string;
  };
  pusher: {
    key: string;
    cluster: string;
    forceTLS?: boolean;
  };
}

// Determine if we're running locally or on Vercel
const isLocalhost = config.apiUrl.includes('localhost');
const defaultProviderType: ProviderType = isLocalhost ? 'socketio' : 'pusher';

console.log(`API URL: ${config.apiUrl}, defaulting to ${defaultProviderType} provider`);

// Default configuration (should be updated from environment variables)
const defaultConfig: ProviderConfig = {
  socketio: {
    serverUrl: config.apiUrl,
  },
  pusher: {
    key: config.pusher.key,
    cluster: config.pusher.cluster,
  },
};

/**
 * Initialize and return the realtime provider with the given type and configuration
 */
export function initializeRealtimeProvider(
  type: ProviderType = defaultProviderType, 
  config?: Partial<ProviderConfig[ProviderType]>
): RealtimeClientProvider {
  // If already initialized with the same type, return existing instance
  if (realtimeProvider) {
    return realtimeProvider;
  }

  switch (type) {
    case 'pusher': {
      const pusherConfig = { ...defaultConfig.pusher, ...config };
      console.log('Initializing Pusher with config:', pusherConfig);
      realtimeProvider = new PusherClient(pusherConfig);
      break;
    }
    case 'socketio': {
      const socketConfig = { ...defaultConfig.socketio, ...config };
      const serverUrl = socketConfig.serverUrl;
      console.log('Initializing Socket.IO with server URL:', serverUrl);
      realtimeProvider = new SocketIOClient(serverUrl);
      break;
    }
    default:
      throw new Error(`Invalid provider type: ${type}`);
  }

  return realtimeProvider;
}

/**
 * Get the initialized realtime provider instance
 */
export function getRealtimeProvider(): RealtimeClientProvider {
  if (!realtimeProvider) {
    // Default to the environment-specific provider if not initialized
    return initializeRealtimeProvider(defaultProviderType);
  }
  return realtimeProvider;
}

export { RealtimeEventType };
export type { RealtimeClientProvider }; 