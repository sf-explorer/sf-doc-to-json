#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, '../src/doc/index.json');

console.log('Loading index.json...');
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

console.log(`\nCurrent stats:`);
console.log(`  Total objects: ${indexData.totalObjects}`);
console.log(`  Objects in index: ${Object.keys(indexData.objects).length}`);

// Find all Metadata API objects
const metadataObjects = [];
const nonMetadataObjects = {};

for (const [objectName, objectData] of Object.entries(indexData.objects)) {
  if (objectData.cloud === 'Metadata API' || 
      (objectData.clouds && objectData.clouds.includes('Metadata API') && objectData.file?.startsWith('metadata/'))) {
    metadataObjects.push(objectName);
  } else {
    nonMetadataObjects[objectName] = objectData;
  }
}

console.log(`\n📊 Analysis:`);
console.log(`  Metadata API objects to remove: ${metadataObjects.length}`);
console.log(`  Non-Metadata objects to keep: ${Object.keys(nonMetadataObjects).length}`);

// Create backup
const backupPath = indexPath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, fs.readFileSync(indexPath));
console.log(`\n💾 Backup created: ${path.basename(backupPath)}`);

// Update index
indexData.objects = nonMetadataObjects;
indexData.totalObjects = Object.keys(nonMetadataObjects).length;

// Save updated index
fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

console.log(`\n✅ Index updated successfully!`);
console.log(`  New total objects: ${indexData.totalObjects}`);
console.log(`  Removed ${metadataObjects.length} Metadata API objects`);

// Show sample of removed objects
console.log(`\n📋 Sample of removed Metadata API objects (first 10):`);
metadataObjects.slice(0, 10).forEach(name => {
  console.log(`  - ${name}`);
});
if (metadataObjects.length > 10) {
  console.log(`  ... and ${metadataObjects.length - 10} more`);
}

console.log(`\n💡 Next steps:`);
console.log(`  1. Run validation: node scripts/validate-index.mjs`);
console.log(`  2. Rebuild cloud files: npx tsx scripts/rebuild-cloud-files.ts`);


