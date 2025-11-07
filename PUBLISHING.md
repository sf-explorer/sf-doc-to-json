# Publishing Guide

## Pre-Publishing Checklist

### ✅ 1. Fetch Latest Documentation

**IMPORTANT:** Make sure you have the latest Salesforce documentation before publishing!

```bash
# Fetch all clouds
npm run fetch:all

# Or fetch specific clouds
npm run fetch:fsc
npm run fetch:core
npm run fetch:health
```

Verify the `doc/` folder contains JSON files:
```bash
ls -lh doc/
```

You should see:
- `index.json` - Master index
- `core-salesforce.json`
- `financial-services-cloud.json`
- `health-cloud.json`
- And other cloud JSON files

### ✅ 2. Build TypeScript

```bash
npm run build
```

### ✅ 3. Run Tests

```bash
npm test
```

### ✅ 4. Preview Package Contents

See what will be included in the published package:

```bash
npm run pack:preview
```

This shows:
- `dist/` - Compiled JavaScript and type definitions
- `doc/` - **ALL JSON files with Salesforce object data**
- `README.md`
- `LICENSE`
- `package.json`

Expected size: **15-25 MB** (includes all documentation JSON files)

### ✅ 5. Update Version

```bash
# Patch version (bug fixes): 1.0.0 -> 1.0.1
npm version patch

# Minor version (new features): 1.0.0 -> 1.1.0
npm version minor

# Major version (breaking changes): 1.0.0 -> 2.0.0
npm version major
```

## Publishing

### First Time Setup

```bash
# Login to npm (if not already logged in)
npm login
```

### Publish Package

```bash
# Publish to npm (runs build + tests automatically)
npm publish --access public
```

The `prepublishOnly` script ensures:
1. ✅ Code is built
2. ✅ Tests pass
3. ✅ Package is ready

### Verify Published Package

After publishing, verify the package includes JSON files:

```bash
npm info @sf-explorer/salesforce-object-reference
```

Or install it in a test project:

```bash
mkdir test-install
cd test-install
npm init -y
npm install @sf-explorer/salesforce-object-reference

# Check that doc folder exists
ls -lh node_modules/@sf-explorer/salesforce-object-reference/doc/
```

## What Gets Published

### ✅ Included in Package

```
@sf-explorer/salesforce-object-reference/
├── dist/                          # Compiled JavaScript
│   ├── index.js
│   ├── index.d.ts                # TypeScript definitions
│   ├── cli.js                    # CLI tool
│   ├── scraper.js
│   └── ...
├── doc/                           # 📦 ALL DOCUMENTATION JSON FILES
│   ├── index.json                # ~12K lines - Master index
│   ├── core-salesforce.json      # ~25K lines - Core objects
│   ├── financial-services-cloud.json  # ~15K lines - FSC objects
│   ├── health-cloud.json
│   └── ... (all other clouds)
├── README.md                      # Documentation
├── LICENSE                        # MIT License
└── package.json                   # Package metadata
```

### ❌ Excluded from Package

```
- src/                    # TypeScript source (not needed)
- tests/                  # Test files
- coverage/               # Test coverage reports
- node_modules/           # Dependencies (users install their own)
- sample files            # Development samples
- development docs        # MIGRATION_COMPLETE.md, SETUP.md, etc.
```

## Package Size

With all JSON documentation included:

- **Unpacked Size:** ~20-30 MB
- **Tarball Size:** ~5-8 MB (compressed)

Most of the size comes from the documentation JSON files, which is expected and valuable!

## Benefits of Including JSON Files

✅ **Zero-config:** Users can use the library immediately after installation  
✅ **Offline:** No need to fetch docs from Salesforce  
✅ **Consistent:** Everyone gets the same version of documentation  
✅ **Fast:** Instant access to object schemas  
✅ **Tree-shakeable:** Async functions only load needed JSON files  

## Updating Documentation

To publish a new version with updated documentation:

```bash
# 1. Fetch latest docs
npm run fetch:all

# 2. Update version
npm version patch

# 3. Publish
npm publish --access public
```

## Scoped Package

This is a scoped package: `@sf-explorer/salesforce-object-reference`

To change the scope, update in `package.json`:
```json
{
  "name": "@your-scope/salesforce-object-reference"
}
```

## Common Issues

### Issue: Package too large
**Solution:** This is expected! The JSON files contain comprehensive Salesforce documentation.

### Issue: JSON files not included
**Solution:** 
1. Check `package.json` has `"doc"` in `"files"` array
2. Check `.npmignore` doesn't exclude `doc/`
3. Run `npm run pack:preview` to verify

### Issue: Tests fail during publish
**Solution:** 
1. Make sure you've fetched documentation: `npm run fetch:all`
2. Run tests manually first: `npm test`
3. Fix any failing tests before publishing

## Versioning Strategy

- **Patch (1.0.x):** Bug fixes, updated documentation
- **Minor (1.x.0):** New features, new API functions
- **Major (x.0.0):** Breaking changes to API

## Example: Complete Publish Workflow

```bash
# 1. Fetch latest Salesforce docs
npm run fetch:all

# 2. Build and test
npm run build
npm test

# 3. Preview what will be published
npm run pack:preview

# 4. Update version
npm version patch

# 5. Publish
npm publish --access public

# 6. Verify
npm info @sf-explorer/salesforce-object-reference

# 7. Tag release in git
git push origin main --tags
```

## After Publishing

1. **Test Installation:**
   ```bash
   npm install @sf-explorer/salesforce-object-reference
   ```

2. **Update README** if needed

3. **Create GitHub Release** with version notes

4. **Announce** in relevant channels

## Support

If users report issues with missing JSON files:
1. Verify with `npm run pack:preview`
2. Check `.npmignore` configuration
3. Republish if necessary

---

**Remember:** Always fetch fresh documentation before publishing! The JSON files are the main value of this package. 📦✨

