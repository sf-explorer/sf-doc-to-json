# Salesforce Object Reference

A dual-purpose npm package that:
1. **Generates** - Scrapes Salesforce documentation to create structured JSON files
2. **Exposes** - Provides programmatic access to Salesforce object schemas

## 📦 Two Ways to Use This Package

### 1. As a Consumer (Most Common)

Install and use the pre-generated Salesforce object reference data:

```bash
npm install @sf-explorer/salesforce-object-reference
```

```typescript
import { getObject, searchObjects } from '@sf-explorer/salesforce-object-reference';

// Get a specific object
const account = await getObject('Account');
console.log(account?.properties);

// Search objects
const results = await searchObjects(/financial/i);
```

**What you get:**
- ✅ Pre-generated JSON files with all Salesforce objects
- ✅ TypeScript types and interfaces
- ✅ Helper functions to query the data
- ✅ Works in Node.js and browsers
- ✅ Tree-shakeable and async for optimal bundle size

---

### 2. As a Generator (Advanced)

Use the scraper to fetch fresh documentation from Salesforce:

```bash
# Clone the repository
git clone https://github.com/sf-explorer/sf-doc-to-json.git
cd sf-doc-to-json

# Install dependencies
npm install

# Build the project
npm run build

# Generate documentation
npm run fetch:all           # All clouds
npm run fetch:fsc          # Financial Services Cloud only
npm run fetch:core         # Core Salesforce only
```

**Use this to:**
- ✅ Get the latest Salesforce documentation
- ✅ Customize which clouds to include
- ✅ Create your own version with specific objects
- ✅ Keep documentation in sync with Salesforce releases

---

## 🚀 Quick Start (Consumer)

### Installation

```bash
npm install @sf-explorer/salesforce-object-reference
```

### Basic Usage

```typescript
import {
  loadIndex,
  getObject,
  searchObjects,
  getObjectsByCloud,
  getAvailableClouds
} from '@sf-explorer/salesforce-object-reference';

// Load index to see what's available
const index = await loadIndex();
console.log(`${index.totalObjects} objects across ${index.totalClouds} clouds`);

// Get a specific object
const account = await getObject('Account');
if (account) {
  console.log(account.name);
  console.log(account.description);
  console.log(Object.keys(account.properties).length + ' fields');
}

// Search for objects
const fscObjects = await searchObjects(/financial/i);
console.log(`Found ${fscObjects.length} financial objects`);

// Get all objects from a cloud
const healthObjects = await getObjectsByCloud('Health Cloud');
console.log(`Health Cloud has ${healthObjects.length} objects`);

// List all clouds
const clouds = await getAvailableClouds();
console.log('Available clouds:', clouds);
```

### Browser Usage

```html
<script type="module">
  import { getObject } from './node_modules/@sf-explorer/salesforce-object-reference/dist/index.js';
  
  const account = await getObject('Account');
  console.log(account);
</script>
```

See [browser-example.html](./browser-example.html) for a complete example.

---

## 📚 API Reference

### Core Functions

#### `loadIndex(useCache?: boolean): Promise<DocumentIndex | null>`
Load the master index containing all objects and their cloud associations.

```typescript
const index = await loadIndex();
// { version, totalObjects, totalClouds, objects: {...} }
```

#### `getObject(objectName: string, useCache?: boolean): Promise<SalesforceObject | null>`
Get detailed information about a specific Salesforce object.

```typescript
const account = await getObject('Account');
// { name, description, module, properties: {...} }
```

#### `searchObjects(pattern: string | RegExp, useCache?: boolean): Promise<Array<{name, cloud, file}>>`
Search for objects by name pattern.

```typescript
const results = await searchObjects(/account/i);
// [{ name: "Account", cloud: "Core Salesforce", file: "..." }, ...]
```

#### `getObjectsByCloud(cloudName: string, useCache?: boolean): Promise<SalesforceObject[]>`
Get all objects belonging to a specific cloud.

```typescript
const fscObjects = await getObjectsByCloud('Financial Services Cloud');
```

#### `getAvailableClouds(useCache?: boolean): Promise<string[]>`
Get list of all available clouds.

```typescript
const clouds = await getAvailableClouds();
// ["Core Salesforce", "Financial Services Cloud", ...]
```

#### `loadCloud(cloudFileName: string, useCache?: boolean): Promise<SalesforceObjectCollection | null>`
Load all objects for a specific cloud file.

