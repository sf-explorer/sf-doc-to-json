# Object Descriptions API

## Overview

The Object Descriptions API allows you to retrieve all Salesforce object descriptions without loading the full object data (including all field properties). This is **140x more efficient** than loading all objects when you only need descriptions.

## Why Use This?

### Performance Benefits

- **Traditional approach**: Load all ~3,400 objects with all fields → ~100MB+ of JSON data
- **Descriptions API**: Load only descriptions → ~700KB of JSON data (140x smaller!)
- **Use cases**: Perfect for search, autocomplete, listings, object browsers, etc.

## Setup

First, generate the descriptions index file:

```bash
npm run generate:descriptions
```

This creates `/doc/descriptions.json` containing all object descriptions (~700KB).

## API Functions

### 1. `loadAllDescriptions(useCache?: boolean)`

Load all object descriptions at once.

```typescript
import { loadAllDescriptions } from '@sf-explorer/salesforce-object-reference';

const descriptions = await loadAllDescriptions();
// Returns: { 
//   "Account": { 
//     description: "Represents an individual account...",
//     cloud: "Core Salesforce",
//     module: "Core Salesforce"
//   },
//   "Contact": { ... },
//   ...
// }
```

### 2. `getObjectDescription(objectName: string, useCache?: boolean)`

Get description for a specific object.

```typescript
import { getObjectDescription } from '@sf-explorer/salesforce-object-reference';

const accountDesc = await getObjectDescription('Account');
console.log(accountDesc.description);
// "Represents an individual account, which is an organization or person..."

console.log(accountDesc.cloud);
// "Core Salesforce"
```

### 3. `searchObjectsByDescription(pattern: string | RegExp, useCache?: boolean)`

Search for objects by description content.

```typescript
import { searchObjectsByDescription } from '@sf-explorer/salesforce-object-reference';

// String search (case-insensitive)
const invoiceObjects = await searchObjectsByDescription('invoice');

// Regex search
const healthObjects = await searchObjectsByDescription(/health|medical/i);

// Results include name, description, cloud, and module
invoiceObjects.forEach(obj => {
  console.log(`${obj.name} (${obj.cloud})`);
  console.log(obj.description);
});
```

### 4. `getDescriptionsByCloud(cloudName: string, useCache?: boolean)`

Get all descriptions for objects in a specific cloud.

```typescript
import { getDescriptionsByCloud } from '@sf-explorer/salesforce-object-reference';

const fscObjects = await getDescriptionsByCloud('Financial Services Cloud');
console.log(`Found ${Object.keys(fscObjects).length} objects`);

// Returns: {
//   "FinancialAccount": {
//     description: "Represents a financial account...",
//     module: "Financial Services Cloud"
//   },
//   ...
// }
```

## Caching

All functions support caching (enabled by default):

```typescript
// First call: loads from file
const descriptions1 = await loadAllDescriptions();

// Second call: returns cached data (instant)
const descriptions2 = await loadAllDescriptions();

// Clear cache if needed
import { clearCache } from '@sf-explorer/salesforce-object-reference';
clearCache();
```

## TypeScript Types

```typescript
interface ObjectDescription {
  description: string;
  cloud: string;
  module: string;
}

type DescriptionsIndex = Record<string, ObjectDescription>;
```

## Use Cases

### 1. Object Browser/Explorer

```typescript
const descriptions = await loadAllDescriptions();
const objectNames = Object.keys(descriptions).sort();

// Display list of objects with descriptions
objectNames.forEach(name => {
  const desc = descriptions[name];
  console.log(`${name} - ${desc.description.substring(0, 100)}...`);
});
```

### 2. Search Autocomplete

```typescript
async function autocompleteSearch(query: string) {
  const results = await searchObjectsByDescription(query);
  return results.map(obj => ({
    label: obj.name,
    description: obj.description,
    cloud: obj.cloud
  }));
}
```

### 3. Cloud-Specific Documentation

```typescript
const clouds = [
  'Core Salesforce',
  'Financial Services Cloud',
  'Health Cloud',
  'Manufacturing Cloud'
];

for (const cloud of clouds) {
  const objects = await getDescriptionsByCloud(cloud);
  console.log(`\n## ${cloud} (${Object.keys(objects).length} objects)\n`);
  
  for (const [name, info] of Object.entries(objects)) {
    console.log(`- **${name}**: ${info.description}`);
  }
}
```

### 4. Object Discovery

```typescript
// Find all objects related to a specific domain
const paymentObjects = await searchObjectsByDescription(/payment|transaction|billing/i);
const locationObjects = await searchObjectsByDescription(/address|location|geolocation/i);
const healthObjects = await searchObjectsByDescription(/patient|health|medical/i);
```

## Regenerating the Index

If you update the object files in `/doc/objects/`, regenerate the descriptions index:

```bash
npm run generate:descriptions
```

This will:
1. Scan all ~3,400 object files
2. Extract just the descriptions
3. Create a lightweight index file (~700KB)
4. Update the timestamp

## Performance Comparison

| Metric | Full Objects | Descriptions Only |
|--------|-------------|-------------------|
| File Size | ~100MB+ | ~700KB |
| Memory Usage | ~200MB+ | ~2MB |
| Load Time | ~5-10s | ~50ms |
| Files Read | 3,400+ | 1 |
| Ideal For | Full object details | Search, browse, list |

## Browser Support

The descriptions API works in both Node.js and browsers:

```html
<script type="module">
  import { loadAllDescriptions } from './dist/index.js';
  
  const descriptions = await loadAllDescriptions();
  console.log('Loaded', Object.keys(descriptions).length, 'descriptions');
</script>
```

## Notes

- The descriptions index is automatically included in the published package
- Caching is enabled by default for better performance
- All functions are async for consistency with the rest of the API
- Use `clearCache()` if you need to reload fresh data during runtime


