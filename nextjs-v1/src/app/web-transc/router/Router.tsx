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

  // Initialize worker once on mount
  useEffect(() => {
    console.log('🚀 Router mounted, initializing worker...');
    whisperWorker.initialize();

    // Cleanup on unmount
    return () => {
      console.log('👋 Router unmounting, terminating worker...');
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
