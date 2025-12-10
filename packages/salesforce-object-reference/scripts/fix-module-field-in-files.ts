import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function* walkDir(dir: string): AsyncGenerator<string> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            yield* walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            yield fullPath;
        }
    }
}

async function fixModuleFieldInFiles() {
    const objectsDir = path.join(__dirname, '../src/doc/objects');
    
    console.log('Scanning for object files with module="N/A" or module="Unknown"...\n');
    
    let fixedCount = 0;
    let filesWithNA: string[] = [];
    
    for await (const file of walkDir(objectsDir)) {
        try {
            const content = await fs.readFile(file, 'utf-8');
            
            if (content.includes('"module": "N/A"') || content.includes('"module": "Unknown"')) {
                const objectData = JSON.parse(content);
                const objectName = Object.keys(objectData)[0];
                
                if (objectData[objectName].module === 'N/A' || objectData[objectName].module === 'Unknown') {
                    objectData[objectName].module = 'Core Salesforce';
                    await fs.writeFile(file, JSON.stringify(objectData, null, 2), 'utf-8');
                    filesWithNA.push(path.basename(file));
                    fixedCount++;
                }
            }
        } catch (error: any) {
            console.error(`Error processing ${file}:`, error.message);
        }
    }
    
    console.log(`✅ Fixed ${fixedCount} object files:`);
    filesWithNA.forEach(f => console.log(`   - ${f}`));
}

fixModuleFieldInFiles().catch(console.error);

