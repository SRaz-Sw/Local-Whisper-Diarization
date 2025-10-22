# Batch Upload Test Suite

## Overview
Comprehensive test suite for the batch upload feature, including critical regression tests for the file-skipping bug fix.

## Test Structure

```
__tests__/
├── unit/                    # Unit tests for individual modules
│   ├── services/           # BatchQueueManager, BatchWorkerPoolService
│   ├── stores/             # Zustand stores (useBatchStore)
│   ├── components/         # React components
│   └── workers/            # Web Worker tests
├── integration/            # Integration tests for complete workflows
├── helpers/                # Test utilities and helpers
│   └── testUtils.tsx       # Common test helpers
└── mocks/                  # Mock implementations
    ├── audioData.ts        # Mock audio buffer/file generators
    └── worker.ts           # Mock Web Worker

```

## Running Tests

### All Tests
```bash
bun test
```

### Watch Mode (for development)
```bash
bun test --watch
```

### Unit Tests Only
```bash
bun test __tests__/unit
```

### Integration Tests Only
```bash
bun test __tests__/integration
```

### Coverage Report
```bash
bun test --coverage
```

### CI Mode
```bash
bun test --coverage
```

## Test Priority

### P0 - Critical (MUST PASS)
- **Race Condition Tests** (`BatchQueueManager.raceCondition.test.ts`)
  - Validates fix for file-skipping bug
  - Ensures even-numbered files are actually processed
  - Tests worker reassignment scenarios

### P1 - High Priority
- **BatchQueueManager Core Tests** (`BatchQueueManager.test.ts`)
- **useBatchStore Tests** (`useBatchStore.test.ts`)
- **BatchWorkerPoolService Tests** (to be implemented)

### P2 - Medium Priority
- UI Component tests
- Accessibility tests

### P3 - Low Priority
- Performance tests
- Edge case tests

## Current Test Coverage

### Implemented Tests (23 tests)

#### Race Condition Prevention (6 tests) ✅
- `should include fileId in load messages sent to worker`
- `should include fileId in run messages sent to worker`
- `should handle delayed "complete" messages correctly`
- `should process even-numbered files correctly` **(CRITICAL)**
- `should handle model loading progress messages with fileId`
- `should not misattribute messages when worker is reassigned`

#### BatchQueueManager Core (10 tests) ✅
- Initialization & Lifecycle (3 tests)
- Queue Processing (5 tests)
- File Processing (3 tests)

#### useBatchStore (11 tests) ✅
- File Management (8 tests)
- Queue State (5 tests)
- Processing File Tracking (2 tests)

### To Be Implemented
- BatchWorkerPoolService tests
- Worker tests (whisperDiarization.worker.js)
- UI Component tests
- Integration tests
- Performance tests

## Mock Utilities

### Audio Data Mocks
```typescript
import { createMockAudioFile, createMockAudioFiles } from '../mocks/audioData'

// Create a single mock audio file
const file = createMockAudioFile('test.mp3', 10) // 10 seconds duration

// Create multiple mock files
const files = createMockAudioFiles(6) // 6 files
```

### Worker Mocks
```typescript
import { MockWorker } from '../mocks/worker'

// Mock Worker is automatically used via __tests__/setup.ts
// It simulates realistic worker behavior including:
// - Model loading progress
// - Transcription progress updates
// - Completion with transcript results
```

### Test Helpers
```typescript
import { resetStores, waitForCondition } from '../helpers/testUtils'

// Reset all Zustand stores before each test
beforeEach(() => {
  resetStores()
})

// Wait for a condition to be true
await waitForCondition(
  () => useBatchStore.getState().totalCompleted === 6,
  30000 // 30 second timeout
)
```

## Writing New Tests

### Basic Template
```typescript
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { batchQueueManager } from '@/app/web-transc/services/BatchQueueManager'
import { useBatchStore } from '@/app/web-transc/store/useBatchStore'
import { resetStores, waitForCondition } from '../../helpers/testUtils'
import { createMockAudioFiles } from '../../mocks/audioData'

describe('YourFeature - TestSuite', () => {
  beforeEach(() => {
    resetStores()
  })

  afterEach(() => {
    batchQueueManager.terminate()
  })

  test('should do something', async () => {
    // Arrange
    await batchQueueManager.initialize()
    const files = createMockAudioFiles(2)
    useBatchStore.getState().addFiles(files)

    // Act
    await batchQueueManager.start()

    // Assert
    await waitForCondition(
      () => useBatchStore.getState().totalCompleted === 2,
      10000
    )

    expect(useBatchStore.getState().totalCompleted).toBe(2)
  })
})
```

## CI/CD Integration

Tests are configured to run in CI with:
- Coverage reporting
- Fast execution with Bun

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: bun test --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Coverage Goals
- **Overall**: 80%+
- **Critical Paths**: 95%+
  - BatchQueueManager
  - BatchWorkerPoolService
  - Race condition prevention logic

## Debugging Tests

### Run Single Test File
```bash
bun test __tests__/unit/services/BatchQueueManager.raceCondition.test.ts
```

### Run Single Test
```bash
bun test -t "should process even-numbered files correctly"
```

### Verbose Output
```bash
bun test --verbose
```

## Common Issues

### Issue: Tests timeout
**Solution**: Increase timeout in `waitForCondition` or test itself
```typescript
test('long test', async () => {
  // code
}, 60000) // 60 second timeout
```

### Issue: Worker not mocked
**Solution**: Ensure `__tests__/setup.ts` is preloaded (via bunfig.toml) and Worker is mocked globally

### Issue: Zustand state persists between tests
**Solution**: Always call `resetStores()` in `beforeEach`

## Contributing

When adding new features to batch upload:

1. **Write tests first** (TDD)
2. **Focus on P0 tests** for critical logic
3. **Use existing mocks** for consistency
4. **Update this README** with new test counts
5. **Ensure >80% coverage** for new code

## References

- [Test Specification](../BATCH_UPLOAD_TEST_SPECIFICATION.md) - Full test plan
- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)
