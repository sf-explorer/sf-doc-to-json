# Quick Reference: Standard Objects vs DMOs

## Key Differences

| Aspect | Standard Salesforce Objects | Data Model Objects (DMOs) |
|--------|---------------------------|---------------------------|
| **Storage Location** | `src/doc/objects/` | `src/doc/ssot__objects/` |
| **Source** | Salesforce Object Reference Docs | Data Cloud DMO Documentation |
| **Index File** | `index.json` | `dmo-index.json` |
| **Module** | Various (Core, FSC, Health Cloud, etc.) | Data Cloud |
| **Field Details** | Yes (from API describe calls) | No (only object-level info) |
| **Count** | ~4,000+ objects | 158 DMOs |
| **Purpose** | Salesforce database objects | Data Cloud data model groupings |

## When to Use What

### Use Standard Objects When:
- Working with Salesforce org data (Account, Contact, etc.)
- Need field-level metadata (types, validation, picklist values)
- Building Salesforce applications or integrations
- Need to know API names and field properties

### Use DMOs When:
- Working with Data Cloud / Data 360
- Mapping data streams to standard data model
- Building Data Cloud segments or activations
- Understanding Data Cloud data model structure

## Example: Account

### Standard Account Object
Location: `src/doc/objects/A/Account.json`
```json
{
  "Account": {
    "name": "Account",
    "description": "Represents an individual account...",
    "properties": {
      "Id": { "type": "id", "description": "Unique identifier" },
      "Name": { "type": "string", "maxLength": 255 },
      "Type": { "type": "picklist", "picklistValues": [...] },
      // ... 50+ more fields
    },
    "module": "Core Salesforce",
    "clouds": ["Core Salesforce", "Sales Cloud"]
  }
}
```

### Account DMO
Location: `src/doc/ssot__objects/A/Account.json`
```json
{
  "Account": {
    "name": "Account",
    "description": "The Account DMO represents how a party wants to interact with your company.",
    "sourceUrl": "https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html",
    "module": "Data Cloud",
    "clouds": ["Data Cloud"]
  }
}
```

## How to Access

### Load Standard Objects
```typescript
// Via main index
import index from './src/doc/index.json';
const accountInfo = index.objects['Account'];

// Direct file
import accountData from './src/doc/objects/A/Account.json';
```

### Load DMOs
```typescript
// Via DMO index
import dmoIndex from './src/doc/dmo-index.json';
const accountDMOInfo = dmoIndex.objects['Account'];

// Direct file
import accountDMO from './src/doc/ssot__objects/A/Account.json';
```

## Common DMO Use Cases

### 1. Data Mapping
Map source data fields to DMO objects when ingesting data into Data Cloud:
```
Source: customer_email
→ DMO: Contact Point Email
```

### 2. Segment Building
Use DMO objects to build segments in Data Cloud:
```
- Party DMO (individual attributes)
- Email Engagement DMO (email behavior)
- Loyalty Program Member DMO (loyalty status)
```

### 3. Activation
Activate segments using DMO relationships:
```
Party → Contact Point Email → Send marketing email
Party → Loyalty Program Member → Send loyalty offers
```

## DMO Categories Quick Reference

| Category | Count | Examples |
|----------|-------|----------|
| **Core** | 28 | Account, Party, Contact Point Email, Case |
| **Engagement** | 17 | Email Engagement, Website Engagement, Message Engagement |
| **Loyalty** | 18 | Loyalty Program, Loyalty Member, Loyalty Tier |
| **Consent** | 18 | Authorization Form, Communication Subscription, Party Consent |
| **Financial** | 23 | Financial Account, Card Account, Investment Account |
| **Survey** | 11 | Survey, Survey Question, Survey Response |
| **Flow** | 6 | Flow, Flow Version, Flow Element |
| **Agent** | 5 | Agent Work, Agent Service Presence, Skill |
| **Other** | 32 | User, Device, Brand, Voucher |

## Scripts

### Fetch Standard Objects
```bash
npm run fetch:all          # All objects
npm run fetch:core         # Core Salesforce
npm run fetch:fsc          # Financial Services Cloud
npm run fetch:health       # Health Cloud
```

### Fetch DMOs
```bash
npm run fetch:dmo          # Data Model Objects
```

### Examples
```bash
npx tsx scripts/dmo/example-usage.ts   # DMO usage examples
```

## Documentation

- Standard Objects: See main `README.md`
- DMOs: See `scripts/dmo/README.md`
- Implementation: See `scripts/dmo/IMPLEMENTATION_SUMMARY.md`

---

**Note**: Standard Objects and DMOs serve different purposes. Standard Objects describe the structure of Salesforce org data, while DMOs define the standardized data model used in Data Cloud for data unification and activation.

