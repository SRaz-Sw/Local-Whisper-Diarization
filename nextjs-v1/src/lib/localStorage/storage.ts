/**
 * Storage Helper - Thin wrapper around localforage with Zod validation
 *
 * Provides type-safe, validated storage collections using IndexedDB via localforage.
 */

import localforage from "localforage";
import { z } from "zod";

/**
 * Create a storage collection with automatic Zod validation
 *
 * @example
 * ```typescript
 * const users = createCollection({
 *   name: 'users',
 *   schema: z.object({ id: z.string(), name: z.string() })
 * })
 *
 * await users.set('user1', { id: 'user1', name: 'Alice' })
 * const user = await users.get('user1')
 * ```
 */
export function createCollection<T extends z.ZodType>(config: {
  name: string;
  schema: T;
}) {
  // Create a localforage instance for this collection
  const store = localforage.createInstance({
    name: "whisper-diarization",
    storeName: config.name,
    description: `Storage for ${config.name}`,
  });

  /**
   * Validate data against schema
   */
  const validate = (data: unknown): z.infer<T> => {
    try {
      return config.schema.parse(data);
    } catch (error) {
      console.error(`Validation error in ${config.name}:`, error);
      if (error instanceof z.ZodError) {
        console.error("Validation details:", error.issues);
      }
      throw new Error(`Invalid data for ${config.name}: ${error}`);
    }
  };

  return {
    /**
     * Get an item by key (with validation)
     */
    async get(key: string): Promise<z.infer<T> | null> {
      const data = await store.getItem<unknown>(key);
      if (data === null) return null;
      return validate(data);
    },

    /**
     * Set an item (validates before saving)
     */
    async set(key: string, value: z.infer<T>): Promise<void> {
      const validated = validate(value);
      await store.setItem(key, validated);
    },

    /**
     * Get all items in collection
     */
    async list(): Promise<Array<{ key: string; value: z.infer<T> }>> {
      const keys = await store.keys();
      const items = await Promise.all(
        keys.map(async (key) => {
          try {
            const value = await this.get(key);
            return { key, value };
          } catch (error) {
            // Skip invalid items instead of crashing
            console.warn(`Skipping invalid item with key "${key}":`, error);
            return { key, value: null };
          }
        }),
      );
      return items.filter((item) => item.value !== null) as Array<{ key: string; value: z.infer<T> }>;
    },

    /**
     * Remove an item by key
     */
    async remove(key: string): Promise<void> {
      await store.removeItem(key);
    },

    /**
     * Clear entire collection
     */
    async clear(): Promise<void> {
      await store.clear();
    },

    /**
     * Get all keys in collection
     */
    async keys(): Promise<string[]> {
      return store.keys();
    },

    /**
     * Check if a key exists
     */
    async has(key: string): Promise<boolean> {
      const keys = await store.keys();
      return keys.includes(key);
    },

    /**
     * Get count of items in collection
     */
    async count(): Promise<number> {
      return store.length();
    },

    /**
     * Find items matching a predicate
     */
    async find(
      predicate: (value: z.infer<T>) => boolean,
    ): Promise<Array<{ key: string; value: z.infer<T> }>> {
      const all = await this.list();
      return all.filter((item) => predicate(item.value));
    },
  };
}

/**
 * Blob storage helper - Separate storage for binary data (audio files, etc.)
 *
 * Uses a dedicated localforage instance optimized for blobs.
 *
 * @example
 * ```typescript
 * await blobStorage.save('audio-123', audioBlob)
 * const blob = await blobStorage.get('audio-123')
 * ```
 */
export const blobStorage = {
  store: localforage.createInstance({
    name: "whisper-diarization",
    storeName: "blobs",
    description: "Binary storage for audio files and other blobs",
  }),

  /**
   * Save a blob
   */
  async save(key: string, blob: Blob): Promise<void> {
    await this.store.setItem(key, blob);
  },

  /**
   * Get a blob
   */
  async get(key: string): Promise<Blob | null> {
    return this.store.getItem<Blob>(key);
  },

  /**
   * Remove a blob
   */
  async remove(key: string): Promise<void> {
    await this.store.removeItem(key);
  },

  /**
   * Clear all blobs
   */
  async clear(): Promise<void> {
    await this.store.clear();
  },

  /**
   * Get all blob keys
   */
  async keys(): Promise<string[]> {
    return this.store.keys();
  },

  /**
   * Check if blob exists
   */
  async has(key: string): Promise<boolean> {
    const keys = await this.store.keys();
    return keys.includes(key);
  },

  /**
   * Get count of blobs
   */
  async count(): Promise<number> {
    return this.store.length();
  },
};
