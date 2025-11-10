/**
 * Test Utilities
 *
 * Helper functions for audio compression tests
 */

// ============================================================================
// INITIALIZE MOCKS AT MODULE LOAD TIME
// ============================================================================
// These mocks MUST be set up before any code tries to use them

// Mock AudioContext and OfflineAudioContext if not available
if (typeof (global as any).AudioContext === "undefined") {
  (global as any).AudioContext = class AudioContext {
    sampleRate: number;

    constructor(options?: any) {
      this.sampleRate = options?.sampleRate || 44100;
    }

    async decodeAudioData(
      _arrayBuffer: ArrayBuffer,
    ): Promise<AudioBuffer> {
      // Return a mock audio buffer with the correct sample rate
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

    async close() {}

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
  };

  (global as any).OfflineAudioContext = class OfflineAudioContext extends (
    (global as any).AudioContext
  ) {
    constructor(
      _numberOfChannels: number,
      _length: number,
      sampleRate: number,
    ) {
      super({ sampleRate });
    }

    createBuffer(
      numberOfChannels: number,
      length: number,
      sampleRate: number,
    ): AudioBuffer {
      const buffer: any = {
        numberOfChannels,
        length,
        sampleRate,
        duration: length / sampleRate,
        getChannelData: (_channel: number) => new Float32Array(length),
        copyFromChannel: () => {},
        copyToChannel: () => {},
      };
      return buffer;
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
  };
}

// Mock MediaRecorder - ALWAYS set it to ensure it's available
// (Setup files may have already set it, but we override to be sure)
(global as any).MediaRecorder = class MediaRecorder {
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
};

// ============================================================================
// TEST UTILITY FUNCTIONS
// ============================================================================

/**
 * Load test audio file as Blob
 *
 * @param filePath - Path to audio file
 * @returns Audio blob
 */
export async function loadTestAudioBlob(filePath: string): Promise<Blob> {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`Failed to load test audio: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Create a simple sine wave audio buffer for testing
 *
 * @param duration - Duration in seconds
 * @param frequency - Frequency in Hz
 * @param sampleRate - Sample rate in Hz
 * @param numberOfChannels - Number of channels
 * @returns AudioBuffer
 */
export function createTestAudioBuffer(
  duration: number = 1,
  frequency: number = 440,
  sampleRate: number = 44100,
  numberOfChannels: number = 2,
): AudioBuffer {
  const offlineContext = new OfflineAudioContext(
    numberOfChannels,
    duration * sampleRate,
    sampleRate,
  );

  const buffer = offlineContext.createBuffer(
    numberOfChannels,
    duration * sampleRate,
    sampleRate,
  );

  // Generate sine wave for each channel
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(
        (2 * Math.PI * frequency * i) / sampleRate,
      );
    }
  }

  return buffer;
}

/**
 * Create a test blob from AudioBuffer
 *
 * @param audioBuffer - Audio buffer to convert
 * @returns Promise<Blob>
 */
export async function audioBufferToBlob(
  audioBuffer: AudioBuffer,
): Promise<Blob> {
  // Use regular AudioContext instead of OfflineAudioContext
  // because we need createMediaStreamDestination()
  const audioContext = new AudioContext({
    sampleRate: audioBuffer.sampleRate,
  });

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  const destination = audioContext.createMediaStreamDestination();
  source.connect(destination);

  // Use global.MediaRecorder (set by test setup)
  const MediaRecorderClass = (global as any).MediaRecorder;
  if (!MediaRecorderClass) {
    throw new Error("MediaRecorder is not available in test environment");
  }
  const mediaRecorder = new MediaRecorderClass(destination.stream);
  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e: any) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      await audioContext.close();
      resolve(new Blob(chunks, { type: "audio/webm" }));
    };

    mediaRecorder.onerror = async (error: any) => {
      await audioContext.close();
      reject(error);
    };

    mediaRecorder.start();
    source.start(0);

    setTimeout(
      () => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      },
      audioBuffer.duration * 1000 + 100,
    );
  });
}

/**
 * Check if two audio buffers are approximately equal
 *
 * @param buffer1 - First audio buffer
 * @param buffer2 - Second audio buffer
 * @param tolerance - Tolerance for floating point comparison
 * @returns True if buffers are approximately equal
 */
export function areAudioBuffersEqual(
  buffer1: AudioBuffer,
  buffer2: AudioBuffer,
  tolerance: number = 0.01,
): boolean {
  if (
    buffer1.numberOfChannels !== buffer2.numberOfChannels ||
    buffer1.length !== buffer2.length ||
    Math.abs(buffer1.sampleRate - buffer2.sampleRate) > 1
  ) {
    return false;
  }

  for (let ch = 0; ch < buffer1.numberOfChannels; ch++) {
    const data1 = buffer1.getChannelData(ch);
    const data2 = buffer2.getChannelData(ch);

    for (let i = 0; i < data1.length; i++) {
      if (Math.abs(data1[i] - data2[i]) > tolerance) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get audio buffer statistics
 *
 * @param audioBuffer - Audio buffer to analyze
 * @returns Statistics object
 */
export function getAudioBufferStats(audioBuffer: AudioBuffer) {
  const stats = {
    duration: audioBuffer.duration,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
    length: audioBuffer.length,
    rms: [] as number[],
    peak: [] as number[],
  };

  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);

    // Calculate RMS (Root Mean Square)
    let sumSquares = 0;
    let peak = 0;

    for (let i = 0; i < data.length; i++) {
      sumSquares += data[i] * data[i];
      peak = Math.max(peak, Math.abs(data[i]));
    }

    stats.rms.push(Math.sqrt(sumSquares / data.length));
    stats.peak.push(peak);
  }

  return stats;
}

/**
 * Wait for a specified time
 *
 * @param ms - Milliseconds to wait
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock MediaRecorder if not available (for Node.js tests)
 */
export function setupMediaRecorderMock() {
  if (typeof MediaRecorder === "undefined") {
    (global as any).MediaRecorder = class MediaRecorder {
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
    };
  }
}

/**
 * Mock AudioContext if not available (for Node.js tests)
 */
export function setupAudioContextMock() {
  if (typeof AudioContext === "undefined") {
    (global as any).AudioContext = class AudioContext {
      sampleRate: number;

      constructor(options?: any) {
        this.sampleRate = options?.sampleRate || 44100;
      }

      async decodeAudioData(
        arrayBuffer: ArrayBuffer,
      ): Promise<AudioBuffer> {
        // Return a mock audio buffer
        return {
          numberOfChannels: 2,
          length: this.sampleRate,
          sampleRate: this.sampleRate,
          duration: 1,
          getChannelData: (channel: number) =>
            new Float32Array(this.sampleRate),
          copyFromChannel: () => {},
          copyToChannel: () => {},
        } as AudioBuffer;
      }

      async close() {}

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
    };

    (global as any).OfflineAudioContext =
      class OfflineAudioContext extends (global as any).AudioContext {
        constructor(
          numberOfChannels: number,
          length: number,
          sampleRate: number,
        ) {
          super({ sampleRate });
        }

        createBuffer(
          numberOfChannels: number,
          length: number,
          sampleRate: number,
        ): AudioBuffer {
          const buffer: any = {
            numberOfChannels,
            length,
            sampleRate,
            duration: length / sampleRate,
            getChannelData: (channel: number) => new Float32Array(length),
            copyFromChannel: () => {},
            copyToChannel: () => {},
          };
          return buffer;
        }

        createChannelMerger(channels: number) {
          return { connect: () => {} };
        }

        createChannelSplitter(channels: number) {
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
      };
  }
}
