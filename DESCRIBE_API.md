# Salesforce Describe API Integration

A separate package (`@sf-explorer/describe-api`) that connects to Salesforce using jsforce and the Describe API to fetch accurate object metadata and convert it to JSON Schema format.

## Overview

While the main `@sf-explorer/salesforce-object-reference` package provides pre-scraped Salesforce documentation, the `@sf-explorer/describe-api` package connects directly to **your Salesforce org** to get real-time metadata including:

- ✅ All custom fields and objects from your org
- ✅ Real picklist values (as `enum` arrays)  
- ✅ Relationship fields (`x-object` for single references, `x-objects` for polymorphic)
- ✅ Field constraints (maxLength, nullable, readOnly, etc.)
- ✅ JSON Schema standard format

## Location

The Describe API package is located in the `describe-api/` directory and is a **separate npm package** with its own dependencies.

```
sf-doc-to-json/
├── describe-api/              # Separate package
│   ├── package.json           # Has jsforce as dependency
│   ├── src/
│   │   ├── client.ts         # Salesforce connection
│   │   ├── converter.ts      # Describe → JSON Schema
│   │   ├── types.ts          # TypeScript types
│   │   ├── runner.ts         # High-level API
│   │   ├── cli-describe.ts   # CLI tool
│   │   └── example.ts        # Usage examples
│   └── README.md
```

## Installation

```bash
cd describe-api
npm install
```

## Quick Start

See the [describe-api/README.md](./describe-api/README.md) for full documentation.

### CLI Usage

```bash
cd describe-api

# Set credentials
export SF_USERNAME="your-username@example.com"
export SF_PASSWORD="your-password"
export SF_SECURITY_TOKEN="your-token"

# Fetch all objects
npm start

# Fetch specific objects
SF_OBJECTS="Account,Contact,Opportunity" npm start
```

### Programmatic Usage

```typescript
import { fetchAndConvert } from '@sf-explorer/describe-api';

const schemas = await fetchAndConvert({
  connection: {
    loginUrl: 'https://login.salesforce.com',
    username: 'user@example.com',
    password: 'password',
  },
  objects: ['Account', 'Contact', 'Opportunity'],
});
```

## Output Format

The generated schemas follow JSON Schema standard with Salesforce extensions:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Accounts",
  "type": "object",
  "properties": {
    "Type": {
      "type": "string",
      "format": "enum",
      "enum": ["Prospect", "Customer", "Partner"]
    },
    "OwnerId": {
      "type": "string",
      "format": "salesforce-id",
      "x-object": "User"
    }
  },
  "x-salesforce": {
    "keyPrefix": "001",
    "createable": true
  }
}
```

## Custom Extensions

- `format: "enum"` - Field is a picklist
- `enum: [...]` - Available picklist values
- `x-object: "ObjectName"` - Single reference (lookup/master-detail)
- `x-objects: ["Obj1", "Obj2"]` - Polymorphic reference
- `x-salesforce: {...}` - Salesforce metadata (keyPrefix, CRUD flags, etc.)

## Benefits Over Documentation Scraping

| Feature | Documentation Scraping | Describe API |
|---------|----------------------|--------------|
| Custom Fields | ❌ No | ✅ Yes |
| Org-Specific Config | ❌ No | ✅ Yes |
| Real-time Data | ❌ No | ✅ Yes |
| Picklist Values | ❌ Generic | ✅ Your org's values |
| Setup Required | ❌ None | ✅ Org credentials |

## Use Cases

1. **Generate TypeScript types** from your exact org schema
2. **Validate data** before sending to Salesforce
3. **Document your API** with real org configuration
4. **Compare schemas** between orgs (dev, staging, prod)
5. **Migration planning** - see what fields exist where

## Documentation

Full documentation is in [describe-api/README.md](./describe-api/README.md)

