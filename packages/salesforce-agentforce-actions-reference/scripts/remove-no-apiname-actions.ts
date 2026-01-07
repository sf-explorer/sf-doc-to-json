/**
 * Remove all actions without API Name
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AgentforceAction {
    name: string;
    properties: Record<string, any>;
    [key: string]: any;
}

async function removeNoApiNameActions(): Promise<void> {
    console.log('Removing actions without API Name...\n');
    
    const actionsFolder = path.join(__dirname, '..', 'src', 'doc', 'actions');
    const indexPath = path.join(__dirname, '..', 'src', 'doc', 'index.json');
    
    // Load index
    let index: any = {};
    try {
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(indexContent);
    } catch (e) {
        console.error('Error loading index:', e);
        return;
    }
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let deletedCount = 0;
    const deletedActions: string[] = [];
    
    for (const letter of letters) {
        const letterFolder = path.join(actionsFolder, letter);
        
        try {
            const files = await fs.readdir(letterFolder);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            for (const file of jsonFiles) {
                const filePath = path.join(letterFolder, file);
                
                try {
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    const action: AgentforceAction = JSON.parse(fileContent);
                    
                    // Check if API Name exists in properties
                    const apiNameProperty = action.properties?.["API Name"];
                    const apiName = apiNameProperty?.type || apiNameProperty?.description;
                    
                    if (!apiName || apiName.trim() === '') {
                        console.log(`  Deleting: ${letter}/${file} (${action.name}) - no API Name`);
                        await fs.unlink(filePath);
                        deletedCount++;
                        deletedActions.push(action.name);
                        
                        // Remove from index
                        if (index.actions && index.actions[action.name]) {
                            delete index.actions[action.name];
                        }
                    }
                } catch (e) {
                    console.error(`  Error processing ${filePath}:`, e);
                }
            }
        } catch (e) {
            // Folder doesn't exist, skip
            continue;
        }
    }
    
    // Update index
    if (index.actions) {
        index.totalActions = Object.keys(index.actions).length;
        index.generatedAt = new Date().toISOString();
    }
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log(`\n✅ Deleted ${deletedCount} actions without API Name`);
    console.log(`   Updated index: ${Object.keys(index.actions || {}).length} actions remaining`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    removeNoApiNameActions().catch(console.error);
}

export { removeNoApiNameActions };

