/**
 * Mock Worker
 * Simulates a Web Worker for testing purposes
 */

export class MockWorker {
  public onmessage: ((e: MessageEvent) => void) | null = null
  public url: string
  private _terminated = false
  private _messageHandlers = new Set<(e: MessageEvent) => void>()
  private _errorHandlers = new Set<(e: ErrorEvent) => void>()

  constructor(stringUrl: string | URL) {
    this.url = typeof stringUrl === 'string' ? stringUrl : stringUrl.toString()
  }

  addEventListener(type: string, handler: any): void {
    if (type === 'message') {
      this._messageHandlers.add(handler)
    } else if (type === 'error') {
      this._errorHandlers.add(handler)
    }
  }

  removeEventListener(type: string, handler: any): void {
    if (type === 'message') {
      this._messageHandlers.delete(handler)
    } else if (type === 'error') {
      this._errorHandlers.delete(handler)
    }
  }

  postMessage(data: any): void {
    if (this._terminated) {
      throw new Error('Worker has been terminated')
    }

    // Simulate async processing
    setTimeout(() => {
      if (data.type === 'load') {
        this._handleLoad(data.data)
      } else if (data.type === 'run') {
        this._handleRun(data.data)
      }
    }, 10)
  }

  terminate(): void {
    this._terminated = true
    this.onmessage = null
  }

  private _handleLoad(data: any): void {
    const { device, model, fileId } = data

    // Simulate loading message
    const loadingEvent = {
      data: {
        status: 'loading',
        data: `Loading ${model || 'whisper-base'} (${device})...`,
        fileId,
      },
    } as MessageEvent

    this.onmessage?.(loadingEvent)
    this._messageHandlers.forEach(handler => handler(loadingEvent))

    // Simulate loaded message after a short delay
    setTimeout(() => {
      const loadedEvent = {
        data: {
          status: 'loaded',
          fileId,
        },
      } as MessageEvent

      this.onmessage?.(loadedEvent)
      this._messageHandlers.forEach(handler => handler(loadedEvent))
    }, 50)
  }

  private _handleRun(data: any): void {
    const { audio, language, fileId } = data

    if (!audio || audio.length === 0) {
      // Simulate error for invalid audio
      const errorEvent = {
        data: {
          status: 'error',
          error: 'Invalid audio data',
          fileId,
        },
      } as MessageEvent

      this.onmessage?.(errorEvent)
      this._messageHandlers.forEach(handler => handler(errorEvent))
      return
    }

    // Simulate transcription progress
    this._simulateTranscription(fileId, audio.length)
  }

  private _simulateTranscription(fileId: string, audioLength: number): void {
    const totalSeconds = audioLength / 16000
    const steps = 10

    // Send initial progress
    const initialEvent = {
      data: {
        status: 'processing_progress',
        fileId,
        processedSeconds: 0,
        totalSeconds,
        estimatedTimeRemaining: totalSeconds,
      },
    } as MessageEvent

    this.onmessage?.(initialEvent)
    this._messageHandlers.forEach(handler => handler(initialEvent))

    // Simulate progress updates
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        const processedSeconds = (totalSeconds / steps) * i
        const remaining = totalSeconds - processedSeconds

        const progressEvent = {
          data: {
            status: 'processing_progress',
            fileId,
            processedSeconds,
            totalSeconds,
            estimatedTimeRemaining: remaining,
          },
        } as MessageEvent

        this.onmessage?.(progressEvent)
        this._messageHandlers.forEach(handler => handler(progressEvent))
      }, i * 100)
    }

    // Send complete message
    setTimeout(() => {
      const completeEvent = {
        data: {
          status: 'complete',
          fileId,
          result: {
            transcript: {
              text: `Mock transcript for ${fileId}`,
              chunks: [
                {
                  text: `Mock transcript for ${fileId}`,
                  timestamp: [0, totalSeconds],
                },
              ],
            },
            segments: [
              {
                id: 0,
                label: 'SPEAKER_00',
                start: 0,
                end: totalSeconds,
                confidence: 0.95,
              },
            ],
          },
          time: 1000,
        },
      } as MessageEvent

      this.onmessage?.(completeEvent)
      this._messageHandlers.forEach(handler => handler(completeEvent))
    }, (steps + 1) * 100)
  }
}

// Export as default for Worker mock
export default MockWorker
