/**
 * Salesforce Object Reference - API Quick Reference
 * 
 * Import:
 *   import { ... } from '@sf-explorer/salesforce-object-reference';
 * 
 * Or:
 *   const { ... } = require('@sf-explorer/salesforce-object-reference');
 */

// ============================================
// 1. LOAD INDEX
// ============================================
import { loadIndex } from '@sf-explorer/salesforce-object-reference';

const index = loadIndex();
/*
Returns: {
  generated: "2025-11-07T...",
  version: "264.0",
  totalObjects: 1500,
  totalClouds: 13,
  objects: {
    "Account": { 
      cloud: "Core Salesforce", 
      file: "objects/A/Account.json",
      description: "An organization or individual involved...",
      fieldCount: 76,
      keyPrefix: "001",  // 3-character ID prefix for records
      label: "Account",   // User-friendly display name
      sourceUrl: "https://developer.salesforce.com/docs/..."  // Official doc link
    },
    ...
  }
}
*/

// ============================================
// 2. GET SPECIFIC OBJECT
// ============================================
import { getObject } from '@sf-explorer/salesforce-object-reference';

const account = getObject('Account');
/*
Returns: {
  name: "Account",
  description: "...",
  module: "Core Salesforce",
  properties: {
    "Name": { type: "string", description: "..." },
    "Industry": { type: "picklist", description: "..." },
    ...
  }
}
*/

// ============================================
// 3. SEARCH OBJECTS
// ============================================
import { searchObjects } from '@sf-explorer/salesforce-object-reference';

// String search (case-insensitive)
const results1 = searchObjects('financial');

// Regex search
const results2 = searchObjects(/^Account/i);
/*
Returns: [
  { name: "Account", cloud: "Core Salesforce", file: "core-salesforce.json" },
  { name: "AccountContactRole", cloud: "Core Salesforce", file: "core-salesforce.json" },
  ...
]
*/

// ============================================
// 4. GET OBJECTS BY CLOUD
// ============================================
import { getObjectsByCloud } from '@sf-explorer/salesforce-object-reference';

const fscObjects = getObjectsByCloud('Financial Services Cloud');
/*
Returns: [
  {
    name: "FinancialAccount",
    description: "...",
    module: "Financial Services Cloud",
    properties: { ... }
  },
  ...
]
*/

// ============================================
// 5. GET AVAILABLE CLOUDS
// ============================================
import { getAvailableClouds } from '@sf-explorer/salesforce-object-reference';

const clouds = getAvailableClouds();
/*
Returns: [
  "Automotive Cloud",
  "Consumer Goods Cloud",
  "Core Salesforce",
  "Education Cloud",
  "Energy and Utilities Cloud",
  "Feedback Management",
  "Field Service Lightning",
  "Financial Services Cloud",
  "Health Cloud",
  ...
]
*/

// ============================================
// 6. LOAD ENTIRE CLOUD
// ============================================
import { loadCloud } from '@sf-explorer/salesforce-object-reference';

const fscData = loadCloud('financial-services-cloud');
/*
Returns: {
  "FinancialAccount": { name: "...", description: "...", properties: {...} },
  "FinancialAccountRole": { ... },
  ...
}
*/

// ============================================
// 7. LOAD OBJECT DESCRIPTIONS (EFFICIENT)
// ============================================
import { loadAllDescriptions, getObjectDescription } from '@sf-explorer/salesforce-object-reference';

// Get all descriptions at once (much faster than loading full objects)
const descriptions = loadAllDescriptions();
/*
Returns: {
  "Account": {
    description: "An organization or individual involved...",
    cloud: "Core Salesforce",
    fieldCount: 76,
    keyPrefix: "001",
    label: "Account",
    sourceUrl: "https://developer.salesforce.com/docs/..."
  },
  ...
}
*/

// Get description for a specific object
const accountDesc = getObjectDescription('Account');
/*
Returns: {
  description: "An organization or individual involved...",
  cloud: "Core Salesforce",
  fieldCount: 76,
  keyPrefix: "001",
  label: "Account",
  sourceUrl: "https://developer.salesforce.com/docs/..."
}
*/

// ============================================
// 8. SEARCH BY DESCRIPTION
// ============================================
import { searchObjectsByDescription, getDescriptionsByCloud } from '@sf-explorer/salesforce-object-reference';

// Search for objects by description text
const results = searchObjectsByDescription('financial');
/*
Returns: [
  {
    name: "FinancialAccount",
    description: "A financial account...",
    cloud: "Financial Services Cloud",
    fieldCount: 45,
    keyPrefix: "01k",
    label: "Financial Account"
  },
  ...
]
*/

// Get all descriptions for a specific cloud
const fscDescriptions = getDescriptionsByCloud('Financial Services Cloud');
/*
Returns: {
  "FinancialAccount": {
    description: "A financial account...",
    fieldCount: 45,
    keyPrefix: "01k",
    label: "Financial Account"
  },
  ...
}
*/

