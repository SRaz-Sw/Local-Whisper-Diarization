/**
 * Storage Collections
 *
 * Pre-configured storage collections for the application.
 * Each collection is type-safe and automatically validated with Zod.
 */

import { createCollection } from './storage'
import {
  savedTranscriptSchema,
  promptTemplateSchema,
  appSettingsSchema,
  batchJobSchema,
} from './schemas'

/**
 * Transcripts Collection
 *
 * Stores saved transcripts with full metadata and speaker diarization.
 *
 * @example
 * ```typescript
 * // Save a transcript
 * await transcripts.set('transcript-123', {
 *   id: 'transcript-123',
 *   transcript: { text: '...', chunks: [...] },
 *   segments: [...],
 *   metadata: { ... }
 * })
 *
 * // Get a transcript
 * const transcript = await transcripts.get('transcript-123')
 *
 * // List all transcripts
 * const all = await transcripts.list()
 * ```
 */
export const transcripts = createCollection({
  name: 'transcripts',
  schema: savedTranscriptSchema,
})

/**
 * Templates Collection
 *
 * Stores user-created LLM export prompt templates.
 *
 * @example
 * ```typescript
 * await templates.set('template-meeting', {
 *   id: 'template-meeting',
 *   name: 'Meeting Summary',
 *   content: 'Summarize this meeting...',
 *   createdAt: Date.now(),
 *   updatedAt: Date.now()
 * })
 * ```
 */
export const templates = createCollection({
  name: 'templates',
  schema: promptTemplateSchema,
})

/**
 * Settings Collection
 *
 * Stores application-wide settings.
 *
 * @example
 * ```typescript
 * await settings.set('app-settings', {
 *   theme: 'dark',
 *   defaultLanguage: 'en',
 *   autoSave: true,
 *   keepAudioFiles: true
 * })
 * ```
 */
export const settings = createCollection({
  name: 'settings',
  schema: appSettingsSchema,
})

/**
 * Batch Jobs Collection
 *
 * Stores metadata for batch upload jobs.
 *
 * @example
 * ```typescript
 * await batchJobs.set('batch-123', {
 *   id: 'batch-123',
 *   createdAt: new Date().toISOString(),
 *   updatedAt: new Date().toISOString(),
 *   totalFiles: 10,
 *   completedFiles: 8,
 *   failedFiles: 1,
 *   cancelledFiles: 1,
 *   transcriptIds: ['t1', 't2', ...],
 *   status: 'completed'
 * })
 * ```
 */
export const batchJobs = createCollection({
  name: 'batchJobs',
  schema: batchJobSchema,
})

/**
 * Export all collections as a namespace for convenience
 */
export const collections = {
  transcripts,
  templates,
  settings,
  batchJobs,
} as const
