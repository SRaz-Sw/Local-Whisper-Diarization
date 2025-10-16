# Simplified Storage Architecture (Localforage + Zod)

## Focus

**Local-only persistent storage** using IndexedDB via localforage with Zod validation. Simple, maintainable, expandable.

---

## Core Principles

1. **One collection per resource type** (transcripts, templates, audio files)
2. **Zod schemas** for runtime validation
3. **Simple hooks** for each resource
4. **Type-safe** throughout
5. **No over-engineering** - just what we need now

---

## Architecture (Simplified)

```
┌─────────────────────────────────────┐
│      React Components               │
│   (WhisperDiarization, etc.)        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Resource Hooks (Simple)          │
│  • useTranscripts()                 │
│  • useTemplates()                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Storage Helper (Thin Wrapper)      │
│  • createCollection()               │
│  • get/set/list/remove              │
│  • Zod validation                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Localforage                   │
│       (IndexedDB)                   │
└─────────────────────────────────────┘
```

---

## File Structure

```
src/
├── lib/
│   └── localStorage/              # ✅ ACTUAL LOCATION
│       ├── schemas.ts            # Zod schemas + TypeScript types
│       ├── storage.ts            # Storage helper (thin wrapper around localforage)
│       └── collections.ts        # Collection instances (transcripts, templates, settings)
│
├── hooks/
│   ├── useTranscripts.ts         # Transcript CRUD operations
│   └── useTemplates.ts           # Template CRUD operations
│
└── app/
    └── web-transc/
        └── components/
            └── WhisperDiarization.tsx  # Main component using storage
```

**That's it!** No providers, no managers, no events. Just what we need.

---

## Implementation

### 1. Storage Helper (Thin Wrapper)

**File**: `src/lib/localStorage/storage.ts`

```typescript
import localforage from 'localforage'
import { z } from 'zod'

/**
 * Create a storage collection with Zod validation
 */
export function createCollection<T extends z.ZodType>(config: {
  name: string
  schema: T
}) {
  // Create a localforage instance for this collection
  const store = localforage.createInstance({
    name: 'whisper-diarization',
    storeName: config.name,
    description: `Storage for ${config.name}`,
  })

  // Helper to validate data
  const validate = (data: unknown): z.infer<T> => {
    try {
      return config.schema.parse(data)
    } catch (error) {
      console.error(`Validation error in ${config.name}:`, error)
      throw new Error(`Invalid data for ${config.name}`)
    }
  }

  return {
    /**
     * Get an item by key
     */
    async get(key: string): Promise<z.infer<T> | null> {
      const data = await store.getItem<unknown>(key)
      if (data === null) return null
      return validate(data)
    },

    /**
     * Set an item (validates before saving)
     */
    async set(key: string, value: z.infer<T>): Promise<void> {
      const validated = validate(value)
      await store.setItem(key, validated)
    },

    /**
     * Get all items in collection
     */
    async list(): Promise<Array<{ key: string; value: z.infer<T> }>> {
      const keys = await store.keys()
      const items = await Promise.all(
        keys.map(async (key) => {
          const value = await this.get(key)
          return { key, value: value! }
        })
      )
      return items.filter(item => item.value !== null)
    },

    /**
     * Remove an item
     */
    async remove(key: string): Promise<void> {
      await store.removeItem(key)
    },

    /**
     * Clear entire collection
     */
    async clear(): Promise<void> {
      await store.clear()
    },

    /**
     * Get all keys
     */
    async keys(): Promise<string[]> {
      return store.keys()
    },

    /**
     * Check if key exists
     */
    async has(key: string): Promise<boolean> {
      const keys = await store.keys()
      return keys.includes(key)
    },

    /**
     * Get count of items
     */
    async count(): Promise<number> {
      return store.length()
    },
  }
}

/**
 * Blob storage helper (separate from collections)
 */
export const blobStorage = {
  store: localforage.createInstance({
    name: 'whisper-diarization',
    storeName: 'blobs',
    description: 'Binary storage for audio files',
  }),

  async save(key: string, blob: Blob): Promise<void> {
    await this.store.setItem(key, blob)
  },

  async get(key: string): Promise<Blob | null> {
    return this.store.getItem<Blob>(key)
  },

  async remove(key: string): Promise<void> {
    await this.store.removeItem(key)
  },

  async clear(): Promise<void> {
    await this.store.clear()
  },
}
```

