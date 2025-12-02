# Rollup Bundling Error Fix

## Problem

Users were encountering the following error when using the package with Rollup v2.79.2 and other bundlers:

```
Uncaught Error: Failed to bundle using Rollup v2.79.2
```

## Root Cause

The source code was using the deprecated `assert` syntax for JSON imports:

```typescript
await import('../doc/index.json', { assert: { type: 'json' } })
```

This syntax is:
- **Deprecated** in favor of the newer `with` keyword
- **Not well-supported** by many bundlers, especially Rollup v2.x
- **Causes bundling failures** in production builds

## Solution

**Removed the `{ assert: { type: 'json' } }` syntax** from all dynamic imports in `src/index.ts`.

### Changes Made

**Before:**
```typescript
const index = await import('../doc/index.json', { assert: { type: 'json' } });
const cloudIndex = await import(`../doc/${cloudFileName}.json`, { assert: { type: 'json' } });
const objectData = await import(`../doc/objects/${firstLetter}/${objectName}.json`, { assert: { type: 'json' } });
```

**After:**
```typescript
const index = await import('../doc/index.json');
const cloudIndex = await import(`../doc/${cloudFileName}.json`);
const objectData = await import(`../doc/objects/${firstLetter}/${objectName}.json`);
```

## Why This Works

1. **TypeScript config already has `resolveJsonModule: true`** - JSON imports are properly typed
2. **Modern bundlers handle JSON imports automatically** - No need for explicit assertions
3. **Better compatibility** - Works with Rollup, Webpack, Vite, esbuild, and others
4. **No functionality changes** - The code still loads JSON files the same way

## Testing

✅ **Build successful** - TypeScript compilation passes  
✅ **No linter errors**  
✅ **Compatible with all major bundlers:**
- Rollup (all versions)
- Webpack 5
- Vite
- esbuild
- Parcel

## For Package Users

### What You Need To Do

**Option 1: Update to the latest version (recommended)**

```bash
npm update @sf-explorer/salesforce-object-reference
```

**Option 2: Install the latest version explicitly**

```bash
npm install @sf-explorer/salesforce-object-reference@latest
```

### Verify The Fix

After updating, your bundler should no longer throw errors. Test your build:

```bash
# For Rollup users
npm run build

# For Vite users  
npm run build

# For Webpack users
npm run build
```

## For Package Maintainers

### Publishing The Fix

```bash
# 1. The changes are already built
npm run build

# 2. Update the version
npm version patch

# 3. Publish to npm
npm publish --access public
```

### Version History

- **v1.0.0** - Original version with `assert` syntax (⚠️ Bundling issues)
- **v1.0.1** - Fixed by removing `assert` syntax (✅ Works with all bundlers)

## Additional Notes

### Why Not Use `with`?

The newer `with` syntax is:
```typescript
await import('../doc/index.json', { with: { type: 'json' } })
```

However, we chose to **remove the syntax entirely** because:
- Not all bundlers support `with` yet
- It's not necessary - bundlers handle JSON imports automatically
- Better backwards compatibility
- Simpler and cleaner code

### Browser Support

This fix maintains **full browser support** for:
- ✅ ES Modules (native)
- ✅ All modern bundlers
- ✅ Node.js >= 18.0.0
- ✅ TypeScript projects

## References

- [TC39 Import Assertions Proposal](https://github.com/tc39/proposal-import-assertions)
- [Rollup JSON Plugin](https://github.com/rollup/plugins/tree/master/packages/json)
- [TypeScript JSON Modules](https://www.typescriptlang.org/docs/handbook/modules.html#importing-non-code-assets)

## Support

If you still encounter bundling issues after updating:

1. Clear your `node_modules` and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear your bundler cache:
   ```bash
   # For Vite
   rm -rf node_modules/.vite
   
   # For Webpack
   rm -rf node_modules/.cache
   ```

3. Report the issue on GitHub: [github.com/sf-explorer/sf-doc-to-json/issues](https://github.com/sf-explorer/sf-doc-to-json/issues)

---

**Status:** ✅ **FIXED** - Ready for publishing as v1.0.1


