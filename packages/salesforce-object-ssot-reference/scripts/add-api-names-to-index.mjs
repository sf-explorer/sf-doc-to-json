import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexPath = path.join(__dirname, '..', 'src', 'doc', 'index.json');
const objectsDir = path.join(__dirname, '..', 'src', 'doc', 'objects');

console.log('Adding API names to SSOT index...');

// Read the index
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

// Process each object entry
for (const [objectName, entry] of Object.entries(indexData.objects)) {
    try {
        // Get the first letter for the directory
        const firstLetter = objectName[0].toUpperCase();
        const objectFilePath = path.join(objectsDir, firstLetter, `${objectName}.json`);
        
        if (fs.existsSync(objectFilePath)) {
            const objectData = JSON.parse(fs.readFileSync(objectFilePath, 'utf-8'));
            const obj = objectData[objectName];
            
            if (obj) {
                // Get the API name from the object (it's the key in the JSON file)
                const apiName = Object.keys(objectData)[0];
                entry.apiName = apiName;
                
                // Count the actual fields
                const fieldCount = obj.properties ? Object.keys(obj.properties).length : 0;
                entry.fieldCount = fieldCount;
                
                // Update the file path to use the new structure
                entry.file = `objects/${firstLetter}/${objectName}.json`;
                
                console.log(`✓ Updated ${objectName} (${fieldCount} fields, API: ${apiName})`);
            }
        }
    } catch (error) {
        console.error(`✗ Error processing ${objectName}:`, error.message);
    }
}

// Write the updated index back
fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

console.log(`\n✅ Done! Updated ${Object.keys(indexData.objects).length} objects`);
console.log('Index now includes apiName for each object');

