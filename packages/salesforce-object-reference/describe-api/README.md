# @sf-explorer/describe-api

Fetch real-time Salesforce object metadata from your org using the Describe API and convert it to JSON Schema format.

## Why Use This?

This package connects directly to your Salesforce org to get accurate, up-to-date metadata including:

- ✅ **All custom fields and objects** from your org
- ✅ **Real picklist values** (as `enum` arrays)
- ✅ **Relationship fields** (`x-object` for lookups, `x-objects` for polymorphic)
- ✅ **Field constraints** (maxLength, nullable, readOnly, etc.)
- ✅ **Icon metadata** (icon URLs and theme colors from UI API)
- ✅ **JSON Schema standard** format for easy integration

Unlike documentation scraping, this gives you the **exact configuration** of your org.

## Installation

```bash
npm install @sf-explorer/describe-api
```

## Authentication

This package supports two authentication methods:

### OAuth2 Access Token (Recommended)

**Use this if you see "SOAP API login() is disabled" error.**

Get an access token using Salesforce CLI:
```bash
# Login to your org
sf org login web --alias my-org

# Run the helper script
./get-token.sh

# Or manually get the token
sf org display --target-org my-org --json
```

Then add to your `.env`:
```bash
SF_ACCESS_TOKEN=00D...xyz
SF_INSTANCE_URL=https://mycompany.my.salesforce.com
```

**See [OAUTH2_SETUP.md](OAUTH2_SETUP.md) for detailed instructions.**

### Username/Password (Traditional)

**Note: May not work if SOAP API is disabled in your org.**

```bash
SF_USERNAME=your-username@example.com
SF_PASSWORD=your-password
SF_SECURITY_TOKEN=your-token
```

## Quick Start

### Easy Setup with Helper Script

```bash
# 1. Get access token using Salesforce CLI
./get-token.sh

# 2. Run
npm start
```

### Setup with .env File (Recommended)

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your Salesforce credentials:

**Option A: OAuth2 (Recommended - works when SOAP is disabled)**
```bash
SF_ACCESS_TOKEN=00D...xyz
SF_INSTANCE_URL=https://mycompany.my.salesforce.com
```

**Option B: Username/Password (Traditional)**
```bash
SF_LOGIN_URL=https://login.salesforce.com
SF_USERNAME=your-username@example.com
SF_PASSWORD=your-password
SF_SECURITY_TOKEN=your-token
```

3. Run the CLI:
```bash
npx sf-describe-fetch
```

### CLI Usage

**Using .env file** (recommended):
```bash
# 1. Copy and configure .env
cp .env.example .env
# Edit .env with your credentials

# 2. Run
npx sf-describe-fetch
```

**Using environment variables**:
```bash
# Set environment variables
export SF_USERNAME="your-username@example.com"
export SF_PASSWORD="your-password"
export SF_SECURITY_TOKEN="your-token"

# Fetch all objects from your org
npx sf-describe-fetch

# Fetch specific objects
SF_OBJECTS="Account,Contact,Opportunity" npx sf-describe-fetch

# Custom output directory
SF_OUTPUT_DIR="./my-schemas" npx sf-describe-fetch

# For sandbox orgs
SF_LOGIN_URL="https://test.salesforce.com" npx sf-describe-fetch
```

**Using command-line arguments**:
```bash
npx sf-describe-fetch username@example.com mypassword mytoken
```

### Programmatic API

```typescript
import { fetchAndConvert } from '@sf-explorer/describe-api';

// Fetch specific objects
const schemas = await fetchAndConvert({
  connection: {
    loginUrl: 'https://login.salesforce.com',
    username: 'user@example.com',
    password: 'password',
    securityToken: 'token', // optional
  },
  objects: ['Account', 'Contact', 'Opportunity'],
});

console.log(schemas.Account);
```

## Output Format

The generated schemas follow JSON Schema standard with Salesforce extensions:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Accounts",
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
      "enum": ["Prospect", "Customer", "Partner", "Other"]
    },
    "OwnerId": {
      "type": "string",
      "format": "salesforce-id",
      "description": "Owner ID",
      "x-object": "User"
    },
    "ParentId": {
      "type": "string",
      "format": "salesforce-id",
      "description": "Parent Account ID",
      "x-object": "Account"
    }
  },
  "required": ["Name"],
  "x-salesforce": {
    "name": "Account",
    "keyPrefix": "001",
    "createable": true,
    "updateable": true,
    "deletable": true
  }
}
```

## Custom Extensions

The schemas include these Salesforce-specific extensions:

| Extension | Description | Example |
|-----------|-------------|---------|
| `format: "enum"` | Field is a picklist | `"Type"` field |
| `enum: [...]` | Available picklist values | `["Prospect", "Customer"]` |
| `x-object: "ObjectName"` | Single reference (lookup/master-detail) | `"x-object": "Account"` |
| `x-objects: ["Obj1", "Obj2"]` | Polymorphic reference | Owner can be User or Queue |
| `x-salesforce: {...}` | Salesforce metadata | keyPrefix, CRUD flags, etc. |

## API Reference

### `fetchAndConvert(options)`

Fetch object schemas and return them as a JavaScript object.

**Options:**
- `connection` (required): Salesforce connection config
  - `loginUrl`: Login URL (default: `https://login.salesforce.com`)
  - `username`: Your Salesforce username
  - `password`: Your Salesforce password
  - `securityToken`: Security token (optional if IP whitelisted)
