# Running Audio Compressor Tests

Complete guide for running the audio compressor test suite using Bun.

## Quick Start

```bash
# Navigate to project root
cd nextjs-v1

# Run all audio compressor tests
bun test src/features/audioCompressor

# Or use the shorthand
bun test audioCompressor
```

## Test Commands

### Run All Tests

```bash
# All audio compressor tests
bun test audioCompressor

# All tests in the project
bun test
```

### Run Specific Test Suites

```bash
# Unit tests only
bun test src/features/audioCompressor/__tests__/unit

# Integration tests only
bun test src/features/audioCompressor/__tests__/integration

# Specific test file
bun test src/features/audioCompressor/__tests__/unit/audioFormatDetector.test.ts
```

### Run Tests by Name Pattern

```bash
# Run tests matching a pattern
bun test --test-name-pattern "convertToMono"

# Run all format detector tests
bun test --test-name-pattern "audioFormatDetector"
```

### Watch Mode

```bash
# Watch for changes and re-run tests
bun test --watch audioCompressor

# Watch specific file
bun test --watch src/features/audioCompressor/__tests__/unit/audioFormatDetector.test.ts
```

### Coverage

```bash
# Run with coverage report
bun test --coverage audioCompressor

# Coverage for entire project
bun test --coverage
```

### Verbose Output

```bash
# Show detailed test output
bun test --verbose audioCompressor

# Combine with other options
bun test --verbose --coverage audioCompressor
```

## Test Structure

```
src/features/audioCompressor/__tests__/
├── helpers/
│   └── testUtils.ts                       # Shared utilities
├── unit/
│   ├── audioFormatDetector.test.ts        # 20+ tests
│   ├── audioBufferProcessor.test.ts       # 25+ tests
│   └── mediaRecorderEncoder.test.ts       # 30+ tests
└── integration/
    └── AudioCompressionService.test.ts    # 30+ tests
```

## Running Individual Test Suites

### 1. Format Detector Tests (20+ tests)

```bash
# All format detector tests
bun test src/features/audioCompressor/__tests__/unit/audioFormatDetector.test.ts

# Specific test
bun test --test-name-pattern "detectCompressionCapabilities"
```

**Tests:**

- Browser capability detection
- MIME type selection
- Format identification
- Bitrate estimation
- Skip logic

### 2. Buffer Processor Tests (25+ tests)

```bash
# All buffer processor tests
bun test src/features/audioCompressor/__tests__/unit/audioBufferProcessor.test.ts

# Specific test
bun test --test-name-pattern "convertToMono"
```

**Tests:**

- Audio blob decoding
- Mono conversion
- Buffer creation
- Resampling
- Info formatting

### 3. MediaRecorder Encoder Tests (30+ tests)

```bash
# All encoder tests
bun test src/features/audioCompressor/__tests__/unit/mediaRecorderEncoder.test.ts

# Specific test
bun test --test-name-pattern "encodeAudioBuffer"
```

**Tests:**

- Buffer encoding
- Stream creation
- Stream recording
- Configuration validation

### 4. Integration Tests (30+ tests)

```bash
# All integration tests
bun test src/features/audioCompressor/__tests__/integration/AudioCompressionService.test.ts

# End-to-end workflow tests
bun test --test-name-pattern "End-to-End"
```

**Tests:**

- Full compression pipeline
- Various input formats
- Custom configurations
- Error handling
- Concurrent operations

## Test Timeouts

Tests have a 10-second timeout configured in `bunfig.toml`:

```toml
[test]
timeout = 10000
```

To override for a specific test:

```typescript
it("should handle long audio", async () => {
  // test code
}, 20000); // 20 second timeout
```

## Debugging Tests

### Run Single Test

```bash
# Run only one test file
bun test src/features/audioCompressor/__tests__/unit/audioFormatDetector.test.ts
```

### Enable Console Output

Console logs are visible by default in Bun tests:

```typescript
console.log("Debug info:", data);
```

### Add Breakpoints

Use Bun's debugger:

```bash
bun test --inspect audioCompressor
```

Then attach your debugger (Chrome DevTools or VS Code).

## Test Output Examples

### Successful Run

```
✓ audioFormatDetector > detectCompressionCapabilities > should detect browser capabilities
✓ audioFormatDetector > getBestSupportedFormat > should return a MIME type string or null
✓ audioBufferProcessor > convertToMono > should convert stereo to mono by averaging
...

105 pass
0 fail
Elapsed: 2.5s
```

### Failed Test

```
✗ audioFormatDetector > isAlreadyCompressed > should detect MP3 format
  Expected: true
  Received: false

  at /path/to/test.ts:42:23
```

### Coverage Report

