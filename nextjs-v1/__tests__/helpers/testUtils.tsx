/**
 * Test Utilities
 * Common helpers for testing React components and Zustand stores
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { useBatchStore } from '@/app/web-transc/store/useBatchStore'

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { ...options })
}

/**
 * Reset all Zustand stores to initial state
 */
export function resetStores() {
  useBatchStore.setState({
    files: [],
    processingCount: 0,
    totalCompleted: 0,
    totalFailed: 0,
    totalCancelled: 0,
    batchStatus: 'idle',
    isPaused: false,
    isQueueInitialized: false,
    isQueueRunning: false,
    isAssigningFile: false,
    maxConcurrentFiles: 1,
    availableWorkerIds: [],
    isDragging: false,
    isComponentInitialized: false,
    processingFiles: new Map(),
    lastLoggedProgress: new Map(),
  })

  // Clear mock localStorage
  const { mockTranscripts, mockBlobStorage } = require('../mocks/localStorage')
  mockTranscripts._storage.clear()
  mockBlobStorage._blobs.clear()
}

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 50,
): Promise<void> {
  const startTime = Date.now()

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition not met within timeout')
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

/**
 * Create a mock File object with specific properties
 */
export function createMockFile(
  name: string,
  size: number,
  type: string = 'audio/mp3',
): File {
  const content = new ArrayBuffer(size)
  return new File([content], name, { type, lastModified: Date.now() })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
