#!/usr/bin/env node
/**
 * Add clouds index to index.json - pure references only
 * All metadata (description, objectCount, icons) loaded at runtime
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('Reading index.json...');
const indexPath = join(rootDir, 'doc/index.json');
const indexData = JSON.parse(readFileSync(indexPath, 'utf-8'));

console.log('Reading cloud files...');
const docDir = join(rootDir, 'doc');
const cloudFiles = readdirSync(docDir).filter(f => 
  f.endsWith('-cloud.json') || 
  f === 'tooling-api.json' ||
  f === 'metadata.json' ||
  f === 'scheduler.json' ||
  f === 'feedback-management.json' ||
  f === 'loyalty.json' ||
  f === 'field-service-lightning.json'
);

console.log(`Found ${cloudFiles.length} cloud files`);

// Create minimal clouds index - just file references
const clouds = {};

for (const cloudFile of cloudFiles) {
  const cloudData = JSON.parse(readFileSync(join(docDir, cloudFile), 'utf-8'));
  const cloudName = cloudData.cloud;
  
  // Only store cloud name and file reference - everything else loaded from cloud file
  clouds[cloudName] = {
    cloud: cloudName,
    fileName: cloudFile,
  };
  
  console.log(`  ${cloudName} -> ${cloudFile}`);
}

// Add clouds to index
indexData.clouds = clouds;
indexData.generated = new Date().toISOString();

// Write updated index
writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

console.log(`\n✅ Added minimal clouds index to index.json`);
console.log(`   Total clouds: ${Object.keys(clouds).length}`);
console.log(`   All metadata will be loaded from cloud files at runtime`);
