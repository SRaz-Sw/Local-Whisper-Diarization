/**
 * SavedView - Browse and manage saved transcripts
 * Shows: List of saved transcripts, search/filter, actions
 */

"use client";

import { useRouterStore } from '../store/useRouterStore';
import { useWhisperStore } from '../store/useWhisperStore';

export default function SavedView() {
  const navigate = useRouterStore((state) => state.navigate);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Saved Transcripts View</h1>
        <p className="text-muted-foreground mt-2">
          This view will be implemented in Phase 2
        </p>
        <div className="mt-4 flex gap-2 justify-center">
          <button
            onClick={() => navigate('upload')}
            className="bg-secondary text-secondary-foreground rounded px-4 py-2"
          >
            Back to Home
          </button>
          <button
            onClick={() => navigate('transcript', { id: 'saved-transcript-456' })}
            className="bg-primary text-primary-foreground rounded px-4 py-2"
          >
            Load Transcript (Test)
          </button>
        </div>
      </div>
    </div>
  );
}
