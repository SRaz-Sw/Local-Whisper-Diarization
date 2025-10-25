/**
 * BatchFileUpload - Duplicate Handling Tests
 * 
 * Tests the new non-blocking duplicate file handling functionality
 * that replaces the blocking window.confirm() dialog.
 */

import { describe, test, expect, beforeEach, vi } from 'bun:test'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BatchFileUpload } from '@/app/web-transc/components/BatchFileUpload'
import { useBatchStore } from '@/app/web-transc/store/useBatchStore'
import { useTranscripts } from '@/app/web-transc/hooks/useTranscripts'
import { resetStores } from '../../helpers/testUtils'
import { createMockAudioFile } from '../../mocks/audioData'

// Mock the toast functionality
vi.mock('sonner', () => ({
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock the hooks
vi.mock('@/app/web-transc/hooks/useTranscripts', () => ({
  useTranscripts: vi.fn(),
}))

vi.mock('@/app/web-transc/store/useBatchStore', () => ({
  useBatchStore: vi.fn(),
}))

vi.mock('@/app/web-transc/store/useWhisperStore', () => ({
  useWhisperStore: vi.fn(),
}))

vi.mock('@/app/web-transc/store/useRouterStore', () => ({
  useRouterStore: vi.fn(),
}))

describe('BatchFileUpload - Duplicate Handling', () => {
  const mockAddFiles = vi.fn()
  const mockFindDuplicateByFileName = vi.fn()

  beforeEach(() => {
    resetStores()
    vi.clearAllMocks()
    
    // Setup default mock implementations
    ;(useBatchStore as any).mockReturnValue({
      files: [],
      addFiles: mockAddFiles,
      removeFile: vi.fn(),
      cancelFile: vi.fn(),
      retryFile: vi.fn(),
      pauseBatch: vi.fn(),
      resumeBatch: vi.fn(),
      clearCompleted: vi.fn(),
      clearAll: vi.fn(),
      reorderFiles: vi.fn(),
      setIsDragging: vi.fn(),
      setComponentInitialized: vi.fn(),
    })

    ;(useTranscripts as any).mockReturnValue({
      transcripts: [],
      findDuplicateByFileName: mockFindDuplicateByFileName,
    })

    ;(useWhisperStore as any).mockReturnValue({
      model: { model: 'base', device: 'cpu' },
      setModel: vi.fn(),
    })

    ;(useRouterStore as any).mockReturnValue({
      navigate: vi.fn(),
    })
  })

  test('should add non-duplicate files immediately', () => {
    // Arrange
    const nonDuplicateFile = createMockAudioFile('new-file.mp3', 10)
    const duplicateFile = createMockAudioFile('existing-file.mp3', 10)
    
    mockFindDuplicateByFileName
      .mockReturnValueOnce(null) // nonDuplicateFile is not a duplicate
      .mockReturnValueOnce({ id: 'existing-transcript' }) // duplicateFile is a duplicate

    render(<BatchFileUpload />)

    // Act - simulate file selection
    const fileInput = screen.getByRole('button', { name: /select files/i })
    const mockFileList = {
      0: nonDuplicateFile,
      1: duplicateFile,
      length: 2,
      item: (index: number) => (index === 0 ? nonDuplicateFile : duplicateFile),
    } as FileList

    fireEvent.change(fileInput, { target: { files: mockFileList } })

    // Assert
    expect(mockAddFiles).toHaveBeenCalledWith([nonDuplicateFile])
    expect(mockAddFiles).toHaveBeenCalledTimes(1)
  })

  test('should show toast notification for duplicate files', () => {
    // Arrange
    const { toast } = require('sonner')
    const duplicateFile = createMockAudioFile('existing-file.mp3', 10)
    
    mockFindDuplicateByFileName.mockReturnValue({ id: 'existing-transcript' })

    render(<BatchFileUpload />)

    // Act - simulate file selection with duplicate
    const fileInput = screen.getByRole('button', { name: /select files/i })
    const mockFileList = {
      0: duplicateFile,
      length: 1,
      item: (index: number) => duplicateFile,
    } as FileList

    fireEvent.change(fileInput, { target: { files: mockFileList } })

    // Assert
    expect(toast.custom).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        duration: 15000,
        position: 'top-center',
      })
    )
  })

  test('should handle mixed duplicate and non-duplicate files', () => {
    // Arrange
    const { toast } = require('sonner')
    const nonDuplicateFile1 = createMockAudioFile('new-file-1.mp3', 10)
    const nonDuplicateFile2 = createMockAudioFile('new-file-2.mp3', 10)
    const duplicateFile1 = createMockAudioFile('existing-file-1.mp3', 10)
    const duplicateFile2 = createMockAudioFile('existing-file-2.mp3', 10)
    
    mockFindDuplicateByFileName
      .mockReturnValueOnce(null) // nonDuplicateFile1
      .mockReturnValueOnce(null) // nonDuplicateFile2
      .mockReturnValueOnce({ id: 'existing-transcript-1' }) // duplicateFile1
      .mockReturnValueOnce({ id: 'existing-transcript-2' }) // duplicateFile2

    render(<BatchFileUpload />)

    // Act
    const fileInput = screen.getByRole('button', { name: /select files/i })
    const mockFileList = {
      0: nonDuplicateFile1,
      1: nonDuplicateFile2,
      2: duplicateFile1,
      3: duplicateFile2,
      length: 4,
      item: (index: number) => [nonDuplicateFile1, nonDuplicateFile2, duplicateFile1, duplicateFile2][index],
    } as FileList

    fireEvent.change(fileInput, { target: { files: mockFileList } })

    // Assert
    expect(mockAddFiles).toHaveBeenCalledWith([nonDuplicateFile1, nonDuplicateFile2])
    expect(toast.custom).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        duration: 15000,
        position: 'top-center',
      })
    )
  })

  test('should not show toast when no duplicates are found', () => {
    // Arrange
    const { toast } = require('sonner')
    const nonDuplicateFile = createMockAudioFile('new-file.mp3', 10)
    
    mockFindDuplicateByFileName.mockReturnValue(null)

    render(<BatchFileUpload />)

    // Act
    const fileInput = screen.getByRole('button', { name: /select files/i })
    const mockFileList = {
      0: nonDuplicateFile,
      length: 1,
      item: (index: number) => nonDuplicateFile,
    } as FileList

    fireEvent.change(fileInput, { target: { files: mockFileList } })

    // Assert
    expect(toast.custom).not.toHaveBeenCalled()
    expect(mockAddFiles).toHaveBeenCalledWith([nonDuplicateFile])
  })
})
