# Salesforce Data Cloud DMO Reference

[![npm version](https://img.shields.io/npm/v/@sf-explorer/salesforce-object-ssot-reference.svg)](https://www.npmjs.com/package/@sf-explorer/salesforce-object-ssot-reference)
[![license](https://img.shields.io/npm/l/@sf-explorer/salesforce-object-ssot-reference.svg)](https://github.com/sf-explorer/sf-doc-to-json/blob/main/LICENSE)

**Data Cloud Data Model Objects (DMOs)** from Salesforce documentation.

This package provides programmatic access to Salesforce Data Cloud DMO schemas - the canonical data model used for data harmonization and unified customer profiles in Data Cloud.

## 🎯 What Are DMOs?

**Data Model Objects (DMOs)** are the foundation of Salesforce Data Cloud. They define the canonical data model for harmonizing data from multiple sources into unified customer profiles.

> ⚠️ **Important**: DMOs are NOT the same as standard Salesforce CRM objects!
> - CRM `Contact` ≠ DMO `Individual` (though they represent similar concepts)
> - CRM `Account` ≠ DMO `Account` (DMOs have different fields and purposes)
> - DMO API names follow the pattern: `ssot__ObjectName__dlm`

### DMO vs Standard Objects

| Package | Object Type | Example | Use Case |
|---------|-------------|---------|----------|
| `salesforce-object-reference` | CRM Objects | `Account`, `Contact` | Sales, Service, Marketing |
| `salesforce-object-ssot-reference` | DMO Objects | `Individual`, `SalesOrder` | Data Cloud harmonization |

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
console.log(`${index.totalObjects} DMO objects available`);

// Get a specific DMO (full details with all fields)
// Can use display name or API name (ssot__Individual__dlm)
const individual = await getObject('Individual');
if (individual) {
  console.log(individual.name);        // "Individual"
  console.log(individual.description); // "The Individual DMO represents..."
  console.log(Object.keys(individual.properties).length + ' fields');
}

// Get just the description and field count (much faster!)
const desc = await getObjectDescription('ssot__SalesOrder__dlm');
if (desc) {
  console.log(desc.description);  // DMO description
  console.log(desc.fieldCount);   // Number of fields (85)
}

// Search for DMOs by name pattern
const loyaltyDMOs = await searchObjects(/loyalty/i);
console.log(`Found ${loyaltyDMOs.length} Loyalty-related DMOs`);

// Search by description content
const engagementDMOs = await searchObjectsByDescription('engagement');
engagementDMOs.forEach(obj => {
  console.log(`${obj.name} - ${obj.fieldCount} fields`);
});

// Get all DMO API names
const allNames = await getAllObjectNames();
console.log('Available DMOs:', allNames);
// Output: ['ssot__Account__dlm', 'ssot__Individual__dlm', ...]
```

### Common DMO Objects

| DMO Name | Display Name | Description |
|----------|--------------|-------------|
| `ssot__Individual__dlm` | Individual | Represents contacts/customers (like CRM Contact) |
| `ssot__SalesOrder__dlm` | Sales Order | Current and pending sales orders |
| `ssot__GoodsProduct__dlm` | Goods Product | Product catalog items |
| `ssot__LoyaltyProgramMember__dlm` | Loyalty Program Member | Loyalty program memberships |
| `ssot__EmailEngagement__dlm` | Email Engagement | Email interaction data |

## 📂 Data Structure

```
src/doc/
├── index.json        # Master index (keys are API names like ssot__Individual__dlm)
└── objects/          # Individual DMO files (organized by display name)
    ├── A/
    │   ├── Account.json
    │   ├── Account Contact.json
    │   └── ...
    ├── I/
    │   ├── Individual.json
    │   └── ...
    ├── S/
    │   ├── Sales Order.json
    │   └── ...
    └── ...
```

## 📚 API Reference

### Core Functions

#### `loadIndex(useCache?: boolean): Promise<DocumentIndex | null>`
Load the master index containing all DMO objects.

#### `getObject(nameOrApiName: string, useCache?: boolean): Promise<SalesforceObject | null>`
Get detailed information about a specific DMO. Accepts either:
- Display name: `'Individual'`
- API name: `'ssot__Individual__dlm'`

#### `searchObjects(pattern: string | RegExp, useCache?: boolean): Promise<Array<{name, description, fieldCount}>>`
Search for DMOs by API name pattern.

#### `getAllObjectNames(useCache?: boolean): Promise<string[]>`
Get list of all available DMO API names (in `ssot__*__dlm` format).

### Lightweight Descriptions API

#### `loadAllDescriptions(useCache?: boolean): Promise<Record<string, DescriptionInfo> | null>`
Load descriptions and field counts for all DMOs at once.

#### `getObjectDescription(nameOrApiName: string, useCache?: boolean): Promise<DescriptionInfo | null>`
Get description and field count for a specific DMO.

#### `searchObjectsByDescription(pattern: string | RegExp, useCache?: boolean): Promise<DescriptionSearchResult[]>`
Search for DMOs by description content.

#### `loadAllObjects(useCache?: boolean): Promise<SalesforceObjectCollection>`
Load all DMOs with full details.

#### `clearCache(): void`
Clear all cached data.

## 🌐 Browser Support

Works in all modern browsers when bundled with Vite, Webpack, Rollup, or other modern bundlers.

```typescript
// Works perfectly in the browser after bundling!
import { getObject } from '@sf-explorer/salesforce-object-ssot-reference';

const individual = await getObject('Individual');
```

## 🔄 Generating Fresh Data

To fetch fresh DMO data from Salesforce documentation:

```bash
npm run fetch:dmo
```

## 🤝 Related Packages

- [`@sf-explorer/salesforce-object-reference`](../salesforce-object-reference) - Standard CRM objects from Salesforce documentation
- [`@sf-explorer/salesforce-metadata-reference`](../salesforce-metadata-reference) - Metadata API objects
- [`@sf-explorer/salesforce-agentforce-actions-reference`](../salesforce-agentforce-actions-reference) - Agentforce standard actions

## 📄 License

MIT License - see [LICENSE](../../LICENSE)

## 📖 Links

- [NPM Package](https://www.npmjs.com/package/@sf-explorer/salesforce-object-ssot-reference)
- [GitHub Repository](https://github.com/sf-explorer/sf-doc-to-json)
- [Issue Tracker](https://github.com/sf-explorer/sf-doc-to-json/issues)
- [Salesforce Data Cloud DMO Documentation](https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html)

---

**Note:** This package contains data from Salesforce Data Cloud documentation. It is not officially affiliated with or endorsed by Salesforce.

