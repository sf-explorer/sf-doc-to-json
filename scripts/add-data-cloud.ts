import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addDataCloud() {
    const indexPath = path.join(__dirname, '../src/doc/index.json');
    const objectsDir = path.join(__dirname, '../src/doc/objects');
    const docDir = path.join(__dirname, '../src/doc');
    
    console.log('Reading index...');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    
    let updatedCount = 0;
    const dataCloudObjects: string[] = [];
    
    // Find all objects with "Data Cloud" in accessRules
    console.log('\nScanning for Data Cloud objects...\n');
    
    for (const [objectName, objectInfo] of Object.entries(indexData.objects)) {
        const firstLetter = objectName[0].toUpperCase();
        const objectFilePath = path.join(objectsDir, firstLetter, `${objectName}.json`);
        
        try {
            const objectData = JSON.parse(await fs.readFile(objectFilePath, 'utf-8'));
            const objectDetails = objectData[objectName];
            
            if (objectDetails) {
                let isDataCloudObject = false;
                let reason = '';
                
                // Check 1: accessRules contains "data cloud"
                if (objectDetails.accessRules) {
                    const accessRules = objectDetails.accessRules.toLowerCase();
                    if (accessRules.includes('data cloud')) {
                        isDataCloudObject = true;
                        reason = 'accessRules mentions Data Cloud';
                    }
                }
                
                // Check 2: Object description indicates it's a Data Cloud object
                if (!isDataCloudObject && objectDetails.description) {
                    const desc = objectDetails.description.toLowerCase();
                    // Look for strong indicators that this is a Data Cloud object
                    if (desc.match(/represents a .*data cloud/i) || 
                        desc.match(/data cloud (object|org|entity|record)/i) ||
                        desc.match(/collection of data cloud/i)) {
                        isDataCloudObject = true;
                        reason = 'description indicates Data Cloud object';
                    }
                }
                
                // Check 3: Object name strongly suggests Data Cloud (e.g., DataKit*, DataSpace*, etc.)
                if (!isDataCloudObject) {
                    const dataCloudPrefixes = ['DataKit', 'DataSpace', 'Dataspace', 'ExtDataShare'];
                    if (dataCloudPrefixes.some(prefix => objectName.startsWith(prefix))) {
                        isDataCloudObject = true;
                        reason = 'object name suggests Data Cloud';
                    }
                }
                
                if (isDataCloudObject) {
                    // Initialize clouds array if it doesn't exist
                    if (!Array.isArray(objectDetails.clouds)) {
                        objectDetails.clouds = [];
                    }
                    
                    // Add "Data Cloud" if not already present
                    if (!objectDetails.clouds.includes('Data Cloud')) {
                        objectDetails.clouds.push('Data Cloud');
                        
                        // Sort clouds array for consistency
                        objectDetails.clouds.sort();
                        
                        // Write updated object file
                        await fs.writeFile(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
                        
                        updatedCount++;
                        dataCloudObjects.push(objectName);
                        console.log(`  ✓ ${objectName} - added "Data Cloud" (${reason})`);
                    } else {
                        dataCloudObjects.push(objectName);
                        console.log(`  ℹ ${objectName} - already has "Data Cloud" (${reason})`);
                    }
                    
                    // Update index entry
                    if (!Array.isArray(indexData.objects[objectName].clouds)) {
                        indexData.objects[objectName].clouds = [];
                    }
                    if (!indexData.objects[objectName].clouds.includes('Data Cloud')) {
                        indexData.objects[objectName].clouds.push('Data Cloud');
                        indexData.objects[objectName].clouds.sort();
                    }
                }
            }
        } catch (error) {
            // Silently skip missing files
        }
    }
    
    console.log(`\n📊 Statistics:`);
    console.log(`   - Updated ${updatedCount} objects`);
    console.log(`   - Total Data Cloud objects: ${dataCloudObjects.length}`);
    
    // Update index.json
    console.log(`\nUpdating index.json...`);
    
    // Update totalClouds if needed
    const allClouds = new Set<string>();
    for (const objectInfo of Object.values(indexData.objects)) {
        if (Array.isArray(objectInfo.clouds)) {
            objectInfo.clouds.forEach((cloud: string) => allClouds.add(cloud));
        }
    }
    
    const oldTotalClouds = indexData.totalClouds;
    indexData.totalClouds = allClouds.size;
    
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
    console.log(`  ✓ Updated totalClouds from ${oldTotalClouds} to ${indexData.totalClouds}`);
    
    // Create/update data-cloud.json
    console.log(`\nCreating data-cloud.json...`);
    const dataCloudFile = {
        cloud: 'Data Cloud',
        objectCount: dataCloudObjects.length,
        objects: dataCloudObjects.sort()
    };
    
    const cloudFilePath = path.join(docDir, 'data-cloud.json');
    await fs.writeFile(cloudFilePath, JSON.stringify(dataCloudFile, null, 2), 'utf-8');
    console.log(`  ✓ Created data-cloud.json with ${dataCloudObjects.length} objects`);
    
    console.log(`\n✅ Data Cloud integration complete!`);
    console.log(`\n📋 Data Cloud Objects:`);
    dataCloudObjects.forEach(obj => console.log(`   - ${obj}`));
}

addDataCloud().catch(console.error);

