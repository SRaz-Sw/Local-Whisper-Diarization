// app/lib/storage.ts
"use client";

import localforage from "localforage";

// Configure localforage
localforage.config({
  name: "nextjs-v1",
  version: 1.0,
  storeName: "nextjs-v1-store", // This is the name of the IndexedDB database
  description: "Storage for nextjs-v1",
});

// Utility functions for common operations
export const storage = {
  async getItem<T>(key: string): Promise<T | null> {
    return localforage.getItem<T>(key);
  },

  async setItem<T>(key: string, value: T): Promise<T> {
    return localforage.setItem<T>(key, value);
  },

  async removeItem(key: string): Promise<void> {
    return localforage.removeItem(key);
  },

  async clear(): Promise<void> {
    return localforage.clear();
  },

  async keys(): Promise<string[]> {
    return localforage.keys();
  },
};

export default storage;
