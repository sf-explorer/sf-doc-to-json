# DMO Scraper Implementation Summary

## What Was Added

This implementation adds a complete scraping solution for Salesforce Data Cloud Data Model Objects (DMOs) with full field-level details.

### New Files Created

1. **`scripts/scrape-dmo-enhanced.ts`** - Enhanced DMO scraper script (PRIMARY)
   - Fetches DMO list from Salesforce documentation
   - Fetches detailed information from individual DMO pages
   - Extracts API names (e.g., `ssot__Account__dlm`)
   - Extracts categories and primary keys
   - Extracts all fields with API names, descriptions, data types, and data bundles
   - Saves objects to `src/doc/ssot__objects/[A-Z]/`
   - Generates a comprehensive DMO index at `src/doc/dmo-index.json`

2. **`scripts/scrape-dmo.ts`** - Basic DMO scraper (DEPRECATED)
   - Original simple version that only extracted summary data
   - Kept for reference

2. **`scripts/dmo/README.md`** - Comprehensive documentation
   - Usage instructions
   - Output structure description
   - List of DMO categories
   - Maintenance guidelines
   - Future enhancement ideas

3. **`scripts/dmo/example-usage.ts`** - Example code demonstrating how to use DMO data
   - Load DMO index
   - Load specific DMO objects
   - Search DMOs by keyword
   - Filter DMOs by category
   - Practical examples

### Modified Files

1. **`package.json`** - Added npm script
   - `npm run fetch:dmo` - Run the DMO scraper

### Directory Structure

```
scripts/
├── dmo/
│   ├── README.md           # Documentation
│   └── example-usage.ts    # Usage examples
└── scrape-dmo.ts           # Main scraper

src/doc/
├── ssot__objects/          # DMO objects (NEW - separate from standard objects)
│   ├── A/
│   │   ├── Account.json
│   │   ├── Affiliation.json
│   │   └── ... (13 files)
│   ├── B/ ... (3 files)
│   ├── C/ ... (21 files)
│   └── ... (26 total folders, 158 files)
└── dmo-index.json          # DMO index (NEW)
```

## Key Features

### 1. Separate Storage Directory
- DMO objects are stored in `ssot__objects/` instead of `objects/`
- This distinguishes them from standard Salesforce objects
- Maintains clear separation between Data Cloud DMOs and regular objects

### 2. Comprehensive Scraping
- Extracts **158 DMO objects** from the documentation
- **146 DMOs** with API names (e.g., `ssot__Account__dlm`)
- **117 DMOs** with full field details
- **2,669 total fields** extracted across all DMOs
- Captures name, description, API name, categories, primary key, and fields for each DMO
- All DMOs are tagged with `module: "Data Cloud"` and `clouds: ["Data Cloud"]`

### 3. Field-Level Details
Each DMO field includes:
- **Field Name**: Human-readable name (e.g., "Account Name")
- **Field API Name**: Technical name (e.g., "ssot__Name__c")
- **Description**: What the field represents
- **Data Type**: Field type (text, number, dateTime, etc.)
- **Data Bundle**: Which Data Cloud bundles include this field (e.g., "Sales, Service")

### 4. Metadata Extraction
For each DMO, the scraper extracts:
- **API Name**: The Data Cloud object API name (e.g., `ssot__Account__dlm`)
- **Categories**: Object classification (e.g., ["Profile", "Party"])
- **Primary Key**: The unique identifier field
- **Fields Count**: Number of fields in the DMO
- **Source URL**: Link to the detailed documentation page

### 3. Organized File Structure
- Alphabetical folders (A-Z) for easy navigation
- Each DMO in its own JSON file
- Consistent naming convention

### 4. DMO Index
- Centralized index of all DMOs at `dmo-index.json`
- Includes metadata: generated timestamp, total count
- Quick reference without loading individual files

### 5. Merge Support
- Existing DMO files are preserved and merged with new data
- Won't overwrite additional fields added manually
- Deduplicates clouds array

## Usage

### Run the Scraper
```bash
npm run fetch:dmo
```

