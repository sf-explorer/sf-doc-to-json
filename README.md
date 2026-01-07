# Salesforce Object Reference - Monorepo

This is a monorepo containing four complementary Salesforce reference packages.

## 📦 Packages

### 1. [@sf-explorer/salesforce-object-reference](./packages/salesforce-object-reference) 📚

**Standard Salesforce objects** scraped from official documentation.

- **Source**: Salesforce documentation websites
- **Objects**: 2,500+ standard objects from all Salesforce clouds
- **Use Case**: Official documented objects with comprehensive descriptions
- **Includes**: Describe API tool for live org queries
- **Install**: `npm install @sf-explorer/salesforce-object-reference`

[📖 Full Documentation](./packages/salesforce-object-reference/README.md)
[🔧 Describe API Tool](./packages/salesforce-object-reference/describe-api/README.md)

### 2. [@sf-explorer/salesforce-metadata-reference](./packages/salesforce-metadata-reference) ⚙️

**Metadata API objects** from Salesforce documentation.

- **Source**: Metadata API documentation
- **Objects**: 700+ metadata objects (CustomObject, Flow, ApexClass, etc.)
- **Use Case**: Metadata deployment and configuration
- **Install**: `npm install @sf-explorer/salesforce-metadata-reference`

[📖 Full Documentation](./packages/salesforce-metadata-reference/README.md)

### 3. [@sf-explorer/salesforce-object-ssot-reference](./packages/salesforce-object-ssot-reference) 🎯

**Single Source of Truth (SSOT)** objects from Salesforce DMO APIs.

- **Source**: Salesforce DMO (Data Model Object) APIs
- **Objects**: 150+ SSOT objects
- **Use Case**: Authoritative data model structure directly from APIs
- **Install**: `npm install @sf-explorer/salesforce-object-ssot-reference`

[📖 Full Documentation](./packages/salesforce-object-ssot-reference/README.md)

### 4. [@sf-explorer/salesforce-agentforce-actions-reference](./packages/salesforce-agentforce-actions-reference) 🤖

**Salesforce Agentforce standard actions** from official documentation.

- **Source**: Salesforce Agentforce Copilot Actions documentation
- **Actions**: Standard actions for Agentforce/Copilot
- **Use Case**: Reference for available Agentforce actions and their parameters
- **Install**: `npm install @sf-explorer/salesforce-agentforce-actions-reference`

[📖 Full Documentation](./packages/salesforce-agentforce-actions-reference/README.md)

## 🏗️ Monorepo Structure

```
sf-doc-to-json/
├── packages/
│   ├── salesforce-object-reference/      # 📚 Standard objects
│   │   ├── src/
│   │   │   ├── doc/
│   │   │   │   ├── objects/              # ~2,500 objects
│   │   │   │   └── *.json                # Cloud indexes
│   │   │   └── index.ts
│   │   ├── describe-api/                 # Live org Describe API tool
│   │   └── package.json
│   │
│   ├── salesforce-metadata-reference/    # ⚙️ Metadata objects
│   │   ├── src/
│   │   │   ├── doc/
│   │   │   │   ├── objects/              # ~700 metadata objects
│   │   │   │   └── index.json            # Metadata index
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── salesforce-object-ssot-reference/ # 🎯 SSOT objects
│   │   ├── src/
│   │   │   ├── doc/
│   │   │   │   ├── objects/              # ~150 SSOT objects
│   │   │   │   └── index.json            # SSOT index
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── salesforce-agentforce-actions-reference/ # 🤖 Agentforce actions
│       ├── src/
│       │   ├── doc/
│       │   │   ├── actions/              # Agentforce actions
│       │   │   └── index.json            # Actions index
│       │   └── index.ts
│       └── package.json
│
├── package.json                          # Root workspace config
└── README.md                             # This file
```

## 🚀 Getting Started

### For Users

Install the packages you need:

