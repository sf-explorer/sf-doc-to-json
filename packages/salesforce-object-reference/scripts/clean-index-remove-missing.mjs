#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, '../src/doc/index.json');
const docRoot = path.join(__dirname, '../src/doc');

console.log('Loading index.json...');
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

console.log(`\nCurrent stats:`);
console.log(`  Total objects: ${indexData.totalObjects}`);
console.log(`  Objects in index: ${Object.keys(indexData.objects).length}`);

// Find all objects where files don't exist
const toRemove = [];
const toKeep = {};

for (const [objectName, objectData] of Object.entries(indexData.objects)) {
  const filePath = path.join(docRoot, objectData.file);
  
  if (!fs.existsSync(filePath)) {
    toRemove.push({ name: objectName, ...objectData });
  } else {
    toKeep[objectName] = objectData;
  }
}

console.log(`\n📊 Analysis:`);
console.log(`  Objects with existing files: ${Object.keys(toKeep).length}`);
console.log(`  Objects with MISSING files: ${toRemove.length}`);

// Group missing by cloud
const byCloud = {};
for (const obj of toRemove) {
  if (!byCloud[obj.cloud]) {
    byCloud[obj.cloud] = [];
  }
  byCloud[obj.cloud].push(obj.name);
}

console.log(`\n📦 Missing objects by cloud:`);
for (const [cloud, objects] of Object.entries(byCloud).sort()) {
  console.log(`  ${cloud}: ${objects.length}`);
}

// Create backup
const backupPath = indexPath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, fs.readFileSync(indexPath));
console.log(`\n💾 Backup created: ${path.basename(backupPath)}`);

// Update index - keep only objects with existing files
indexData.objects = toKeep;
indexData.totalObjects = Object.keys(toKeep).length;

// Save updated index
fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

console.log(`\n✅ Index cleaned successfully!`);
console.log(`  Objects kept: ${Object.keys(toKeep).length}`);
console.log(`  Objects removed: ${toRemove.length}`);

// Show sample of removed objects
console.log(`\n📋 Sample of removed objects (first 20):`);
toRemove.slice(0, 20).forEach(obj => {
  console.log(`  - ${obj.name} (${obj.cloud})`);
});
if (toRemove.length > 20) {
  console.log(`  ... and ${toRemove.length - 20} more`);
}

console.log(`\n💡 Next steps:`);
console.log(`  1. Run validation: node scripts/validate-index.mjs`);
console.log(`  2. Rebuild cloud files: npx tsx scripts/rebuild-cloud-files.ts`);


