# Key Prefix Feature

## Overview

The Salesforce Object Reference library now includes **key prefixes** for all Salesforce objects. Key prefixes are 3-character codes that identify the object type from a Salesforce record ID.

## What is a Key Prefix?

In Salesforce, every record ID starts with a 3-character prefix that identifies the object type:
- `001` - Account
- `003` - Contact  
- `006` - Opportunity
- `a00` - Custom objects (varies)

This feature was added to help developers:
- Identify object types from record IDs
- Build validation logic
- Debug data issues
- Map records to their object definitions

## Data Source

Key prefixes are extracted from the Salesforce `globalDescribe` API response and stored in the `index.json` file.

**Statistics:**
- 1,648 objects have key prefixes
- 1,367 objects don't have key prefixes (e.g., metadata objects, platform events)

## API Usage

### TypeScript Type

```typescript
interface ObjectIndexEntry {
    cloud: string;
    file: string;
    description: string;
    fieldCount: number;
    keyPrefix?: string;  // Optional 3-character prefix
}
```

### Load All Descriptions with Prefixes

```typescript
import { loadAllDescriptions } from '@sf-explorer/salesforce-object-reference';

const descriptions = await loadAllDescriptions();

// descriptions['Account'] = {
//   description: "An organization or individual involved...",
//   cloud: "Core Salesforce",
//   fieldCount: 76,
//   keyPrefix: "001"
// }
```

### Get Single Object Description

```typescript
import { getObjectDescription } from '@sf-explorer/salesforce-object-reference';

const accountDesc = await getObjectDescription('Account');

console.log(accountDesc.keyPrefix); // "001"
```

### Search and Filter by Prefix

```typescript
import { loadAllDescriptions } from '@sf-explorer/salesforce-object-reference';

const descriptions = await loadAllDescriptions();

// Find all objects with prefixes starting with '0'
const standardObjects = Object.entries(descriptions)
  .filter(([_, meta]) => meta.keyPrefix?.startsWith('0'))
  .map(([name, meta]) => ({
    name,
    prefix: meta.keyPrefix,
    description: meta.description
  }));
```

### Validate Record IDs

```typescript
import { loadIndex } from '@sf-explorer/salesforce-object-reference';

async function getObjectTypeFromId(recordId: string) {
  const prefix = recordId.substring(0, 3);
  const index = await loadIndex();
  
  if (!index) return null;
  
  // Find object with matching prefix
  const objectEntry = Object.entries(index.objects)
    .find(([_, meta]) => meta.keyPrefix === prefix);
  
  return objectEntry ? objectEntry[0] : null;
}

// Usage
const objectName = await getObjectTypeFromId('001abc123456789'); // "Account"
```

## Demo Application Integration

The demo application now displays key prefixes in two places:

### 1. Object List Table

A new "Prefix" column shows the 3-character key prefix for each object:

```jsx
{
  accessorKey: 'keyPrefix',
  header: 'Prefix',
  size: 80,
  Cell: ({ cell }) => {
    const prefix = cell.getValue();
    return prefix ? (
      <Box sx={{ 
        fontFamily: 'monospace',
        fontWeight: 600,
        color: '#014486',
        backgroundColor: '#ecebea',
        padding: '2px 6px',
        borderRadius: '3px'
      }}>
        {prefix}
      </Box>
    ) : '—';
  }
}
```

### 2. Object Detail View

When viewing an object's fields, the key prefix is shown in the metadata section:

```jsx
{object.keyPrefix && (
  <Box>
    <Typography variant="caption">Key Prefix:</Typography>
    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
      {object.keyPrefix}
    </Typography>
  </Box>
)}
```

## Regenerating Key Prefixes

If you need to update the key prefixes (e.g., after Salesforce API changes):

1. Ensure `globalDescribe.json` exists in the `doc/` folder
2. Run the key prefix enrichment script:

```bash
node scripts/add-key-prefixes.mjs
```

This will:
- Read all objects from `globalDescribe.json`
- Match them with objects in `index.json`
- Add `keyPrefix` field where available
- Update `index.json` in place

## File Structure

```
doc/
  ├── globalDescribe.json       # Source of truth for key prefixes
  ├── index.json                # Enriched with keyPrefix fields
  └── objects/
      └── ...                   # Individual object files
```

## Implementation Details

### Script: `add-key-prefixes.mjs`

Location: `scripts/add-key-prefixes.mjs`

```javascript
// Reads globalDescribe.json
// Builds map: objectName -> keyPrefix
// Updates index.json with keyPrefix fields
```

### Type Updates

Location: `src/types.ts`

```typescript
export interface ObjectIndexEntry {
    cloud: string;
    file: string;
    description: string;
    fieldCount: number;
    keyPrefix?: string;  // Added
}
```

### API Function Updates

All description-related functions now return `keyPrefix`:
- `loadAllDescriptions()`
- `getObjectDescription()`
- `searchObjectsByDescription()`
- `getDescriptionsByCloud()`

## Benefits

1. **Record Identification**: Quickly identify object type from record IDs
2. **Validation**: Validate record IDs against expected object types
3. **Debugging**: Understand which object a record belongs to
4. **Data Mapping**: Map external IDs to Salesforce objects
5. **Developer Experience**: Better insights into Salesforce data structure

## Notes

- Not all Salesforce objects have key prefixes
- Platform events and some metadata objects typically don't have prefixes
- Custom objects can have varying prefixes depending on org
- Key prefixes are optional fields (marked with `?` in TypeScript)

## Related Documentation

- [API Reference](./API_REFERENCE.ts) - Full API documentation
- [Descriptions API](./DESCRIPTIONS_API.md) - Description feature details
- [README](./README.md) - Main library documentation

