import { RealtimeEventType } from "@sraz-sw/fullstack-shared";

/**
 * Interface for client-side realtime providers
 */
export interface RealtimeClientProvider {
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (channel: string, callback: (eventType: RealtimeEventType, data: any) => void) => void;
  unsubscribe: (channel: string, callback?: (eventType: RealtimeEventType, data: any) => void) => void;
  readonly EVENT_TYPES: typeof RealtimeEventType;
}

export { RealtimeEventType }; 