/**
 * Bun Test Setup
 * Global mocks and configuration for Bun test runner
 */

// IMPORTANT: Set up global mocks FIRST before any imports
// This ensures that code that runs during import time has access to these globals

import { Window } from "happy-dom";

// Setup DOM environment using happy-dom
const window = new Window();
const document = window.document;

// Assign to global FIRST
global.window = window as any;
global.document = document as any;
global.navigator = window.navigator as any;
global.HTMLElement = window.HTMLElement as any;
global.Element = window.Element as any;

// Mock AudioContext BEFORE any modules are imported
global.AudioContext = class AudioContext {
  sampleRate: number;

  constructor(options?: { sampleRate?: number }) {
    this.sampleRate = options?.sampleRate || 44100;
  }

  async decodeAudioData(_arrayBuffer: ArrayBuffer) {
    // Return mock audio buffer with the correct sample rate from constructor
    return {
      numberOfChannels: 2,
      length: this.sampleRate,
      sampleRate: this.sampleRate,
      duration: 1,
      getChannelData: (_channel: number) =>
        new Float32Array(this.sampleRate),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    };
  }

  async close() {
    return Promise.resolve();
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
    };
  }

  createMediaStreamDestination() {
    return {
      stream: {},
    };
  }
} as any;

// Mock OfflineAudioContext BEFORE any modules are imported
global.OfflineAudioContext = class OfflineAudioContext {
  sampleRate: number;

  constructor(
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ) {
    this.sampleRate = sampleRate;
  }

  createBuffer(
    numberOfChannels: number,
    length: number,
    sampleRate: number,
  ): AudioBuffer {
    return {
      numberOfChannels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: (_channel: number) => new Float32Array(length),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as AudioBuffer;
  }

  createChannelMerger(_channels: number) {
    return { connect: () => {} };
  }

  createChannelSplitter(_channels: number) {
    return { connect: () => {} };
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect: () => {},
    };
  }

  get destination() {
    return { connect: () => {} };
  }

  async startRendering(): Promise<AudioBuffer> {
    return this.createBuffer(1, this.sampleRate, this.sampleRate);
  }

  async close() {
    return Promise.resolve();
  }

  async decodeAudioData(_arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return {
      numberOfChannels: 2,
      length: this.sampleRate,
      sampleRate: this.sampleRate,
      duration: 1,
      getChannelData: (_channel: number) =>
        new Float32Array(this.sampleRate),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as AudioBuffer;
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
    };
  }

  createMediaStreamDestination() {
    return {
      stream: {},
    };
  }
} as any;

// Mock MediaRecorder BEFORE any modules are imported
global.MediaRecorder = class MediaRecorder {
  static isTypeSupported(mimeType: string) {
    return mimeType.includes("webm") || mimeType.includes("opus");
  }

  state = "inactive";
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  constructor(
    public stream: any,
    public options?: any,
  ) {}

  start() {
    this.state = "recording";
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({
          data: new Blob(["mock audio data"], {
            type: this.options?.mimeType || "audio/webm",
          }),
        });
      }
    }, 10);
  }

  stop() {
    this.state = "inactive";
    setTimeout(() => {
      if (this.onstop) this.onstop();
    }, 10);
  }
} as any;

// Mock FileReader BEFORE any modules are imported
global.FileReader = class FileReader extends EventTarget {
  result: string | ArrayBuffer | null = null;
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
  readyState: number = 0;
  error: DOMException | null = null;

  // EventTarget methods
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {}
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {}
  dispatchEvent(event: Event): boolean {
    return true;
  }

  private createProgressEvent(): ProgressEvent<FileReader> {
    return {
      target: this,
      currentTarget: this,
      lengthComputable: true,
      loaded: 0,
      total: 0,
      bubbles: false,
      cancelBubble: false,
      cancelable: false,
      composed: false,
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: true,
      returnValue: true,
      srcElement: this,
      timeStamp: Date.now(),
      type: "load",
      composedPath: () => [],
      initEvent: () => {},
      preventDefault: () => {},
      stopImmediatePropagation: () => {},
      stopPropagation: () => {},
      AT_TARGET: 2,
      BUBBLING_PHASE: 3,
      CAPTURING_PHASE: 1,
      NONE: 0,
    } as ProgressEvent<FileReader>;
  }

  readAsArrayBuffer(blob: Blob) {
    // Simulate async file reading
    setTimeout(() => {
      // Create a mock ArrayBuffer
      this.result = new ArrayBuffer(blob.size);
      this.readyState = 2; // DONE
      const event = this.createProgressEvent();
      this.onload?.(event);
    }, 10);
  }

  readAsDataURL(blob: Blob) {
    setTimeout(() => {
      this.result = "data:audio/mp3;base64,mock";
      this.readyState = 2; // DONE
      const event = this.createProgressEvent();
      this.onload?.(event);
    }, 10);
  }

  readAsText(blob: Blob) {
    setTimeout(() => {
      this.result = "mock text";
      this.readyState = 2; // DONE
      const event = this.createProgressEvent();
      this.onload?.(event);
    }, 10);
  }

  abort() {
    this.readyState = 2; // DONE
  }

  // FileReader constants
  static readonly EMPTY = 0;
  static readonly LOADING = 1;
  static readonly DONE = 2;
  readonly EMPTY = 0;
  readonly LOADING = 1;
  readonly DONE = 2;
} as any;

