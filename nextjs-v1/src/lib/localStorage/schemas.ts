/**
 * Zod Schemas for Storage
 *
 * All data types stored in IndexedDB are validated using these schemas.
 * This ensures type safety at runtime and provides automatic validation.
 */

import { z } from 'zod'

/**
 * Transcript Chunk Schema
 *
 * Represents a single word or phrase with timestamps
 */
export const transcriptChunkSchema = z.object({
  text: z.string(),
  timestamp: z.tuple([z.number(), z.number()]), // [start, end] in seconds
})

/**
 * Speaker Segment Schema
 *
 * Represents a continuous segment spoken by one speaker
 */
export const speakerSegmentSchema = z.object({
  label: z.string(), // e.g., "SPEAKER_00", "SPEAKER_01"
  start: z.number(), // Start time in seconds
  end: z.number(), // End time in seconds
})

/**
 * Saved Transcript Schema
 *
 * Complete transcript with metadata, segments, and optional audio reference
 */
export const savedTranscriptSchema = z.object({
  id: z.string(),

  // Transcript data
  transcript: z.object({
    text: z.string(), // Full transcript text
    chunks: z.array(transcriptChunkSchema), // Word-level timestamps
  }),

  // Speaker diarization
  segments: z.array(speakerSegmentSchema),

  // Metadata
  metadata: z.object({
    fileName: z.string(), // Original file name or custom name
    duration: z.number(), // Duration in seconds
    speakerCount: z.number(), // Number of unique speakers
    language: z.string(), // Language code (e.g., 'en', 'es')
    model: z.string(), // Model used for transcription (e.g., 'whisper-base')
    createdAt: z.number(), // Unix timestamp
    updatedAt: z.number(), // Unix timestamp
  }),

  // Optional reference to audio blob
  audioFileId: z.string().optional(),
})

/**
 * Prompt Template Schema
 *
 * User-created templates for LLM export
 */
export const promptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(), // Template name (e.g., "Meeting Summary")
  content: z.string(), // Template content/prompt
  createdAt: z.number(), // Unix timestamp
  updatedAt: z.number(), // Unix timestamp
})

/**
 * App Settings Schema (Future Use)
 *
 * Application-wide settings
 */
export const appSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  defaultLanguage: z.string().default('en'),
  autoSave: z.boolean().default(false),
  keepAudioFiles: z.boolean().default(true), // Keep audio with transcript
})

// ==================== TypeScript Types ====================

/**
 * Export TypeScript types from Zod schemas
 * These provide type safety at compile time
 */

export type TranscriptChunk = z.infer<typeof transcriptChunkSchema>
export type SpeakerSegment = z.infer<typeof speakerSegmentSchema>
export type SavedTranscript = z.infer<typeof savedTranscriptSchema>
export type PromptTemplate = z.infer<typeof promptTemplateSchema>
export type AppSettings = z.infer<typeof appSettingsSchema>

// ==================== Default Values ====================

/**
 * Default prompt template
 */
export const DEFAULT_TEMPLATE: PromptTemplate = {
  id: 'default',
  name: 'Default',
  content: `Based on the following conversation transcript, please analyze and provide insights:

format and data we want to extract:
Speaker 1 name:
Speaker 2 name:
____________
High level Summary: (2-3 sentences)
____________
Detailed Summary: (5-7 sentences)
____________
Key Insights: (3-5 insights)
____________
Action Items: (3-5 action items)
____________
contact Details: (email, phone, name)




Here's the transcript:
( Note - the transcription maybe inaccurate sometimes, adjust your logic accordingly )

`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

/**
 * Default app settings
 */
export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultLanguage: 'en',
  autoSave: false,
  keepAudioFiles: true,
}
