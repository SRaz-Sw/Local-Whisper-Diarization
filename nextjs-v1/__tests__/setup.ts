/**
 * Bun Test Setup
 * Global mocks and configuration for Bun test runner
 */

import '@testing-library/jest-dom'
import { mockTranscripts, mockBlobStorage } from './mocks/localStorage'
import { MockWorker } from './mocks/worker'
import { Window } from 'happy-dom'

// Setup DOM environment using happy-dom
const window = new Window()
const document = window.document

// Assign to global
global.window = window as any
global.document = document as any
global.navigator = window.navigator as any
global.HTMLElement = window.HTMLElement as any
global.Element = window.Element as any

// Mock global Worker
global.Worker = MockWorker as any

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
})

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
}
global.localStorage = localStorageMock as any

// Mock AudioContext for audio duration extraction
global.AudioContext = class AudioContext {
  sampleRate: number

  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate || 44100
  }

  async decodeAudioData(arrayBuffer: ArrayBuffer) {
    // Return mock audio buffer
    return {
      numberOfChannels: 2,
      length: 16000,
      sampleRate: 16000,
      duration: 1,
      getChannelData: (channel: number) => new Float32Array(16000),
    }
  }

  async close() {
    return Promise.resolve()
  }
} as any

// Mock WebGPU AudioContext if needed
;(global as any).webkitAudioContext = global.AudioContext

// Mock FileReader for file operations in tests
global.FileReader = class FileReader {
  result: string | ArrayBuffer | null = null
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null

  readAsArrayBuffer(blob: Blob) {
    // Simulate async file reading
    setTimeout(() => {
      // Create a mock ArrayBuffer
      this.result = new ArrayBuffer(blob.size)
      const event = { target: this } as ProgressEvent<FileReader>
      this.onload?.(event)
    }, 10)
  }

  readAsDataURL(blob: Blob) {
    setTimeout(() => {
      this.result = 'data:audio/mp3;base64,mock'
      const event = { target: this } as ProgressEvent<FileReader>
      this.onload?.(event)
    }, 10)
  }

  readAsText(blob: Blob) {
    setTimeout(() => {
      this.result = 'mock text'
      const event = { target: this } as ProgressEvent<FileReader>
      this.onload?.(event)
    }, 10)
  }

  abort() {}
} as any
