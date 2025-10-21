// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Import mocks
import './__tests__/mocks/localStorage'
import { createMockWorkerPool } from './__tests__/mocks/workerPool'

// Mock the BatchWorkerPoolService
jest.mock('./src/app/web-transc/services/BatchWorkerPoolService', () => ({
  batchWorkerPool: createMockWorkerPool(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock Worker
global.Worker = class Worker {
  constructor(stringUrl) {
    this.url = stringUrl
    this.onmessage = null
  }

  postMessage(msg) {
    // Override in tests
  }

  terminate() {
    // Override in tests
  }
}

// Mock AudioContext
global.AudioContext = class AudioContext {
  constructor(options) {
    this.sampleRate = options?.sampleRate || 44100
  }

  async decodeAudioData(arrayBuffer) {
    // Return mock audio buffer
    return {
      numberOfChannels: 2,
      length: 16000,
      sampleRate: 16000,
      getChannelData: (channel) => new Float32Array(16000),
    }
  }

  async close() {
    return Promise.resolve()
  }
}
