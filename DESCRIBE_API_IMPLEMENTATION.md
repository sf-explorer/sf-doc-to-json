# Describe API Package - Implementation Summary

## Overview

Created a separate npm package (`@sf-explorer/describe-api`) that connects to Salesforce orgs using jsforce and the Describe API to fetch real-time object metadata and convert it to JSON Schema format.

## Package Structure

```
describe-api/
├── package.json              # Separate package with jsforce dependency
├── tsconfig.json            # TypeScript configuration
├── README.md                # Comprehensive documentation
├── setup.sh                 # Setup script
├── .gitignore              # Git ignore rules
└── src/
    ├── types.ts            # TypeScript interfaces
    ├── client.ts           # Salesforce connection client
    ├── converter.ts        # Describe → JSON Schema converter
    ├── runner.ts           # High-level API (fetchAndConvert, fetchAndSave)
    ├── index.ts            # Main exports
    ├── cli-describe.ts     # CLI tool
    └── example.ts          # Usage examples
```

## Key Features

### 1. **JSON Schema Conversion**
- Converts Salesforce Describe API results to JSON Schema Draft 2020-12
- Maps all Salesforce field types to appropriate JSON Schema types
- Includes format specifiers (email, uri, date, date-time, etc.)

### 2. **Enum Support**
- Extracts picklist values and maps them to `enum` arrays
- Includes `format: "enum"` for picklist fields
- Only includes active picklist values

### 3. **Relationship Fields**
- `x-object: "ObjectName"` for single references (lookup/master-detail)
- `x-objects: ["Obj1", "Obj2"]` for polymorphic references
- Properly handles Name lookup polymorphism (Who/What fields)

### 4. **Field Constraints**
- `maxLength` for string fields
- `maximum`, `minimum`, `multipleOf` for numeric fields
- `nullable` based on field's nillable property
- `readOnly` for calculated/formula fields

### 5. **Salesforce Metadata**
- `x-salesforce` extension with:
  - Object name, label, labelPlural
  - Key prefix (3-character ID prefix)
  - CRUD flags (createable, updateable, deletable, queryable, searchable)

## Type Mappings

| Salesforce Type | JSON Schema Type | Format |
|----------------|------------------|---------|
| string, textarea | string | - |
| id, reference | string | salesforce-id |
| email | string | email |
| url | string | uri |
| phone | string | phone |
| picklist, multipicklist | string | enum |
| int | integer | - |
| double, currency, percent | number | currency/percent |
| boolean | boolean | - |
| date | string | date |
| datetime | string | date-time |
| time | string | time |
| address, location | object | - |

## API

### Client Class: `SalesforceDescribeClient`

```typescript
const client = new SalesforceDescribeClient();
await client.connect(config);

// Single object
const describe = await client.describeObject('Account');

// Multiple objects
const describes = await client.describeObjects(['Account', 'Contact']);

// All objects (with progress callback)
const all = await client.describeAllObjects(10, (current, total, name) => {
  console.log(`${current}/${total}: ${name}`);
});

client.disconnect();
```

### High-Level Functions

```typescript
// Fetch and convert to JSON Schema
const schemas = await fetchAndConvert({
  connection: {
    loginUrl: 'https://login.salesforce.com',
    username: 'user@example.com',
    password: 'password',
    securityToken: 'token',
  },
  objects: ['Account', 'Contact'],  // Optional: all if not specified
  includeMetadata: true,
  batchSize: 10,
});

// Fetch and save to files
await fetchAndSave({
  connection: { /* ... */ },
  outputDir: './schemas',
  objects: ['Account'],
  batchSize: 10,
});
```

## CLI Tool

```bash
# Environment variables
export SF_USERNAME="user@example.com"
export SF_PASSWORD="password"
export SF_SECURITY_TOKEN="token"  # optional
export SF_LOGIN_URL="https://login.salesforce.com"

# Run
npx sf-describe-fetch

# Options via environment
SF_OBJECTS="Account,Contact" npx sf-describe-fetch
SF_OUTPUT_DIR="./my-schemas" npx sf-describe-fetch
SF_BATCH_SIZE="5" npx sf-describe-fetch
```