```
---------------------|---------|----------|---------|---------|
File                 | % Stmts | % Branch | % Funcs | % Lines |
---------------------|---------|----------|---------|---------|
audioFormatDetector  |   95.2  |   88.9   |  100.0  |   94.7  |
audioBufferProcessor |   92.3  |   85.7   |   96.4  |   91.8  |
mediaRecorderEncoder |   89.5  |   82.1   |   93.3  |   88.9  |
AudioCompressionService | 87.6  |   79.3   |   88.9  |   86.5  |
---------------------|---------|----------|---------|---------|
All files            |   90.1  |   83.5   |   94.1  |   89.7  |
---------------------|---------|----------|---------|---------|
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Audio Compressor
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test audioCompressor --coverage
```

### Local Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "Running audio compressor tests..."
bun test audioCompressor

if [ $? -ne 0 ]; then
  echo "Tests failed! Commit aborted."
  exit 1
fi
```

## Troubleshooting

### Tests Not Found

```bash
# Make sure you're in the nextjs-v1 directory
cd nextjs-v1

# Check file exists
ls src/features/audioCompressor/__tests__/
```

### Mock Errors

If mocks aren't working:

1. Check `__tests__/setup.ts` is loaded (configured in `bunfig.toml`)
2. Ensure mocks are set up before imports:

```typescript
beforeAll(() => {
  setupMediaRecorderMock();
  setupAudioContextMock();
});
```

### Timeout Errors

For tests that process audio:

```typescript
it("should compress long audio", async () => {
  // test code
}, 15000); // Increase timeout to 15 seconds
```

### TypeScript Errors

```bash
# Check TypeScript configuration
bun run tsc --noEmit

# Verify types are correct
bun test --dry-run audioCompressor
```

## Performance Tips

### Run Tests in Parallel

Bun automatically runs tests in parallel by default.

### Skip Slow Tests During Development

```typescript
it.skip("should handle very long audio", async () => {
  // Skipped during development
});
```

### Focus on Specific Tests

```typescript
it.only("should convert to mono", async () => {
  // Only this test runs
});
```

## Environment Variables

Set environment variables for tests:

```bash
# Enable debug logging
DEBUG=audio-compressor bun test audioCompressor

# Custom test configuration
TEST_AUDIO_FILE=./test-files/test-audio-1.m4a bun test
```

## Best Practices

1. **Run tests before committing**

   ```bash
   bun test audioCompressor
   ```

2. **Check coverage regularly**

   ```bash
   bun test --coverage audioCompressor
   ```

3. **Use watch mode during development**

   ```bash
   bun test --watch audioCompressor
   ```

4. **Run integration tests before deployment**

   ```bash
   bun test src/features/audioCompressor/__tests__/integration
   ```

5. **Keep tests fast**
   - Use short audio samples in tests
   - Mock external dependencies
   - Run slow tests separately

## Quick Reference

| Command                                  | Description     |
| ---------------------------------------- | --------------- |
| `bun test audioCompressor`               | Run all tests   |
| `bun test --watch`                       | Watch mode      |
| `bun test --coverage`                    | With coverage   |
| `bun test --verbose`                     | Detailed output |
| `bun test --test-name-pattern "pattern"` | Filter by name  |
| `bun test file.test.ts`                  | Single file     |

## Example Test Run

```bash
# Terminal output
$ bun test audioCompressor

✓ audioFormatDetector (320ms)
  ✓ detectCompressionCapabilities (5ms)
    ✓ should detect browser capabilities
    ✓ should return supported formats as an array
    ✓ should mark as supported if both APIs available
  ✓ getBestSupportedFormat (3ms)
    ✓ should return a MIME type string or null
    ✓ should honor preferred format if available
  ...

✓ audioBufferProcessor (550ms)
  ✓ decodeAudioBlob (45ms)
    ✓ should decode audio blob to AudioBuffer
    ✓ should handle different sample rates
  ✓ convertToMono (38ms)
    ✓ should convert stereo to mono by averaging
    ✓ should return original data for mono buffer
  ...

✓ mediaRecorderEncoder (890ms)
  ✓ encodeAudioBuffer (120ms)
    ✓ should encode AudioBuffer to Blob
    ✓ should handle different bitrates
  ...

✓ AudioCompressionService (1450ms)
  ✓ compressAudio (980ms)
    ✓ should compress audio blob successfully
    ✓ should reduce file size significantly
    ✓ should handle mono audio
  ...

105 pass
0 fail
15 skip
Elapsed: 3.2s
```

## Additional Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Audio Compressor README](./README.md)
- [Project Test Setup](./../../../__tests__/setup.ts)
- [Bun Configuration](../../../bunfig.toml)

---

**Need help?** Open an issue or check the test output for detailed error
messages.
