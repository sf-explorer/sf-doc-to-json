import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function removeWrapperFromActions() {
    console.log('Removing wrapper keys from all action files...\n');
    
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const actionsFolder = path.join(srcDocDir, 'actions');
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let totalUpdated = 0;
    let totalFiles = 0;
    let errors = 0;
    
    for (const letter of letters) {
        const letterFolder = path.join(actionsFolder, letter);
        
        try {
            const files = await fs.readdir(letterFolder);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            for (const file of jsonFiles) {
                totalFiles++;
                const filePath = path.join(letterFolder, file);
                
                try {
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    const data = JSON.parse(fileContent);
                    
                    // Check if file has wrapper (object with single key)
                    const keys = Object.keys(data);
                    if (keys.length === 1 && typeof data[keys[0]] === 'object' && data[keys[0]].name) {
                        // File has wrapper, remove it
                        const action = data[keys[0]];
                        await fs.writeFile(filePath, JSON.stringify(action, null, 2), 'utf-8');
                        totalUpdated++;
                        if (totalUpdated % 50 === 0) {
                            console.log(`  Updated ${totalUpdated} files...`);
                        }
                    }
                    // If no wrapper, file is already in correct format
                } catch (error) {
                    errors++;
                    console.error(`  ⚠️  Error processing ${filePath}: ${error?.message || error}`);
                }
            }
        } catch (error) {
            // Letter folder doesn't exist, skip
            continue;
        }
    }
    
    console.log(`\n✅ Complete!`);
    console.log(`   Processed ${totalFiles} files`);
    console.log(`   Updated ${totalUpdated} files`);
    if (errors > 0) {
        console.log(`   Errors: ${errors}`);
    }
}

removeWrapperFromActions().catch(console.error);

