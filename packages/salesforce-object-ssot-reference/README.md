# Salesforce Object SSOT Reference

[![npm version](https://img.shields.io/npm/v/@sf-explorer/salesforce-object-ssot-reference.svg)](https://www.npmjs.com/package/@sf-explorer/salesforce-object-ssot-reference)
[![license](https://img.shields.io/npm/l/@sf-explorer/salesforce-object-ssot-reference.svg)](https://github.com/sf-explorer/sf-doc-to-json/blob/main/LICENSE)

Single Source of Truth (SSOT) Salesforce object reference from Data Model Object (DMO) APIs.

This package provides programmatic access to Salesforce object schemas obtained directly from the DMO APIs, representing the authoritative data model structure.

## 🎯 What Makes This Different?

While [`@sf-explorer/salesforce-object-reference`](../salesforce-object-reference) contains data scraped from Salesforce documentation, this package contains data obtained directly from Salesforce DMO (Data Model Object) APIs, making it the **Single Source of Truth** for Salesforce data models.

## 📦 Installation

```bash
npm install @sf-explorer/salesforce-object-ssot-reference
```

## 🚀 Quick Start

### Basic Usage

```typescript
import {
  loadIndex,
  getObject,
  searchObjects,
  getAllObjectNames,
  getObjectDescription,
  searchObjectsByDescription
} from '@sf-explorer/salesforce-object-ssot-reference';

// Load index to see what's available
const index = await loadIndex();
console.log(`${index.totalObjects} SSOT objects available`);

// Get a specific object (full details with all fields)
const account = await getObject('Account');
if (account) {
  console.log(account.name);
  console.log(account.description);
  console.log(Object.keys(account.properties).length + ' fields');
}

// Get just the description and field count (much faster!)
const accountDesc = await getObjectDescription('Account');
if (accountDesc) {
  console.log(accountDesc.label);        // "Account"
  console.log(accountDesc.description);  // Object description
  console.log(accountDesc.fieldCount);   // Number of fields
}

// Search for objects by name
const results = await searchObjects(/account/i);
console.log(`Found ${results.length} objects`);

// Search by description content
const invoiceObjects = await searchObjectsByDescription('invoice');
invoiceObjects.forEach(obj => {
  console.log(`${obj.name} - ${obj.fieldCount} fields`);
});

// Get all object names
const allNames = await getAllObjectNames();
console.log('Available objects:', allNames);
```

## 📂 Data Structure

```
src/doc/
├── index.json        # Master index
└── objects/          # Individual object files
    ├── A/
    │   ├── Account.json
    │   ├── Applicant.json
    │   └── ...
    ├── B/
    └── ...
```

## 📚 API Reference

### Core Functions

#### `loadIndex(useCache?: boolean): Promise<DocumentIndex | null>`
Load the master index containing all SSOT objects from DMO APIs.

#### `getObject(objectName: string, useCache?: boolean): Promise<SalesforceObject | null>`
Get detailed information about a specific Salesforce SSOT object.

#### `searchObjects(pattern: string | RegExp, useCache?: boolean): Promise<Array<{name, description, fieldCount}>>`
Search for SSOT objects by name pattern.

#### `getAllObjectNames(useCache?: boolean): Promise<string[]>`
Get list of all available SSOT object names.

### Lightweight Descriptions API

#### `loadAllDescriptions(useCache?: boolean): Promise<Record<string, DescriptionInfo> | null>`
Load descriptions and field counts for all SSOT objects at once.

#### `getObjectDescription(objectName: string, useCache?: boolean): Promise<DescriptionInfo | null>`
Get description and field count for a specific SSOT object.

#### `searchObjectsByDescription(pattern: string | RegExp, useCache?: boolean): Promise<DescriptionSearchResult[]>`
Search for SSOT objects by description content.

#### `loadAllObjects(useCache?: boolean): Promise<SalesforceObjectCollection>`
Load all SSOT objects with full details.

#### `clearCache(): void`
Clear all cached data.

## 🌐 Browser Support

Works in all modern browsers when bundled with Vite, Webpack, Rollup, or other modern bundlers.

```typescript
// Works perfectly in the browser after bundling!
import { getObjectDescription } from '@sf-explorer/salesforce-object-ssot-reference';

const desc = await getObjectDescription('Account');
```

## 🔄 Generating Fresh Data

To fetch fresh SSOT data from DMO APIs:

```bash
npm run fetch:dmo
```

## 🤝 Related Packages

- [`@sf-explorer/salesforce-object-reference`](../salesforce-object-reference) - Salesforce objects from official documentation

## 📄 License

MIT License - see [LICENSE](../../LICENSE)

## 📖 Links

- [NPM Package](https://www.npmjs.com/package/@sf-explorer/salesforce-object-ssot-reference)
- [GitHub Repository](https://github.com/sf-explorer/sf-doc-to-json)
- [Issue Tracker](https://github.com/sf-explorer/sf-doc-to-json/issues)

---

**Note:** This package contains data from Salesforce DMO APIs. It is not officially affiliated with or endorsed by Salesforce.

