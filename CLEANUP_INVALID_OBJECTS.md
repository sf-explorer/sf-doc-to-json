# Cleanup of Invalid Object Names

## Summary

Removed 111 object files from the library that contained spaces in their API names, as these are not valid Salesforce API identifiers.

## Issue

Valid Salesforce API names should not contain spaces. Objects with spaces in their names cannot be properly used through the API and represent documentation pages or special categories rather than actual API objects.

## Action Taken

Deleted all 111 JSON files where the object name contained spaces.

## Statistics

- **Files deleted**: 111
- **Remaining object files**: 3,745
- **Date**: December 3, 2025

## Categories of Removed Objects

The removed objects fell into several categories:

### 1. Event Type Documentation Pages
- Apex Callout Event Type
- Apex Execution Event Type
- Lightning Error Event Type
- Login Event Type
- REST API Event Type
- SOAP API Event Type
- Transaction Security Event Type
- And many more event types...

### 2. Cloud-Specific Field Extensions
- Automotive Cloud Fields on Product2
- Automotive Cloud Fields on Lead
- Automotive Cloud Fields on Asset
- Loyalty Management Fields on EngagementChannelType
- FinServ AuthorizationForm Custom Fields
- And other cloud-specific field documentation...

### 3. API Usage Documentation
- API Total Usage
- Tooling API Usage
- Bulk API 2.0 Usage

### 4. Generic Documentation Pages
- Business Process
- Custom Objects
- External Objects
- Frequently Occurring Fields
- Salesforce Surveys Object Model

### 5. Special Cases
- Community (Zone)
- Consumption Rate
- Consumption Schedule
- Claim Case

## Impact

These removals improve the library by:
1. Ensuring all objects have valid API names
2. Removing documentation-only pages that aren't actual API objects
3. Maintaining consistency in the object naming conventions
4. Preventing errors when users try to use these invalid names in API calls

## Verification

After deletion:
- 0 files remain with spaces in their API names ✓
- All remaining 3,745 object files have valid API names ✓

