/**
 * Main Router Component
 * Handles view switching, deep links, and worker initialization
 */

"use client";

import { Suspense, useEffect } from 'react';
import { toast } from 'sonner';
import { views } from './views';
import type { ViewName } from './types';
import { useRouterStore } from '../store/useRouterStore';
import { ViewLoadingFallback } from '../components/ViewLoadingFallback';
import { whisperWorker } from '../services/WhisperWorkerService';
import { useTranscripts } from '../hooks/useTranscripts';

export function Router() {
  const { currentView, params, navigate } = useRouterStore();
  const { getWithAudio } = useTranscripts();

  // Worker message handler - global state management
  useEffect(() => {
    console.log('🚀 Router mounted, initializing worker...');
    whisperWorker.initialize();

    // Global worker message handler
    const handleWorkerMessage = (e: MessageEvent) => {
      console.log('📨 Router worker message:', e.data.status);

      const useWhisperStore = require('../store/useWhisperStore').useWhisperStore;
      const { remapSpeakerLabels } = require('../utils/transcriptFormatter');

      switch (e.data.status) {
        case 'loading':
          useWhisperStore.getState().setStatus('loading');
          useWhisperStore.getState().setLoadingMessage(e.data.data || 'Loading models...');
          break;

        case 'initiate':
          useWhisperStore.getState().addProgressItem(e.data);
          break;

        case 'progress':
          useWhisperStore.getState().updateProgressItem(e.data.file, e.data);
          break;

        case 'done':
          useWhisperStore.getState().removeProgressItem(e.data.file);
          break;

        case 'loaded':
          console.log('✅ Models loaded and ready');
          useWhisperStore.getState().setStatus('ready');
          useWhisperStore.getState().setProgressItems([]);
          break;

        case 'update':
          useWhisperStore.getState().setProcessingMessage(e.data.data);
          break;

        case 'transcribing':
          if (e.data.data?.text) {
            useWhisperStore.getState().addStreamingWord({
              text: e.data.data.text,
              timestamp: e.data.data.timestamp,
            });
          }
          break;

        case 'processing_progress':
          useWhisperStore.getState().setProcessedSeconds(e.data.processedSeconds || 0);
          useWhisperStore.getState().setTotalSeconds(e.data.totalSeconds || 0);
          useWhisperStore.getState().setEstimatedTimeRemaining(e.data.estimatedTimeRemaining || null);
          break;

        case 'complete':
          console.log('✅ Transcription complete');
          const remappedResult = {
            ...e.data.result,
            segments: remapSpeakerLabels(e.data.result.segments),
          };
          useWhisperStore.getState().setResult(remappedResult);
          useWhisperStore.getState().setStreamingWords([]);
          useWhisperStore.getState().setGenerationTime(e.data.time);
          useWhisperStore.getState().setStatus('ready');
          useWhisperStore.getState().setProcessingMessage('');
          useWhisperStore.getState().setProcessedSeconds(0);
          useWhisperStore.getState().setTotalSeconds(0);
          useWhisperStore.getState().setEstimatedTimeRemaining(null);

          // Auto-save will be handled in TranscribeView
          break;

        case 'error':
          console.error('❌ Worker error:', e.data.error);
          toast.error('Worker error', { description: e.data.error });
          useWhisperStore.getState().setStatus(null);
          useWhisperStore.getState().setProgressItems([]);
          useWhisperStore.getState().setProcessingMessage('');
          break;

        default:
          console.log('⚠️ Unknown worker status:', e.data.status);
      }
    };

    // Subscribe to worker messages
    const unsubscribe = whisperWorker.subscribe(handleWorkerMessage);

    // Cleanup on unmount
    return () => {
      console.log('👋 Router unmounting, cleaning up...');
      unsubscribe();
      whisperWorker.terminate();
    };
  }, []);

  // Handle deep links and browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);

      console.log('🔗 Hash changed:', hash);

      // No hash = go to upload
      if (!hash) {
        navigate('upload');
        return;
      }

      const [view, id] = hash.split('/');

      // Validate view exists
      if (!(view in views)) {
        console.warn(`⚠️ Invalid view: ${view}`);
        toast.error('Invalid page', {
          description: `View "${view}" does not exist`,
        });
        navigate('upload');
        return;
      }

      // Validate transcript ID if navigating to transcript view
      if (view === 'transcript' && id) {
        getWithAudio(id)
          .then((result) => {
            if (result) {
              console.log('✅ Valid transcript ID:', id);
              navigate(view as ViewName, { id });
            } else {
              console.warn('⚠️ Transcript not found:', id);
              toast.error('Transcript not found', {
                description: `Could not find transcript with ID: ${id}`,
              });
              navigate('upload');
            }
          })
          .catch((error) => {
            console.error('❌ Failed to load transcript:', error);
            toast.error('Failed to load transcript', {
              description: error instanceof Error ? error.message : 'Unknown error',
            });
            navigate('upload');
          });
      } else {
        // Navigate to view without validation
        navigate(view as ViewName, id ? { id } : undefined);
      }
    };

    // Parse initial hash on mount
    handleHashChange();

    // Listen to hash changes (browser back/forward)
    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navigate, getWithAudio]);

  // Get the view component
  const ViewComponent = views[currentView];

  console.log('🎯 Rendering view:', currentView, 'with params:', params);

  return (
    <Suspense fallback={<ViewLoadingFallback viewName={currentView} />}>
      <ViewComponent {...(params as any)} />
    </Suspense>
  );
}
