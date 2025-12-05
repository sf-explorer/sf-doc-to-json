import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addShieldCloud() {
    const indexPath = path.join(__dirname, '../src/doc/index.json');
    const objectsDir = path.join(__dirname, '../src/doc/objects');
    
    console.log('Reading index...');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    
    const shieldObjects: string[] = [];
    let updatedCount = 0;
    
    console.log('\nScanning objects for Shield requirements...');
    
    // Scan all objects for Shield-related accessRules
    for (const [objectName, objectInfo] of Object.entries(indexData.objects)) {
        const firstLetter = objectName[0].toUpperCase();
        const objectFilePath = path.join(objectsDir, firstLetter, `${objectName}.json`);
        
        try {
            const objectData = JSON.parse(await fs.readFile(objectFilePath, 'utf-8'));
            const obj = objectData[objectName];
            
            if (obj) {
                const accessRules = (obj.accessRules || '').toLowerCase();
                const description = (obj.description || '').toLowerCase();
                
                // Check if accessRules or description contains Shield or View Event Log Object Data
                // Also check for Platform Encryption and tenant security objects
                const hasShieldAccess = accessRules.includes('shield') || 
                                       accessRules.includes('view event log object data');
                const hasShieldInDescription = description.includes('shield') || 
                                              description.includes('platform encryption') ||
                                              description.includes('tenantsecret') ||
                                              objectName.startsWith('TenantSecurity') ||
                                              objectName === 'TenantSecret';
                
                if (hasShieldAccess || hasShieldInDescription) {
                    
                    shieldObjects.push(objectName);
                    
                    // Update the object's clouds array
                    if (!Array.isArray(obj.clouds)) {
                        obj.clouds = [obj.module || 'Core Salesforce'];
                    }
                    
                    if (!obj.clouds.includes('Shield')) {
                        obj.clouds.push('Shield');
                        await fs.writeFile(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
                        updatedCount++;
                        
                        if (updatedCount % 10 === 0) {
                            process.stdout.write(`\rProcessed ${updatedCount} objects...`);
                        }
                    }
                    
                    // Update index entry
                    if (!Array.isArray(indexData.objects[objectName].clouds)) {
                        indexData.objects[objectName].clouds = [indexData.objects[objectName].cloud];
                    }
                    
                    if (!indexData.objects[objectName].clouds.includes('Shield')) {
                        indexData.objects[objectName].clouds.push('Shield');
                    }
                }
            }
        } catch (error: any) {
            // Skip if file doesn't exist or can't be read
            if (error.code !== 'ENOENT') {
                console.error(`\nError processing ${objectName}:`, error.message);
            }
        }
    }
    
    console.log(`\n\nFound ${shieldObjects.length} Shield-related objects`);
    console.log(`Updated ${updatedCount} object files`);
    
    // Create Shield cloud file
    const shieldCloudData = {
        cloud: 'Shield',
        description: 'Objects requiring Shield or View Event Log Object Data permissions, including event monitoring and encryption features.',
        objectCount: shieldObjects.length,
        objects: shieldObjects.sort()
    };
    
    const shieldFilePath = path.join(__dirname, '../src/doc/shield.json');
    await fs.writeFile(shieldFilePath, JSON.stringify(shieldCloudData, null, 2) + '\n', 'utf-8');
    console.log(`\n✓ Created shield.json with ${shieldObjects.length} objects`);
    
    // Update totalClouds count in index
    const existingClouds = new Set<string>();
    for (const objInfo of Object.values(indexData.objects)) {
        if (Array.isArray((objInfo as any).clouds)) {
            (objInfo as any).clouds.forEach((cloud: string) => existingClouds.add(cloud));
        } else if ((objInfo as any).cloud) {
            existingClouds.add((objInfo as any).cloud);
        }
    }
    indexData.totalClouds = existingClouds.size;
    
    // Save updated index
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
    console.log(`✓ Updated index.json (totalClouds: ${indexData.totalClouds})`);
    
    console.log('\n✅ Shield cloud added successfully!');
    console.log('\nSample Shield objects:');
    console.log(shieldObjects.slice(0, 10).map(o => `  - ${o}`).join('\n'));
}

addShieldCloud().catch(console.error);