## Example Output

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Accounts",
  "description": "Accounts - Account",
  "type": "object",
  "properties": {
    "Name": {
      "type": "string",
      "description": "Account Name",
      "maxLength": 255,
      "nullable": false
    },
    "Type": {
      "type": "string",
      "format": "enum",
      "description": "Account Type",
      "enum": ["Prospect", "Customer - Direct", "Customer - Channel", "Channel Partner / Reseller", "Installation Partner", "Technology Partner", "Other"]
    },
    "Industry": {
      "type": "string",
      "format": "enum",
      "description": "Industry",
      "enum": ["Agriculture", "Apparel", "Banking", "Biotechnology", ...]
    },
    "AnnualRevenue": {
      "type": "number",
      "format": "currency",
      "description": "Annual Revenue",
      "nullable": true
    },
    "OwnerId": {
      "type": "string",
      "format": "salesforce-id",
      "description": "Owner ID",
      "x-objects": ["User", "Queue"]
    },
    "ParentId": {
      "type": "string",
      "format": "salesforce-id",
      "description": "Parent Account ID",
      "x-object": "Account",
      "nullable": true
    }
  },
  "required": ["Name"],
  "x-salesforce": {
    "name": "Account",
    "label": "Account",
    "labelPlural": "Accounts",
    "keyPrefix": "001",
    "custom": false,
    "createable": true,
    "updateable": true,
    "deletable": true,
    "queryable": true,
    "searchable": true
  }
}
```

## Installation & Setup

```bash
# Navigate to package
cd describe-api

# Run setup
chmod +x setup.sh
./setup.sh

# Or manually
npm install
npm run build
```

## Usage Examples

The package includes three examples in `src/example.ts`:

1. **Example 1**: Fetch specific objects
2. **Example 2**: Save all objects to files
3. **Example 3**: Show enriched schema with relationships and enums

```bash
npm run example 1  # Fetch Account, Contact, Opportunity
npm run example 2  # Fetch and save all objects
npm run example 3  # Show Account schema details
```

## Benefits vs Documentation Scraping

| Feature | Doc Scraping | Describe API |
|---------|-------------|--------------|
| Custom Fields | ❌ | ✅ |
| Org-Specific | ❌ | ✅ |
| Real-time | ❌ | ✅ |
| Exact Picklist Values | ❌ | ✅ |
| Custom Objects | ❌ | ✅ |
| Requires Auth | ❌ | ✅ |
| Offline | ✅ | ❌ |

## Use Cases

1. **Generate TypeScript types** from exact org schema
2. **Validate data** before Salesforce API calls
3. **Document APIs** with real org configuration
4. **Compare schemas** between dev/staging/prod
5. **Migration planning** - identify schema differences
6. **Integration testing** - test against real schemas
7. **Form generation** - build forms from schema
8. **Data modeling** - understand relationships

## Dependencies

- `jsforce`: ^2.0.0 - Salesforce API client
- `typescript`: ^5.3.0 - TypeScript compiler (dev)
- `@types/node`: ^20.10.0 - Node.js types (dev)

## Future Enhancements

Potential improvements:

1. **Caching** - Cache describe results to avoid repeated API calls
2. **Incremental updates** - Only fetch changed objects
3. **Schema diffing** - Compare schemas between orgs
4. **TypeScript generation** - Generate TypeScript types from schemas
5. **Validation functions** - Generate validation functions from schemas
6. **Custom field filtering** - Options to include/exclude custom fields
7. **Relationship graph** - Visualize object relationships
8. **Field dependencies** - Track field dependencies and controlling fields

## Documentation

- **Main README**: [describe-api/README.md](../describe-api/README.md)
- **Overview**: [DESCRIBE_API.md](../DESCRIBE_API.md)
- **Examples**: `describe-api/src/example.ts`

## Integration

The describe-api package is **independent** from the main package:

- Separate `package.json` with its own dependencies
- Separate build process
- Can be published separately
- No coupling with documentation scraper
- Can be used standalone or alongside main package

## Summary

The Describe API integration provides a powerful way to get accurate, real-time Salesforce metadata in JSON Schema format. It complements the documentation scraping approach by offering org-specific data including custom fields, exact picklist values, and complete relationship information.

