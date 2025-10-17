/**
 * Custom hook for accessing Whisper worker
 * Manages subscriptions and cleanup automatically
 */

import { useEffect, useCallback } from 'react';
import { whisperWorker } from '../services/WhisperWorkerService';

export function useWhisperWorker(
  onMessage: (e: MessageEvent) => void,
  onError?: (error: ErrorEvent) => void
) {
  useEffect(() => {
    // Subscribe to messages
    const unsubscribeMessage = whisperWorker.subscribe(onMessage);

    // Subscribe to errors if handler provided
    const unsubscribeError = onError
      ? whisperWorker.onError(onError)
      : () => {};

    // Cleanup on unmount
    return () => {
      unsubscribeMessage();
      unsubscribeError();
    };
  }, [onMessage, onError]);

  // Memoize API methods
  const postMessage = useCallback((data: any) => {
    whisperWorker.postMessage(data);
  }, []);

  const recreate = useCallback(() => {
    return whisperWorker.recreate();
  }, []);

  const isReady = useCallback(() => {
    return whisperWorker.isReady();
  }, []);

  return {
    postMessage,
    recreate,
    isReady,
  };
}
