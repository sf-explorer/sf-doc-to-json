#!/usr/bin/env node

/**
 * Script to:
 * 1. Add keyPrefix and label data from globalDescribe.json to index.json
 * 2. Create Tooling API objects as a separate cloud from toolingGlobalDescribe.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docDir = path.resolve(__dirname, '../doc');

console.log('Processing globalDescribe and toolingGlobalDescribe...\n');

// Read globalDescribe.json
const globalDescribePath = path.join(docDir, 'globalDescribe.json');
if (!fs.existsSync(globalDescribePath)) {
    console.error('Error: globalDescribe.json not found at', globalDescribePath);
    process.exit(1);
}

console.log('Reading globalDescribe.json...');
const globalDescribe = JSON.parse(fs.readFileSync(globalDescribePath, 'utf-8'));

// Read toolingGlobalDescribe.json
const toolingGlobalDescribePath = path.join(docDir, 'toolingGlobalDescribe.json');
let toolingGlobalDescribe = null;
if (fs.existsSync(toolingGlobalDescribePath)) {
    console.log('Reading toolingGlobalDescribe.json...');
    toolingGlobalDescribe = JSON.parse(fs.readFileSync(toolingGlobalDescribePath, 'utf-8'));
}

// Build maps of object name -> keyPrefix and label
const prefixMap = {};
const labelMap = {};
let totalWithPrefix = 0;
let totalWithoutPrefix = 0;
let totalWithLabel = 0;

for (const sobject of globalDescribe.sobjects) {
    if (sobject.name) {
        if (sobject.keyPrefix) {
            prefixMap[sobject.name] = sobject.keyPrefix;
            totalWithPrefix++;
        } else {
            totalWithoutPrefix++;
        }
        
        if (sobject.label) {
            labelMap[sobject.name] = sobject.label;
            totalWithLabel++;
        }
    }
}

console.log(`Found ${totalWithPrefix} objects with key prefixes`);
console.log(`Found ${totalWithoutPrefix} objects without key prefixes`);
console.log(`Found ${totalWithLabel} objects with labels\n`);

// Process tooling API objects and create them as a separate cloud
let toolingObjectsCreated = 0;
const toolingObjectNames = [];

if (toolingGlobalDescribe) {
    console.log('Processing Tooling API objects...');
    
    const objectsFolder = path.join(docDir, 'objects');
    
    for (const sobject of toolingGlobalDescribe.sobjects) {
        // Only process standard objects (no custom objects with __)
        if (sobject.name && !sobject.name.includes('__')) {
            const objectName = sobject.name;
            
            // Add to maps if not already present
            if (sobject.keyPrefix && !prefixMap[objectName]) {
                prefixMap[objectName] = sobject.keyPrefix;
            }
            if (sobject.label && !labelMap[objectName]) {
                labelMap[objectName] = sobject.label;
            }
            
            // Create object file for Tooling API
            const firstLetter = objectName[0].toUpperCase();
            const objectFilePath = path.join(objectsFolder, firstLetter, `${objectName}.json`);
            
            // Check if object file already exists (from scraper)
            if (!fs.existsSync(objectFilePath)) {
                // Create a basic object structure for Tooling API objects
                const objectData = {
                    [objectName]: {
                        name: objectName,
                        description: '', // No description - not scraped
                        properties: {},
                        module: 'Tooling API'
                    }
                };
                
                fs.writeFileSync(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
                toolingObjectsCreated++;
            }
            
            toolingObjectNames.push(objectName);
        }
    }
    
    console.log(`Created ${toolingObjectsCreated} new Tooling API object files`);
    
    // Create Tooling API cloud index file
    const toolingCloudPath = path.join(docDir, 'tooling-api.json');
    const toolingCloudIndex = {
        cloud: 'Tooling API',
        description: 'Salesforce Tooling API objects for metadata management, deployment, and development operations.',
        objectCount: toolingObjectNames.length,
        objects: toolingObjectNames.sort()
    };
    
    fs.writeFileSync(toolingCloudPath, JSON.stringify(toolingCloudIndex, null, 2), 'utf-8');
    console.log(`Created Tooling API cloud index with ${toolingObjectNames.length} objects\n`);
}

// Read index.json
const indexPath = path.join(docDir, 'index.json');
if (!fs.existsSync(indexPath)) {
    console.error('Error: index.json not found at', indexPath);
    process.exit(1);
}

console.log('Reading index.json...');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Add key prefixes and labels to existing objects in index
let prefixesAdded = 0;
let labelsAdded = 0;
let genericLabelsRemoved = 0;

for (const [objectName, metadata] of Object.entries(index.objects)) {
    if (prefixMap[objectName]) {
        metadata.keyPrefix = prefixMap[objectName];
        prefixesAdded++;
    }
    
    // Remove generic "Entity" labels
    if (metadata.label === 'Entity') {
        delete metadata.label;
        genericLabelsRemoved++;
    }
    // Only add label if it's meaningful (not generic "Entity")
    else if (labelMap[objectName] && labelMap[objectName] !== 'Entity') {
        metadata.label = labelMap[objectName];
        labelsAdded++;
    }
}

// Add Tooling API objects to index
let toolingAddedToIndex = 0;
if (toolingObjectNames.length > 0) {
    for (const objectName of toolingObjectNames) {
        // Only add if not already in index
        if (!index.objects[objectName]) {
            const firstLetter = objectName[0].toUpperCase();
            // Only use label if it's meaningful (not generic "Entity")
            const meaningfulLabel = labelMap[objectName] !== 'Entity' ? labelMap[objectName] : undefined;
            
            index.objects[objectName] = {
                cloud: 'Tooling API',
                file: `objects/${firstLetter}/${objectName}.json`,
                description: '', // No description - not scraped
                fieldCount: 0,
                keyPrefix: prefixMap[objectName],
                label: meaningfulLabel
            };
            toolingAddedToIndex++;
        }
    }
}

// Update totals
index.totalObjects = Object.keys(index.objects).length;
const clouds = new Set(Object.values(index.objects).map(obj => obj.cloud));
index.totalClouds = clouds.size;

console.log(`Added key prefixes to ${prefixesAdded} existing objects`);
console.log(`Added labels to ${labelsAdded} existing objects`);
if (genericLabelsRemoved > 0) {
    console.log(`Removed ${genericLabelsRemoved} generic "Entity" labels`);
}
if (toolingAddedToIndex > 0) {
    console.log(`Added ${toolingAddedToIndex} Tooling API objects to index`);
}

// Sort index objects alphabetically
const sortedObjects = {};
Object.keys(index.objects).sort().forEach(key => {
    sortedObjects[key] = index.objects[key];
});
index.objects = sortedObjects;

// Write updated index.json
console.log('\nWriting updated index.json...');
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');

console.log('\n✅ Successfully enriched data');
console.log(`   ${prefixesAdded} objects now have key prefixes`);
console.log(`   ${labelsAdded} objects now have labels`);
if (genericLabelsRemoved > 0) {
    console.log(`   ${genericLabelsRemoved} generic "Entity" labels removed`);
}
if (toolingGlobalDescribe) {
    console.log(`   ${toolingObjectNames.length} total Tooling API objects`);
    console.log(`   ${toolingObjectsCreated} new Tooling API object files created`);
    console.log(`   ${toolingAddedToIndex} Tooling API objects added to index`);
}
console.log(`   Total objects in index: ${index.totalObjects}`);
console.log(`   Total clouds: ${index.totalClouds}`);

