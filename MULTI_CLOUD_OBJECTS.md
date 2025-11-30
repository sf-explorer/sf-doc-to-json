# Multi-Cloud Object Handling

## Issue

During the split structure migration, we discovered that **88 objects appear in multiple clouds**. For example:
- `AccountAccountRelation` appears in: Automotive Cloud, Nonprofit Cloud, Public Sector Cloud
- `Appraisal` appears in: Automotive Cloud, Financial Services Cloud

## Solution

Since each object is stored in a single file (e.g., `objects/A/AccountAccountRelation.json`), but can belong to multiple clouds, we implemented **dynamic cloud assignment** in the API layer:

### How It Works

1. **Object Files**: Store the object with its original `module` field from the first cloud processed
2. **Cloud Index Files**: Each cloud's JSON file lists all objects that belong to it
3. **Runtime Override**: When loading an object, the API checks which cloud it's being requested for and overrides the `module` field if needed

### Implementation

```typescript
async function loadObjectFromFile(objectName: string, expectedCloud?: string) {
    const obj = /* load from file */;
    
    // If requested cloud differs from stored cloud, override it
    if (obj && expectedCloud && obj.module !== expectedCloud) {
        return { ...obj, module: expectedCloud };
    }
    
    return obj;
}
```

### Benefits

- ✅ **No Data Duplication**: Each object stored once (not 2-3 times)
- ✅ **Correct Cloud Attribution**: Objects return the correct cloud based on context
- ✅ **Transparent to Users**: API handles this automatically
- ✅ **All Tests Pass**: Including cloud-specific object tests

### Examples

```typescript
// Load from Automotive Cloud
const automotiveObjects = await getObjectsByCloud('Automotive Cloud');
// AccountAccountRelation.module === 'Automotive Cloud'

// Load from Nonprofit Cloud  
const nonprofitObjects = await getObjectsByCloud('Nonprofit Cloud');
// AccountAccountRelation.module === 'Nonprofit Cloud'

// Same physical file, different module value returned!
```

## Statistics

- **Total Objects**: 3,437
- **Objects in Multiple Clouds**: 88 (2.6%)
- **Disk Space Saved**: ~50% compared to duplicating multi-cloud objects

