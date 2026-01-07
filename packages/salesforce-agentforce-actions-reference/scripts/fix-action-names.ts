/**
 * Fix action names - use "Reference Action" property if available, otherwise derive from API Name
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

/**
 * Convert API Name to readable action name
 * Example: "AddCaseComment" -> "Add Case Comment"
 */
function apiNameToActionName(apiName: string): string {
    // Insert space before capital letters (except the first one)
    return apiName
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

async function fixActionNames(): Promise<void> {
    console.log('Fixing action names...\n');
    console.log('Using "Reference Action" property if available, otherwise deriving from API Name\n');
    
    const actionsFolder = path.join(__dirname, '..', 'src', 'doc', 'actions');
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let fixedCount = 0;
    let skippedCount = 0;
    
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
                    
                    // Get API Name
                    const apiNameProperty = action.properties?.["API Name"];
                    const apiName = apiNameProperty?.type || apiNameProperty?.description;
                    
                    if (!apiName) {
                        console.log(`  ⚠️  Skipping ${letter}/${file} - no API Name`);
                        skippedCount++;
                        continue;
                    }
                    
                    // Try to get action name from "Reference Action" property
                    // Prefer description over type (description has the actual value)
                    const referenceActionProperty = action.properties?.["Reference Action"];
                    let newActionName = referenceActionProperty?.description || referenceActionProperty?.type;
                    
                    // Filter out generic values like "string", "boolean", etc.
                    if (newActionName && (newActionName === 'string' || newActionName === 'boolean' || newActionName.trim() === '')) {
                        newActionName = undefined;
                    }
                    
                    // If no valid Reference Action, derive from API Name
                    if (!newActionName) {
                        newActionName = apiNameToActionName(apiName);
                    }
                    
                    // Only update if the name has changed
                    if (action.name !== newActionName) {
                        console.log(`  ✅ ${letter}/${file}`);
                        console.log(`     Old: "${action.name}"`);
                        console.log(`     New: "${newActionName}"`);
                        
                        action.name = newActionName;
                        await fs.writeFile(filePath, JSON.stringify(action, null, 2), 'utf-8');
                        fixedCount++;
                    }
                } catch (e) {
                    console.error(`  ❌ Error processing ${filePath}:`, e);
                }
            }
        } catch (e) {
            // Folder doesn't exist, skip
            continue;
        }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} action names`);
    console.log(`   Skipped ${skippedCount} actions (no API Name)`);
    console.log('\nNow run: npm run rebuild-index && npm run build');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    fixActionNames().catch(console.error);
}

export { fixActionNames };

