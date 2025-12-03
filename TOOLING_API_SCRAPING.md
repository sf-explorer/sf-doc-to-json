# Tooling API Documentation Scraping - Complete Guide

## Overview

The scraper now supports **scraping Tooling API objects** directly from official Salesforce documentation, giving you complete field properties, descriptions, and source URLs!

## Configuration Added

Added Tooling API to `src/config.ts`:

```typescript
'atlas.en-us.api_tooling.meta': {
    label: 'Tooling API',
    description: 'Salesforce Tooling API objects for metadata management, deployment, and development operations.'
}
```

## New NPM Script

```bash
# Scrape only Tooling API documentation
npm run fetch:tooling
```

## How It Works

When you run `npm run fetch:all` or `npm run fetch:tooling`, the scraper will:

1. **Fetch from official docs**: https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/reference_objects_list.htm
2. **Parse object pages**: Extract descriptions and field properties
3. **Generate object files**: Create complete JSON files in `doc/objects/`
4. **Add source URLs**: Include links to official documentation
5. **Create cloud index**: Generate `doc/tooling-api.json`

## Complete Workflow

### Step 1: Scrape Tooling API Documentation

```bash
# Scrape all clouds including Tooling API
npm run fetch:all

# Or just Tooling API
npm run fetch:tooling
```

This will create/update Tooling API objects with:
- Real descriptions from docs
- Complete field properties with types
- Source URLs to official pages

### Step 2: Enrich with Metadata

```bash
# Add keyPrefix and label from globalDescribe
node scripts/add-key-prefixes.mjs
```

This adds:
- Key prefixes (3-character IDs)
- User-friendly labels
- Fills in any gaps for non-scraped objects

### Step 3: Build

```bash
npm run build
```

## What You Get

### Complete Tooling API Objects

**Example: ApexClass**

```json
{
  "ApexClass": {
    "name": "ApexClass",
    "description": "Represents an Apex class.",
    "properties": {
      "ApiVersion": {
        "type": "double",
        "description": "The API version for this class..."
      },
      "Body": {
        "type": "textarea",
        "description": "The Apex class definition. Limit: 1 million characters."
      },
      "Name": {
        "type": "string",
        "description": "Name of the class. Limit: 255 characters"
      },
      // ... all fields
    },
    "module": "Tooling API",
    "sourceUrl": "https://developer.salesforce.com/docs/atlas.en-us.api_tooling/..."
  }
}
```

### Index Entry

```json
{
  "ApexClass": {
    "cloud": "Tooling API",
    "file": "objects/A/ApexClass.json",
    "description": "Represents an Apex class.",
    "fieldCount": 8,
    "keyPrefix": "01p",
    "label": "Apex Class",
    "sourceUrl": "https://developer.salesforce.com/docs/..."
  }
}
```

## Benefits

### Before (globalDescribe only):
- ❌ Empty descriptions
- ❌ No field properties
- ❌ No source URLs
- ❌ Limited usefulness

### After (scraped from docs):
- ✅ **Real descriptions** from official docs
- ✅ **Complete field properties** with types and descriptions
- ✅ **Source URLs** to official documentation
- ✅ **Full API coverage** for development and metadata work

## Use Cases

With complete Tooling API documentation, you can:

1. **Build Metadata Tools**: Understand ApexClass, ApexTrigger, CustomObject structures
2. **Create IDE Features**: Autocomplete, validation, documentation tooltips
3. **Generate Code**: Create deployment scripts with proper field types
4. **Learn Tooling API**: Explore all available objects and their capabilities
5. **Link to Docs**: Direct users to official documentation

## Comparison: globalDescribe vs Scraped

### Only globalDescribe (667 objects):
```json
{
  "ApexExecutionOverlayAction": {
    "name": "ApexExecutionOverlayAction",
    "description": "",
    "properties": {},
    "module": "Tooling API"
  }
}
```
**Problem**: No useful information for development

### Scraped from Docs (all objects):
```json
{
  "ApexExecutionOverlayAction": {
    "name": "ApexExecutionOverlayAction",
    "description": "Represents an Apex execution overlay action used for debugging.",
    "properties": {
      "ActionScript": {
        "type": "string",
        "description": "The Apex script to execute during the overlay."
      },
      "Line": {
        "type": "integer",
        "description": "The line number where the action executes."
      }
      // ... more fields
    },
    "module": "Tooling API",
    "sourceUrl": "https://developer.salesforce.com/docs/..."
  }
}
```
**Benefit**: Complete, usable documentation!

## Expected Results After Scraping

When you run `npm run fetch:tooling`, expect:

- **~200-400 objects** with full documentation (not all 839 from globalDescribe are documented)
- **Complete field properties** for all documented objects
- **Source URLs** linking to official pages
- **Processing time**: 5-15 minutes depending on network

## Important Notes

1. **Not All Objects Are Documented**: The Tooling API docs may not cover all 839 objects from globalDescribe
2. **Enrichment Still Needed**: Run `add-key-prefixes.mjs` after scraping to fill in metadata for undocumented objects
3. **Network Required**: Scraping requires internet connection
4. **Complements globalDescribe**: Scraped objects get full docs, others get basic metadata

## Verification

After scraping, check a Tooling API object:

```bash
# Check if object has full properties
cat doc/objects/A/ApexClass.json | jq '.ApexClass.properties | length'
# Should show number > 0

# Check if sourceUrl exists
cat doc/objects/A/ApexClass.json | jq '.ApexClass.sourceUrl'
# Should show URL

# Check index entry
cat doc/index.json | jq '.objects.ApexClass'
# Should show complete metadata
```

## Recommended Practice

Always run both scraper and enrichment:

```bash
# 1. Scrape documentation (gets full details for documented objects)
npm run fetch:all

# 2. Enrich metadata (fills in gaps for undocumented objects)
node scripts/add-key-prefixes.mjs

# 3. Build
npm run build
```

This gives you:
- Complete documentation for objects that have it
- Basic metadata for objects that don't
- Best of both worlds!

## Summary

The Tooling API is now a **fully supported, scrapeable cloud** with:
- ✅ Official documentation scraping
- ✅ Complete field properties
- ✅ Source URL links
- ✅ Real descriptions
- ✅ Metadata enrichment from globalDescribe

Run `npm run fetch:tooling` to get started! 🚀

