#!/usr/bin/env node
/**
 * Generate metadata cloud from jsforce ApiSchemas
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read the jsforce schema file to extract metadata types
const schemaPath = join(rootDir, 'describe-api/node_modules/jsforce/src/api/metadata/schema.ts');
const schemaContent = readFileSync(schemaPath, 'utf-8');

// Extract all metadata type names (lines like "  TypeName: {")
const typeRegex = /^  ([A-Z][a-zA-Z0-9]+): \{$/gm;
const metadataTypes = [];
let match;

while ((match = typeRegex.exec(schemaContent)) !== null) {
  const typeName = match[1];
  // Skip result/internal types
  if (!typeName.endsWith('Result') && 
      !typeName.includes('Error') && 
      typeName !== 'Metadata' &&
      typeName !== 'MetadataWithContent') {
    metadataTypes.push(typeName);
  }
}

console.log(`Found ${metadataTypes.length} metadata types`);

// Function to format label from camelCase
function formatLabel(name) {
  return name.replace(/([A-Z])/g, ' $1').trim();
}

// Function to generate description
function generateDescription(typeName) {
  return `Represents ${typeName} metadata component used in Salesforce deployments and package development.`;
}

// Create doc/objects directories for metadata types
const objectsDir = join(rootDir, 'doc/objects');

for (const typeName of metadataTypes) {
  const firstLetter = typeName.charAt(0).toUpperCase();
  const letterDir = join(objectsDir, firstLetter);
  
  if (!existsSync(letterDir)) {
    mkdirSync(letterDir, { recursive: true });
  }
  
  const objectData = {
    [typeName]: {
      name: typeName,
      label: formatLabel(typeName),
      description: generateDescription(typeName),
      properties: {
        FullName: {
          type: 'string',
          description: 'The unique identifier for this metadata component',
          nullable: false,
          readOnly: false
        }
      },
      module: 'Metadata API'
    }
  };
  
  const filePath = join(letterDir, `${typeName}.json`);
  writeFileSync(filePath, JSON.stringify(objectData, null, 2));
}

console.log(`Created ${metadataTypes.length} metadata object files`);

// Create metadata.json cloud file
const cloudData = {
  cloud: 'Metadata API',
  description: 'Salesforce metadata types including ApexClass, CustomObject, Flow, and other components used in deployments and package development.',
  objectCount: metadataTypes.length,
  objects: metadataTypes.sort()
};

const cloudPath = join(rootDir, 'doc/metadata.json');
writeFileSync(cloudPath, JSON.stringify(cloudData, null, 2));
console.log(`Created metadata cloud file: ${cloudPath}`);

// Update index.json
const indexPath = join(rootDir, 'doc/index.json');
const indexData = JSON.parse(readFileSync(indexPath, 'utf-8'));

// Add metadata objects to index
for (const typeName of metadataTypes) {
  const firstLetter = typeName.charAt(0).toUpperCase();
  indexData.objects[typeName] = {
    cloud: 'Metadata API',
    file: `objects/${firstLetter}/${typeName}.json`,
    description: generateDescription(typeName),
    fieldCount: 1,
    label: formatLabel(typeName)
  };
}

indexData.totalObjects += metadataTypes.length;
indexData.totalClouds += 1;
indexData.generated = new Date().toISOString();

writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
console.log(`Updated index.json with ${metadataTypes.length} metadata types`);
console.log(`Total objects: ${indexData.totalObjects}, Total clouds: ${indexData.totalClouds}`);