---

### 2. Zod Schemas

**File**: `src/lib/localStorage/schemas.ts`

```typescript
import { z } from 'zod'

/**
 * Transcript Chunk Schema
 */
export const transcriptChunkSchema = z.object({
  text: z.string(),
  timestamp: z.tuple([z.number(), z.number()]), // [start, end]
})

/**
 * Speaker Segment Schema
 */
export const speakerSegmentSchema = z.object({
  label: z.string(),
  start: z.number(),
  end: z.number(),
})

/**
 * Saved Transcript Schema
 */
export const savedTranscriptSchema = z.object({
  id: z.string(),

  // Transcript data
  transcript: z.object({
    text: z.string(),
    chunks: z.array(transcriptChunkSchema),
  }),

  segments: z.array(speakerSegmentSchema),

  // Metadata
  metadata: z.object({
    fileName: z.string(),
    duration: z.number(), // seconds
    speakerCount: z.number(),
    language: z.string(),
    model: z.string(),
    createdAt: z.number(), // timestamp
    updatedAt: z.number(), // timestamp
  }),

  // Optional reference to audio blob
  audioFileId: z.string().optional(),
})

/**
 * Template Schema
 */
export const promptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

/**
 * TypeScript types from schemas
 */
export type TranscriptChunk = z.infer<typeof transcriptChunkSchema>
export type SpeakerSegment = z.infer<typeof speakerSegmentSchema>
export type SavedTranscript = z.infer<typeof savedTranscriptSchema>
export type PromptTemplate = z.infer<typeof promptTemplateSchema>
```

---

### 3. Collection Instances

**File**: `src/lib/localStorage/collections.ts`

```typescript
import { createCollection } from './storage'
import { savedTranscriptSchema, promptTemplateSchema } from './schemas'

/**
 * Transcripts collection
 */
export const transcripts = createCollection({
  name: 'transcripts',
  schema: savedTranscriptSchema,
})

/**
 * Templates collection
 */
export const templates = createCollection({
  name: 'templates',
  schema: promptTemplateSchema,
})

// Easy to add more:
// export const settings = createCollection({
//   name: 'settings',
//   schema: settingsSchema,
// })
```

---

### 4. useTranscripts Hook

**File**: `src/hooks/useTranscripts.ts`

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { transcripts } from '@/lib/localStorage/collections'
import { blobStorage } from '@/lib/localStorage/storage'
import type { SavedTranscript, TranscriptChunk, SpeakerSegment } from '@/lib/localStorage/schemas'

