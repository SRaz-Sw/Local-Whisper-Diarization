// FILE ___________ src/lib/query-services/queryClientPersist.ts
import { QueryClient } from '@tanstack/react-query';
import { AsyncStorage, persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import localforage from 'localforage';
import { useRef } from 'react';

// --- QueryClient Instance (Singleton Pattern) ---
// Create the client outside of the component/hook scope
let queryClientInstance: QueryClient | undefined;

export function getQueryClient(): QueryClient {
    if (!queryClientInstance) {
        queryClientInstance = new QueryClient({
            defaultOptions: {
                queries: {
                    gcTime: 1000 * 60 * 60 * 24, // 24 hours: time data stays in cache without observers
                    staleTime: 1000 * 60 * 5,    // 5 minutes: time until data is considered stale
                },
            },
        });
    }
    return queryClientInstance;
}

// --- Persistence Setup ---
localforage.config({
    name: 'WhatsAppCloneCache',
    storeName: 'queryCache',
});

const asyncStorageAdapter = {
    getItem: async (key: string) => await localforage.getItem(key),
    setItem: async (key: string, value: unknown) => await localforage.setItem(key, value),
    removeItem: async (key: string) => await localforage.removeItem(key),
};

const appPersister = createAsyncStoragePersister({
    storage: asyncStorageAdapter as AsyncStorage<string>,
    throttleTime: 1000,
});

// --- Hook to Initialize Persistence ---
// We use a hook to ensure it runs client-side and only once
export function useInitializeQueryClientPersistence() {
    const didInitialize = useRef(false);
    const queryClient = getQueryClient(); // Get the singleton instance

    if (typeof window !== 'undefined' && !didInitialize.current) {
        persistQueryClient({
            queryClient,
            persister: appPersister,
            maxAge: 1000 * 60 * 60 * 24 * 7, // Example: Cache persists for 7 days
            buster: process.env.NEXT_PUBLIC_APP_VERSION || 'v1',
        });
        console.log('React Query persistence initialized.');
        didInitialize.current = true;
    }
    // Return the client instance so the Provider can use it
    return queryClient;
}