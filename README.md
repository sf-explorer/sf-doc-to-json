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
import { getObject, getObjectDescription, searchObjectsByDescription } from '@sf-explorer/salesforce-object-reference';

// Get full object with all field properties
const account = await getObject('Account');
console.log(account?.properties);

// 🆕 Get just description and field count (100x faster!)
const desc = await getObjectDescription('Account');
console.log(desc?.description);  // "Represents an individual account..."
console.log(desc?.fieldCount);   // 106

// 🆕 Search by description content
const results = await searchObjectsByDescription('invoice');
```

**What you get:**
- ✅ Pre-generated JSON files with all Salesforce objects
- ✅ TypeScript types and interfaces
- ✅ Helper functions to query the data
- ✅ Works in Node.js and browsers
- ✅ Tree-shakeable and async for optimal bundle size
- ✅ 🆕 **Descriptions API** - access metadata without loading full objects (100x faster!)

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
  getAvailableClouds,
  // NEW: Lightweight descriptions API
  loadAllDescriptions,
  getObjectDescription,
  searchObjectsByDescription
} from '@sf-explorer/salesforce-object-reference';

// Load index to see what's available
const index = await loadIndex();
console.log(`${index.totalObjects} objects across ${index.totalClouds} clouds`);

// Get a specific object (full details with all fields)
const account = await getObject('Account');
if (account) {
  console.log(account.name);
  console.log(account.description);
  console.log(Object.keys(account.properties).length + ' fields');
}

// NEW: Get just the description and field count (much faster!)
const accountDesc = await getObjectDescription('Account');
console.log(accountDesc.description);  // "Represents an individual account..."
console.log(accountDesc.fieldCount);   // 106

// Search for objects by name
const fscObjects = await searchObjects(/financial/i);
console.log(`Found ${fscObjects.length} financial objects`);

// NEW: Search by description content (not just name)
const invoiceObjects = await searchObjectsByDescription('invoice');
invoiceObjects.forEach(obj => {
  console.log(`${obj.name} - ${obj.fieldCount} fields`);
});

// Get all objects from a cloud
const healthObjects = await getObjectsByCloud('Health Cloud');
console.log(`Health Cloud has ${healthObjects.length} objects`);

// List all clouds
const clouds = await getAvailableClouds();
console.log('Available clouds:', clouds);
```

### Browser Usage

**📦 Bundler Required:** This package uses dynamic JSON imports which require a bundler (Vite, Webpack, etc.) to work in browsers.

#### Example with Vite

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head><title>My App</title></head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

```javascript
// src/main.js
import { getObject, getObjectDescription } from '@sf-explorer/salesforce-object-reference';

// Get full object details
const account = await getObject('Account');
console.log('Fields:', Object.keys(account.properties).length);

// Or get just the description (faster!)
const desc = await getObjectDescription('Account');
console.log('Description:', desc.description);
console.log('Field count:', desc.fieldCount);
```

```bash
# Run your app
npm run dev
```

#### Example with React

```tsx
import { useEffect, useState } from 'react';
import { searchObjectsByDescription } from '@sf-explorer/salesforce-object-reference';

function ObjectSearch() {
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    async function search() {
      const objects = await searchObjectsByDescription('account');
      setResults(objects);
    }
    search();
  }, []);
  
  return (
    <div>
      {results.map(obj => (
        <div key={obj.name}>
          <h3>{obj.name}</h3>
          <p>{obj.description}</p>
          <small>{obj.fieldCount} fields • {obj.cloud}</small>
        </div>
      ))}
    </div>
  );
}
```

See [browser-example.html](./browser-example.html) for a complete example (requires a bundler or local dev server).

---

## 📚 API Reference

### Core Functions

#### `loadIndex(useCache?: boolean): Promise<DocumentIndex | null>`
Load the master index containing all objects and their cloud associations.

```typescript
const index = await loadIndex();
// { version, totalObjects, totalClouds, objects: {...} }
```

**Note:** The index now includes `description` and `fieldCount` for each object, allowing you to access metadata without loading full object files.

#### `getObject(objectName: string, useCache?: boolean): Promise<SalesforceObject | null>`
Get detailed information about a specific Salesforce object.

```typescript
const account = await getObject('Account');
// { name, description, module, properties: {...} }
```

**Use this when:** You need full object details including all field properties.

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

### 🚀 Lightweight Descriptions API

**NEW:** Access object descriptions and field counts without loading full object data - **100x more efficient!**

These functions use only the index file (~1.5MB) instead of loading individual object files (~100MB+).

#### `loadAllDescriptions(useCache?: boolean): Promise<Record<string, DescriptionInfo> | null>`

Load descriptions and field counts for all objects at once.

