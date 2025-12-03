# Re-scraping Documentation

## To Get Updated Source URLs and Tooling API Objects

To re-scrape the Salesforce documentation and update all object files with the latest source URLs, run:

```bash
# Re-scrape all clouds including Tooling API (this will take a while)
npm run fetch:all

# Or re-scrape specific clouds
npm run fetch:core      # Core Salesforce
npm run fetch:fsc       # Financial Services Cloud
npm run fetch:health    # Health Cloud
npm run fetch:tooling   # Tooling API (NEW!)
```

## What's New: Tooling API Scraping

The scraper now supports **Tooling API documentation**! When you run the scraper, it will fetch Tooling API objects from the official documentation at:

https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/reference_objects_list.htm

This means Tooling API objects will have:
- ✅ **Real descriptions** from documentation (not empty)
- ✅ **Field properties** with types and descriptions
- ✅ **Source URLs** pointing to official Tooling API docs

## What Happens When You Re-scrape

1. **Existing Objects Updated**: Objects already in the index will be updated with:
   - Latest descriptions
   - Updated field properties
   - **New sourceUrl** field with documentation links

2. **Tooling API Objects Scraped**: Tooling API objects will be scraped from official docs with:
   - Real descriptions
   - Full field properties
   - Source URLs

3. **Source URLs Added**: All scraped objects will have the `sourceUrl` field pointing to official documentation

## After Re-scraping

Run the enrichment script to add keyPrefix and label metadata:

```bash
# Enrich with globalDescribe data
node scripts/add-key-prefixes.mjs
```

## Recommended Workflow

```bash
# 1. Re-scrape to get latest docs and source URLs (including Tooling API)
npm run fetch:all

# 2. Enrich with metadata (keyPrefix, label)
node scripts/add-key-prefixes.mjs

# 3. Rebuild TypeScript
npm run build

# 4. Test the demo
cd demo
npm run dev
```

## Notes

- **Re-scraping takes time**: Can take 30-60 minutes for all clouds
- **Network required**: Fetches from developer.salesforce.com
- **Tooling API included**: Now scraped from official documentation
- **Source URLs**: All scraped objects (including Tooling API) will have sourceUrl

## Current State vs After Re-scraping

### Before Re-scraping:
- ✅ 3,682 objects (3,015 scraped + 667 Tooling API from globalDescribe)
- ✅ keyPrefix and label from globalDescribe
- ✅ No fake descriptions
- ❌ Tooling API objects have empty descriptions and no properties
- ❌ Source URLs not populated

### After Re-scraping:
- ✅ All objects with **real descriptions** from documentation
- ✅ Tooling API objects with **full field properties**
- ✅ All scraped objects have **sourceUrl** field
- ✅ Descriptions and properties are up-to-date
- ✅ Tooling API is a complete, properly scraped cloud

## Example: Before vs After

**Before (from globalDescribe only):**
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

**After (scraped from docs):**
```json
{
  "ApexExecutionOverlayAction": {
    "name": "ApexExecutionOverlayAction",
    "description": "Represents an Apex execution overlay action...",
    "properties": {
      "ActionScript": {
        "type": "string",
        "description": "The Apex script to execute..."
      },
      // ... more properties
    },
    "module": "Tooling API",
    "sourceUrl": "https://developer.salesforce.com/docs/atlas.en-us.api_tooling/..."
  }
}
```

Run `npm run fetch:all` to get complete Tooling API documentation! 🚀

