/**
 * Mock Worker
 * Simulates a Web Worker for testing purposes
 */

export class MockWorker {
  public onmessage: ((e: MessageEvent) => void) | null = null
  public url: string
  private _terminated = false

  constructor(stringUrl: string | URL) {
    this.url = typeof stringUrl === 'string' ? stringUrl : stringUrl.toString()
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
    this.onmessage?.({
      data: {
        status: 'loading',
        data: `Loading ${model || 'whisper-base'} (${device})...`,
        fileId,
      },
    } as MessageEvent)

    // Simulate loaded message after a short delay
    setTimeout(() => {
      this.onmessage?.({
        data: {
          status: 'loaded',
          fileId,
        },
      } as MessageEvent)
    }, 50)
  }

  private _handleRun(data: any): void {
    const { audio, language, fileId } = data

    if (!audio || audio.length === 0) {
      // Simulate error for invalid audio
      this.onmessage?.({
        data: {
          status: 'error',
          error: 'Invalid audio data',
          fileId,
        },
      } as MessageEvent)
      return
    }

    // Simulate transcription progress
    this._simulateTranscription(fileId, audio.length)
  }

  private _simulateTranscription(fileId: string, audioLength: number): void {
    const totalSeconds = audioLength / 16000
    const steps = 10

    // Send initial progress
    this.onmessage?.({
      data: {
        status: 'processing_progress',
        fileId,
        processedSeconds: 0,
        totalSeconds,
        estimatedTimeRemaining: totalSeconds,
      },
    } as MessageEvent)

    // Simulate progress updates
    for (let i = 1; i <= steps; i++) {
      setTimeout(() => {
        const processedSeconds = (totalSeconds / steps) * i
        const remaining = totalSeconds - processedSeconds

        this.onmessage?.({
          data: {
            status: 'processing_progress',
            fileId,
            processedSeconds,
            totalSeconds,
            estimatedTimeRemaining: remaining,
          },
        } as MessageEvent)
      }, i * 100)
    }

    // Send complete message
    setTimeout(() => {
      this.onmessage?.({
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
      } as MessageEvent)
    }, (steps + 1) * 100)
  }
}

// Export as default for Worker mock
export default MockWorker
