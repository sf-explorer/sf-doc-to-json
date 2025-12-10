#!/usr/bin/env node
/**
 * Generate metadata cloud from jsforce ApiSchemas with full field information
 * Stores in separate 'metadata' folder to avoid conflicts with Tooling API objects
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read the jsforce schema file to extract metadata types
const schemaPath = join(rootDir, 'describe-api/node_modules/jsforce/src/api/metadata/schema.ts');
const schemaContent = readFileSync(schemaPath, 'utf-8');

// Extract metadata type definitions with their properties
const typeDefRegex = /^  ([A-Z][a-zA-Z0-9]+): \{\n    type: '[^']+',\n    props: \{([^}]+(?:\n[^}]*)*)\},?(?:\n    extends: '([^']+)',)?/gm;

const metadataTypes = new Map();
let match;

while ((match = typeDefRegex.exec(schemaContent)) !== null) {
  const typeName = match[1];
  const propsSection = match[2];
  const extendsType = match[3];
  
  // Skip result/internal types
  if (typeName.endsWith('Result') || 
      typeName.includes('Error') || 
      typeName === 'Metadata' ||
      typeName === 'MetadataWithContent') {
    continue;
  }
  
  // Parse properties
  const props = {};
  const propLines = propsSection.split('\n');
  
  for (const line of propLines) {
    const propMatch = line.match(/^\s+([a-zA-Z0-9_]+):\s*(.+?),?\s*$/);
    if (propMatch) {
      const propName = propMatch[1];
      let propType = propMatch[2].replace(/'/g, '').trim();
      
      // Handle array types
      if (propType.startsWith('[') && propType.endsWith(']')) {
        const itemType = propType.slice(1, -1).replace(/'/g, '');
        props[propName] = {
          type: 'array',
          itemType: itemType,
          nullable: false
        };
      } else {
        // Handle optional types
        const isOptional = propType.startsWith('?');
        const cleanType = isOptional ? propType.substring(1) : propType;
        
        props[propName] = {
          type: mapJsforceType(cleanType),
          nullable: isOptional,
          readOnly: false
        };
      }
    }
  }
  
  metadataTypes.set(typeName, {
    name: typeName,
    props,
    extends: extendsType
  });
}

console.log(`Found ${metadataTypes.size} metadata types with field definitions`);

// Function to map jsforce types to schema types
function mapJsforceType(jsforceType) {
  const typeMap = {
    'string': 'string',
    'boolean': 'boolean',
    'number': 'double',
    'int': 'int',
    'double': 'double',
    'date': 'date',
    'datetime': 'datetime',
  };
  
  return typeMap[jsforceType] || 'string';
}

// Function to format label from camelCase
function formatLabel(name) {
  return name.replace(/([A-Z])/g, ' $1').trim();
}

// Function to generate description
function generateDescription(typeName) {
  return `Represents ${typeName} metadata component used in Salesforce deployments and package development.`;
}

// Function to generate field description
function generateFieldDescription(fieldName, typeName) {
  return `${formatLabel(fieldName)} field of ${typeName} metadata component.`;
}

// Remove old metadata objects from objects/ folder if they exist
console.log('Cleaning up old metadata objects from objects/ folder...');
let removedCount = 0;
for (const typeName of metadataTypes.keys()) {
  const firstLetter = typeName.charAt(0).toUpperCase();
  const oldPath = join(rootDir, 'doc/objects', firstLetter, `${typeName}.json`);
  if (existsSync(oldPath)) {
    rmSync(oldPath);
    removedCount++;
  }
}
console.log(`Removed ${removedCount} old metadata object files`);

// Create doc/metadata directories for metadata types
const metadataDir = join(rootDir, 'doc/metadata');

// Clean metadata directory if it exists
if (existsSync(metadataDir)) {
  rmSync(metadataDir, { recursive: true, force: true });
}

mkdirSync(metadataDir, { recursive: true });

for (const [typeName, typeInfo] of metadataTypes.entries()) {
  const firstLetter = typeName.charAt(0).toUpperCase();
  const letterDir = join(metadataDir, firstLetter);
  
  if (!existsSync(letterDir)) {
    mkdirSync(letterDir, { recursive: true });
  }
  
  // Convert props to properties format
  const properties = {};
  
  // Add FullName (always present in metadata)
  properties.FullName = {
    type: 'string',
    description: 'The unique identifier for this metadata component',
    nullable: false,
    readOnly: false
  };
  
  // Add all other properties
  for (const [propName, propInfo] of Object.entries(typeInfo.props)) {
    properties[propName] = {
      ...propInfo,
      description: generateFieldDescription(propName, typeName)
    };
  }
  
  const objectData = {
    [typeName]: {
      name: typeName,
      label: formatLabel(typeName),
      description: generateDescription(typeName),
      properties,
      module: 'Metadata API',
      ...(typeInfo.extends && { extends: typeInfo.extends })
    }
  };
  
  const filePath = join(letterDir, `${typeName}.json`);
  writeFileSync(filePath, JSON.stringify(objectData, null, 2));
}

console.log(`Created ${metadataTypes.size} metadata files in doc/metadata/`);

// Create metadata.json cloud file
const cloudData = {
  cloud: 'Metadata API',
  description: 'Salesforce metadata types including ApexClass, CustomObject, Flow, and other components used in deployments and package development.',
  objectCount: metadataTypes.size,
  objects: Array.from(metadataTypes.keys()).sort()
};

const cloudPath = join(rootDir, 'doc/metadata.json');
writeFileSync(cloudPath, JSON.stringify(cloudData, null, 2));
console.log(`Updated metadata cloud file: ${cloudPath}`);

// Update index.json
const indexPath = join(rootDir, 'doc/index.json');
const indexData = JSON.parse(readFileSync(indexPath, 'utf-8'));

// Remove old metadata entries from objects
let removedFromIndex = 0;
for (const typeName of metadataTypes.keys()) {
  if (indexData.objects[typeName] && indexData.objects[typeName].cloud === 'Metadata API') {
    delete indexData.objects[typeName];
    removedFromIndex++;
  }
}

// Add metadata types to index with new paths
for (const [typeName, typeInfo] of metadataTypes.entries()) {
  const firstLetter = typeName.charAt(0).toUpperCase();
  indexData.objects[typeName] = {
    cloud: 'Metadata API',
    file: `metadata/${firstLetter}/${typeName}.json`,
    description: generateDescription(typeName),
    fieldCount: Object.keys(typeInfo.props).length + 1, // +1 for FullName
    label: formatLabel(typeName)
  };
}

indexData.totalObjects = Object.keys(indexData.objects).length;
indexData.generated = new Date().toISOString();

writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
console.log(`Updated index.json (removed ${removedFromIndex} old entries, added ${metadataTypes.size} new entries)`);
console.log(`Total objects: ${indexData.totalObjects}, Total clouds: ${indexData.totalClouds}`);

