# Resume Capability & Enhanced Metadata

## New Features

### 1. ✅ Auto-Resume from Last Processed Object

The tool now saves progress every 10 objects and can automatically resume if interrupted!

**Progress file:** `.describe-progress.json`

### 2. ✅ Child Relationships (`x-child-relations`)

Now includes child object relationships showing which objects reference this one.

### 3. ✅ CRUD Flags Already Included

The tool already captures:
- `createable` - Can create new records
- `updateable` - Can update records  
- `deletable` - Can delete records
- `queryable` - Can query via SOQL
- `searchable` - Appears in search results

## Usage

### Auto-Resume (Default)

If the tool is interrupted (Ctrl+C, error, timeout), just restart it:

```bash
cd describe-api
npm start
```

It will automatically detect and resume:

```
📍 Found previous progress:
   Last processed: Account (index 444)
   Processed: 444/4801
   Last updated: 12/3/2024, 1:23:45 PM

🔄 Resuming from index 445...

Progress: 445/4801 - AccountBrand
Progress: 446/4801 - AccountChangeEvent
...
```

### Start from Specific Index

Force start from a specific object:

```bash
# In your .env
SF_START_FROM_INDEX=444

# Or directly
SF_START_FROM_INDEX=444 npm start
```

### Disable Resume (Start Fresh)

```bash
# In your .env
SF_RESUME=false

# Or directly
SF_RESUME=false npm start
```

## Progress File

`.describe-progress.json` is saved in your output directory:

```json
{
  "lastProcessedIndex": 444,
  "lastProcessedObject": "Account",
  "totalObjects": 4801,
  "startedAt": "2024-12-03T18:00:00.000Z",
  "lastUpdatedAt": "2024-12-03T18:23:45.000Z",
  "processedCount": 444
}
```

### Progress Saves

- Every 10 objects processed
- Survives crashes, Ctrl+C, network errors
- Automatically deleted when completed

## Child Relationships

Objects now include `x-child-relations` showing what objects reference them:

```json
{
  "Account": {
    "properties": { ... },
    "x-salesforce": {
      "createable": true,
      "updateable": true,
      "deletable": true,
      "queryable": true,
      "searchable": true
    },
    "x-child-relations": [
      {
        "childObject": "Contact",
        "field": "AccountId",
        "relationshipName": "Contacts",
        "cascadeDelete": false
      },
      {
        "childObject": "Opportunity",
        "field": "AccountId",
        "relationshipName": "Opportunities",
        "cascadeDelete": false
      },
      {
        "childObject": "Case",
        "field": "AccountId",
        "relationshipName": "Cases",
        "cascadeDelete": false
      }
    ]
  }
}
```

## CRUD Flags Usage

Check what operations are allowed:

```javascript
import { getObject } from '@sf-explorer/salesforce-object-reference';

const account = await getObject('Account');

if (account['x-salesforce']?.createable) {
  console.log('✅ Can create Accounts');
}

if (account['x-salesforce']?.deletable) {
  console.log('✅ Can delete Accounts');
}

if (account['x-salesforce']?.searchable) {
  console.log('✅ Accounts appear in search');
}
```

## Demo Enhancements

The demo now shows:

### Object Summary
- **CRUD Flags**: Visual badges for create/update/delete
- **Searchable**: Icon if object appears in search
- **Child Relations**: Count of child objects

### Field Details
- **Reference Fields**: Clickable links
- **Child Relations Tab**: Browse objects that reference this one

## Common Scenarios

### 1. Interrupted at Object 444

```bash
npm start

# Output:
📍 Found previous progress:
   Last processed: Account (index 444)
🔄 Resuming from index 445...
```

### 2. Want to Start Fresh

```bash
SF_RESUME=false npm start

# Or manually delete progress
rm .describe-progress.json
npm start
```

### 3. Skip First 1000 Objects

```bash
SF_START_FROM_INDEX=1000 npm start
```

### 4. Process in Chunks

```bash
# Day 1: Process first 1000
SF_START_FROM_INDEX=0 SF_OBJECTS_LIMIT=1000 npm start

# Day 2: Next 1000
SF_START_FROM_INDEX=1000 SF_OBJECTS_LIMIT=1000 npm start
```

## Tips

1. **Let it run overnight** - Auto-resume means you can safely stop and restart
2. **Check progress** - Look at `.describe-progress.json` anytime
3. **Monitor files** - Watch `/doc/objects/` timestamps to see progress
4. **Network issues** - Tool will skip failed objects and continue

## Environment Variables

```bash
# Resume from last point (default: true)
SF_RESUME=true

# Or start from specific index
SF_START_FROM_INDEX=444

# Disable resume and start fresh
SF_RESUME=false
```

## What Gets Captured

For each object:
- ✅ All fields with types
- ✅ Enum values from picklists
- ✅ Reference relationships (x-object, x-objects)
- ✅ Field constraints (maxLength, nullable, etc.)
- ✅ **Child relationships** (what objects point to this)
- ✅ **CRUD flags** (createable, updateable, deletable, queryable, searchable)
- ✅ Key prefix for ID recognition

All while preserving descriptions from documentation! 🎉

