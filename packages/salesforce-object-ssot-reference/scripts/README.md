# DMO (Data Model Objects) Scraper

This folder contains scripts and documentation for scraping Salesforce Data Cloud Data Model Objects (DMOs).

## Overview

Data Model Objects (DMOs) are groupings of data created from data streams, insights, and other sources in Salesforce Data Cloud (Data 360). This scraper extracts DMO definitions from the official Salesforce documentation and stores them in a separate directory structure.

## Usage

To scrape DMO documentation, run:

```bash
npm run fetch:dmo
```

This will:
1. Fetch the DMO list from the [Data Model Objects documentation](https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html)
2. Extract object names and descriptions
3. Save each DMO as a JSON file in `src/doc/ssot__objects/[A-Z]/`
4. Generate a DMO index at `src/doc/dmo-index.json`

## Output Structure

### Directory Structure

```
src/doc/
├── ssot__objects/           # DMO objects (separate from standard objects)
│   ├── A/
│   │   ├── Account.json
│   │   ├── Affiliation.json
│   │   └── ...
│   ├── B/
│   │   ├── BenefitAction.json
│   │   └── ...
│   └── ...
└── dmo-index.json          # DMO index file
```

### DMO Object Format

Each DMO is stored as a JSON file with the following structure:

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

### DMO Index Format

The `dmo-index.json` file contains:

```json
{
  "generated": "2025-01-10T12:00:00.000Z",
  "totalObjects": 150,
  "objects": {
    "Account": {
      "file": "ssot__objects/A/Account.json",
      "description": "The Account DMO represents how a party wants to interact with your company.",
      "sourceUrl": "https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html"
    },
    ...
  }
}
```

## Key Differences from Standard Objects

1. **Separate Directory**: DMOs are stored in `ssot__objects/` instead of `objects/` to distinguish them from standard Salesforce objects
2. **Module**: All DMOs have `module: "Data Cloud"` and `clouds: ["Data Cloud"]`
3. **Source**: All DMOs reference the main DMO documentation page as their source URL
4. **Separate Index**: DMOs have their own index file (`dmo-index.json`) separate from the main object index

## Standard DMOs

As of the latest documentation, Data Cloud includes the following types of DMOs:

### Core DMOs
- Account, Party, Contact Point (Email, Phone, Address, etc.)
- Case, Opportunity, Sales Order
- Product Catalog, Master Product, Product Category

### Engagement DMOs
- Email Engagement, Message Engagement
- Website Engagement, Device Application Engagement
- Shopping Cart Engagement, Product Browse Engagement

### Loyalty DMOs
- Loyalty Program, Loyalty Program Member
- Loyalty Tier, Member Benefit
- Loyalty Transaction Journal, Voucher

### Consent & Privacy DMOs
- Authorization Form, Authorization Form Consent
- Communication Subscription, Consent Status
- Data Use Purpose, Privacy Consent Log

### Industry-Specific DMOs
- Financial: Card Account, Deposit Account, Payment Method
- Healthcare: Applicant, Person Life Event
- Survey: Survey, Survey Response, Survey Question

## Maintenance

To update the DMO data:

1. Run `npm run fetch:dmo` to scrape the latest DMO documentation
2. The script will merge with existing data, preserving any additional fields
3. Review the console output for any warnings or errors
4. Check the `dmo-index.json` for the updated object count

## Technical Details

### Script: `scripts/scrape-dmo.ts`

The DMO scraper:
- Fetches the DMO documentation page
- Parses the HTML using Cheerio
- Extracts DMO names and descriptions from list items
- Creates alphabetical folders (A-Z) for organization
- Merges with existing data to preserve additional fields
- Generates a comprehensive index file

### Dependencies
- `cheerio`: HTML parsing
- `node:fs/promises`: File system operations
- TypeScript with ES modules

## Future Enhancements

Potential improvements for the DMO scraper:

1. **Field Extraction**: If individual DMO pages exist, extract field definitions
2. **Relationship Mapping**: Identify relationships between DMOs
3. **Historical Tracking**: Track changes to DMO definitions over time
4. **Validation**: Cross-reference with Data Cloud API metadata
5. **Enhanced Descriptions**: Extract additional context from documentation

## Related Documentation

- [Data Model Objects Documentation](https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html)
- [Data Cloud Developer Guide](https://developer.salesforce.com/docs/data)
- [Data Cloud DMO Mapping](https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping)

