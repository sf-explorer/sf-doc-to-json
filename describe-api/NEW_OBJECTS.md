# Handling New Objects Not in Documentation

## What Happens Now

When you run the Describe API merge, objects are handled in **3 scenarios**:

### 1. ✅ Object Exists in Documentation (Most Common)
**What happens:**
- Merges Describe API data with existing doc
- **Preserves** description from documentation
- **Preserves** module/cloud assignment
- **Preserves** sourceUrl
- **Adds** enum values, relationships, constraints

**Example:** `Account`, `Contact`, `Opportunity`

### 2. 🆕 Custom Object from Your Org (New!)
**What happens:**
- Object not found in documentation
- Creates new entry in `/doc/objects/`
- **Sets** `module: "N/A"`
- **Generates** basic description
- **Includes** all Describe API metadata

**Example:** `MyCustomObject__c`, `CompanySpecificData__c`

**Console output:**
```
Progress: 523/4801 - MyCustomObject__c
  ℹ️  New object not in docs: MyCustomObject__c (adding to N/A cloud)
  → Saved to ../doc/objects/M/MyCustomObject__c.json ✅
```

### 3. 📦 Managed Package Objects (New!)
**What happens:**
- Objects from installed packages (e.g., `vlocity_ins__Policy__c`)
- Not in Salesforce documentation
- Creates new entry
- **Sets** `module: "N/A"`
- Includes package namespace in name

**Example:** `vlocity_ins__Policy__c`, `FinancialForce__Invoice__c`

## Output Format for New Objects

```json
{
  "MyCustomObject__c": {
    "name": "MyCustomObject__c",
    "description": "MyCustomObject__c object from Salesforce org",
    "properties": {
      "Name": {
        "type": "string",
        "description": "Name field",
        "maxLength": 80,
        "nullable": false
      },
      "CustomField__c": {
        "type": "string",
        "description": "CustomField__c field",
        "format": "enum",
        "enum": ["Option1", "Option2", "Option3"]
      }
    },
    "module": "N/A",
    "keyPrefix": "a0X",
    "label": "My Custom Object"
  }
}
```

## Benefits

### Before (Without This Feature)
- ❌ Custom objects would fail or be skipped
- ❌ No way to document your org-specific objects
- ❌ Package objects invisible

### After (With This Feature)
- ✅ All objects from your org are captured
- ✅ Custom objects automatically added
- ✅ Package objects included
- ✅ Complete org documentation
- ✅ Demo can browse ALL your objects

## In the Demo

New objects will appear with:
- **Cloud Filter**: "N/A" category
- **Label**: From Describe API
- **Fields**: All custom fields with metadata
- **References**: Clickable relationships
- **Enums**: Real picklist values

## Filtering in Demo

Users can filter by cloud:
```
☐ Core Salesforce (1,234 objects)
☐ Financial Services Cloud (567 objects)
☐ Health Cloud (234 objects)
☑ N/A (89 objects) ← Your custom objects!
```

## Run It

```bash
cd describe-api

# Your .env should have:
# SF_MERGE_WITH_DOCS=true
# SF_OUTPUT_DIR=../doc

npm start
```

Watch for the `ℹ️  New object not in docs` messages to see which custom objects are being added!

## Statistics After Run

The tool will show:
```
Done!

Summary:
- Merged: 1,234 objects (found in docs)
- Added: 89 new objects (custom/packages)
- Total: 1,323 objects in your catalog
```

## Update Index

After running, you may want to update the main index.json to include the new objects:

```bash
# TODO: Add script to regenerate index.json with N/A objects
```

