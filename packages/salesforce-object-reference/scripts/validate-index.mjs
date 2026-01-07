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

console.log(`Total objects in index: ${indexData.totalObjects}`);
console.log('\nValidating object files...\n');

const missing = [];
const existing = [];

for (const [objectName, objectData] of Object.entries(indexData.objects)) {
  const filePath = path.join(docRoot, objectData.file);
  
  if (!fs.existsSync(filePath)) {
    missing.push({
      name: objectName,
      file: objectData.file,
      cloud: objectData.cloud,
      sourceUrl: objectData.sourceUrl || 'N/A'
    });
  } else {
    existing.push(objectName);
  }
}

console.log('='.repeat(80));
console.log('VALIDATION RESULTS');
console.log('='.repeat(80));
console.log(`Total objects in index: ${Object.keys(indexData.objects).length}`);
console.log(`Objects with existing files: ${existing.length}`);
console.log(`Objects with MISSING files: ${missing.length}`);
console.log('='.repeat(80));

if (missing.length > 0) {
  console.log('\n❌ MISSING OBJECTS:\n');
  
  // Group by cloud
  const byCloud = {};
  missing.forEach(obj => {
    if (!byCloud[obj.cloud]) {
      byCloud[obj.cloud] = [];
    }
    byCloud[obj.cloud].push(obj);
  });
  
  for (const [cloud, objects] of Object.entries(byCloud).sort()) {
    console.log(`\n📦 ${cloud} (${objects.length} missing):`);
    console.log('-'.repeat(80));
    objects.forEach(obj => {
      console.log(`  • ${obj.name}`);
      console.log(`    File: ${obj.file}`);
      if (obj.sourceUrl !== 'N/A') {
        console.log(`    URL: ${obj.sourceUrl}`);
      }
    });
  }
  
  // Save missing objects to a file for reference
  const missingPath = path.join(__dirname, '../missing-objects.json');
  fs.writeFileSync(missingPath, JSON.stringify(missing, null, 2));
  console.log(`\n📄 Missing objects saved to: ${missingPath}`);
  
  process.exit(1);
} else {
  console.log('\n✅ All objects in index have corresponding files!\n');
  process.exit(0);
}


