# Setup and Publishing Guide

## Initial Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/sf-explorer/sf-doc-to-json.git
   cd sf-doc-to-json
   npm install
   ```

2. **Build all packages:**
   ```bash
   npm run build
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

## Project Structure

```
sf-doc-to-json/
├── packages/
│   ├── salesforce-object-reference/      # Standard Salesforce objects
│   ├── salesforce-metadata-reference/    # Metadata API objects
│   ├── salesforce-object-ssot-reference/ # Data Cloud DMO objects
│   └── salesforce-agentforce-actions-reference/ # Agentforce actions
├── demo/                                 # Demo web application
├── tests/                                # Integration tests
├── package.json                          # Root workspace config
└── README.md
```

## Development Workflow

### Building Packages

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@sf-explorer/salesforce-object-reference
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=@sf-explorer/salesforce-object-reference
```

### Fetching Fresh Documentation

```bash
# Standard objects - all clouds
npm run fetch:all

# Specific clouds
npm run fetch:fsc    # Financial Services Cloud
npm run fetch:core   # Core Salesforce
npm run fetch:health # Health Cloud

# Data Cloud DMO objects
npm run fetch:dmo

# Agentforce actions
npm run fetch:actions
```

## Publishing to NPM

### First Time Setup

1. **Login to NPM:**
   ```bash
   npm login
   ```

2. **Verify package configuration** in each package's `package.json`

### Publishing Steps

1. **Build and test:**
   ```bash
   npm run build
   npm test
   ```

2. **Update version** (in the package directory):
   ```bash
   cd packages/salesforce-object-reference
   npm version patch   # 1.0.0 -> 1.0.1
   # or
   npm version minor   # 1.0.0 -> 1.1.0
   # or
   npm version major   # 1.0.0 -> 2.0.0
   ```

3. **Publish:**
   ```bash
   npm publish --access public
   ```

## Using the Packages

### Installation

```bash
# Standard objects
npm install @sf-explorer/salesforce-object-reference

# Metadata API objects
npm install @sf-explorer/salesforce-metadata-reference

# Data Cloud DMO objects
npm install @sf-explorer/salesforce-object-ssot-reference

# Agentforce actions
npm install @sf-explorer/salesforce-agentforce-actions-reference
```

### TypeScript Usage

```typescript
import { getObject } from '@sf-explorer/salesforce-object-reference';

const account = await getObject('Account');
console.log(account?.description);
```

### JavaScript Usage

```javascript
const { getObject } = require('@sf-explorer/salesforce-object-reference');

const account = await getObject('Account');
console.log(account?.description);
```

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Type Errors

Make sure TypeScript is up to date:
```bash
npm install -D typescript@latest
```

### Missing Documentation Data

If `loadIndex()` returns null:
```bash
npm run fetch:all
```

## Environment Requirements

- **Node.js**: >= 18.0.0 (uses native fetch)
- **npm**: >= 8.0.0 (for workspace support)

## Package Sizes

Package sizes vary based on included documentation data. Use `npm pack --dry-run` in any package directory to preview what will be published.

## Support

- Issues: [GitHub Issues](https://github.com/sf-explorer/sf-doc-to-json/issues)
- Documentation: [README.md](./README.md)
