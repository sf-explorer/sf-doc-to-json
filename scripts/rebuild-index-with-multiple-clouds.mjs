import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const docDir = join(rootDir, 'doc');

console.log('Reading index.json...');
const indexPath = join(docDir, 'index.json');
const index = JSON.parse(readFileSync(indexPath, 'utf-8'));

// Build a map of object -> clouds[]
const objectToCloudMap = {};

// Get all cloud JSON files
const cloudFiles = readdirSync(docDir)
  .filter(file => file.endsWith('-cloud.json') || file === 'scheduler.json' || file === 'feedback-management.json' || file === 'revenue-lifecycle-management.json')
  .filter(file => file !== 'index.json');

console.log(`Found ${cloudFiles.length} cloud files:\n${cloudFiles.join('\n')}`);

// Read each cloud file and build the mapping
cloudFiles.forEach(cloudFile => {
  const cloudPath = join(docDir, cloudFile);
  const cloudData = JSON.parse(readFileSync(cloudPath, 'utf-8'));
  const cloudName = cloudData.cloud;
  
  console.log(`\nProcessing ${cloudName} (${cloudData.objectCount} objects)...`);
  
  cloudData.objects.forEach(objectName => {
    if (!objectToCloudMap[objectName]) {
      objectToCloudMap[objectName] = [];
    }
    if (!objectToCloudMap[objectName].includes(cloudName)) {
      objectToCloudMap[objectName].push(cloudName);
    }
  });
});

// Update index.json to use clouds array
let updatedCount = 0;
let multiCloudCount = 0;

Object.keys(index.objects).forEach(objectName => {
  const clouds = objectToCloudMap[objectName];
  
  if (clouds && clouds.length > 0) {
    // Convert single 'cloud' to 'clouds' array
    index.objects[objectName].clouds = clouds;
    
    // Keep the first cloud as the primary 'cloud' for backwards compatibility
    index.objects[objectName].cloud = clouds[0];
    
    updatedCount++;
    
    if (clouds.length > 1) {
      multiCloudCount++;
      console.log(`  → ${objectName}: ${clouds.join(', ')}`);
    }
  } else {
    // Object not in any specific cloud file, stays as is but convert to array
    const currentCloud = index.objects[objectName].cloud;
    index.objects[objectName].clouds = [currentCloud];
  }
});

console.log(`\n✅ Updated ${updatedCount} objects with cloud mappings`);
console.log(`📦 Found ${multiCloudCount} objects belonging to multiple clouds`);

// Write updated index
writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log('\n✅ Index updated successfully with multiple cloud support!');

