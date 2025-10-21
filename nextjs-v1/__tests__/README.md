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
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Coverage Report
```bash
npm run test:coverage
```

### CI Mode
```bash
npm run test:ci
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

// Mock Worker is automatically used via jest.setup.js
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
import { batchQueueManager } from '@/app/web-transc/services/BatchQueueManager'
import { useBatchStore } from '@/app/web-transc/store/useBatchStore'
import { resetStores, waitForCondition } from '../../helpers/testUtils'
import { createMockAudioFiles } from '../../mocks/audioData'

describe('YourFeature - TestSuite', () => {
  beforeEach(() => {
    resetStores()
    jest.clearAllMocks()
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
- Maximum 2 workers for stability
- Coverage reporting
- Fast fail on first error

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm run test:ci

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
npm test -- BatchQueueManager.raceCondition.test.ts
```

### Run Single Test
```bash
npm test -- -t "should process even-numbered files correctly"
```

### Verbose Output
```bash
npm test -- --verbose
```

### Update Snapshots
```bash
npm test -- -u
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
**Solution**: Ensure `jest.setup.js` is loaded and Worker is mocked globally

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
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://testingjavascript.com/)
