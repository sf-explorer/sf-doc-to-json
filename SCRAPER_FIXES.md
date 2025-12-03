# Scraper Fixes - Index Merging & Correct URLs

## Summary

Fixed two critical issues with the scraper:

1. ✅ **Index Merging**: Scraper now preserves existing objects when scraping individual clouds
2. ✅ **Correct URLs**: Source URLs now use the same pattern as the fetch URL

---

## Fix #1: Index Merging

### The Problem
When scraping a single cloud (e.g., `npm run fetch:tooling`), the scraper would **replace** the entire index, losing all previously scraped objects from other clouds.

### The Solution
Modified `src/scraper.ts` to:
1. Load existing `index.json` if it exists
2. Merge new objects with existing objects
3. Recalculate totals across all objects

### Code Changes

**Before:**
```typescript
const objectIndex: Record<string, ObjectIndexEntry> = {};
```

**After:**
```typescript
// Load existing index if it exists
const indexPath = path.join(docFolder, 'index.json');
let existingIndex: DocumentIndex | null = null;
try {
    const existingContent = await fs.readFile(indexPath, 'utf-8');
    existingIndex = JSON.parse(existingContent);
    console.log(`📂 Loaded existing index with ${existingIndex?.totalObjects || 0} objects`);
} catch {
    console.log('📂 No existing index found, creating new one');
}

const objectIndex: Record<string, ObjectIndexEntry> = existingIndex?.objects ? { ...existingIndex.objects } : {};
```

### Result

Now you can:
- Scrape individual clouds without losing other clouds
- Re-scrape a cloud to update its objects while preserving others
- Build up your index incrementally

**Example:**
```bash
# Scrape Tooling API first
npm run fetch:tooling
# Index: 291 Tooling API objects

# Then scrape Core Salesforce
npm run fetch:core
# Index: 291 Tooling API + 1,720 Core = 2,011 objects ✅

# Re-scrape Tooling API to update
npm run fetch:tooling
# Index: Still has Core + updated Tooling ✅
```

---

## Fix #2: Correct Source URLs

### The Problem
Source URLs were constructed incorrectly, resulting in broken links like:
```
https://developer.salesforce.com/docs/api_tooling/tooling_api_objects_aiapplication.htm
```

This URL doesn't exist and returns 404.

### The Correct URL Format
The correct URL should match the pattern used by Salesforce documentation:
```
https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/tooling_api_objects_aiapplication.htm
```

### The Solution
Use the **same URL structure** that we use to fetch the content:

**Fetch URL (internal API):**
```
https://developer.salesforce.com/docs/get_document_content/${deliverable}/${url}/en-us/${version}
```

**Public URL (for users):**
```
https://developer.salesforce.com/docs/${documentationId}/${deliverable}/${url}
```

Where:
- `documentationId` = `"atlas.en-us.api_tooling.meta"` (the full meta path)
- `deliverable` = `"api_tooling"` (from the API response)
- `url` = `"tooling_api_objects_aiapplication.htm"` (the page path)

### Code Changes

**Before (broken URLs):**
```typescript
const publicUrl = `https://developer.salesforce.com/docs/${header.deliverable}/${url}`;
```

**After (correct URLs):**
```typescript
// The contentUrl uses: /get_document_content/${deliverable}/${url}/en-us/${version}
// The public URL uses: /${documentationId}/${deliverable}/${url}
const publicUrl = `https://developer.salesforce.com/docs/${documentationId}/${header.deliverable}/${url}`;
```

### Result

All source URLs now point to valid Salesforce documentation pages:

**Tooling API Example:**
```json
{
  "AIApplication": {
    "sourceUrl": "https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/tooling_api_objects_aiapplication.htm"
  }
}
```

**Core Salesforce Example:**
```json
{
  "Account": {
    "sourceUrl": "https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_account.htm"
  }
}
```

---

## Testing

### Test Index Merging

```bash
# 1. Scrape Tooling API
npm run fetch:tooling
cat doc/index.json | jq '.totalObjects'
# Should show: 291

# 2. Scrape a different cloud
npm run fetch:core
cat doc/index.json | jq '.totalObjects'
# Should show: 291 + 1720 = 2011 (or similar, combined total)

# 3. Verify both clouds exist
cat doc/index.json | jq '.totalClouds'
# Should show: 2 or more
```

### Test Source URLs

```bash
# Check a Tooling API URL
cat doc/objects/A/AIApplication.json | jq '.AIApplication.sourceUrl'
# Should be: "https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/..."

# Verify it's valid (should return 200)
curl -I "$(cat doc/objects/A/AIApplication.json | jq -r '.AIApplication.sourceUrl')" 2>&1 | grep "HTTP"
# Should show: HTTP/2 200
```

---

## Benefits

### Index Merging Benefits
1. **Incremental Updates**: Scrape clouds one at a time
2. **Faster Re-scraping**: Update only the clouds that changed
3. **Safety**: Won't lose data when re-scraping a single cloud
4. **Flexibility**: Build your index in any order

### Correct URLs Benefits
1. **Valid Links**: All URLs point to real documentation pages
2. **User Navigation**: Users can click through to official docs
3. **SEO-Friendly**: Search engines can index the correct pages
4. **Professional**: No broken links in production

---

## Workflow Examples

### Incremental Build
```bash
# Day 1: Scrape Tooling API only
npm run fetch:tooling

# Day 2: Add Core Salesforce
npm run fetch:core

# Day 3: Add Financial Services Cloud
npm run fetch:fsc

# Result: All clouds preserved in index! ✅
```

### Update Specific Cloud
```bash
# Re-scrape only Tooling API to get updates
npm run fetch:tooling

# All other clouds (Core, FSC, etc.) remain unchanged ✅
```

### Complete Rebuild
```bash
# Remove old index to start fresh
rm doc/index.json

# Scrape all clouds
npm run fetch:all

# Result: Fresh index with all clouds ✅
```

---

## Summary

Both fixes are critical for production use:

1. **Index Merging** enables incremental and targeted scraping
2. **Correct URLs** ensures all documentation links work

The scraper now behaves professionally and predictably! 🎉

