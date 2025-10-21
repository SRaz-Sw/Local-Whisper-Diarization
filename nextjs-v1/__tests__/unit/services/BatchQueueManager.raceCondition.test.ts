/**
 * BatchQueueManager - Race Condition Prevention Tests (HIGHEST PRIORITY)
 *
 * These tests validate the fix for the critical file-skipping bug where
 * even-numbered files were marked complete without processing.
 *
 * Bug Description:
 * When File 1 completed, delayed "complete" messages would arrive after
 * the worker was reassigned to File 2, causing File 2 to be incorrectly
 * marked as complete.
 *
 * Fix:
 * All worker messages now include fileId, and the manager uses message.fileId
 * instead of looking up the current worker assignment.
 */

import { batchQueueManager } from '@/app/web-transc/services/BatchQueueManager'
import { batchWorkerPool } from '@/app/web-transc/services/BatchWorkerPoolService'
import { useBatchStore } from '@/app/web-transc/store/useBatchStore'
import { resetStores, waitForCondition } from '../../helpers/testUtils'
import { createMockAudioFiles } from '../../mocks/audioData'
import { MockWorker } from '../../mocks/worker'

// Mock the worker
global.Worker = MockWorker as any

describe('BatchQueueManager - Race Condition Prevention', () => {
  beforeEach(() => {
    resetStores()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    batchQueueManager.terminate()
  })

  test('should include fileId in load messages sent to worker', async () => {
    const postMessageSpy = jest.spyOn(MockWorker.prototype, 'postMessage')

    await batchQueueManager.initialize()

    const files = createMockAudioFiles(1)
    useBatchStore.getState().addFiles(files)

    await batchQueueManager.start()

    // Wait for load message
    await waitForCondition(
      () => postMessageSpy.mock.calls.some(call => call[0]?.type === 'load'),
      2000,
    )

    // Find the load message call
    const loadCall = postMessageSpy.mock.calls.find(
      call => call[0]?.type === 'load',
    )

    expect(loadCall).toBeDefined()
    expect(loadCall![0].data.fileId).toBeDefined()
    expect(typeof loadCall![0].data.fileId).toBe('string')
  })

  test('should include fileId in run messages sent to worker', async () => {
    const postMessageSpy = jest.spyOn(MockWorker.prototype, 'postMessage')

    await batchQueueManager.initialize()

    const files = createMockAudioFiles(1)
    useBatchStore.getState().addFiles(files)

    await batchQueueManager.start()

    // Wait for run message
    await waitForCondition(
      () => postMessageSpy.mock.calls.some(call => call[0]?.type === 'run'),
      3000,
    )

    // Find the run message call
    const runCall = postMessageSpy.mock.calls.find(
      call => call[0]?.type === 'run',
    )

    expect(runCall).toBeDefined()
    expect(runCall![0].data.fileId).toBeDefined()
    expect(typeof runCall![0].data.fileId).toBe('string')
  })

  test('should handle delayed "complete" messages correctly', async () => {
    await batchQueueManager.initialize()

    const files = createMockAudioFiles(2)
    const store = useBatchStore.getState()
    store.addFiles(files)

    // Wait for files to be added (addFiles is async)
    await waitForCondition(() => useBatchStore.getState().files.length === 2, 2000)

    const file1Id = store.files[0].id
    const file2Id = store.files[1].id

    await batchQueueManager.start()

    // Wait for File 1 to complete
    await waitForCondition(
      () => {
        const f1 = useBatchStore.getState().files.find(f => f.id === file1Id)
        return f1?.status === 'completed'
      },
      5000,
    )

    // File 1 should be completed
    const file1 = useBatchStore.getState().files.find(f => f.id === file1Id)
    expect(file1?.status).toBe('completed')

    // File 2 should still be processing (not marked complete by delayed message)
    const file2 = useBatchStore.getState().files.find(f => f.id === file2Id)
    expect(file2?.status).not.toBe('completed')
    expect(['queued', 'processing']).toContain(file2?.status)
  })

  test('should process even-numbered files correctly (critical regression test)', async () => {
    await batchQueueManager.initialize()

    // Upload 6 files to test files 2, 4, 6
    const files = createMockAudioFiles(6)
    useBatchStore.getState().addFiles(files)

    await batchQueueManager.start()

    // Wait for all files to complete
    await waitForCondition(
      () => useBatchStore.getState().totalCompleted === 6,
      30000,
    )

    const state = useBatchStore.getState()

    // Verify ALL files completed
    expect(state.totalCompleted).toBe(6)
    expect(state.files.every(f => f.status === 'completed')).toBe(true)

    // Specific check for even-numbered files
    const file2 = state.files[1]
    const file4 = state.files[3]
    const file6 = state.files[5]

    expect(file2.status).toBe('completed')
    expect(file4.status).toBe('completed')
    expect(file6.status).toBe('completed')

    // Verify they all have transcript IDs (proof they were processed)
    expect(file2.transcriptId).toBeDefined()
    expect(file4.transcriptId).toBeDefined()
    expect(file6.transcriptId).toBeDefined()

    // Verify unique transcripts (not duplicates from odd-numbered files)
    expect(file2.transcriptId).not.toBe(state.files[0].transcriptId)
    expect(file4.transcriptId).not.toBe(state.files[2].transcriptId)
    expect(file6.transcriptId).not.toBe(state.files[4].transcriptId)
  })

  test('should handle model loading progress messages with fileId', async () => {
    let loadingMessageReceived = false
    let hasFileId = false

    // Mock worker to capture loading messages
    const originalWorker = global.Worker
    global.Worker = class extends MockWorker {
      postMessage(data: any) {
        super.postMessage(data)

        // Simulate model loading progress message
        if (data.type === 'load') {
          setTimeout(() => {
            this.onmessage?.({
              data: {
                status: 'progress',
                file: 'model.bin',
                progress: 50,
                loaded: 500,
                total: 1000,
                fileId: data.data.fileId,
              },
            } as MessageEvent)

            loadingMessageReceived = true
            hasFileId = !!data.data.fileId
          }, 20)
        }
      }
    } as any

    await batchQueueManager.initialize()

    const files = createMockAudioFiles(1)
    useBatchStore.getState().addFiles(files)

    await batchQueueManager.start()

    // Wait for loading message
    await waitForCondition(() => loadingMessageReceived, 2000)

    expect(loadingMessageReceived).toBe(true)
    expect(hasFileId).toBe(true)

    // Restore original Worker
    global.Worker = originalWorker
  })

  test('should not misattribute messages when worker is reassigned', async () => {
    await batchQueueManager.initialize()

    const files = createMockAudioFiles(3)
    const store = useBatchStore.getState()
    store.addFiles(files)

    // Wait for files to be added
    await waitForCondition(() => store.files.length === 3, 1000)

    const file1Id = store.files[0].id
    const file2Id = store.files[1].id
    const file3Id = store.files[2].id

    await batchQueueManager.start()

    // Wait for all files to complete
    await waitForCondition(
      () => useBatchStore.getState().totalCompleted === 3,
      15000,
    )

    const finalState = useBatchStore.getState()

    // All files should have their own unique transcripts
    const file1 = finalState.files.find(f => f.id === file1Id)
    const file2 = finalState.files.find(f => f.id === file2Id)
    const file3 = finalState.files.find(f => f.id === file3Id)

    expect(file1?.transcriptId).toBeDefined()
    expect(file2?.transcriptId).toBeDefined()
    expect(file3?.transcriptId).toBeDefined()

    // Transcripts should be unique
    const transcriptIds = new Set([
      file1?.transcriptId,
      file2?.transcriptId,
      file3?.transcriptId,
    ])
    expect(transcriptIds.size).toBe(3) // All unique
  })
})