```typescript
const coreData = await loadCloud('core-salesforce');
```

#### `clearCache(): void`
Clear all cached data.

```typescript
clearCache();
```

#### `preloadClouds(cloudFileNames: string[]): Promise<void>`
Preload specific clouds into cache for better performance.

```typescript
await preloadClouds(['financial-services-cloud', 'health-cloud']);
```

---

## 🔧 Generator Usage (Advanced)

### Prerequisites

- Node.js >= 18.0.0
- Internet connection to fetch from Salesforce

### Setup

```bash
# Clone and install
git clone https://github.com/sf-explorer/sf-doc-to-json.git
cd sf-doc-to-json
npm install

# Build TypeScript
npm run build
```

### Generate Documentation

```bash
# Fetch all clouds (takes ~5-10 minutes)
npm run fetch:all

# Fetch specific version
node dist/cli.js 265.0

# Fetch specific cloud
node dist/cli.js 265.0 atlas.en-us.financial_services_cloud_object_reference.meta

# Or use convenience scripts
npm run fetch:fsc    # Financial Services Cloud
npm run fetch:core   # Core Salesforce
npm run fetch:health # Health Cloud
```

### Output Structure

```
doc/
├── index.json                       # Master index (~12K lines)
├── core-salesforce.json             # Core Salesforce objects
├── financial-services-cloud.json    # FSC objects
├── health-cloud.json                # Health Cloud objects
└── ...                              # Other clouds
```

### Supported Salesforce Clouds

The generator supports fetching documentation from:

- **Core Salesforce** - Standard objects
- **Financial Services Cloud** - Banking and financial services
- **Health Cloud** - Healthcare and life sciences
- **Consumer Goods Cloud** - Retail and CPG
- **Manufacturing Cloud** - Manufacturing operations
- **Energy and Utilities Cloud** - Energy and utilities
- **Education Cloud** - Educational institutions
- **Automotive Cloud** - Automotive industry
- **Nonprofit Cloud** - Nonprofit organizations
- **Public Sector Cloud** - Government and public sector
- **Net Zero Cloud** - Sustainability and carbon management
- **Field Service Lightning** - Field service management
- **Loyalty** - Loyalty programs
- **Scheduler** - Scheduling and appointments
- **Feedback Management** - Customer feedback

---

## 📦 Package Contents

### For Consumers

When you install the package, you get:

```
@sf-explorer/salesforce-object-reference/
├── dist/                    # Compiled JavaScript & TypeScript definitions
│   ├── index.js            # ES Module entry point
│   ├── index.d.ts          # TypeScript definitions
│   ├── cjs/                # CommonJS for older Node.js
│   │   └── index.js
│   └── ...
├── doc/                     # Pre-generated JSON files (~20MB)
│   ├── index.json
│   ├── core-salesforce.json
│   ├── financial-services-cloud.json
│   └── ...
├── README.md
└── package.json
```

### For Generators

The source repository includes:

```
sf-doc-to-json/
├── src/                     # TypeScript source
│   ├── index.ts            # Consumer API
│   ├── scraper.ts          # Generator logic
│   ├── cli.ts              # CLI tool
│   └── ...
├── tests/                   # Test files
├── scripts/                 # Build scripts
└── ...
```

---

## 🎯 Use Cases

### Consumer Use Cases

- **Schema Validation** - Validate your Salesforce data structures
- **Code Generation** - Generate TypeScript interfaces from Salesforce objects
- **Documentation** - Build automated documentation
- **IDE Integration** - Create VS Code extensions with Salesforce awareness
- **Data Modeling** - Understand relationships between objects
- **Migration Tools** - Build tools to migrate between Salesforce orgs

### Generator Use Cases

- **Stay Current** - Get the latest Salesforce object definitions
- **Custom Builds** - Create packages with only specific clouds
- **Private Packages** - Generate and publish your own version
- **CI/CD Integration** - Automatically update documentation on Salesforce releases
- **Internal Tools** - Keep your team's tools in sync with Salesforce

---

## 🌐 Browser Support

Works in all modern browsers and bundlers:

- ✅ Vite
- ✅ Webpack 5
- ✅ Rollup
- ✅ esbuild
- ✅ Native ES modules

**No Node.js required for browser usage!** The package uses dynamic imports for tree-shaking, so you only load the JSON files you need.

