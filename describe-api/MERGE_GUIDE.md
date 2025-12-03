# Quick Guide: Merge Describe API with Documentation

## To Update Your `/doc/objects` with Describe API Data

Your `.env` should have these settings:

```bash
# OAuth2 credentials (required)
SF_ACCESS_TOKEN=your-token-here
SF_INSTANCE_URL=https://your-instance.salesforce.com

# MERGE MODE - preserves descriptions!
SF_MERGE_WITH_DOCS=true
SF_OUTPUT_DIR=../doc

# Optional: fetch specific objects first to test
# SF_OBJECTS=Account,Contact,User

# Batch size (lower = more polite to API)
SF_BATCH_SIZE=10
```

## Run the Update

```bash
cd describe-api
npm start
```

## What Happens

The tool will:
1. ✅ Fetch object metadata from your Salesforce org using Describe API
2. ✅ Read existing files from `../doc/objects/`
3. ✅ **Merge** new data with existing:
   - **Keeps**: Descriptions from documentation
   - **Keeps**: Module/cloud information
   - **Keeps**: Source URLs
   - **Adds**: Enum values from your org
   - **Adds**: Reference relationships (`x-object`, `x-objects`)
   - **Adds**: Field constraints (maxLength, nullable, etc.)
   - **Adds**: Custom fields from your org
4. ✅ Save merged files back to `../doc/objects/` **incrementally**

## Watch Progress

In another terminal:
```bash
# Watch file count
watch -n 1 'find doc/objects -name "*.json" -newer doc/objects/A/Account.json 2>/dev/null | wc -l'

# Or watch timestamps
ls -lt doc/objects/A/ | head -20
```

## Test with Specific Objects First

To test before running all 4,801 objects:

```bash
# In your .env, add:
SF_OBJECTS=Account,Contact,User,Opportunity

# Then run
npm start
```

Check `doc/objects/A/Account.json` to verify the merge worked correctly!

## What You'll See

Files will be updated with timestamps as they're processed:

```bash
Progress: 1/4801 - AIInsightAction
  → Merged to ../doc/objects/A/AIInsightAction.json ✅
Progress: 2/4801 - Account  
  → Merged to ../doc/objects/A/Account.json ✅
...
```

## Verify It Worked

```bash
# Check an updated file
cat doc/objects/A/Account.json | grep -A 3 '"Type"'

# You should see:
# "Type": {
#   "type": "string",
#   "description": "Type of account",  ← FROM DOCS!
#   "format": "enum",                  ← FROM DESCRIBE!
#   "enum": ["Prospect", "Customer"...]  ← FROM YOUR ORG!
# }
```