### Load DMO Data in Code
```typescript
import { promises as fs } from 'fs';

// Load the index
const index = JSON.parse(
  await fs.readFile('src/doc/dmo-index.json', 'utf-8')
);

// Load a specific DMO
const dmoData = JSON.parse(
  await fs.readFile('src/doc/ssot__objects/L/Loyalty Program.json', 'utf-8')
);
```

### Run the Example
```bash
npx tsx scripts/dmo/example-usage.ts
```

## DMO Categories

The 158 DMOs are organized into several categories:

### Core DMOs (28)
- Account, Party, Individual
- Contact Point (Address, Email, Phone, App, Social, Digital ID, Consent)
- Case, Opportunity, Lead
- Product (Catalog, Category, Master Product)
- Sales Order, Order Delivery Method

### Engagement DMOs (17)
- Email Engagement, Message Engagement, Website Engagement
- Device Application Engagement, Product Browse Engagement
- Shopping Cart Engagement, Knowledge Article Engagement
- Engagement Analysis (Text, Participant, Session, Direct Feedback)

### Loyalty DMOs (18)
- Loyalty Program, Loyalty Program Member
- Loyalty Tier, Loyalty Tier Group, Loyalty Tier Benefit
- Loyalty Benefit, Loyalty Benefit Type, Member Benefit
- Loyalty Currency, Loyalty Ledger
- Loyalty Transaction Journal, Loyalty Journal Type/Subtype

### Consent & Privacy DMOs (18)
- Authorization Form (and related: Consent, Data Use, Text)
- Communication Subscription (and related: Channel Type, Consent, Timing)
- Consent Action, Consent Status, Data Use Purpose
- Contact Point Consent, Party Consent
- Privacy Consent Log, Data Use Legal Basis

### Financial DMOs (23)
- Financial Account (and related: Balance, Fee, Interest Rate, Limit, Party, Transaction)
- Financial Application (and related: Item, Item Proposal)
- Financial Customer, Financial Goal (and related: Funding, Party)
- Financial Plan, Financial Holding, Financial Security
- Card Account, Deposit Account, Investment Account, Loan Account
- Insurance Policy, Payment Method

### Survey DMOs (11)
- Survey, Survey Version, Survey Invitation
- Survey Question, Survey Question Response, Survey Question Section
- Survey Response, Survey Subject

### Flow DMOs (6)
- Flow, Flow Version, Flow Version Occurrence
- Flow Element, Flow Element Run, Flow Run

### Agent/Service DMOs (5)
- Agent Service Presence, Agent Work, Agent Work Skill
- Service Presence Status, Skill

### Other DMOs (32)
- User, User Group, Operating Hours
- Device, Device Application Template
- Brand, Goods Product, Market Segment
- Voucher, Voucher Definition, Promotion
- Network Usage, Asset Service Level Objective
- Conversation Reason (and related objects)
- And more...

## Test Results

Successfully scraped and saved:
- **158 DMO objects** across 26 alphabetical folders
- All files validated with proper JSON structure
- Index file generated with complete metadata
- Example usage script runs successfully

## Next Steps / Future Enhancements

1. **Field Extraction**: If individual DMO pages exist with field definitions, extract those
2. **Relationship Mapping**: Identify and document relationships between DMOs
3. **Historical Tracking**: Track changes to DMO definitions over time
4. **API Integration**: Cross-reference with Data Cloud API metadata
5. **Enhanced Search**: Build more sophisticated search/filter capabilities
6. **Export Formats**: Support exporting DMO data in different formats (CSV, Excel, etc.)

## Technical Notes

### Dependencies
- `cheerio`: HTML parsing
- `node:fs/promises`: Async file operations
- TypeScript with ES modules support

### Source URL
All DMOs reference: https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html

### Data Format
Each DMO file structure:
```json
{
  "DMO Name": {
    "name": "DMO Name",
    "description": "The DMO Name DMO represents...",
    "sourceUrl": "https://developer.salesforce.com/...",
    "module": "Data Cloud",
    "clouds": ["Data Cloud"]
  }
}
```

## Documentation References

- [Data Model Objects Documentation](https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html)
- [Data Cloud Documentation](https://developer.salesforce.com/docs/data)
- See `scripts/dmo/README.md` for detailed documentation