```bash
# Standard objects from documentation
npm install @sf-explorer/salesforce-object-reference

# Metadata API objects
npm install @sf-explorer/salesforce-metadata-reference

# SSOT/DMO objects
npm install @sf-explorer/salesforce-object-ssot-reference

# Agentforce actions
npm install @sf-explorer/salesforce-agentforce-actions-reference
```

Then import and use:

```typescript
// Standard objects
import { getObject } from '@sf-explorer/salesforce-object-reference';
const account = await getObject('Account');

// Metadata objects
import { getObject as getMetadata } from '@sf-explorer/salesforce-metadata-reference';
const customObject = await getMetadata('CustomObject');

// SSOT objects
import { getObject as getSSOT } from '@sf-explorer/salesforce-object-ssot-reference';
const accountSSOT = await getSSOT('Account');

// Agentforce actions
import { getAction } from '@sf-explorer/salesforce-agentforce-actions-reference';
const createRecordAction = await getAction('CreateRecord');
```

### For Developers

Clone and setup the monorepo:

```bash
git clone https://github.com/sf-explorer/sf-doc-to-json.git
cd sf-doc-to-json

# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests for all packages
npm run test
```

## 🎯 Consistent API Across Packages

All object packages share the same interface:

```typescript
// Every package exports these functions:
loadIndex()                          // Load master index
getObject(name)                      // Get full object details
searchObjects(pattern)               // Search by name
getAllObjectNames()                  // Get all object names
loadAllDescriptions()                // Get all descriptions (lightweight)
getObjectDescription(name)           // Get single description (lightweight)
searchObjectsByDescription(pattern)  // Search by description
loadAllObjects()                     // Load all objects (heavy)
clearCache()                         // Clear cached data
```

## 📝 Development

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@sf-explorer/salesforce-object-reference
npm run build --workspace=@sf-explorer/salesforce-metadata-reference
npm run build --workspace=@sf-explorer/salesforce-object-ssot-reference
npm run build --workspace=@sf-explorer/salesforce-agentforce-actions-reference
```

### Testing

```bash
# Test all packages
npm run test

# Test specific package
npm test --workspace=@sf-explorer/salesforce-metadata-reference
```

### Generate Fresh Data

```bash
# Generate standard objects
npm run fetch:all          # All clouds
npm run fetch:fsc          # Financial Services Cloud
npm run fetch:core         # Core Salesforce

# Generate SSOT/DMO objects
npm run fetch:dmo

# Generate Agentforce actions
npm run fetch:actions
```

## 📦 Publishing

Each package is published independently:

```bash
# Standard objects
cd packages/salesforce-object-reference
npm version patch
npm publish --access public

# Metadata objects
cd packages/salesforce-metadata-reference
npm version patch
npm publish --access public

# SSOT objects
cd packages/salesforce-object-ssot-reference
npm version patch
npm publish --access public

# Agentforce actions
cd packages/salesforce-agentforce-actions-reference
npm version patch
npm publish --access public
```

## 🔗 Links

- **NPM Packages**:
  - [@sf-explorer/salesforce-object-reference](https://www.npmjs.com/package/@sf-explorer/salesforce-object-reference)
  - [@sf-explorer/salesforce-metadata-reference](https://www.npmjs.com/package/@sf-explorer/salesforce-metadata-reference)
  - [@sf-explorer/salesforce-object-ssot-reference](https://www.npmjs.com/package/@sf-explorer/salesforce-object-ssot-reference)
  - [@sf-explorer/salesforce-agentforce-actions-reference](https://www.npmjs.com/package/@sf-explorer/salesforce-agentforce-actions-reference)
- **GitHub**: [sf-explorer/sf-doc-to-json](https://github.com/sf-explorer/sf-doc-to-json)
- **Issues**: [GitHub Issues](https://github.com/sf-explorer/sf-doc-to-json/issues)

## 📄 License

MIT License - see [LICENSE](./LICENSE)

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

**Note:** These packages contain data from Salesforce. They are not officially affiliated with or endorsed by Salesforce.
