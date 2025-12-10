/**
 * Rename all "label" fields to "title" to comply with JSON Schema standard
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renameLabelToTitle() {
    try {
        console.log('🔄 Renaming "label" to "title" in all DMO objects...\n');

        const docFolder = path.join(__dirname, '../src/doc');
        const objectsFolder = path.join(docFolder, 'objects');

        let updatedFiles = 0;
        let updatedFields = 0;

        const folders = await fs.readdir(objectsFolder);
        
        for (const folder of folders) {
            const folderPath = path.join(objectsFolder, folder);
            const stat = await fs.stat(folderPath);
            
            if (!stat.isDirectory()) continue;

            const files = await fs.readdir(folderPath);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filePath = path.join(folderPath, file);
                const fileContent = await fs.readFile(filePath, 'utf-8');
                const fileData = JSON.parse(fileContent);

                const apiName = Object.keys(fileData)[0];
                const objectData = fileData[apiName];

                let fileUpdated = false;
                let fileFieldsUpdated = 0;

                // Update fields
                for (const [fieldApiName, fieldData] of Object.entries(objectData.properties || {})) {
                    const field = fieldData as any;
                    
                    // If has label but no title, rename label to title
                    if (field.label && !field.title) {
                        field.title = field.label;
                        delete field.label;
                        fileUpdated = true;
                        fileFieldsUpdated++;
                    }
                    // If has both label and title, remove label
                    else if (field.label && field.title) {
                        delete field.label;
                        fileUpdated = true;
                        fileFieldsUpdated++;
                    }
                }

                if (fileUpdated) {
                    await fs.writeFile(filePath, JSON.stringify(fileData, null, 2), 'utf-8');
                    updatedFiles++;
                    updatedFields += fileFieldsUpdated;
                    console.log(`✓ Updated ${objectData.name} (${fileFieldsUpdated} fields)`);
                }
            }
        }

        console.log('\n✨ Renaming complete!\n');
        console.log('📊 Summary:');
        console.log(`   Updated files: ${updatedFiles}`);
        console.log(`   Updated fields: ${updatedFields}`);

    } catch (error) {
        console.error('❌ Error during renaming:', error);
        throw error;
    }
}

// Run the renaming
renameLabelToTitle().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

