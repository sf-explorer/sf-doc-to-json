import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixUnknownClouds() {
    const indexPath = path.join(__dirname, '../src/doc/index.json');
    const objectsDir = path.join(__dirname, '../src/doc/objects');
    
    console.log('Reading index...');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    
    let unknownCount = 0;
    let naCount = 0;
    let fixedCount = 0;
    
    // First pass: count how many need fixing
    for (const [objectName, objectInfo] of Object.entries(indexData.objects)) {
        const needsFix = 
            objectInfo.cloud === 'Unknown' || 
            objectInfo.cloud === 'N/A' ||
            (Array.isArray(objectInfo.clouds) && objectInfo.clouds.some((c: string) => c === 'Unknown' || c === 'N/A'));
        
        if (needsFix) {
            if (objectInfo.cloud === 'Unknown') unknownCount++;
            else if (objectInfo.cloud === 'N/A') naCount++;
            else if (Array.isArray(objectInfo.clouds) && objectInfo.clouds.some((c: string) => c === 'Unknown' || c === 'N/A')) {
                // Count objects that only have it in the clouds array
                if (objectInfo.clouds.includes('Unknown')) unknownCount++;
                if (objectInfo.clouds.includes('N/A')) naCount++;
            }
        }
    }
    
    console.log(`\nFound objects with "Unknown" or "N/A" in cloud/clouds fields`);
    console.log(`Total to fix: ${unknownCount + naCount}\n`);
    
    // Second pass: fix them
    for (const [objectName, objectInfo] of Object.entries(indexData.objects)) {
        const needsFix = 
            objectInfo.cloud === 'Unknown' || 
            objectInfo.cloud === 'N/A' ||
            (Array.isArray(objectInfo.clouds) && objectInfo.clouds.some((c: string) => c === 'Unknown' || c === 'N/A'));
            
        if (needsFix) {
            const oldCloud = objectInfo.cloud;
            
            // Update index entry
            if (indexData.objects[objectName].cloud === 'Unknown' || indexData.objects[objectName].cloud === 'N/A') {
                indexData.objects[objectName].cloud = 'Core Salesforce';
            }
            
            // Also fix the clouds array if it exists
            if (Array.isArray(indexData.objects[objectName].clouds)) {
                indexData.objects[objectName].clouds = indexData.objects[objectName].clouds.map((c: string) => 
                    (c === 'Unknown' || c === 'N/A') ? 'Core Salesforce' : c
                );
            }
            
            // Update individual object file
            const firstLetter = objectName[0].toUpperCase();
            const objectFilePath = path.join(objectsDir, firstLetter, `${objectName}.json`);
            
            try {
                const objectData = JSON.parse(await fs.readFile(objectFilePath, 'utf-8'));
                
                if (objectData[objectName]) {
                    if (objectData[objectName].module === 'Unknown' || objectData[objectName].module === 'N/A') {
                        objectData[objectName].module = 'Core Salesforce';
                    }
                    
                    // Also fix clouds array in the object file if it exists
                    if (Array.isArray(objectData[objectName].clouds)) {
                        objectData[objectName].clouds = objectData[objectName].clouds.map((c: string) =>
                            (c === 'Unknown' || c === 'N/A') ? 'Core Salesforce' : c
                        );
                    }
                    
                    await fs.writeFile(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
                }
                
                fixedCount++;
                if (fixedCount % 10 === 0) {
                    process.stdout.write(`\rFixed ${fixedCount}/${unknownCount + naCount} objects...`);
                }
            } catch (error) {
                console.error(`\nError fixing ${objectName}:`, error.message);
            }
        }
    }
    
    console.log(`\n\nUpdating index.json...`);
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
    
    console.log(`\n✅ Fixed ${fixedCount} objects:`);
    console.log(`   - ${unknownCount} "Unknown" → "Core Salesforce"`);
    console.log(`   - ${naCount} "N/A" → "Core Salesforce"`);
    console.log(`\n✓ Updated index.json`);
    console.log(`✓ Updated ${fixedCount} object files`);
}

fixUnknownClouds().catch(console.error);

