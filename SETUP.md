# Setup and Publishing Guide

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the TypeScript project:**
   ```bash
   npm run build
   ```

3. **Fetch Salesforce documentation:**
   ```bash
   npm run fetch:all
   # or fetch specific clouds
   npm run fetch:fsc
   ```

## Project Structure

```
sf-doc-to-json/
├── src/                    # TypeScript source files
│   ├── index.ts           # Main library exports
│   ├── cli.ts             # Command-line interface
│   ├── scraper.ts         # Web scraping logic
│   ├── config.ts          # Configuration
│   ├── types.ts           # TypeScript interfaces
│   └── example.ts         # Usage examples
├── dist/                   # Compiled JavaScript (generated)
│   ├── index.js
│   ├── index.d.ts
│   └── ...
├── doc/                    # Generated documentation (generated)
│   ├── index.json
│   ├── core-salesforce.json
│   ├── financial-services-cloud.json
│   └── ...
├── tsconfig.json          # TypeScript configuration
├── package.json           # NPM package configuration
├── README.md              # Documentation
└── LICENSE                # MIT License
```

## Development Workflow

### 1. Make Changes
Edit files in the `src/` directory.

### 2. Build
```bash
npm run build
```

### 3. Test Locally
```bash
# Test CLI
node dist/cli.js

# Test as library
node -e "const lib = require('./dist/index.js'); console.log(lib.getAvailableClouds())"
```

### 4. Run Example
```bash
npm run build && node dist/example.js
```

## Publishing to NPM

### First Time Setup

1. **Create NPM account** (if you don't have one):
   ```bash
   npm adduser
   ```

2. **Update package.json:**
   - Change `@ndespres/salesforce-object-reference` to your scope
   - Update `repository.url` with your GitHub repo
   - Update `author` field
   - Verify `version` is correct

### Publishing Steps

1. **Build and test:**
   ```bash
   npm run build
   npm test
   ```

2. **Fetch fresh documentation** (optional but recommended):
   ```bash
   npm run fetch:all
   ```

3. **Commit changes:**
   ```bash
   git add .
   git commit -m "Prepare v1.0.0"
   git tag v1.0.0
   git push origin main --tags
   ```

4. **Publish to NPM:**
   ```bash
   npm publish --access public
   ```

### Updating the Package

1. **Make your changes**

2. **Update version:**
   ```bash
   npm version patch   # 1.0.0 -> 1.0.1
   # or
   npm version minor   # 1.0.0 -> 1.1.0
   # or
   npm version major   # 1.0.0 -> 2.0.0
   ```

3. **Build and publish:**
   ```bash
   npm run build
   npm publish
   ```

## Using in Another Project

### Installation

```bash
npm install @ndespres/salesforce-object-reference
```

### TypeScript Usage

```typescript
import {
  loadIndex,
  getObject,
  getObjectsByCloud,
  SalesforceObject
} from '@ndespres/salesforce-object-reference';

const account = getObject('Account');
console.log(account?.description);
```

### JavaScript Usage

```javascript
const {
  loadIndex,
  getObject,
  getObjectsByCloud
} = require('@ndespres/salesforce-object-reference');

const account = getObject('Account');
console.log(account?.description);
```

### CLI Usage

```bash
# If installed globally
npm install -g @ndespres/salesforce-object-reference
sf-doc-fetch

# If installed locally
npx sf-doc-fetch
```

## What Gets Published

The NPM package includes:

- ✅ `dist/` - Compiled JavaScript
- ✅ `dist/**/*.d.ts` - TypeScript definitions
- ✅ `doc/` - Pre-generated documentation JSON files
- ✅ `README.md` - Documentation
- ✅ `LICENSE` - License file
- ✅ `package.json` - Package metadata

Excluded from package (see `.npmignore`):
- ❌ `src/` - TypeScript source
- ❌ `node_modules/`
- ❌ `*.log`
- ❌ Development files

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Type Errors

Make sure you have the latest TypeScript:
```bash
npm install -D typescript@latest
```

### Missing Documentation

If `loadIndex()` returns null:
```bash
npm run fetch:all
```

### CLI Not Working

After building, make sure the CLI file is executable:
```bash
chmod +x dist/cli.js
```

## Environment Variables

None required - the package uses native Node.js fetch (Node >= 18).

## Testing Before Publishing

1. **Link locally:**
   ```bash
   npm link
   cd /path/to/test-project
   npm link @ndespres/salesforce-object-reference
   ```

2. **Test in test project:**
   ```typescript
   import { getObject } from '@ndespres/salesforce-object-reference';
   console.log(getObject('Account'));
   ```

3. **Unlink when done:**
   ```bash
   npm unlink @ndespres/salesforce-object-reference
   ```

## Package Size

Current package size: ~15-20MB (includes all documentation JSON files)

To reduce size, you can:
- Publish without `doc/` folder (users fetch their own)
- Gzip the JSON files
- Fetch documentation on-demand

## Support

- Issues: [GitHub Issues](https://github.com/yourusername/sf-doc-to-json/issues)
- Documentation: [README.md](./README.md)

