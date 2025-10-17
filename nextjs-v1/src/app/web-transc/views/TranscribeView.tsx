/**
 * TranscribeView - Model loading and transcription process
 * Shows: Model selection, loading, transcription progress
 */

"use client";

import { useRouterStore } from '../store/useRouterStore';
import { useWhisperStore } from '../store/useWhisperStore';

export default function TranscribeView() {
  const navigate = useRouterStore((state) => state.navigate);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Transcribe View</h1>
        <p className="text-muted-foreground mt-2">
          This view will be implemented in Phase 2
        </p>
        <div className="mt-4 flex gap-2 justify-center">
          <button
            onClick={() => navigate('upload')}
            className="bg-secondary text-secondary-foreground rounded px-4 py-2"
          >
            Back to Upload
          </button>
          <button
            onClick={() => navigate('transcript', { id: 'test-123' })}
            className="bg-primary text-primary-foreground rounded px-4 py-2"
          >
            Go to Transcript (Test)
          </button>
        </div>
      </div>
    </div>
  );
}
