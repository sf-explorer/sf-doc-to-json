# Testing Guide

## Running Tests

### Run all tests
```bash
npm test
```

### Watch mode (re-runs tests on file changes)
```bash
npm run test:watch
```

### Generate coverage report
```bash
npm run test:coverage
```

## Test Structure

### Test Files

- `tests/index.test.ts` - Tests for main API functions
- `tests/config.test.ts` - Tests for configuration
- `tests/types.test.ts` - Tests for TypeScript types

### What's Tested

#### API Functions
- ✅ `loadIndex()` - Loading and validating index structure
- ✅ `getObject()` - Retrieving specific objects
- ✅ `searchObjects()` - Searching with strings and regex
- ✅ `getObjectsByCloud()` - Filtering objects by cloud
- ✅ `getAvailableClouds()` - Listing available clouds
- ✅ `loadCloud()` - Loading entire cloud data

#### Configuration
- ✅ CONFIGURATION object structure
- ✅ Valid documentation IDs
- ✅ Unique labels
- ✅ CHUNK_SIZE validation

#### TypeScript Types
- ✅ Type definitions compile correctly
- ✅ All interfaces are usable

#### Integration Tests
- ✅ Consistency between index and cloud files
- ✅ Same objects accessible via different methods
- ✅ Search results match getObject results

## Prerequisites

Before running tests, make sure you have:

1. **Built the project:**
   ```bash
   npm run build
   ```

2. **Fetched documentation** (at least one cloud):
   ```bash
   npm run fetch:fsc
   # or
   npm run fetch:all
   ```

Tests will skip if no documentation data is available.

## Test Coverage

After running `npm run test:coverage`, you'll find:
- Terminal summary of coverage
- HTML report in `coverage/lcov-report/index.html`

### Expected Coverage

| Type | Coverage |
|------|----------|
| Statements | > 80% |
| Branches | > 70% |
| Functions | > 80% |
| Lines | > 80% |

## Writing New Tests

### Example Test

```typescript
import { getObject } from '../src/index';

describe('My New Feature', () => {
    it('should do something', () => {
        const result = getObject('Account');
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Account');
    });
});
```

### Best Practices

1. **Descriptive test names** - Use clear, specific descriptions
2. **Arrange-Act-Assert** - Structure tests clearly
3. **Guard against missing data** - Tests check if data exists first
4. **Test edge cases** - Include null checks, empty arrays, etc.
5. **Independent tests** - Each test should run independently

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run fetch:fsc
      - run: npm test
      - run: npm run test:coverage
```

## Troubleshooting

### Tests Fail: "Index file not found"
**Solution:** Run `npm run fetch:all` to generate documentation first.

### Tests Timeout
**Solution:** Increase Jest timeout in `jest.config.js`:
```javascript
testTimeout: 30000
```

### Type Errors in Tests
**Solution:** Make sure TypeScript is compiled:
```bash
npm run build
```

## Mock Data for Tests

If you want to test without fetching real documentation, create mock data in `tests/fixtures/`:

```typescript
// tests/fixtures/mock-index.ts
export const mockIndex = {
  generated: '2025-11-07T12:00:00.000Z',
  version: '264.0',
  totalObjects: 2,
  totalClouds: 1,
  objects: {
    'TestObject': {
      cloud: 'Core Salesforce',
      file: 'core-salesforce.json'
    }
  }
};
```

Then use in tests:
```typescript
jest.mock('../src/index', () => ({
  loadIndex: () => mockIndex
}));
```

## Running Specific Tests

```bash
# Run specific test file
npm test -- tests/config.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="loadIndex"

# Run in verbose mode
npm test -- --verbose
```

## Continuous Testing During Development

```bash
# Watch mode with coverage
npm run test:watch -- --coverage

# Watch only changed files
npm run test:watch -- --onlyChanged
```

