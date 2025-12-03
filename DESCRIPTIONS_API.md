# Object Descriptions API

## Overview

The Object Descriptions API allows you to retrieve all Salesforce object descriptions without loading the full object data (including all field properties). This is **140x more efficient** than loading all objects when you only need descriptions.

## Why Use This?

### Performance Benefits

- **Traditional approach**: Load all ~3,400 objects with all fields → ~100MB+ of JSON data
- **Descriptions API**: Load only descriptions and field counts from index → ~1.5MB of JSON data (100x smaller!)
- **Use cases**: Perfect for search, autocomplete, listings, object browsers, etc.

## Setup

**No setup required!** Descriptions and field counts are now included directly in the main `index.json` file (~1.5MB). The package automatically uses this data when you call the descriptions API functions.

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
//     fieldCount: 106
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
if (accountDesc) {
  console.log(accountDesc.description);
  // "Represents an individual account, which is an organization or person..."
  
  console.log(accountDesc.cloud);
  // "Core Salesforce"
  
  console.log(accountDesc.fieldCount);
  // 106
}
```

### 3. `searchObjectsByDescription(pattern: string | RegExp, useCache?: boolean)`

Search for objects by description content.

```typescript
import { searchObjectsByDescription } from '@sf-explorer/salesforce-object-reference';

// String search (case-insensitive)
const invoiceObjects = await searchObjectsByDescription('invoice');

// Regex search
const healthObjects = await searchObjectsByDescription(/health|medical/i);

// Results include name, description, cloud, and fieldCount
invoiceObjects.forEach(obj => {
  console.log(`${obj.name} (${obj.cloud}) - ${obj.fieldCount} fields`);
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
//     fieldCount: 42
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
interface DescriptionInfo {
  description: string;
  cloud: string;
  fieldCount: number;
}

interface DescriptionSearchResult {
  name: string;
  description: string;
  cloud: string;
  fieldCount: number;
}
```

## Use Cases

### 1. Object Browser/Explorer

```typescript
const descriptions = await loadAllDescriptions();
const objectNames = Object.keys(descriptions).sort();

// Display list of objects with descriptions
objectNames.forEach(name => {
  const desc = descriptions[name];
  console.log(`${name} (${desc.fieldCount} fields) - ${desc.description.substring(0, 100)}...`);
});
```

### 2. Search Autocomplete

```typescript
async function autocompleteSearch(query: string) {
  const results = await searchObjectsByDescription(query);
  return results.map(obj => ({
    label: obj.name,
    description: obj.description,
    cloud: obj.cloud,
    fieldCount: obj.fieldCount
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
    console.log(`- **${name}** (${info.fieldCount} fields): ${info.description}`);
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

When you regenerate documentation with the scraper, descriptions and field counts are automatically included in the index:

```bash
npm run fetch:all
```

This will:
1. Scrape all Salesforce objects from documentation
2. Extract descriptions and count fields for each object
3. Include this metadata in `doc/index.json` (~1.5MB)
4. Update the timestamp

## Performance Comparison

| Metric | Full Objects | Descriptions Only |
|--------|-------------|-------------------|
| File Size | ~100MB+ | ~1.5MB |
| Memory Usage | ~200MB+ | ~5MB |
| Load Time | ~5-10s | ~50ms |
| Files Read | 3,000+ | 1 |
| Ideal For | Full object details with all fields | Search, browse, list, quick stats |

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

- Descriptions and field counts are automatically included in `index.json` (no separate file needed)
- Caching is enabled by default for better performance
- All functions are async for consistency with the rest of the API
- Use `clearCache()` if you need to reload fresh data during runtime
- All functions handle null cases gracefully - always check for null returns








