/**
 * Mock Audio Data Utilities
 * Provides helper functions to create mock audio buffers and files for testing
 */

export const createMockAudioBuffer = (duration: number = 10): Float32Array => {
  const sampleRate = 16000
  const samples = duration * sampleRate
  const buffer = new Float32Array(samples)

  // Generate sine wave (440 Hz A note)
  for (let i = 0; i < samples; i++) {
    buffer[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.3
  }

  return buffer
}

export const createMockAudioFile = (
  name: string,
  duration: number = 10,
): File => {
  const buffer = createMockAudioBuffer(duration)
  const blob = new Blob([buffer.buffer], { type: 'audio/wav' })
  const file = new File([blob], name, { type: 'audio/wav', lastModified: Date.now() })

  // Add arrayBuffer method that the store needs for duration extraction
  Object.defineProperty(file, 'arrayBuffer', {
    value: () => Promise.resolve(buffer.buffer),
    writable: false,
  })

  return file
}

export const createMockAudioFiles = (count: number): File[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockAudioFile(`file${i + 1}.mp3`, 10),
  )
}
