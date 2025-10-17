/**
 * TranscriptView - Display completed transcript with actions
 * Props: { id: string } - transcript ID
 * Shows: Audio player (sticky), transcript, search, actions
 */

"use client";

import { useRouterStore } from '../store/useRouterStore';
import { useWhisperStore } from '../store/useWhisperStore';

interface TranscriptViewProps {
  id: string;
}

export default function TranscriptView({ id }: TranscriptViewProps) {
  const navigate = useRouterStore((state) => state.navigate);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Transcript View</h1>
        <p className="text-muted-foreground mt-2">
          Viewing transcript: <code className="bg-muted rounded px-2 py-1">{id}</code>
        </p>
        <p className="text-muted-foreground mt-1">
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
            onClick={() => navigate('saved')}
            className="bg-primary text-primary-foreground rounded px-4 py-2"
          >
            View All Saved
          </button>
        </div>
      </div>
    </div>
  );
}
