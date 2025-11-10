# Audio Compressor Tests Summary

## Test Coverage

### Unit Tests

#### 1. CompressionService.test.ts ✅

Tests for the unified compression service with auto-detection.

**Coverage**:

- Environment detection (browser vs Electron)
- Service availability checking
- Singleton pattern behavior
- Compression API
- Resource cleanup
- Error handling

**Test Count**: 12 tests

#### 2. BrowserCompression.test.ts ✅

Tests for browser-based FFmpeg.wasm compression.

**Coverage**:

- Service initialization
- Audio compression with different options
- Multiple codec support (Opus, MP3, AAC)
- Progress tracking
- Error handling
- Concurrent compression
- Resource cleanup

**Test Count**: 15 tests

#### 3. CompressionQueue.test.ts ✅

Tests for queue management and batch processing.

**Coverage**:

- Queue management (add, remove, get status)
- Concurrency control
- Event listeners (progress, complete, error)
- Sequential and parallel processing
- Queue clearing
- Job removal and cancellation

**Test Count**: 18 tests

### Integration Tests

#### 4. NewCompressionFlow.test.ts ✅

End-to-end tests for the complete compression workflow.

**Coverage**:

- Direct compression via `compressAudio()`
- Queue-based compression
- Multiple file handling
- Concurrency limits
- Progress tracking
- Error handling
- Different codec support

**Test Count**: 11 tests

### Legacy Tests (Old Implementation)

The following tests are for the old MediaRecorder-based implementation and
are kept for reference:

- `audioFormatDetector.test.ts` - Format detection utilities
- `audioBufferProcessor.test.ts` - Audio buffer processing
- `mediaRecorderEncoder.test.ts` - MediaRecorder encoding
- `AudioCompressionService.test.ts` - Old service tests

**Note**: These will be archived once the new implementation is fully
integrated.

## Running Tests

### Run All Tests

```bash
cd nextjs-v1
bun test src/features/audioCompressor/__tests__
```

### Run Specific Test Suite

```bash
# Unit tests
bun test src/features/audioCompressor/__tests__/unit/

# Integration tests
bun test src/features/audioCompressor/__tests__/integration/

# Specific file
bun test src/features/audioCompressor/__tests__/unit/CompressionService.test.ts
```

### Run with Coverage

```bash
bun test --coverage src/features/audioCompressor/__tests__
```

### Watch Mode

```bash
bun test --watch src/features/audioCompressor/__tests__
```

## Test Environment

### Mocked Components

**For Browser Tests**:

- `Worker` - Mocked to simulate FFmpeg.wasm worker
- `AudioContext` - Mocked for audio processing
- `MediaRecorder` - Mocked for legacy tests

**For Electron Tests**:

- `ipcRenderer` - Would be mocked for Electron-specific tests
- `ffmpeg` - Native FFmpeg command execution

### Test Utilities

Located in `__tests__/helpers/testUtils.ts`:

- `createTestAudioBuffer()` - Generate test audio buffers
- `audioBufferToBlob()` - Convert audio buffer to blob
- `areAudioBuffersEqual()` - Compare audio buffers
- `getAudioBufferStats()` - Analyze audio buffer
- Mock setup functions

## Expected Test Behavior

### In CI/Test Environment

Most tests will **pass** with mocks, but actual compression won't occur
without full FFmpeg.wasm. Tests are designed to:

1. Verify API contracts
2. Test error handling
3. Validate state management
4. Check concurrent operations

### In Development

With full FFmpeg.wasm loaded:

- Actual compression will occur
- Real progress updates will fire
- File sizes will actually reduce
- Different codecs will produce different outputs

### In Electron

Native FFmpeg tests would require:

- Electron test environment
- FFmpeg installed/bundled
- IPC communication setup

## Test Statistics

**Total Tests**: 56 tests

- Unit Tests: 45 tests
- Integration Tests: 11 tests

**Coverage Goals**:

- Core functionality: >90%
- Edge cases: >80%
- Error paths: >75%

## Known Limitations

1. **FFmpeg.wasm Loading**: Tests use mocks, actual FFmpeg.wasm not loaded
2. **Worker Communication**: Simplified mock responses
3. **Electron Tests**: Require full Electron environment (not yet
   implemented)
4. **Real Audio Files**: Tests use simple blobs, not actual audio files
5. **Performance**: Not tested in CI (requires real compression)

## Future Test Improvements

- [ ] Add Electron-specific tests
- [ ] Test with real audio files (small fixtures)
- [ ] Add performance benchmarks
- [ ] Test memory usage patterns
- [ ] Add visual regression tests for UI components
- [ ] Test compression quality metrics
- [ ] Add stress tests (many concurrent compressions)
- [ ] Test cancellation edge cases

## CI Integration

Tests are designed to run in CI with:

- Bun test runner
- Mocked Worker/AudioContext
- Fast execution (<5 seconds total)
- No external dependencies

### Example CI Command

```bash
bun test --coverage src/features/audioCompressor/__tests__/
```

## Debugging Tests

### Enable Verbose Output

```bash
DEBUG=1 bun test src/features/audioCompressor/__tests__/
```

### Run Single Test

```bash
bun test --test-name-pattern "should compress audio" src/features/audioCompressor/__tests__/
```

### Debug in VSCode

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "bun",
  "runtimeArgs": ["test", "${file}"],
  "skipFiles": ["<node_internals>/**"]
}
```