// Now it's safe to import modules
import "@testing-library/jest-dom";
import { mockTranscripts, mockBlobStorage } from "./mocks/localStorage";
import { MockWorker } from "./mocks/worker";

// Mock global Worker
global.Worker = MockWorker as any;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
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
});

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
};
global.localStorage = localStorageMock as any;

// Mock WebGPU AudioContext if needed
(global as any).webkitAudioContext = global.AudioContext;
// /**
//  * Bun Test Setup
//  * Global mocks and configuration for Bun test runner
//  */

// // IMPORTANT: Set up global mocks FIRST before any imports
// // This ensures that code that runs during import time has access to these globals

// import { Window } from "happy-dom";

// // Setup DOM environment using happy-dom
// const window = new Window();
// const document = window.document;

// // Assign to global FIRST
// global.window = window as any;
// global.document = document as any;
// global.navigator = window.navigator as any;
// global.HTMLElement = window.HTMLElement as any;
// global.Element = window.Element as any;

// // Mock AudioContext BEFORE any modules are imported
// global.AudioContext = class AudioContext {
//   sampleRate: number;

//   constructor(options?: { sampleRate?: number }) {
//     this.sampleRate = options?.sampleRate || 44100;
//   }

//   async decodeAudioData(arrayBuffer: ArrayBuffer) {
//     // Return mock audio buffer
//     return {
//       numberOfChannels: 2,
//       length: 16000,
//       sampleRate: 16000,
//       duration: 1,
//       getChannelData: (channel: number) => new Float32Array(16000),
//     };
//   }

//   async close() {
//     return Promise.resolve();
//   }
// } as any;

// // Mock FileReader BEFORE any modules are imported
// global.FileReader = class FileReader {
//   result: string | ArrayBuffer | null = null;
//   onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
//   onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;

//   readAsArrayBuffer(blob: Blob) {
//     // Simulate async file reading
//     setTimeout(() => {
//       // Create a mock ArrayBuffer
//       this.result = new ArrayBuffer(blob.size);
//       const event = { target: this } as ProgressEvent<FileReader>;
//       this.onload?.(event);
//     }, 10);
//   }

//   readAsDataURL(blob: Blob) {
//     setTimeout(() => {
//       this.result = "data:audio/mp3;base64,mock";
//       const event = { target: this } as ProgressEvent<FileReader>;
//       this.onload?.(event);
//     }, 10);
//   }

//   readAsText(blob: Blob) {
//     setTimeout(() => {
//       this.result = "mock text";
//       const event = { target: this } as ProgressEvent<FileReader>;
//       this.onload?.(event);
//     }, 10);
//   }

//   abort() {}
// } as any;

// // Now it's safe to import modules
// import "@testing-library/jest-dom"; //  is fine to keep (it works with Bun and provides useful matchers like toBeInTheDocumen
// import { mockTranscripts, mockBlobStorage } from "./mocks/localStorage";
// import { MockWorker } from "./mocks/worker";

// // Mock global Worker
// global.Worker = MockWorker as any;

// // Mock IntersectionObserver
// global.IntersectionObserver = class IntersectionObserver {
//   constructor() {}
//   disconnect() {}
//   observe() {}
//   takeRecords() {
//     return [];
//   }
//   unobserve() {}
// } as any;

// // Mock ResizeObserver
// global.ResizeObserver = class ResizeObserver {
//   constructor() {}
//   disconnect() {}
//   observe() {}
//   unobserve() {}
// } as any;

// // Mock window.matchMedia
// Object.defineProperty(window, "matchMedia", {
//   writable: true,
//   value: (query: string) => ({
//     matches: false,
//     media: query,
//     onchange: null,
//     addListener: () => {},
//     removeListener: () => {},
//     addEventListener: () => {},
//     removeEventListener: () => {},
//     dispatchEvent: () => true,
//   }),
// });

// // Mock localStorage
// const localStorageMock = {
//   getItem: () => null,
//   setItem: () => {},
//   removeItem: () => {},
//   clear: () => {},
//   length: 0,
//   key: () => null,
// };
// global.localStorage = localStorageMock as any;

// // Mock WebGPU AudioContext if needed
// (global as any).webkitAudioContext = global.AudioContext;