```typescript
const descriptions = await loadAllDescriptions();
console.log(descriptions['Account']);
// {
//   description: "Represents an individual account, which is an organization...",
//   cloud: "Core Salesforce",
//   fieldCount: 106
// }
```

**Returns:** Object mapping each object name to:
- `description` - Object description text
- `cloud` - Cloud/module name
- `fieldCount` - Number of fields

**Performance:** Loads ~1.5MB vs ~100MB+ for full objects

#### `getObjectDescription(objectName: string, useCache?: boolean): Promise<DescriptionInfo | null>`

Get description and field count for a specific object.

```typescript
const desc = await getObjectDescription('Account');
console.log(desc.description);  // "Represents an individual account..."
console.log(desc.cloud);        // "Core Salesforce"
console.log(desc.fieldCount);   // 106
```

**Use this when:** You need basic object info without loading all field properties.

#### `searchObjectsByDescription(pattern: string | RegExp, useCache?: boolean): Promise<DescriptionSearchResult[]>`

Search for objects by description content (not just name).

```typescript
// String search (case-insensitive)
const invoiceObjects = await searchObjectsByDescription('invoice');

// Regex search
const healthObjects = await searchObjectsByDescription(/patient|health|medical/i);

// Results include name, description, cloud, and fieldCount
invoiceObjects.forEach(obj => {
  console.log(`${obj.name} (${obj.cloud}) - ${obj.fieldCount} fields`);
  console.log(obj.description);
});
```

**Returns:** Array of objects with:
- `name` - Object name
- `description` - Full description text
- `cloud` - Cloud/module name  
- `fieldCount` - Number of fields

#### `getDescriptionsByCloud(cloudName: string, useCache?: boolean): Promise<Record<string, {description, fieldCount}>>`

Get descriptions for all objects in a specific cloud.

```typescript
const fscDescriptions = await getDescriptionsByCloud('Financial Services Cloud');
console.log(Object.keys(fscDescriptions).length); // 238 objects

// Access each object's info
Object.entries(fscDescriptions).forEach(([name, info]) => {
  console.log(`${name}: ${info.fieldCount} fields`);
  console.log(info.description);
});
```

**Use this when:** Building cloud-specific documentation or object browsers.

### When to Use Which API?

| Need | Use This | Data Size | Speed |
|------|----------|-----------|-------|
| Browse/search objects | `loadAllDescriptions()` | ~1.5MB | ⚡ Fast |
| Object description + field count | `getObjectDescription()` | ~1.5MB | ⚡ Fast |
| Search by description | `searchObjectsByDescription()` | ~1.5MB | ⚡ Fast |
| Full object with all fields | `getObject()` | ~5KB per object | 🐢 Slower |
| Many objects with all fields | `loadCloud()` | Variable | 🐢 Slower |

**💡 Tip:** Use descriptions API for discovery and listings, then load full objects only when needed!

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

The generator creates an optimized split structure for better performance:

```
doc/
├── index.json                       # Master index (1.5 MB - includes descriptions & field counts!)
├── objects/                         # Individual object files (14 MB total)
│   ├── A/                          # Objects starting with A (334 files)
│   │   ├── Account.json
│   │   ├── AccountContactRole.json
│   │   └── ...
│   ├── B/                          # Objects starting with B (97 files)
│   ├── C/                          # Objects starting with C (627 files)
│   └── ...                         # D-Z folders
├── core-salesforce.json            # Core Salesforce index (45 KB - lists 1,717 objects)
├── financial-services-cloud.json   # FSC index (6.9 KB - lists 243 objects)
├── health-cloud.json               # Health Cloud index (6.1 KB - lists 226 objects)
└── ...                             # Other cloud indexes
```

**Benefits of Split Structure:**
- ✅ **99% smaller cloud files** (45 KB vs 4.2 MB for core-salesforce)
- ✅ **Faster git operations** (diff, merge, clone)
- ✅ **Better IDE performance** with smaller files
- ✅ **Lazy loading** - load only the objects you need
- ✅ **Easy navigation** - find any object alphabetically
- ✅ **NEW: Descriptions in index** - access metadata without loading object files

See [SPLIT_STRUCTURE.md](./SPLIT_STRUCTURE.md) for complete details.

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
├── doc/                     # Pre-generated JSON files (~15MB total)
│   ├── index.json          # Master index (369 KB)
│   ├── objects/            # 3,007 individual object files (14 MB)
│   │   ├── A/              # Account, Asset, etc.
│   │   ├── B/              # Budget, Building, etc.
│   │   └── ...             # C-Z folders
│   ├── core-salesforce.json           # Lightweight index (45 KB)
│   ├── financial-services-cloud.json  # Lightweight index (6.9 KB)
│   └── ...                 # Other cloud indexes
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
- **Object Browsers** - 🆕 Build fast object explorers using descriptions API
- **Search & Autocomplete** - 🆕 Implement intelligent search with `searchObjectsByDescription()`
- **Quick Stats** - 🆕 Get field counts and descriptions without loading full objects

