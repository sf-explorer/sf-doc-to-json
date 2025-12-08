import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function rebuildCloudFiles() {
    const indexPath = path.join(__dirname, '../src/doc/index.json');
    const docDir = path.join(__dirname, '../src/doc');
    
    console.log('Reading index...');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    
    // Group objects by cloud
    const cloudToObjects: Record<string, string[]> = {};
    
    for (const [objectName, objectInfo] of Object.entries(indexData.objects)) {
        const cloud = objectInfo.cloud;
        if (!cloudToObjects[cloud]) {
            cloudToObjects[cloud] = [];
        }
        cloudToObjects[cloud].push(objectName);
    }
    
    console.log(`\nFound ${Object.keys(cloudToObjects).length} clouds:\n`);
    
    // Update each cloud file
    for (const [cloud, objects] of Object.entries(cloudToObjects)) {
        const cloudFileName = cloudNameToFileName(cloud);
        const cloudFilePath = path.join(docDir, `${cloudFileName}.json`);
        
        try {
            // Try to read existing file to preserve structure
            let cloudData: any;
            try {
                cloudData = JSON.parse(await fs.readFile(cloudFilePath, 'utf-8'));
            } catch {
                // File doesn't exist, create new structure
                cloudData = {
                    cloud: cloud,
                    objectCount: 0,
                    objects: []
                };
            }
            
            // Update with current objects
            cloudData.cloud = cloud;
            cloudData.objectCount = objects.length;
            cloudData.objects = objects.sort();
            
            await fs.writeFile(cloudFilePath, JSON.stringify(cloudData, null, 2), 'utf-8');
            console.log(`  ✓ ${cloud}: ${objects.length} objects → ${cloudFileName}.json`);
        } catch (error) {
            console.error(`  ✗ Error writing ${cloud}:`, error.message);
        }
    }
    
    console.log(`\n✅ Updated ${Object.keys(cloudToObjects).length} cloud files`);
}

function cloudNameToFileName(cloudName: string): string {
    return cloudName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

rebuildCloudFiles().catch(console.error);



