/**
 * Storage Utilities
 *
 * Helper functions for managing storage, including cleanup and debugging.
 */

import { transcripts, templates, settings } from './collections'
import { blobStorage } from './storage'

/**
 * Clear all corrupted items from transcripts collection
 *
 * This scans the transcripts collection and removes any items
 * that fail validation. Useful for cleaning up after schema changes.
 *
 * @returns Number of items removed
 */
export async function clearCorruptedTranscripts(): Promise<number> {
  const keys = await transcripts.keys()
  let removed = 0

  for (const key of keys) {
    try {
      await transcripts.get(key)
    } catch (error) {
      console.warn(`Removing corrupted transcript: ${key}`)
      await transcripts.remove(key)
      removed++
    }
  }

  return removed
}

/**
 * Clear all storage (transcripts, templates, settings, and blobs)
 *
 * WARNING: This will delete ALL saved data!
 *
 * @returns Counts of items cleared
 */
export async function clearAllStorage(): Promise<{
  transcripts: number
  templates: number
  settings: number
  blobs: number
}> {
  const counts = {
    transcripts: await transcripts.count(),
    templates: await templates.count(),
    settings: await settings.count(),
    blobs: await blobStorage.count(),
  }

  await Promise.all([
    transcripts.clear(),
    templates.clear(),
    settings.clear(),
    blobStorage.clear(),
  ])

  return counts
}

/**
 * Get storage statistics
 *
 * @returns Storage usage information
 */
export async function getStorageStats(): Promise<{
  transcripts: number
  templates: number
  settings: number
  blobs: number
}> {
  return {
    transcripts: await transcripts.count(),
    templates: await templates.count(),
    settings: await settings.count(),
    blobs: await blobStorage.count(),
  }
}

/**
 * Debug: List all keys in all collections
 *
 * Useful for debugging storage issues
 */
export async function debugListAllKeys(): Promise<{
  transcripts: string[]
  templates: string[]
  settings: string[]
  blobs: string[]
}> {
  return {
    transcripts: await transcripts.keys(),
    templates: await templates.keys(),
    settings: await settings.keys(),
    blobs: await blobStorage.keys(),
  }
}

/**
 * Expose utilities in browser console for debugging
 *
 * Call this in your component to expose storage utilities to window object.
 * Then you can use them in browser console like:
 *
 * ```javascript
 * // In browser console:
 * await window.__storageUtils.clearCorruptedTranscripts()
 * await window.__storageUtils.getStorageStats()
 * ```
 */
export function exposeStorageUtilsToWindow() {
  if (typeof window !== 'undefined') {
    ;(window as any).__storageUtils = {
      clearCorruptedTranscripts,
      clearAllStorage,
      getStorageStats,
      debugListAllKeys,
    }
    console.log(
      '📦 Storage utilities exposed to window.__storageUtils\n' +
        'Available methods:\n' +
        '  - clearCorruptedTranscripts()\n' +
        '  - clearAllStorage()\n' +
        '  - getStorageStats()\n' +
        '  - debugListAllKeys()'
    )
  }
}
