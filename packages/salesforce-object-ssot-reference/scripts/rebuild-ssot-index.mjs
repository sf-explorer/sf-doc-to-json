import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, '..', 'src', 'doc', 'index.json');
const objectsDir = path.join(__dirname, '..', 'src', 'doc', 'objects');

console.log('Rebuilding SSOT index with correct API names and field counts...\n');

// Read the current index to preserve metadata
const currentIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Create new index structure
const newIndex = {
    generated: currentIndex.generated || new Date().toISOString(),
    totalObjects: 0,
    objects: {}
};

// Walk through all object files
function processDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            processDirectory(itemPath);
        } else if (item.endsWith('.json')) {
            try {
                const objectData = JSON.parse(fs.readFileSync(itemPath, 'utf-8'));
                
                // The first (and only) key in the JSON is the API name
                const apiName = Object.keys(objectData)[0];
                const obj = objectData[apiName];
                
                if (obj && obj.name) {
                    const displayName = obj.name;
                    const fieldCount = obj.properties ? Object.keys(obj.properties).length : 0;
                    const firstLetter = displayName[0].toUpperCase();
                    
                    // Use API name as the key in the index
                    newIndex.objects[apiName] = {
                        name: displayName,
                        apiName: apiName,
                        file: `objects/${firstLetter}/${displayName}.json`,
                        description: obj.description || '',
                        fieldCount: fieldCount,
                        sourceUrl: obj.sourceUrl || ''
                    };
                    
                    console.log(`✓ ${displayName} (${apiName}) - ${fieldCount} fields`);
                }
            } catch (error) {
                console.error(`✗ Error processing ${item}:`, error.message);
            }
        }
    }
}

processDirectory(objectsDir);

newIndex.totalObjects = Object.keys(newIndex.objects).length;

// Write the new index
fs.writeFileSync(indexPath, JSON.stringify(newIndex, null, 2));

console.log(`\n✅ Done! Indexed ${newIndex.totalObjects} objects`);
console.log('Each object now has:');
console.log('  - name: Display name');
console.log('  - apiName: Technical API name'); 
console.log('  - fieldCount: Actual number of fields');
console.log('  - file: Path to object file');


