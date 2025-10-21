/**
 * Mock BatchWorkerPoolService
 * Provides a simplified mock of the worker pool for testing
 */

// Create a simple mock implementation
export const createMockWorkerPool = () => {
  const workers = new Map()
  let initialized = false

  return {
    async initialize() {
      if (initialized) return true

      // Create 2 mock workers
      workers.set('worker-0', {
        status: 'idle',
        currentFileId: undefined,
        worker: new (global.Worker as any)('mock-url'),
      })
      workers.set('worker-1', {
        status: 'idle',
        currentFileId: undefined,
        worker: new (global.Worker as any)('mock-url'),
      })

      initialized = true
      return true
    },

    getWorkerIds() {
      return Array.from(workers.keys())
    },

    getAvailableWorker() {
      for (const [id, instance] of workers) {
        if ((instance as any).status === 'idle') {
          return id
        }
      }
      return null
    },

    assignWork(workerId: string, fileId: string) {
      const instance = workers.get(workerId)
      if (!instance) return false
      if ((instance as any).status !== 'idle') return false

      ;(instance as any).status = 'busy'
      ;(instance as any).currentFileId = fileId
      return true
    },

    releaseWorker(workerId: string) {
      const instance = workers.get(workerId)
      if (instance) {
        ;(instance as any).status = 'idle'
        ;(instance as any).currentFileId = undefined
      }
    },

    getCurrentFileId(workerId: string) {
      const instance = workers.get(workerId)
      return instance ? (instance as any).currentFileId : undefined
    },

    subscribe(workerId: string, callback: (e: MessageEvent) => void) {
      const instance = workers.get(workerId)
      if (instance) {
        ;(instance as any).worker.onmessage = callback
      }
      return () => {
        if (instance) {
          ;(instance as any).worker.onmessage = null
        }
      }
    },

    postMessage(workerId: string, data: any) {
      const instance = workers.get(workerId)
      if (instance) {
        ;(instance as any).worker.postMessage(data)
      }
    },

    setWorkerStatus(workerId: string, status: string) {
      const instance = workers.get(workerId)
      if (instance) {
        ;(instance as any).status = status
      }
    },

    terminateAll() {
      for (const instance of workers.values()) {
        ;(instance as any).worker.terminate()
      }
      workers.clear()
      initialized = false
    },

    cancelWork(fileId: string) {
      // Find worker processing this file and release it
      for (const [workerId, instance] of workers) {
        if ((instance as any).currentFileId === fileId) {
          this.releaseWorker(workerId)
        }
      }
    },
  }
}
