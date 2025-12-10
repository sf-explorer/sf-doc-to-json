# Salesforce Metadata Reference

[![npm version](https://img.shields.io/npm/v/@sf-explorer/salesforce-metadata-reference.svg)](https://www.npmjs.com/package/@sf-explorer/salesforce-metadata-reference)
[![license](https://img.shields.io/npm/l/@sf-explorer/salesforce-metadata-reference.svg)](https://github.com/sf-explorer/sf-doc-to-json/blob/main/LICENSE)

Salesforce Metadata API object reference from official documentation.

This package provides programmatic access to Salesforce Metadata API types including CustomObject, ApexClass, Flow, and other components used in deployments and package development.

## 📦 Installation

```bash
npm install @sf-explorer/salesforce-metadata-reference
```

## 🚀 Quick Start

```typescript
import {
  loadIndex,
  getObject,
  searchObjects,
  getAllObjectNames,
  getObjectDescription
} from '@sf-explorer/salesforce-metadata-reference';

// Load index
const index = await loadIndex();
console.log(`${index.totalObjects} metadata types available`);

// Get a metadata type
const customObject = await getObject('CustomObject');
if (customObject) {
  console.log(customObject.name);
  console.log(customObject.description);
}

// Search metadata types
const flowTypes = await searchObjects(/flow/i);
console.log(`Found ${flowTypes.length} flow-related types`);
```

## 📂 Data Structure

```
src/doc/
├── index.json        # Master index
└── objects/          # Individual metadata type files
    ├── A/
    │   ├── AccessMapping.json
    │   ├── ApexClass.json
    │   └── ...
    ├── C/
    │   ├── CustomObject.json
    │   └── ...
    └── ...
```

## 📚 API Reference

All functions match the standard API across `@sf-explorer` packages:

- `loadIndex()` - Load master index
- `getObject(name)` - Get metadata type details
- `searchObjects(pattern)` - Search by name
- `getAllObjectNames()` - Get all type names
- `getObjectDescription(name)` - Get lightweight metadata
- `clearCache()` - Clear cached data

## 🔗 Related Packages

- [@sf-explorer/salesforce-object-reference](../salesforce-object-reference) - Standard objects
- [@sf-explorer/salesforce-object-ssot-reference](../salesforce-object-ssot-reference) - SSOT objects

## 📄 License

MIT License - see [LICENSE](../../LICENSE)


