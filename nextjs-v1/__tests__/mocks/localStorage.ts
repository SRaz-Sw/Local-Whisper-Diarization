/**
 * Mock localStorage collections
 * Mocks the transcript storage system used by BatchQueueManager
 */

import { mock } from 'bun:test'

export const mockTranscripts = {
  _storage: new Map<string, any>(),

  async get(id: string) {
    return this._storage.get(id)
  },

  async set(id: string, data: any) {
    this._storage.set(id, data)
    return id
  },

  async delete(id: string) {
    this._storage.delete(id)
  },

  async clear() {
    this._storage.clear()
  },

  async getAll() {
    return Array.from(this._storage.values())
  },
}

export const mockBlobStorage = {
  _blobs: new Map<string, Blob>(),

  async save(id: string, blob: Blob) {
    this._blobs.set(id, blob)
    return id
  },

  async get(id: string) {
    return this._blobs.get(id)
  },

  async delete(id: string) {
    this._blobs.delete(id)
  },

  async clear() {
    this._blobs.clear()
  },
}

// Mock the actual modules using Bun's module mocking
mock.module('@/lib/localStorage/collections', () => ({
  transcripts: mockTranscripts,
}))

mock.module('@/lib/localStorage/storage', () => ({
  blobStorage: mockBlobStorage,
}))
