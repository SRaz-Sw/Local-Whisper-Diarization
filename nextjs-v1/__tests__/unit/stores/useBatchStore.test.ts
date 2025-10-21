/**
 * useBatchStore - Zustand State Management Tests
 */

import { useBatchStore } from '@/app/web-transc/store/useBatchStore'
import { resetStores } from '../../helpers/testUtils'
import { createMockAudioFile } from '../../mocks/audioData'

describe('useBatchStore - File Management', () => {
  beforeEach(() => {
    resetStores()
  })

  test('should add files to queue with correct initial state', () => {
    const files = [createMockAudioFile('test1.mp3', 10)]
    const { addFiles } = useBatchStore.getState()

    addFiles(files)

    const state = useBatchStore.getState()
    expect(state.files).toHaveLength(1)
    expect(state.files[0].status).toBe('queued')
    expect(state.files[0].progress).toBe(0)
    expect(state.files[0].fileName).toBe('test1.mp3')
    expect(state.files[0].retryCount).toBe(0)
  })

  test('should remove file from queue', () => {
    const files = [createMockAudioFile('test1.mp3', 10)]
    const { addFiles, removeFile } = useBatchStore.getState()

    addFiles(files)
    const fileId = useBatchStore.getState().files[0].id

    removeFile(fileId)

    expect(useBatchStore.getState().files).toHaveLength(0)
  })

  test('should cancel file and update counters', () => {
    const files = [createMockAudioFile('test1.mp3', 10)]
    const { addFiles, cancelFile } = useBatchStore.getState()

    addFiles(files)
    const fileId = useBatchStore.getState().files[0].id

    cancelFile(fileId)

    const state = useBatchStore.getState()
    expect(state.files[0].status).toBe('cancelled')
    expect(state.totalCancelled).toBe(1)
  })

  test('should retry failed file and increment retry count', () => {
    const files = [createMockAudioFile('test1.mp3', 10)]
    const { addFiles, setFileStatus, retryFile } = useBatchStore.getState()

    addFiles(files)

    // Wait for file to be added
    const fileId = useBatchStore.getState().files[0]?.id
    expect(fileId).toBeDefined()

    // Mark as error
    setFileStatus(fileId, 'error', 'Test error')

    // Retry
    retryFile(fileId)

    const file = useBatchStore.getState().files[0]
    expect(file.status).toBe('queued')
    expect(file.retryCount).toBe(1) // Increments on retry
    expect(file.error).toBeUndefined()
  })

  test('should update file progress', () => {
    const files = [createMockAudioFile('test1.mp3', 10)]
    const { addFiles, updateFileProgress } = useBatchStore.getState()

    addFiles(files)
    const fileId = useBatchStore.getState().files[0].id

    updateFileProgress(fileId, 50)

    expect(useBatchStore.getState().files[0].progress).toBe(50)
  })

  test('should update file estimated time', () => {
    const files = [createMockAudioFile('test1.mp3', 10)]
    const { addFiles, updateFileEstimatedTime } = useBatchStore.getState()

    addFiles(files)
    const fileId = useBatchStore.getState().files[0].id

    updateFileEstimatedTime(fileId, 120)

    expect(useBatchStore.getState().files[0].estimatedTimeRemaining).toBe(120)
  })

  test('should set file status with optional error and transcriptId', () => {
    const files = [createMockAudioFile('test1.mp3', 10)]
    const { addFiles, setFileStatus } = useBatchStore.getState()

    addFiles(files)
    const fileId = useBatchStore.getState().files[0].id

    setFileStatus(fileId, 'error', 'Decode failed', undefined)

    const file = useBatchStore.getState().files[0]
    expect(file.status).toBe('error')
    expect(file.error).toBe('Decode failed')
  })

  test('should clear completed files only', () => {
    const files = [
      createMockAudioFile('test1.mp3', 10),
      createMockAudioFile('test2.mp3', 10),
      createMockAudioFile('test3.mp3', 10),
    ]
    const { addFiles, setFileStatus, clearCompleted } = useBatchStore.getState()

    addFiles(files)

    const ids = useBatchStore.getState().files.map(f => f.id)

    // Mark first two as completed
    setFileStatus(ids[0], 'completed', undefined, 'transcript-1')
    setFileStatus(ids[1], 'completed', undefined, 'transcript-2')
    // Third is still queued

    clearCompleted()

    const state = useBatchStore.getState()
    expect(state.files).toHaveLength(1)
    expect(state.files[0].id).toBe(ids[2])
  })

  test('should clear all files and reset state', () => {
    const files = [createMockAudioFile('test1.mp3', 10)]
    const { addFiles, clearAll } = useBatchStore.getState()

    addFiles(files)
    clearAll()

    const state = useBatchStore.getState()
    expect(state.files).toHaveLength(0)
    expect(state.processingCount).toBe(0)
    expect(state.totalCompleted).toBe(0)
    expect(state.totalFailed).toBe(0)
    expect(state.totalCancelled).toBe(0)
  })
})

