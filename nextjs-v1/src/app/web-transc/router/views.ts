/**
 * Lazy-loaded view registry
 * Each view is code-split for better performance
 */

import { lazy } from 'react';
import type { ViewName } from './types';

export const views = {
  upload: lazy(() => import('../views/UploadView')),
  transcribe: lazy(() => import('../views/TranscribeView')),
  transcript: lazy(() => import('../views/TranscriptView')),
  saved: lazy(() => import('../views/SavedView')),
} as const satisfies Record<ViewName, React.LazyExoticComponent<React.ComponentType<any>>>;