- `objects`: Array of object names to fetch (fetches all if not specified)
- `includeMetadata`: Include Salesforce metadata (default: `true`)
- `batchSize`: Batch size for rate limiting (default: `10`)

**Returns:** `Promise<Record<string, JsonSchema>>`

### `fetchAndSave(options)`

Fetch object schemas and save them to files.

**Options:** Same as `fetchAndConvert`, plus:
- `outputDir` (required): Directory to save schema files

## Examples

### Example 1: Fetch Specific Objects

```typescript
import { fetchAndConvert } from '@sf-explorer/describe-api';

const schemas = await fetchAndConvert({
  connection: {
    loginUrl: 'https://login.salesforce.com',
    username: process.env.SF_USERNAME,
    password: process.env.SF_PASSWORD,
  },
  objects: ['Account', 'Contact', 'Opportunity'],
});

console.log(`Fetched ${Object.keys(schemas).length} schemas`);
```

### Example 2: Show Relationships and Enums

```typescript
import { fetchAndConvert } from '@sf-explorer/describe-api';

const schemas = await fetchAndConvert({
  connection: { /* ... */ },
  objects: ['Account'],
});

const account = schemas.Account;

// Show lookup relationships
console.log('Lookups:');
for (const [field, prop] of Object.entries(account.properties)) {
  if (prop['x-object']) {
    console.log(`  ${field} -> ${prop['x-object']}`);
  }
}

// Show picklists with values
console.log('\nPicklists:');
for (const [field, prop] of Object.entries(account.properties)) {
  if (prop.format === 'enum' && prop.enum) {
    console.log(`  ${field}: ${prop.enum.join(', ')}`);
  }
}

// Show icon metadata
if (account['x-salesforce']?.iconUrl) {
  console.log('\nIcon:');
  console.log(`  URL: ${account['x-salesforce'].iconUrl}`);
  console.log(`  Color: #${account['x-salesforce'].iconColor}`);
}
```

### Example 3: Save All Objects

```typescript
import { fetchAndSave } from '@sf-explorer/describe-api';

await fetchAndSave({
  connection: { /* ... */ },
  outputDir: './salesforce-schemas',
  batchSize: 5, // Fetch 5 objects at a time
});
```

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
| address, location | object | - |

## Environment Variables

You can configure the tool using a `.env` file, environment variables, or command-line arguments.

### .env File (Recommended)

Create a `.env` file in the describe-api directory:

```bash
# Copy the example
cp .env.example .env

# Edit with your values
```

Example `.env` file:
```bash
SF_LOGIN_URL=https://login.salesforce.com
SF_USERNAME=your-username@example.com
SF_PASSWORD=your-password
SF_SECURITY_TOKEN=your-token
SF_OUTPUT_DIR=./schemas
SF_OBJECTS=Account,Contact,Opportunity
SF_BATCH_SIZE=10
```

### Available Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SF_LOGIN_URL` | Salesforce login URL | `https://login.salesforce.com` |
| `SF_USERNAME` | Salesforce username (required) | - |
| `SF_PASSWORD` | Salesforce password (required) | - |
| `SF_SECURITY_TOKEN` | Security token | - |
| `SF_OUTPUT_DIR` | Output directory | `./schemas` |
| `SF_OBJECTS` | Comma-separated object names | All objects |
| `SF_BATCH_SIZE` | Batch size for fetching | `10` |

## Use Cases

1. **Generate TypeScript Types** - Use schemas to generate type definitions
2. **API Documentation** - Document your Salesforce API
3. **Data Validation** - Validate data before sending to Salesforce
4. **Integration Testing** - Test your integrations against real org schemas
5. **Migration Planning** - Compare schemas between orgs

## Troubleshooting

### Authentication Errors

If you get authentication errors, make sure:
- Your username and password are correct
- Your security token is appended to the password (if required)
- Your IP is not blocked
- Use `https://test.salesforce.com` for sandbox orgs

### Rate Limiting

If you hit rate limits:
- Reduce `batchSize` to fetch fewer objects at once
- Increase delays between requests
- Fetch specific objects instead of all objects

## Icon Metadata

The tool now captures icon information from the Salesforce UI API, including:
- **Icon URL**: Full URL to the object's icon image
- **Icon Color**: Hex color code for the object's theme

See [ICON_METADATA.md](./ICON_METADATA.md) for detailed documentation including:
- How icon capture works
- Usage examples with React and vanilla JavaScript
- Fallback strategies when icons are unavailable
- Troubleshooting guide

Quick example:
```typescript
const account = schemas.Account;
if (account['x-salesforce']?.iconUrl) {
  console.log(`Icon: ${account['x-salesforce'].iconUrl}`);
  console.log(`Color: #${account['x-salesforce'].iconColor}`);
}
```

## License

MIT

## Related Packages

- [`@sf-explorer/salesforce-object-reference`](https://www.npmjs.com/package/@sf-explorer/salesforce-object-reference) - Pre-scraped Salesforce documentation (no org connection needed)

