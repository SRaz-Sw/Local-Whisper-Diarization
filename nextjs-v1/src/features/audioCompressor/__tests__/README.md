# Audio Compressor Tests

Comprehensive test suite for the audio compression feature.

## Structure

```
__tests__/
├── helpers/
│   └── testUtils.ts              # Test utilities and mocks
├── unit/
│   ├── audioFormatDetector.test.ts    # Format detection tests
│   ├── audioBufferProcessor.test.ts   # Buffer processing tests
│   └── mediaRecorderEncoder.test.ts   # Encoder tests
└── integration/
    └── AudioCompressionService.test.ts # End-to-end tests
```

## Running Tests

### Run all tests

```bash
npm test audioCompressor
# or
bun test audioCompressor
```

### Run specific test suite

```bash
npm test audioFormatDetector
npm test audioBufferProcessor
npm test mediaRecorderEncoder
npm test AudioCompressionService
```

### Run with coverage

```bash
npm test -- --coverage audioCompressor
```

### Watch mode

```bash
npm test -- --watch audioCompressor
```

## Test Suites

### Unit Tests

#### audioFormatDetector.test.ts

Tests browser capability detection and format checking.

**Coverage:**

- `detectCompressionCapabilities()` - Browser support detection
- `getBestSupportedFormat()` - Optimal MIME type selection
- `isAlreadyCompressed()` - Format identification
- `estimateBitrate()` - Bitrate calculation
- `shouldSkipCompression()` - Smart skip logic
- `isCompressionAvailable()` - Quick availability check

**Test Cases:** 20+

#### audioBufferProcessor.test.ts

Tests audio buffer manipulation and processing.

**Coverage:**

- `decodeAudioBlob()` - Blob to AudioBuffer decoding
- `convertToMono()` - Multi-channel to mono conversion
- `createAudioBufferFromData()` - Buffer creation from samples
- `createProcessedBuffer()` - Resampling and conversion
- `getAudioBufferInfo()` - Buffer information formatting

**Test Cases:** 25+

#### mediaRecorderEncoder.test.ts

Tests MediaRecorder-based encoding functionality.

**Coverage:**

- `encodeAudioBuffer()` - Buffer to Opus/WebM encoding
- `createMediaStreamFromBuffer()` - Stream creation
- `recordMediaStream()` - Stream recording
- `validateEncoderConfig()` - Configuration validation

**Test Cases:** 30+

### Integration Tests

#### AudioCompressionService.test.ts

End-to-end tests for the complete compression workflow.

**Coverage:**

- Full compression pipeline
- Various audio formats (WAV, MP3, AAC, WebM, Opus)
- Different configurations (sample rates, bitrates, channels)
- Error handling and fallbacks
- Skip logic for already-compressed audio
- Concurrent compressions
- Real-world scenarios

**Test Cases:** 30+

## Test Utilities

### testUtils.ts

Provides helper functions and mocks for testing:

**Audio Generation:**

- `createTestAudioBuffer()` - Generate sine wave audio
- `audioBufferToBlob()` - Convert buffer to blob
- `loadTestAudioBlob()` - Load test audio files

**Audio Analysis:**

- `areAudioBuffersEqual()` - Compare buffers
- `getAudioBufferStats()` - Calculate RMS and peak values

**Mocks:**

- `setupMediaRecorderMock()` - Mock MediaRecorder API
- `setupAudioContextMock()` - Mock Web Audio API

**Utilities:**

- `wait()` - Async delay helper

## Test Audio Files

Test audio files are available in:

```
test-files/test-audio-1.m4a
```

## Browser vs Node.js

Tests include mocks for Node.js environments where Web APIs are not
available:

- Mock MediaRecorder for recording functionality
- Mock AudioContext for audio processing
- Mock OfflineAudioContext for offline rendering

In browser environments, tests use real APIs for more accurate results.

## Coverage Goals

- **Unit Tests:** 90%+ coverage per utility
- **Integration Tests:** 80%+ coverage for main service
- **Overall:** 85%+ coverage for entire feature

## Common Test Scenarios

### 1. Basic Compression

```typescript
const buffer = createTestAudioBuffer(1, 440, 16000, 1);
const blob = await audioBufferToBlob(buffer);
const compressed = await compressAudio(blob);
```

### 2. Mono Conversion

```typescript
const compressed = await compressAudio(stereoBlob, {
  isConvertingToMono: true,
});
```

### 3. Custom Bitrate

```typescript
const compressed = await compressAudio(blob, {
  bitrate: 16, // 16 kbps
});
```

### 4. Error Handling

```typescript
const invalidBlob = new Blob(["invalid"], { type: "audio/wav" });
const result = await compressAudio(invalidBlob);
// Should return original blob on error
```

## Troubleshooting

### Tests Failing in Node.js

Ensure mocks are properly set up in `beforeAll()`:

```typescript
beforeAll(() => {
  setupMediaRecorderMock();
  setupAudioContextMock();
});
```

### Tests Timing Out

Increase test timeout for longer audio files:

```typescript
it("should compress long audio", async () => {
  // ...
}, 10000); // 10 second timeout
```

### Mock Issues

If mocks aren't working, verify they're called before importing modules:

```typescript
import { setupMediaRecorderMock } from "../helpers/testUtils";
setupMediaRecorderMock();
import { compressAudio } from "../../services/AudioCompressionService";
```

## Writing New Tests

### Unit Test Template

```typescript
describe('myFunction', () => {
  it('should do something', () => {
    const input = /* ... */;
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Integration Test Template

```typescript
describe("End-to-End Feature", () => {
  it("should complete workflow", async () => {
    // 1. Setup
    const input = createTestData();

    // 2. Execute
    const result = await performAction(input);

    // 3. Verify
    expect(result).toMatchExpectedOutput();
  });
});
```

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:

- On every pull request
- On main branch commits
- Before deployments

Required checks:

- ✅ All tests pass
- ✅ Coverage thresholds met
- ✅ No console errors (except expected)

## Performance Benchmarks

Typical test execution times:

- Unit tests: ~500ms total
- Integration tests: ~2-5 seconds total
- Full suite: ~6 seconds

## Contributing

When adding new features:

1. Write unit tests for new utilities
2. Add integration tests for workflows
3. Update test documentation
4. Ensure coverage remains above 85%
5. Run full test suite before committing

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Web Audio API Testing](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Testing)
- [MediaRecorder Testing Best Practices](https://web.dev/media-recorder/)
