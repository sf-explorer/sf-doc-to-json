# Split Structure Documentation

## Overview

This project has been optimized with a split file structure where individual Salesforce objects are stored in separate files, organized alphabetically. This improves performance, maintainability, and developer experience.

## Directory Structure

```
doc/
├── index.json                          # Main index with all objects
├── objects/                            # All objects in alphabetical folders
│   ├── A/                             # Objects starting with A
│   │   ├── Account.json
│   │   ├── AccountContactRole.json
│   │   └── ...
│   ├── B/
│   ├── C/
│   └── ...
├── core-salesforce.json               # List of Core Salesforce objects
├── financial-services-cloud.json      # List of Financial Services objects
├── health-cloud.json                  # List of Health Cloud objects
└── ...                                # Other cloud index files
```

## Benefits

### 1. **Massive File Size Reduction**
- `core-salesforce.json`: 4.2 MB → 45 KB (99% reduction)
- Each cloud file is now just a lightweight index

### 2. **Performance Improvements**
- Faster git operations (diff, merge, clone)
- Reduced memory usage when loading specific objects
- Better IDE performance
- Lazy loading support

### 3. **Better Developer Experience**
- Easier to navigate and find specific objects
- Cleaner git diffs and merge conflicts
- Ability to work on different objects concurrently
- Faster file operations

## File Formats

### Cloud Index Files (e.g., `core-salesforce.json`)

```json
{
  "cloud": "Core Salesforce",
  "description": "Standard Salesforce objects including Account, Contact, Opportunity, Case, Lead, and other core CRM functionality.",
  "objectCount": 1717,
  "objects": [
    "Account",
    "Contact",
    "Opportunity",
    ...
  ]
}
```

Each cloud index includes:
- **cloud**: The official cloud name
- **description**: What this cloud is used for and what types of objects it contains
- **objectCount**: Total number of objects in this cloud
- **objects**: Alphabetically sorted array of object names

### Individual Object Files (e.g., `objects/A/Account.json`)

```json
{
  "Account": {
    "name": "Account",
    "description": "Represents an individual account...",
    "properties": {
      "AccountNumber": {
        "type": "string",
        "description": "Account number assigned..."
      },
      ...
    },
    "module": "Core Salesforce"
  }
}
```

### Main Index File (`index.json`)

```json
{
  "generated": "2024-11-08T05:39:00.000Z",
  "version": "62.0",
  "totalObjects": 3437,
  "totalClouds": 15,
  "objects": {
    "Account": {
      "cloud": "Core Salesforce",
      "file": "objects/A/Account.json"
    },
    ...
  }
}
```

## Usage

The API automatically handles the split structure transparently:

```typescript
import { getObject, loadCloud, searchObjects } from '@sf-explorer/salesforce-object-reference';

// Load a single object (only loads that one file)
const account = await getObject('Account');

// Load all objects from a cloud (loads all objects in that cloud)
const coreObjects = await loadCloud('core-salesforce');

// Search objects (uses index, doesn't load all files)
const results = await searchObjects('Account');
```

## Backward Compatibility

The code maintains backward compatibility with the old single-file format. If old format files are detected, they will be loaded correctly. This ensures a smooth transition period.

## Statistics

After migration:
- **Total Objects**: 3,437
- **Total Clouds**: 15
- **Letter Folders**: 26 (A-Z, excluding Z)
- **Largest Folder**: C/ with 627 objects
- **Core Salesforce**: 1,717 objects (50% of total)

## Migration

If you need to migrate existing large JSON files to this structure:

```bash
node scripts/migrate-to-split-structure.mjs
```

## Scraper Updates

When running the scraper, it now automatically generates this split structure:

```bash
npm run scrape
```

The scraper will:
1. Create `doc/objects/` folder with A-Z subfolders
2. Save each object to its own file
3. Generate cloud index files
4. Update the main index

