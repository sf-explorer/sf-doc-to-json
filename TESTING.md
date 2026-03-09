# Testing Guide

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests for a specific package
```bash
npm test --workspace=@sf-explorer/salesforce-object-reference
npm test --workspace=@sf-explorer/salesforce-metadata-reference
npm test --workspace=@sf-explorer/salesforce-object-ssot-reference
npm test --workspace=@sf-explorer/salesforce-agentforce-actions-reference
```

### Run integration tests
```bash
npm test -- tests/integration.test.ts
```

## Test Structure

### Package Tests

Each package has its own test suite in `packages/<package>/tests/`:

- `index.test.ts` - Tests for main API functions

### Root Integration Tests

- `tests/integration.test.ts` - Cross-package integration tests

### What's Tested

#### API Functions (per package)
- `loadIndex()` - Loading and validating index structure
- `getObject()` / `getAction()` - Retrieving specific items
- `searchObjects()` / `searchActions()` - Searching with patterns
- `getAllObjectNames()` / `getAllActionNames()` - Listing all items
- `getObjectDescription()` / `getActionDescription()` - Lightweight descriptions
- `clearCache()` - Cache management

#### Integration Tests
- Cross-package imports work correctly
- Consistent data structures
- API compatibility

## Prerequisites

Before running tests:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build all packages:**
   ```bash
   npm run build
   ```

Tests should pass as long as packages are built and contain valid documentation data.

## Writing New Tests

### Example Test

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { getObject, clearCache } from '../src/index.js';

describe('My Feature', () => {
    beforeEach(() => {
        clearCache();
    });

    it('should do something', async () => {
        const result = await getObject('Account');
        expect(result).not.toBeNull();
        expect(result?.name).toBe('Account');
    });
});
```

### Best Practices

1. **Clear cache between tests** - Use `beforeEach(() => clearCache())`
2. **Guard against missing data** - Check if data exists before assertions
3. **Test edge cases** - Include null checks, empty arrays, invalid inputs
4. **Keep tests independent** - Each test should run in isolation

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

See `.github/workflows/ci.yml` for the full configuration.

### CI Test Matrix

Tests run on:
- Node.js 18.x
- Node.js 20.x

## Troubleshooting

### Tests Fail: "Index file not found"
**Solution:** Make sure packages are built and contain documentation data.
```bash
npm run build
```

### Tests Timeout
**Solution:** Increase Jest timeout in the test file:
```typescript
jest.setTimeout(30000);
```

### Type Errors in Tests
**Solution:** Make sure TypeScript is compiled:
```bash
npm run build
```

## Running Specific Tests

```bash
# Run specific test file
npm test -- --testPathPattern="integration"

# Run tests matching pattern
npm test -- --testNamePattern="loadIndex"

# Run in verbose mode
npm test -- --verbose
```
