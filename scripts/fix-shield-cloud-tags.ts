import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixShieldCloudTags() {
    const indexPath = path.join(__dirname, '../src/doc/index.json');
    const shieldPath = path.join(__dirname, '../src/doc/shield.json');
    
    console.log('Reading files...');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    const shieldData = JSON.parse(await fs.readFile(shieldPath, 'utf-8'));
    
    const shieldObjects = new Set(shieldData.objects);
    let updatedCount = 0;
    
    console.log(`\nFound ${shieldObjects.size} Shield objects in shield.json\n`);
    
    // Update cloud tag for all Shield objects
    for (const [objectName, objectInfo] of Object.entries(indexData.objects)) {
        if (shieldObjects.has(objectName) && objectInfo.cloud !== 'Shield') {
            console.log(`  ✓ ${objectName}: ${objectInfo.cloud} → Shield`);
            objectInfo.cloud = 'Shield';
            updatedCount++;
        }
    }
    
    // Write back
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
    
    console.log(`\n✅ Updated ${updatedCount} objects to Shield cloud`);
    
    // Now rebuild cloud files
    console.log('\n📦 Rebuilding cloud files...\n');
    const { execSync } = await import('child_process');
    execSync('npx tsx scripts/rebuild-cloud-files.ts', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });
}

fixShieldCloudTags().catch(console.error);

