'use client';
// app/hooks/useLocalStorage.ts

import { useState, useEffect } from 'react';
import storage from '../lib/storage';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getStoredValue = async () => {
      try {
        const value = await storage.getItem<T>(key);
        setStoredValue(value !== null ? value : initialValue);
      } catch (error) {
        console.error(error);
        setStoredValue(initialValue);
      } finally {
        setLoading(false);
      }
    };

    getStoredValue();
  }, [key, initialValue]);

  const setValue = async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await storage.setItem(key, valueToStore);
    } catch (error) {
      console.error(error);
    }
  };

  return { value: storedValue, setValue, loading };
}

/**
Best Practices for Next.js 15

Dynamic imports for client-only code:
tsxCopy// For server components that need to conditionally use client features
import dynamic from 'next/dynamic';

const ClientDataComponent = dynamic(
  () => import('@/components/DataManager'),
  { ssr: false }
);

Handle large blobs efficiently:
typescriptCopyasync function storeFile(file: File) {
  try {
    // For large files, consider chunking
    await storage.setItem(`file_${file.name}`, file);
  } catch (error) {
    console.error('Error storing file:', error);
    // Handle storage quota errors
    if (error.name === 'QuotaExceededError') {
      // Implement fallback strategy
    }
  }
}

For re-renders when data changes between tabs/windows:
typescriptCopyuseEffect(() => {
  const handleStorageChange = async () => {
    const updatedValue = await storage.getItem(key);
    if (updatedValue !== storedValue) {
      setStoredValue(updatedValue);
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, [key, storedValue]); 

 */