import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function removeSharingRules() {
    console.log('Removing SharingRule objects...\n');

    const objectsFolder = path.join(__dirname, '..', 'src', 'doc', 'objects');
    const indexPath = path.join(__dirname, '..', 'src', 'doc', 'index.json');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    let removedFilesCount = 0;
    const removedObjects: string[] = [];

    // Remove files
    for (const letter of alphabet) {
        const letterFolder = path.join(objectsFolder, letter);

        try {
            const files = await fs.readdir(letterFolder);

            for (const file of files) {
                if (file.endsWith('SharingRule.json')) {
                    const filePath = path.join(letterFolder, file);
                    const objectName = file.replace('.json', '');
                    
                    await fs.unlink(filePath);
                    console.log(`✓ Removed: ${objectName}`);
                    removedFilesCount++;
                    removedObjects.push(objectName);
                }
            }
        } catch (error) {
            // Letter folder doesn't exist, skip
        }
    }

    console.log(`\n📁 Removed ${removedFilesCount} SharingRule files`);

    // Update index
    console.log('\n📋 Updating index.json...');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));
    let removedFromIndex = 0;

    for (const objectName of removedObjects) {
        if (indexData.objects[objectName]) {
            delete indexData.objects[objectName];
            removedFromIndex++;
        }
    }

    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
    console.log(`✓ Removed ${removedFromIndex} objects from index`);

    // Rebuild cloud files
    console.log('\n📦 Rebuilding cloud files...\n');
    const { execSync } = await import('child_process');
    execSync('npx tsx scripts/rebuild-cloud-files.ts', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });

    console.log(`\n✅ Complete!`);
    console.log(`   Files removed: ${removedFilesCount}`);
    console.log(`   Index entries removed: ${removedFromIndex}`);
}

removeSharingRules().catch(error => {
    console.error('❌ Error removing sharing rules:', error);
    process.exit(1);
});


