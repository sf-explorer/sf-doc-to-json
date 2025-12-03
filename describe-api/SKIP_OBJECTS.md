# Object Filtering Configuration

This document explains how the describe-api tool filters out unwanted Salesforce objects.

## Filtered Object Types

The following object types are automatically skipped during the describe process:

### 1. Custom Objects
- **Pattern**: Any object containing `__` (double underscore)
- **Examples**: `Custom_Object__c`, `My_Custom__Share`, `FSL__Service_Goal__c`
- **Reason**: Custom objects are organization-specific and not part of standard Salesforce documentation

### 2. History Objects
- **Pattern**: Objects ending with `History`
- **Examples**: `AccountHistory`, `OpportunityHistory`, `LeadHistory`
- **Reason**: History tracking objects that duplicate information from parent objects

### 3. Event Objects
- **Pattern**: Objects ending with `Event`
- **Examples**: `DeleteEvent`, `LoginEvent`, `BatchApexErrorEvent`
- **Reason**: Event-driven architecture objects that are transient and implementation-specific

### 4. Feed Objects
- **Pattern**: Objects ending with `Feed`
- **Examples**: `AccountFeed`, `CaseFeed`, `ContentDocumentFeed`
- **Reason**: Chatter feed objects that contain activity streams

### 5. Share Objects
- **Pattern**: Objects ending with `Share`
- **Examples**: `AccountShare`, `OpportunityShare`, `CaseShare`
- **Reason**: Sharing rule objects that contain access control information

## Configuration

The filtering logic is implemented in:
- **File**: `describe-api/src/client.ts`
- **Method**: `describeAllObjectsWithSave()`
- **Lines**: ~192-208

## Cleanup Scripts

### 1. Clean Object Files

To remove existing unwanted objects from the `doc/objects` directory:

```bash
cd describe-api
npm run clean-objects
```

This script will:
1. Scan all letter directories (A-Z) in `doc/objects`
2. Delete files matching the unwanted patterns
3. Display a summary of deleted files by type

### 2. Clean Index Files

To remove unwanted objects from all index files:

```bash
cd describe-api
npm run clean-indexes
```

This script will:
1. Clean `doc/index.json` (main index)
2. Clean all cloud-specific indexes (`doc/*-cloud.json`)
3. Clean other index files (metadata, tooling-api, loyalty, etc.)
4. Update object counts in each index
5. Display a detailed summary by file

### 3. Clean Everything

To clean both object files and all indexes in one command:

```bash
cd describe-api
npm run clean-all
```

This runs both `clean-objects` and `clean-indexes` sequentially.

## Statistics (Last Cleanup)

### Object Files (`doc/objects/`)
When run on the current documentation:
- History objects: 111 deleted
- Event objects: 84 deleted
- Feed objects: 84 deleted
- Share objects: 100 deleted
- **Total: 379 files removed**

### Index Files
When run on the current indexes:
- Main index (`index.json`): 106 objects removed (4381 → 4275)
- Cloud indexes: 86 objects removed
  - `core-salesforce.json`: 79 removed (1720 → 1641)
  - `automotive-cloud.json`: 2 removed (88 → 86)
  - `health-cloud.json`: 3 removed (247 → 244)
  - `education-cloud.json`: 1 removed (115 → 114)
  - `financial-services-cloud.json`: 1 removed (250 → 249)
- Other indexes: 24 objects removed
  - `revenue-lifecycle-management.json`: 16 removed
  - `metadata.json`: 3 removed
  - `scheduler.json`: 3 removed
  - `loyalty.json`: 1 removed
  - `tooling-api.json`: 1 removed
- **Total: 216 index entries removed**

## Modifying Filter Rules

To add or remove filter rules:

1. Edit `describe-api/src/client.ts` around line 195
2. Update the cleanup script in `describe-api/scripts/clean-unwanted-objects.js`
3. Rebuild: `npm run build`
4. Run cleanup: `npm run clean-objects`

### Example: Adding a New Filter

```typescript
// Skip objects ending with History, Event, Feed, Share, or Tag
if (obj.name.endsWith('History') || 
    obj.name.endsWith('Event') || 
    obj.name.endsWith('Feed') || 
    obj.name.endsWith('Share') ||
    obj.name.endsWith('Tag')) {
  // skip logic
}
```

## Benefits

Filtering these object types provides:
1. **Reduced Storage**: Fewer JSON files to maintain
2. **Faster Processing**: Less API calls during describe operations
3. **Cleaner Documentation**: Focus on core business objects
4. **Better Performance**: Smaller dataset for queries and searches
5. **Less Noise**: Easier to find relevant objects

