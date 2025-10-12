// FILE _________ useRealtime.ts ___ realtime hook _____
import { useEffect, useState, useCallback } from 'react';
import { getRealtimeProvider, RealtimeEventType } from '@/lib/realtime';

interface UseRealtimeOptions {
  channel: string;
  events?: RealtimeEventType[];
  autoConnect?: boolean;
}

export function useRealtime({ 
  channel,
  events = Object.values(RealtimeEventType),
  autoConnect = true 
}: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{
    type: RealtimeEventType;
    data: any;
  } | null>(null);

  const connect = useCallback(async () => {
    try {
      const provider = getRealtimeProvider();
      await provider.connect();
      setIsConnected(true);
      return true;
    } catch (error) {
      console.error('[useRealtime] Failed to connect to realtime provider:', error);
      setIsConnected(false);
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    const provider = getRealtimeProvider();
    provider.disconnect();
    setIsConnected(false);
  }, []);

  const subscribe = useCallback((callback: (eventType: RealtimeEventType, data: any) => void) => {
    const provider = getRealtimeProvider();
    provider.subscribe(channel, callback);

    // Return unsubscribe function
    return () => {
      provider.unsubscribe(channel, callback);
    };
  }, [channel]);

  // Handler for receiving events
  const handleEvent = useCallback((eventType: RealtimeEventType, data: any) => {
    if (!events.includes(eventType)) return;
    
    setLastEvent({
      type: eventType,
      data
    });
  }, [events]);

  // Effect to connect and subscribe on mount
  useEffect(() => {
    if (!channel || !autoConnect) return;
    
    let unsubscribe: (() => void) | undefined;
    
    connect().then((connected) => {
      if (connected) {
        const provider = getRealtimeProvider();
        unsubscribe = () => provider.unsubscribe(channel, handleEvent);
        provider.subscribe(channel, handleEvent);
      }
    });

    // Cleanup: unsubscribe and disconnect
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [channel, autoConnect, connect, handleEvent]);

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
    subscribe,
  };
} 