describe('useBatchStore - Queue State', () => {
  beforeEach(() => {
    resetStores()
  })

  test('should get queued files only', () => {
    const files = [
      createMockAudioFile('test1.mp3', 10),
      createMockAudioFile('test2.mp3', 10),
      createMockAudioFile('test3.mp3', 10),
    ]
    const { addFiles, setFileStatus, getQueuedFiles } = useBatchStore.getState()

    addFiles(files)

    const ids = useBatchStore.getState().files.map(f => f.id)

    setFileStatus(ids[0], 'processing')
    setFileStatus(ids[1], 'completed', undefined, 'transcript-1')
    // Third is queued

    const queued = getQueuedFiles()

    expect(queued).toHaveLength(1)
    expect(queued[0].id).toBe(ids[2])
  })

  test('should get processing files only', () => {
    const files = [
      createMockAudioFile('test1.mp3', 10),
      createMockAudioFile('test2.mp3', 10),
    ]
    const { addFiles, setFileStatus, getProcessingFiles } = useBatchStore.getState()

    addFiles(files)

    const ids = useBatchStore.getState().files.map(f => f.id)

    setFileStatus(ids[0], 'processing')

    const processing = getProcessingFiles()

    expect(processing).toHaveLength(1)
    expect(processing[0].id).toBe(ids[0])
  })

  test('should check if can start processing', () => {
    const { addFiles, setMaxConcurrentFiles, incrementProcessingCount, canStartProcessing } =
      useBatchStore.getState()

    // Add queued files (required for canStartProcessing)
    addFiles([createMockAudioFile('test1.mp3'), createMockAudioFile('test2.mp3')])

    setMaxConcurrentFiles(2)

    expect(canStartProcessing()).toBe(true)

    incrementProcessingCount()
    expect(canStartProcessing()).toBe(true)

    incrementProcessingCount()
    expect(canStartProcessing()).toBe(false)
  })

  test('should increment/decrement processing count', () => {
    const { setMaxConcurrentFiles, incrementProcessingCount, decrementProcessingCount } =
      useBatchStore.getState()

    // Set max to allow incrementing
    setMaxConcurrentFiles(5)

    incrementProcessingCount()
    expect(useBatchStore.getState().processingCount).toBe(1)

    incrementProcessingCount()
    expect(useBatchStore.getState().processingCount).toBe(2)

    decrementProcessingCount()
    expect(useBatchStore.getState().processingCount).toBe(1)
  })

  test('should pause/resume batch processing', () => {
    const { pauseBatch, resumeBatch } = useBatchStore.getState()

    pauseBatch()
    expect(useBatchStore.getState().isPaused).toBe(true)

    resumeBatch()
    expect(useBatchStore.getState().isPaused).toBe(false)
  })
})

describe('useBatchStore - Processing File Tracking', () => {
  beforeEach(() => {
    resetStores()
  })

  test('should set and get processing file with workerId', () => {
    const { setProcessingFile, getProcessingFileWorker } = useBatchStore.getState()

    setProcessingFile('file-123', 'worker-0')

    const workerId = getProcessingFileWorker('file-123')
    expect(workerId).toBe('worker-0')
  })

  test('should remove processing file', () => {
    const { setProcessingFile, removeProcessingFile, getProcessingFileWorker } =
      useBatchStore.getState()

    setProcessingFile('file-123', 'worker-0')
    removeProcessingFile('file-123')

    const workerId = getProcessingFileWorker('file-123')
    expect(workerId).toBeUndefined()
  })
})
