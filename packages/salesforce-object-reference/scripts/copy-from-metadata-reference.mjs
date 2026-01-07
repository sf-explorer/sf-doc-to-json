#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const objectRefRoot = path.join(__dirname, '..');
const metadataRefRoot = path.join(__dirname, '../../salesforce-metadata-reference');

const missingObjectsPath = path.join(objectRefRoot, 'missing-objects.json');
const metadataObjectsDir = path.join(metadataRefRoot, 'src/doc/objects');
const objectRefObjectsDir = path.join(objectRefRoot, 'src/doc/objects');

console.log('Loading missing objects list...');
const missingObjects = JSON.parse(fs.readFileSync(missingObjectsPath, 'utf8'));

console.log(`\nFound ${missingObjects.length} missing objects`);
console.log('\nChecking which exist in metadata-reference...\n');

let copiedCount = 0;
let notFoundCount = 0;
const notFound = [];

for (const obj of missingObjects) {
  const objectName = obj.name;
  const firstLetter = objectName[0].toUpperCase();
  
  // Check if this object exists in metadata-reference
  const metadataFilePath = path.join(metadataObjectsDir, firstLetter, `${objectName}.json`);
  
  if (fs.existsSync(metadataFilePath)) {
    // Determine target path in object-reference
    let targetPath;
    if (obj.file.startsWith('metadata/')) {
      // Keep metadata/ prefix for metadata API types
      targetPath = path.join(objectRefRoot, 'src/doc', obj.file);
    } else {
      // Regular objects go to objects/
      targetPath = path.join(objectRefObjectsDir, firstLetter, `${objectName}.json`);
    }
    
    // Create directory if it doesn't exist
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(metadataFilePath, targetPath);
    console.log(`✓ Copied: ${objectName} -> ${path.relative(objectRefRoot, targetPath)}`);
    copiedCount++;
  } else {
    notFound.push(objectName);
    notFoundCount++;
  }
}

console.log(`\n${'='.repeat(80)}`);
console.log(`SUMMARY`);
console.log(`${'='.repeat(80)}`);
console.log(`Total missing objects: ${missingObjects.length}`);
console.log(`Copied from metadata-reference: ${copiedCount}`);
console.log(`Not found in metadata-reference: ${notFoundCount}`);

if (notFound.length > 0) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`STILL MISSING (not in metadata-reference):`);
  console.log(`${'='.repeat(80)}`);
  
  // Group by cloud
  const byCloud = {};
  for (const name of notFound) {
    const obj = missingObjects.find(o => o.name === name);
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

console.log(`\n💡 Next step: Run validation again to verify:`);
console.log(`   node scripts/validate-index.mjs`);


