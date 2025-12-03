#!/usr/bin/env node

/**
 * Script to add keyPrefix data from globalDescribe.json to index.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docDir = path.resolve(__dirname, '../doc');

console.log('Adding key prefixes to index.json...\n');

// Read globalDescribe.json
const globalDescribePath = path.join(docDir, 'globalDescribe.json');
if (!fs.existsSync(globalDescribePath)) {
    console.error('Error: globalDescribe.json not found at', globalDescribePath);
    process.exit(1);
}

console.log('Reading globalDescribe.json...');
const globalDescribe = JSON.parse(fs.readFileSync(globalDescribePath, 'utf-8'));

// Build a map of object name -> keyPrefix
const prefixMap = {};
let totalWithPrefix = 0;
let totalWithoutPrefix = 0;

for (const sobject of globalDescribe.sobjects) {
    if (sobject.name && sobject.keyPrefix) {
        prefixMap[sobject.name] = sobject.keyPrefix;
        totalWithPrefix++;
    } else if (sobject.name) {
        totalWithoutPrefix++;
    }
}

console.log(`Found ${totalWithPrefix} objects with key prefixes`);
console.log(`Found ${totalWithoutPrefix} objects without key prefixes\n`);

// Read index.json
const indexPath = path.join(docDir, 'index.json');
if (!fs.existsSync(indexPath)) {
    console.error('Error: index.json not found at', indexPath);
    process.exit(1);
}

console.log('Reading index.json...');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Add key prefixes to index objects
let added = 0;
let notFound = 0;

for (const [objectName, metadata] of Object.entries(index.objects)) {
    if (prefixMap[objectName]) {
        metadata.keyPrefix = prefixMap[objectName];
        added++;
    } else {
        notFound++;
    }
}

console.log(`Added key prefixes to ${added} objects in index.json`);
console.log(`${notFound} objects in index.json don't have key prefixes in globalDescribe\n`);

// Write updated index.json
console.log('Writing updated index.json...');
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');

console.log('\n✅ Successfully added key prefixes to index.json');
console.log(`   ${added} objects now have key prefixes`);

