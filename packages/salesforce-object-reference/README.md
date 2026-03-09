# Salesforce Object Reference

[![npm version](https://img.shields.io/npm/v/@sf-explorer/salesforce-object-reference.svg)](https://www.npmjs.com/package/@sf-explorer/salesforce-object-reference)
[![license](https://img.shields.io/npm/l/@sf-explorer/salesforce-object-reference.svg)](https://github.com/sf-explorer/sf-doc-to-json/blob/main/LICENSE)

Standard Salesforce objects scraped from official documentation.

This package provides programmatic access to 2,500+ standard Salesforce objects from all clouds including Core Salesforce, Financial Services Cloud, Health Cloud, Manufacturing Cloud, and more.

## Installation

```bash
npm install @sf-explorer/salesforce-object-reference
```

## Quick Start

```typescript
import {
  loadIndex,
  getObject,
  searchObjects,
  getAvailableClouds,
  getObjectsByCloud
} from '@sf-explorer/salesforce-object-reference';

// Load index
const index = await loadIndex();
console.log(`${index.totalObjects} objects available`);

// Get a specific object
const account = await getObject('Account');
if (account) {
  console.log(account.name);
  console.log(account.description);
  console.log(Object.keys(account.properties).length, 'fields');
}

// Search objects
const results = await searchObjects(/opportunity/i);
console.log(`Found ${results.length} opportunity-related objects`);

// Get objects by cloud
const fscObjects = await getObjectsByCloud('Financial Services Cloud');
console.log(`${fscObjects.length} Financial Services Cloud objects`);
```

## Data Structure

```
src/doc/
├── index.json                    # Master index with all objects
├── core-salesforce.json          # Core Salesforce cloud index
├── financial-services-cloud.json # FSC cloud index
├── health-cloud.json             # Health Cloud index
└── objects/                      # Individual object files
    ├── A/
    │   ├── Account.json
    │   ├── AccountContactRelation.json
    │   └── ...
    ├── C/
    │   ├── Contact.json
    │   ├── Case.json
    │   └── ...
    └── ...
```

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `loadIndex()` | Load master index with all objects |
| `getObject(name)` | Get full object details by name |
| `searchObjects(pattern)` | Search objects by name pattern |
| `getAllObjectNames()` | Get array of all object names |

### Cloud Functions

| Function | Description |
|----------|-------------|
| `getAvailableClouds()` | Get list of all available clouds |
| `getObjectsByCloud(cloudName)` | Get all objects for a specific cloud |
| `getAllCloudMetadata()` | Get metadata for all clouds |
| `getCloudMetadata(cloudName)` | Get metadata for a specific cloud |

### Description Functions (Lightweight)

| Function | Description |
|----------|-------------|
| `loadAllDescriptions()` | Load all descriptions without full objects |
| `getObjectDescription(name)` | Get description for a specific object |
| `searchObjectsByDescription(pattern)` | Search by description content |
| `getDescriptionsByCloud(cloudName)` | Get descriptions for a cloud |

### Access Rules Functions

| Function | Description |
|----------|-------------|
| `searchObjectsByAccessRules(pattern)` | Search by access rules |
| `getObjectsWithAccessRules()` | Get objects requiring special access |
| `getObjectsWithStandardAccess()` | Get objects with standard access |

### Utility Functions

| Function | Description |
|----------|-------------|
| `clearCache()` | Clear all cached data |
| `preloadClouds(cloudFileNames)` | Preload specific clouds into cache |

## Available Clouds

- Core Salesforce
- Financial Services Cloud
- Health Cloud
- Manufacturing Cloud
- Nonprofit Cloud
- Education Cloud
- Automotive Cloud
- Consumer Goods Cloud
- Energy and Utilities Cloud
- Net Zero Cloud
- Public Sector Cloud
- Revenue Lifecycle Management
- Field Service Lightning
- Loyalty
- Scheduler
- Feedback Management
- Sales Cloud
- Service Cloud
- Tooling API

## Types

```typescript
interface SalesforceObject {
  name: string;
  description: string;
  properties: Record<string, FieldProperty>;
  module: string;
  sourceUrl?: string;
  accessRules?: string;
}

interface FieldProperty {
  type: string;
  description: string;
}
```

## Usage Examples

### Get Object Fields

```typescript
const account = await getObject('Account');
if (account) {
  for (const [fieldName, field] of Object.entries(account.properties)) {
    console.log(`${fieldName}: ${field.type} - ${field.description}`);
  }
}
```

### Filter by Cloud

```typescript
const clouds = await getAvailableClouds();
for (const cloud of clouds) {
  const objects = await getObjectsByCloud(cloud);
  console.log(`${cloud}: ${objects.length} objects`);
}
```

### Search with Regex

```typescript
// Find all objects related to "Financial"
const financial = await searchObjects(/financial/i);

// Find objects ending with "History"
const history = await searchObjects(/History$/);
```

## Related Packages

- [@sf-explorer/salesforce-metadata-reference](../salesforce-metadata-reference) - Metadata API objects
- [@sf-explorer/salesforce-object-ssot-reference](../salesforce-object-ssot-reference) - Data Cloud DMO objects
- [@sf-explorer/salesforce-agentforce-actions-reference](../salesforce-agentforce-actions-reference) - Agentforce actions

## License

MIT License - see [LICENSE](../../LICENSE)
