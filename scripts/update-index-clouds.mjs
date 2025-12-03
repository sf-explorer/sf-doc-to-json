import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const indexPath = join(rootDir, 'doc/index.json');
const salesCloudPath = join(rootDir, 'doc/sales-cloud.json');
const serviceCloudPath = join(rootDir, 'doc/service-cloud.json');

console.log('Reading files...');
const index = JSON.parse(readFileSync(indexPath, 'utf-8'));
const salesCloud = JSON.parse(readFileSync(salesCloudPath, 'utf-8'));
const serviceCloud = JSON.parse(readFileSync(serviceCloudPath, 'utf-8'));

console.log(`Found ${salesCloud.objects.length} Sales Cloud objects`);
console.log(`Found ${serviceCloud.objects.length} Service Cloud objects`);

let salesUpdated = 0;
let serviceUpdated = 0;

// Update Sales Cloud objects
salesCloud.objects.forEach(objectName => {
  if (index.objects[objectName]) {
    index.objects[objectName].cloud = 'Sales Cloud';
    salesUpdated++;
  } else {
    console.warn(`Warning: Object "${objectName}" not found in index`);
  }
});

// Update Service Cloud objects
serviceCloud.objects.forEach(objectName => {
  if (index.objects[objectName]) {
    index.objects[objectName].cloud = 'Service Cloud';
    serviceUpdated++;
  } else {
    console.warn(`Warning: Object "${objectName}" not found in index`);
  }
});

// Update the totalClouds count
index.totalClouds = 20; // Was 18, now adding Sales Cloud and Service Cloud

console.log(`\nUpdated ${salesUpdated} objects to Sales Cloud`);
console.log(`Updated ${serviceUpdated} objects to Service Cloud`);

// Write updated index
writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log('\n✅ Index updated successfully!');