// ============================================
// FULL EXAMPLE
// ============================================
import {
  loadIndex,
  getObject,
  searchObjects,
  getObjectsByCloud,
  getAvailableClouds,
  loadAllDescriptions,
  getObjectDescription
} from '@ndespres/salesforce-object-reference';

function example() {
  // 1. Check what's available
  const index = loadIndex();
  console.log(`Total: ${index?.totalObjects} objects across ${index?.totalClouds} clouds`);
  
  // 2. List clouds
  const clouds = getAvailableClouds();
  console.log('Clouds:', clouds);
  
  // 3. Search for Account objects
  const accountObjs = searchObjects(/account/i);
  console.log(`Found ${accountObjs.length} account objects`);
  
  // 4. Get object description (fast, no field data)
  const accountDesc = getObjectDescription('Account');
  if (accountDesc) {
    console.log(`${accountDesc.label}: ${accountDesc.description}`);
    console.log(`Key Prefix: ${accountDesc.keyPrefix}`);
    console.log(`Fields: ${accountDesc.fieldCount}`);
  }
  
  // 5. Get full object (when you need field details)
  const account = getObject('Account');
  if (account) {
    console.log(`${account.name}: ${account.description}`);
    console.log(`Fields: ${Object.keys(account.properties).length}`);
  }
  
  // 6. Get all FSC objects
  const fscObjs = getObjectsByCloud('Financial Services Cloud');
  console.log(`FSC has ${fscObjs.length} objects`);
  fscObjs.forEach(obj => {
    console.log(`  - ${obj.name}`);
  });
  
  // 7. Load all descriptions efficiently
  const descriptions = loadAllDescriptions();
  if (descriptions) {
    // Find all objects with a specific key prefix pattern
    const objectsWithPrefix = Object.entries(descriptions)
      .filter(([_, meta]) => meta.keyPrefix?.startsWith('0'))
      .map(([name, meta]) => ({ name, prefix: meta.keyPrefix }));
    console.log(`Objects with 0-prefix: ${objectsWithPrefix.length}`);
  }
}

// ============================================
// TYPESCRIPT TYPES
// ============================================
import type {
  SalesforceObject,
  FieldProperty,
  DocumentIndex,
  ObjectIndexEntry,
  CloudData,
  SalesforceObjectCollection
} from '@sf-explorer/salesforce-object-reference';

const myObject: SalesforceObject = {
  name: 'CustomObject',
  description: 'A custom object',
  module: 'Core Salesforce',
  properties: {
    'CustomField': {
      type: 'String',
      description: 'A custom field'
    }
  }
};

// ObjectIndexEntry includes keyPrefix, label, and sourceUrl fields
const indexEntry: ObjectIndexEntry = {
  cloud: 'Core Salesforce',
  file: 'objects/A/Account.json',
  description: 'An organization or individual involved...',
  fieldCount: 76,
  keyPrefix: '001',  // Optional: 3-character Salesforce ID prefix
  label: 'Account',   // Optional: User-friendly display name
  sourceUrl: 'https://developer.salesforce.com/docs/...'  // Optional: Official documentation link
};

// ============================================
// CLI USAGE
// ============================================

// Fetch all clouds (default version 264.0)
// $ npx sf-doc-fetch

// Fetch specific version
// $ npx sf-doc-fetch 265.0

// Fetch specific cloud
// $ npx sf-doc-fetch 265.0 atlas.en-us.financial_services_cloud_object_reference.meta

// Available documentation IDs:
const DOCS = {
  'atlas.en-us.object_reference.meta': 'Core Salesforce',
  'atlas.en-us.financial_services_cloud_object_reference.meta': 'Financial Services Cloud',
  'atlas.en-us.health_cloud_object_reference.meta': 'Health Cloud',
  'atlas.en-us.retail_api.meta': 'Consumer Goods Cloud',
  'atlas.en-us.field_service_dev.meta': 'Field Service Lightning',
  'atlas.en-us.mfg_api_devguide.meta': 'Manufacturing Cloud',
  'atlas.en-us.eu_developer_guide.meta': 'Energy and Utilities Cloud',
  'atlas.en-us.edu_cloud_dev_guide.meta': 'Education Cloud',
  'atlas.en-us.automotive_cloud.meta': 'Automotive Cloud',
  'atlas.en-us.nonprofit_cloud.meta': 'Nonprofit Cloud',
  'atlas.en-us.psc_api.meta': 'Public Sector Cloud',
  'atlas.en-us.netzero_cloud_dev_guide.meta': 'Net Zero Cloud',
  'atlas.en-us.loyalty.meta': 'Loyalty',
  'atlas.en-us.salesforce_scheduler_developer_guide.meta': 'Scheduler',
  'atlas.en-us.salesforce_feedback_management_dev_guide.meta': 'Feedback Management'
};

