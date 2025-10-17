/**
 * Loading fallback for view transitions
 * Shows view-specific skeletons for better UX
 */

import type { ViewName } from '../router/types';

interface ViewLoadingFallbackProps {
  viewName: ViewName;
}

export function ViewLoadingFallback({ viewName }: ViewLoadingFallbackProps) {
  // Show view-specific skeleton for better UX
  if (viewName === 'transcript') {
    return <TranscriptSkeleton />;
  }

  if (viewName === 'saved') {
    return <SavedListSkeleton />;
  }

  // Generic spinner for other views
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
    </div>
  );
}

function TranscriptSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      {/* Audio player skeleton */}
      <div className="bg-muted h-20 rounded" />
      {/* Search bar skeleton */}
      <div className="bg-muted h-10 w-1/3 rounded" />
      {/* Transcript segments skeleton */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-muted h-16 rounded" />
        ))}
      </div>
    </div>
  );
}

function SavedListSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-muted h-20 rounded" />
      ))}
    </div>
  );
}
