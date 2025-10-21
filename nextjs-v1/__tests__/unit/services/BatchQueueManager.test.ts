/**
 * BatchQueueManager - Core Functionality Tests
 */

import { batchQueueManager } from '@/app/web-transc/services/BatchQueueManager'
import { useBatchStore } from '@/app/web-transc/store/useBatchStore'
import { resetStores, waitForCondition } from '../../helpers/testUtils'
import { createMockAudioFiles } from '../../mocks/audioData'
import { MockWorker } from '../../mocks/worker'

global.Worker = MockWorker as any

describe('BatchQueueManager - Initialization & Lifecycle', () => {
  beforeEach(() => {
    resetStores()
    jest.clearAllMocks()
  })

  afterEach(() => {
    batchQueueManager.terminate()
  })

  test('should initialize worker pool successfully', async () => {
    const result = await batchQueueManager.initialize()

    expect(result).toBe(true)
    expect(useBatchStore.getState().isQueueInitialized).toBe(true)
  })

  test('should prevent re-initialization', async () => {
    await batchQueueManager.initialize()
    const result = await batchQueueManager.initialize()

    expect(result).toBe(true)
    // Should still be initialized without errors
    expect(useBatchStore.getState().isQueueInitialized).toBe(true)
  })

  test('should cleanup on terminate', () => {
    batchQueueManager.terminate()

    const state = useBatchStore.getState()
    expect(state.isQueueRunning).toBe(false)
    expect(state.isQueueInitialized).toBe(false)
  })
})

describe('BatchQueueManager - Queue Processing', () => {
  beforeEach(async () => {
    resetStores()
    jest.clearAllMocks()
    await batchQueueManager.initialize()
  })

  afterEach(() => {
    batchQueueManager.terminate()
  })

  test('should start queue processing', async () => {
    const onComplete = jest.fn()

    useBatchStore.getState().addFiles(createMockAudioFiles(1))
    await batchQueueManager.start(onComplete)

    expect(useBatchStore.getState().isQueueRunning).toBe(true)
  })

  test('should prevent starting queue twice', async () => {
    const consoleSpy = jest.spyOn(console, 'log')

    useBatchStore.getState().addFiles(createMockAudioFiles(1))
    await batchQueueManager.start()
    await batchQueueManager.start()

    // Should log "already running" warning
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('already running'),
    )
  })

  test('should call completion callback when queue finishes', async () => {
    const onComplete = jest.fn()

    useBatchStore.getState().addFiles(createMockAudioFiles(2))
    await batchQueueManager.start(onComplete)

    // Wait for completion
    await waitForCondition(
      () => useBatchStore.getState().totalCompleted === 2,
      10000,
    )

    // Wait a bit for callback to be called
    await new Promise(resolve => setTimeout(resolve, 1000))

    expect(onComplete).toHaveBeenCalled()
  })

  test('should handle pause correctly', async () => {
    useBatchStore.getState().addFiles(createMockAudioFiles(3))
    await batchQueueManager.start()

    // Wait for first file to start
    await waitForCondition(
      () => useBatchStore.getState().processingCount > 0,
      2000,
    )

    batchQueueManager.pause()

    expect(useBatchStore.getState().isPaused).toBe(true)
  })

  test('should handle resume correctly', async () => {
    useBatchStore.getState().addFiles(createMockAudioFiles(2))
    await batchQueueManager.start()

    batchQueueManager.pause()
    expect(useBatchStore.getState().isPaused).toBe(true)

    batchQueueManager.resume()
    expect(useBatchStore.getState().isPaused).toBe(false)
  })
})

describe('BatchQueueManager - File Processing', () => {
  beforeEach(async () => {
    resetStores()
    jest.clearAllMocks()
    await batchQueueManager.initialize()
  })

  afterEach(() => {
    batchQueueManager.terminate()
  })

  test('should process file and update progress', async () => {
    useBatchStore.getState().addFiles(createMockAudioFiles(1))

    await batchQueueManager.start()

    // Wait for progress updates
    await waitForCondition(
      () => {
        const file = useBatchStore.getState().files[0]
        return file && file.progress > 0
      },
      3000,
    )

    const file = useBatchStore.getState().files[0]
    expect(file.progress).toBeGreaterThan(0)
  })

  test('should save transcript on completion', async () => {
    useBatchStore.getState().addFiles(createMockAudioFiles(1))

    await batchQueueManager.start()

    // Wait for completion
    await waitForCondition(
      () => useBatchStore.getState().files[0]?.status === 'completed',
      5000,
    )

    const file = useBatchStore.getState().files[0]
    expect(file.status).toBe('completed')
    expect(file.transcriptId).toBeDefined()
  })

  test('should handle multiple files sequentially', async () => {
    useBatchStore.getState().setMaxConcurrentFiles(1)
    useBatchStore.getState().addFiles(createMockAudioFiles(3))

    await batchQueueManager.start()

    // Wait for all to complete
    await waitForCondition(
      () => useBatchStore.getState().totalCompleted === 3,
      15000,
    )

    expect(useBatchStore.getState().totalCompleted).toBe(3)
    expect(useBatchStore.getState().files.every(f => f.status === 'completed')).toBe(true)
  })
})