**Node.js requirement (>= 18.0.0):**
- ✅ Required for CLI tool (`sf-doc-fetch`)
- ✅ Required for using in Node.js environments
- ✅ Required for generating fresh documentation
- ❌ NOT required for browser-only usage (bundlers handle it)

---

## 📊 Package Size

- **Installed Size:** ~25 MB (includes all JSON documentation)
- **Import Size:** Only what you use (tree-shakeable)
- **Min Bundle:** < 1 KB (if you only use search functions)

Example bundle sizes:
- `getObject('Account')` → ~15 KB (loads only core-salesforce.json)
- `searchObjects(...)` → ~12 KB (loads only index.json)
- `getAvailableClouds()` → ~12 KB (loads only index.json)

---

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

See [TESTING.md](./TESTING.md) for details.

---

## 📝 Development

### Building

```bash
npm run build        # Build both ESM and CJS
npm run build:esm    # ES modules only
npm run build:cjs    # CommonJS only
```

### Generating Fresh Docs

```bash
npm run fetch:all    # Fetch all clouds
```

### Publishing

See [PUBLISHING.md](./PUBLISHING.md) for the complete publishing workflow.

```bash
# 1. Generate fresh docs
npm run fetch:all

# 2. Build and test
npm run build
npm test

# 3. Update version
npm version patch

# 4. Publish
npm publish --access public
```

---

## 🔄 When to Regenerate

Regenerate documentation when:

- 📅 **Salesforce releases** - New objects/fields in seasonal releases
- 🆕 **New clouds** - Salesforce launches new industry clouds
- 🐛 **Bug fixes** - Corrections in Salesforce documentation
- 🎯 **Custom needs** - You need specific subsets of objects

Salesforce typically releases 3 times per year (Spring, Summer, Winter).

---

## 💡 Examples

### Example 1: Validate Object Fields

```typescript
import { getObject } from '@sf-explorer/salesforce-object-reference';

async function validateFields(objectName: string, data: Record<string, any>) {
  const obj = await getObject(objectName);
  if (!obj) return { valid: false, errors: ['Object not found'] };
  
  const errors = [];
  for (const [field, value] of Object.entries(data)) {
    if (!obj.properties[field]) {
      errors.push(`Unknown field: ${field}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

const result = await validateFields('Account', { Name: 'Test', InvalidField: 'value' });
```

### Example 2: Generate TypeScript Interfaces

```typescript
import { getObject } from '@sf-explorer/salesforce-object-reference';

async function generateInterface(objectName: string): Promise<string> {
  const obj = await getObject(objectName);
  if (!obj) return '';
  
  const fields = Object.entries(obj.properties)
    .map(([name, prop]) => `  ${name}?: ${mapSalesforceType(prop.type)};`)
    .join('\n');
  
  return `interface ${objectName} {\n${fields}\n}`;
}

function mapSalesforceType(sfType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'string',
    'boolean': 'boolean',
    'int': 'number',
    'double': 'number',
    'date': 'Date',
    'datetime': 'Date',
  };
  return typeMap[sfType.toLowerCase()] || 'any';
}
```

### Example 3: Find All Phone Fields

```typescript
import { loadAllClouds } from '@sf-explorer/salesforce-object-reference';

async function findPhoneFields() {
  const allClouds = await loadAllClouds();
  const phoneFields = [];
  
  for (const [cloudName, objects] of Object.entries(allClouds)) {
    for (const [objectName, obj] of Object.entries(objects)) {
      for (const [fieldName, field] of Object.entries(obj.properties)) {
        if (field.type.toLowerCase() === 'phone' || fieldName.toLowerCase().includes('phone')) {
          phoneFields.push({ object: objectName, field: fieldName, cloud: obj.module });
        }
      }
    }
  }
  
  return phoneFields;
}
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/@sf-explorer/salesforce-object-reference)
- [GitHub Repository](https://github.com/sf-explorer/sf-doc-to-json)
- [Salesforce Documentation](https://developer.salesforce.com/docs)
- [Issue Tracker](https://github.com/sf-explorer/sf-doc-to-json/issues)

---

## 📮 Support

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/sf-explorer/sf-doc-to-json/issues)
- 💬 **Questions:** [GitHub Discussions](https://github.com/sf-explorer/sf-doc-to-json/discussions)
- 📧 **Email:** support@sf-explorer.dev

---

**Note:** This package contains data scraped from public Salesforce documentation. It is not officially affiliated with or endorsed by Salesforce.
