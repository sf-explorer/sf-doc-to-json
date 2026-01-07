const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../src/doc/index.json');

console.log('Reading index.json...');
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

console.log(`Found ${indexData.totalObjects} objects`);

// Create new objects structure with apiName as key
const newObjects = {};

for (const [oldKey, objectData] of Object.entries(indexData.objects)) {
  const apiName = objectData.apiName;
  
  if (!apiName) {
    console.warn(`Warning: Object "${oldKey}" has no apiName field`);
    continue;
  }
  
  // Use apiName as the new key
  newObjects[apiName] = objectData;
  
  console.log(`Mapping: "${oldKey}" => "${apiName}"`);
}

// Update the index data
indexData.objects = newObjects;

// Write back to file
console.log('\nWriting updated index.json...');
fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2) + '\n');

console.log('Done! All objects now use apiName as the key.');