export function useTranscripts() {
  const [items, setItems] = useState<SavedTranscript[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Load all transcripts
   */
  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await transcripts.list()

      // Sort by most recent
      const sorted = data
        .map(item => item.value)
        .sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt)

      setItems(sorted)
    } catch (err) {
      setError(err as Error)
      console.error('Failed to load transcripts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    load()
  }, [load])

  /**
   * Save a new transcript
   */
  const save = useCallback(async (data: {
    transcript: { text: string; chunks: TranscriptChunk[] }
    segments: SpeakerSegment[]
    fileName?: string
    audioBlob?: Blob
    language?: string
    model?: string
  }): Promise<string> => {
    const id = `transcript-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    // Save audio blob if provided
    let audioFileId: string | undefined
    if (data.audioBlob) {
      audioFileId = `audio-${id}`
      await blobStorage.save(audioFileId, data.audioBlob)
    }

    // Calculate metadata
    const duration = data.transcript.chunks[data.transcript.chunks.length - 1]?.timestamp[1] || 0
    const speakerCount = new Set(data.segments.map(s => s.label)).size

    // Create transcript object
    const transcript: SavedTranscript = {
      id,
      transcript: data.transcript,
      segments: data.segments,
      audioFileId,
      metadata: {
        fileName: data.fileName || 'untitled',
        duration,
        speakerCount,
        language: data.language || 'en',
        model: data.model || 'unknown',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    }

    // Save (Zod validation happens automatically)
    await transcripts.set(id, transcript)

    // Reload list
    await load()

    return id
  }, [load])

  /**
   * Delete a transcript (including audio)
   */
  const remove = useCallback(async (id: string): Promise<void> => {
    // Get transcript to find audio file
    const transcript = await transcripts.get(id)

    // Delete audio blob if exists
    if (transcript?.audioFileId) {
      await blobStorage.remove(transcript.audioFileId)
    }

    // Delete transcript
    await transcripts.remove(id)

    // Reload list
    await load()
  }, [load])

  /**
   * Update a transcript
   */
  const update = useCallback(async (
    id: string,
    updates: Partial<Pick<SavedTranscript, 'transcript' | 'segments'>>
  ): Promise<void> => {
    const existing = await transcripts.get(id)
    if (!existing) {
      throw new Error('Transcript not found')
    }

    const updated: SavedTranscript = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        updatedAt: Date.now(),
      },
    }

    await transcripts.set(id, updated)
    await load()
  }, [load])

  /**
   * Get single transcript with audio
   */
  const getWithAudio = useCallback(async (id: string): Promise<{
    transcript: SavedTranscript
    audioBlob: Blob | null
  } | null> => {
    const transcript = await transcripts.get(id)
    if (!transcript) return null

    let audioBlob: Blob | null = null
    if (transcript.audioFileId) {
      audioBlob = await blobStorage.get(transcript.audioFileId)
    }

    return { transcript, audioBlob }
  }, [])

  return {
    // Data
    transcripts: items,
    loading,
    error,

    // Actions
    save,
    remove,
    update,
    getWithAudio,
    refresh: load,
  }
}
```

---

### 5. useTemplates Hook

**File**: `src/hooks/useTemplates.ts`

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { templates } from '@/lib/localStorage/collections'
import type { PromptTemplate } from '@/lib/localStorage/schemas'

// Default template
const DEFAULT_TEMPLATE: PromptTemplate = {
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
(Note - the transcription may be inaccurate sometimes, adjust your logic accordingly)

`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

export function useTemplates() {
  const [items, setItems] = useState<PromptTemplate[]>([DEFAULT_TEMPLATE])
  const [loading, setLoading] = useState(true)

  /**
   * Load all templates
   */
  const load = useCallback(async () => {
    try {
      setLoading(true)

      const data = await templates.list()
      const sorted = data
        .map(item => item.value)
        .sort((a, b) => b.updatedAt - a.updatedAt)

      // Always include default template
      const hasDefault = sorted.some(t => t.id === 'default')
      if (!hasDefault) {
        sorted.unshift(DEFAULT_TEMPLATE)
      }

      setItems(sorted)
    } catch (err) {
      console.error('Failed to load templates:', err)
      setItems([DEFAULT_TEMPLATE])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /**
   * Save a new template
   */
  const save = useCallback(async (data: {
    name: string
    content: string
  }): Promise<string> => {
    const id = `template-${Date.now()}`

    const template: PromptTemplate = {
      id,
      name: data.name,
      content: data.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await templates.set(id, template)
    await load()

    return id
  }, [load])

  /**
   * Update existing template
   */
  const update = useCallback(async (
    id: string,
    updates: Partial<Pick<PromptTemplate, 'name' | 'content'>>
  ): Promise<void> => {
    if (id === 'default') {
      throw new Error('Cannot update default template')
    }

    const existing = await templates.get(id)
    if (!existing) {
      throw new Error('Template not found')
    }

    const updated: PromptTemplate = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    }

    await templates.set(id, updated)
    await load()
  }, [load])

  /**
   * Delete template
   */
  const remove = useCallback(async (id: string): Promise<void> => {
    if (id === 'default') {
      throw new Error('Cannot delete default template')
    }

    await templates.remove(id)
    await load()
  }, [load])

  return {
    templates: items,
    loading,
    save,
    update,
    remove,
    refresh: load,
  }
}
```

---

## Usage Examples

### Example 1: Save Transcript in Component

```typescript
'use client'

import { useTranscripts } from '@/hooks/useTranscripts'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function WhisperDiarization() {
  const { save } = useTranscripts()
  const [result, setResult] = useState<TranscriptionResult | null>(null)

  const handleSave = async () => {
    if (!result) return

    try {
      const id = await save({
        transcript: result.transcript,
        segments: result.segments,
        fileName: 'My Recording',
        audioBlob: audioBlob, // if available
        model: 'whisper-base',
      })

      toast.success('Transcript saved successfully!')
      console.log('Saved with ID:', id)
    } catch (error) {
      toast.error('Failed to save transcript')
      console.error(error)
    }
  }

  return (
    <Button onClick={handleSave}>
      Save Transcript
    </Button>
  )
}
```

### Example 2: List Saved Transcripts

```typescript
'use client'

import { useTranscripts } from '@/hooks/useTranscripts'
import { Card } from '@/components/ui/card'

function TranscriptList() {
  const { transcripts, loading, remove } = useTranscripts()

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      <h2>Saved Transcripts ({transcripts.length})</h2>

      {transcripts.map((t) => (
        <Card key={t.id} className="p-4">
          <h3>{t.metadata.fileName}</h3>
          <p>Duration: {Math.floor(t.metadata.duration)}s</p>
          <p>Speakers: {t.metadata.speakerCount}</p>
          <p>Date: {new Date(t.metadata.createdAt).toLocaleDateString()}</p>

          <Button onClick={() => remove(t.id)} variant="destructive">
            Delete
          </Button>
        </Card>
      ))}
    </div>
  )
}
```

### Example 3: Use Templates

```typescript
'use client'

import { useTemplates } from '@/hooks/useTemplates'
import { Select } from '@/components/ui/select'

function ExportToLLMModal() {
  const { templates, save: saveTemplate } = useTemplates()
  const [selectedId, setSelectedId] = useState('default')

  const handleSaveAsNew = async () => {
    const id = await saveTemplate({
      name: 'My Custom Template',
      content: customPrompt,
    })

    setSelectedId(id)
  }

  return (
    <div>
      <Select value={selectedId} onValueChange={setSelectedId}>
        {templates.map(t => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>

      <Button onClick={handleSaveAsNew}>
        Save as New Template
      </Button>
    </div>
  )
}
```

---

## Migration from Old Storage

### Migrate Templates from localStorage

```typescript
// src/lib/localStorage/migrations.ts
import { templates } from './collections'
import type { PromptTemplate } from './schemas'

export async function migrateTemplatesFromLocalStorage() {
  const STORAGE_KEY = 'llm-export-templates'

  try {
    const oldData = localStorage.getItem(STORAGE_KEY)
    if (!oldData) return

    const oldTemplates = JSON.parse(oldData) as PromptTemplate[]

    // Save each to new storage
    for (const template of oldTemplates) {
      await templates.set(template.id, template)
    }

    // Remove old data
    localStorage.removeItem(STORAGE_KEY)

    console.log(`✅ Migrated ${oldTemplates.length} templates`)
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}
```

**Run once on app load**:
```typescript
// In main layout or App component
useEffect(() => {
  migrateTemplatesFromLocalStorage()
}, [])
```

---

## Adding New Collections (Super Easy!)

Need to store settings? Just:

1. **Define schema**:
```typescript
// src/lib/localStorage/schemas.ts
export const appSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string(),
  // ... more settings
})

export type AppSettings = z.infer<typeof appSettingsSchema>
```

2. **Create collection**:
```typescript
// src/lib/localStorage/collections.ts
export const settings = createCollection({
  name: 'settings',
  schema: appSettingsSchema,
})
```

3. **Create hook** (optional):
```typescript
// src/hooks/useSettings.ts
export function useSettings() {
  const [data, setData] = useState<AppSettings | null>(null)

  useEffect(() => {
    settings.get('app-settings').then(setData)
  }, [])

  const update = async (updates: Partial<AppSettings>) => {
    const current = await settings.get('app-settings') || defaultSettings
    await settings.set('app-settings', { ...current, ...updates })
    setData({ ...current, ...updates })
  }

  return { settings: data, update }
}
```

**That's it!** No need to modify storage core.

---

## Testing

### Unit Tests

```typescript
// __tests__/storage.test.ts
import { createCollection } from '@/lib/localStorage/storage'
import { z } from 'zod'

describe('Storage', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
  })

  const testCollection = createCollection({
    name: 'test',
    schema: testSchema,
  })

  afterEach(async () => {
    await testCollection.clear()
  })

  it('should save and retrieve data', async () => {
    await testCollection.set('user1', { name: 'Alice', age: 30 })
    const data = await testCollection.get('user1')

    expect(data).toEqual({ name: 'Alice', age: 30 })
  })

  it('should validate data with Zod', async () => {
    await expect(
      testCollection.set('user2', { name: 'Bob', age: 'invalid' } as any)
    ).rejects.toThrow()
  })

  it('should list all items', async () => {
    await testCollection.set('user1', { name: 'Alice', age: 30 })
    await testCollection.set('user2', { name: 'Bob', age: 25 })

    const items = await testCollection.list()

    expect(items).toHaveLength(2)
  })
})
```

---

## Implementation Checklist

### Phase 1: Core ✅ COMPLETED
- [x] Create `src/lib/localStorage/storage.ts` - Storage helper
- [x] Create `src/lib/localStorage/schemas.ts` - Zod schemas
- [x] Create `src/lib/localStorage/collections.ts` - Collection instances
- [ ] Test basic operations

### Phase 2: Hooks ✅ COMPLETED
- [x] Create `src/hooks/useTranscripts.ts`
- [x] Create `src/hooks/useTemplates.ts`
- [ ] Create `src/lib/localStorage/migrations.ts` - Migrate old templates
- [ ] Test hooks in isolation

### Phase 3: UI Integration 🔄 IN PROGRESS
- [ ] Update `WhisperDiarization.tsx` - Add save button functionality
- [ ] Create `TranscriptListModal.tsx` - Show saved transcripts (optional)
- [ ] Update `ExportToLLMModal.tsx` - Use useTemplates hook (if exists)
- [x] Toast notifications already available (sonner)
- [ ] Test full flow

### Phase 4: Polish (1 hour)
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Test edge cases (quota exceeded, etc.)
- [ ] Add JSDoc comments

**Total: 5-8 hours**

---

## Benefits of This Approach

✅ **Simple**: One file for storage, one for schemas, one for collections
✅ **Type-safe**: Zod validates at runtime, TypeScript at compile time
✅ **Maintainable**: Easy to understand, easy to extend
✅ **No over-engineering**: Just what we need, nothing more
✅ **Expandable**: Adding new collections takes 5 minutes
✅ **Testable**: Pure functions, easy to mock
✅ **Fast**: Localforage is optimized, no unnecessary abstractions

---

## What We're NOT Doing (For Now)

❌ Zustand stores - not needed for this
❌ External APIs - local-only
❌ Event emitters - React hooks handle reactivity
❌ Storage providers - just localforage
❌ Sync coordinators - not needed yet
❌ Electron file system - can add later if needed

**Keep it simple, make it work, ship it!** 🚀

---

Ready to implement? Let's start with Phase 1!