### Generator Use Cases

- **Stay Current** - Get the latest Salesforce object definitions
- **Custom Builds** - Create packages with only specific clouds
- **Private Packages** - Generate and publish your own version
- **CI/CD Integration** - Automatically update documentation on Salesforce releases
- **Internal Tools** - Keep your team's tools in sync with Salesforce

---

## 🌐 Browser Support

**✨ Works in all modern browsers when bundled!**

The package uses dynamic `import()` for JSON files, which requires a bundler to work in browsers. All major bundlers handle this automatically.

### Supported Bundlers

✅ **Vite** - Recommended, zero config  
✅ **Webpack 5** - Works out of the box  
✅ **Rollup** - Native JSON support  
✅ **esbuild** - Automatic JSON handling  
✅ **Parcel** - Zero configuration needed  

### Browser Usage (With Bundler)

When you use a bundler (Vite, Webpack, etc.), JSON imports are automatically inlined at build time:

```typescript
// Your source code
import { getObjectDescription } from '@sf-explorer/salesforce-object-reference';

const desc = await getObjectDescription('Account');
// Works perfectly in the browser after bundling!
```

**Note:** This package **requires a bundler** for browser usage. Dynamic JSON imports don't work directly in browsers without a build step. This is standard practice for modern web development.

### Quick Start with Vite

```bash
npm create vite@latest my-app
cd my-app
npm install @sf-explorer/salesforce-object-reference
```

```typescript
// src/main.ts
import { loadAllDescriptions } from '@sf-explorer/salesforce-object-reference';

const descriptions = await loadAllDescriptions();
console.log(`Loaded ${Object.keys(descriptions).length} objects`);
```

### Why a Bundler is Needed

1. **JSON Imports** - Browsers don't natively support `import` for JSON files
2. **Tree Shaking** - Only bundles the JSON you actually use
3. **Performance** - Bundlers optimize and compress the output
4. **Standard Practice** - All modern web apps use bundlers

**The good news:** If you're already using React, Vue, Svelte, Angular, or any modern framework, you already have a bundler configured! Just install and use. 🎉

**Node.js requirement (>= 18.0.0):**
- ✅ Required for CLI tool (`sf-doc-fetch`)
- ✅ Required for using in Node.js environments
- ✅ Required for generating fresh documentation
- ❌ NOT required for browser-only usage (your bundler handles it)

---

## 📊 Package Size & Performance

- **Installed Size:** ~15 MB (includes all JSON documentation)
- **Import Size:** Only what you use (tree-shakeable)
- **Min Bundle:** < 1 KB (if you only use search functions)

**Split Structure Benefits:**

Example bundle sizes with the optimized structure:
- `getObject('Account')` → **~5 KB** (loads only Account.json, not entire cloud!)
- `searchObjects(...)` → ~370 KB (loads only index.json)
- `getAvailableClouds()` → ~370 KB (loads only index.json)
- `loadCloud('core-salesforce')` → Loads only needed objects on-demand

**Performance improvements:**
- ✅ **99% reduction** in cloud index file sizes
- ✅ **Lazy loading** - each object is ~5 KB vs 4+ MB for full cloud
- ✅ **Faster initial load** - no need to parse massive JSON files
- ✅ **Better caching** - unchanged objects don't need re-downloading

---

## 🧪 Testing

```bash
# Run tests (43 tests, all passing ✅)
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Test Coverage:**
- ✅ Index loading and structure validation
- ✅ Object retrieval with split structure
- ✅ Multi-cloud object handling (88 objects appear in multiple clouds)
- ✅ Search functionality
- ✅ Cloud-specific queries
- ✅ Caching behavior

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
npm run fetch:all    # Fetch all clouds (automatically creates split structure)
```

**Note:** The scraper automatically generates the optimized split structure. Each object is saved to its own file in `doc/objects/[A-Z]/`, and lightweight cloud index files are created.

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

## 📖 Additional Documentation

- [SPLIT_STRUCTURE.md](./SPLIT_STRUCTURE.md) - Details about the optimized file structure
- [MULTI_CLOUD_OBJECTS.md](./MULTI_CLOUD_OBJECTS.md) - How objects shared across clouds are handled
- [TESTING.md](./TESTING.md) - Testing guide and coverage
- [PUBLISHING.md](./PUBLISHING.md) - Publishing workflow
- [SETUP.md](./SETUP.md) - Setup and configuration

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
