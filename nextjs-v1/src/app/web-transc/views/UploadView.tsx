/**
 * UploadView - Initial state, audio file upload
 * Shows: Upload area, saved transcripts list
 */

"use client";

import { useRouterStore } from '../store/useRouterStore';
import { useWhisperStore } from '../store/useWhisperStore';

export default function UploadView() {
  const navigate = useRouterStore((state) => state.navigate);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Upload View</h1>
        <p className="text-muted-foreground mt-2">
          This view will be implemented in Phase 2
        </p>
        <button
          onClick={() => navigate('transcribe')}
          className="bg-primary text-primary-foreground mt-4 rounded px-4 py-2"
        >
          Go to Transcribe (Test Navigation)
        </button>
      </div>
    </div>
  );
}
