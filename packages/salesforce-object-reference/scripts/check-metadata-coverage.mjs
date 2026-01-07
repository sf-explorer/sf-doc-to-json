#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const objectRefRoot = path.join(__dirname, '..');
const metadataRefRoot = path.join(__dirname, '../../salesforce-metadata-reference');

const missingObjectsPath = path.join(objectRefRoot, 'missing-objects.json');
const objectRefIndexPath = path.join(objectRefRoot, 'src/doc/index.json');
const metadataRefIndexPath = path.join(metadataRefRoot, 'src/doc/index.json');

console.log('Loading indexes...');
const missingObjects = JSON.parse(fs.readFileSync(missingObjectsPath, 'utf8'));
const objectRefIndex = JSON.parse(fs.readFileSync(objectRefIndexPath, 'utf8'));
const metadataRefIndex = JSON.parse(fs.readFileSync(metadataRefIndexPath, 'utf8'));

console.log(`\nFound ${missingObjects.length} missing objects in object-reference`);
console.log(`Metadata-reference has ${metadataRefIndex.objectCount} objects\n`);

// Build a map of metadata objects by name
const metadataObjectMap = {};
for (const objectName of metadataRefIndex.objects) {
  metadataObjectMap[objectName] = true;
}

let copiedCount = 0;
let notFoundCount = 0;
const notFound = [];
const copied = [];

// Create backup
const backupPath = objectRefIndexPath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, fs.readFileSync(objectRefIndexPath));
console.log(`💾 Backup created: ${path.basename(backupPath)}\n`);

for (const obj of missingObjects) {
  const objectName = obj.name;
  
  // Check if this object exists in metadata-reference index
  if (metadataObjectMap[objectName]) {
    // The object exists in metadata-reference
    // Copy the index entry from object-reference (keep it as is, since it has the file path and cloud info)
    // We just confirm it exists in metadata
    console.log(`✓ Confirmed in metadata: ${objectName}`);
    copied.push(objectName);
    copiedCount++;
  } else {
    notFound.push(obj);
    notFoundCount++;
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`SUMMARY`);
console.log(`${'='.repeat(80)}`);
console.log(`Total missing objects checked: ${missingObjects.length}`);
console.log(`Found in metadata-reference: ${copiedCount}`);
console.log(`Not found in metadata-reference: ${notFoundCount}`);

if (notFound.length > 0) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`STILL MISSING (not in metadata-reference):`);
  console.log(`${'='.repeat(80)}`);
  
  // Group by cloud
  const byCloud = {};
  for (const obj of notFound) {
    if (!byCloud[obj.cloud]) {
      byCloud[obj.cloud] = [];
    }
    byCloud[obj.cloud].push(obj);
  }
  
  for (const [cloud, objects] of Object.entries(byCloud).sort()) {
    console.log(`\n📦 ${cloud} (${objects.length}):`);
    objects.forEach(obj => {
      console.log(`  • ${obj.name}`);
      if (obj.sourceUrl !== 'N/A') {
        console.log(`    URL: ${obj.sourceUrl}`);
      }
    });
  }
}

console.log(`\n💡 The index entries are already correct for objects in metadata-reference.`);
console.log(`   These objects need to have their actual JSON files copied or scraped.`);


