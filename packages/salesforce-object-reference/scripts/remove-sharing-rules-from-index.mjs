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

// List of sharing rules to remove
const sharingRulesToRemove = [
  'AccountOwnerSharingRule',
  'AccountTerritorySharingRule',
  'CampaignOwnerSharingRule',
  'AssetOwnerSharingRule'
];

// Create backup
const backupPath = indexPath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, fs.readFileSync(indexPath));
console.log(`\n💾 Backup created: ${path.basename(backupPath)}`);

// Remove sharing rules
let removedCount = 0;
const removed = [];

for (const ruleName of sharingRulesToRemove) {
  if (indexData.objects[ruleName]) {
    const objData = indexData.objects[ruleName];
    console.log(`\n✓ Removing: ${ruleName}`);
    console.log(`  Cloud: ${objData.cloud}`);
    console.log(`  File: ${objData.file}`);
    
    delete indexData.objects[ruleName];
    removed.push(ruleName);
    removedCount++;
  } else {
    console.log(`\n⚠️  Not found: ${ruleName}`);
  }
}

// Update total count
indexData.totalObjects = Object.keys(indexData.objects).length;

// Save updated index
fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

console.log(`\n${'='.repeat(80)}`);
console.log(`SUMMARY`);
console.log(`${'='.repeat(80)}`);
console.log(`Sharing rules removed: ${removedCount}`);
console.log(`New total objects: ${indexData.totalObjects}`);
console.log(`Objects removed:`);
removed.forEach(name => console.log(`  - ${name}`));

console.log(`\n💡 Next steps:`);
console.log(`  1. Run validation: node scripts/validate-index.mjs`);
console.log(`  2. Rebuild cloud files: npx tsx scripts/rebuild-cloud-files.ts`);


