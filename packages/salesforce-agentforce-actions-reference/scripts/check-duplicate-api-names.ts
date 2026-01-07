/**
 * Check for duplicate API Names in the index and action files
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

async function checkDuplicateApiNames(): Promise<void> {
    console.log('Checking for duplicate API Names...\n');
    
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
    
    // Check for duplicates in index
    const apiNameMap = new Map<string, string[]>();
    
    for (const actionName in index.actions) {
        const actionEntry = index.actions[actionName];
        const apiName = actionEntry.apiName;
        
        if (apiName) {
            if (!apiNameMap.has(apiName)) {
                apiNameMap.set(apiName, []);
            }
            apiNameMap.get(apiName)!.push(actionName);
        }
    }
    
    // Find duplicates
    const duplicates: Array<{ apiName: string; actionNames: string[] }> = [];
    for (const [apiName, actionNames] of apiNameMap.entries()) {
        if (actionNames.length > 1) {
            duplicates.push({ apiName, actionNames });
        }
    }
    
    if (duplicates.length > 0) {
        console.log(`⚠️  Found ${duplicates.length} duplicate API Name(s):\n`);
        for (const dup of duplicates) {
            console.log(`  API Name: "${dup.apiName}"`);
            console.log(`    Found in actions:`);
            for (const actionName of dup.actionNames) {
                const entry = index.actions[actionName];
                console.log(`      - "${actionName}" (file: ${entry.file})`);
            }
            console.log('');
        }
        
        // Check actual files
        console.log('Checking actual files...\n');
        for (const dup of duplicates) {
            for (const actionName of dup.actionNames) {
                const entry = index.actions[actionName];
                const filePath = path.join(__dirname, '..', 'src', 'doc', entry.file);
                try {
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    const action: AgentforceAction = JSON.parse(fileContent);
                    const fileApiName = action.properties?.["API Name"]?.type || action.properties?.["API Name"]?.description;
                    console.log(`    File: ${entry.file}`);
                    console.log(`      Action Name: ${action.name}`);
                    console.log(`      API Name in file: ${fileApiName}`);
                    console.log(`      API Name in index: ${entry.apiName}`);
                    console.log('');
                } catch (e) {
                    console.log(`    ⚠️  Could not read file: ${entry.file}`);
                }
            }
        }
    } else {
        console.log('✅ No duplicate API Names found in index.');
    }
    
    // Also check files directly
    console.log('\nChecking all action files for duplicates...\n');
    const fileApiNameMap = new Map<string, string[]>();
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
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
                    const apiName = action.properties?.["API Name"]?.type || action.properties?.["API Name"]?.description;
                    
                    if (apiName) {
                        if (!fileApiNameMap.has(apiName)) {
                            fileApiNameMap.set(apiName, []);
                        }
                        fileApiNameMap.get(apiName)!.push(`${letter}/${file}`);
                    }
                } catch (e) {
                    // Skip files that can't be read
                }
            }
        } catch (e) {
            // Folder doesn't exist, skip
            continue;
        }
    }
    
    // Find duplicates in files
    const fileDuplicates: Array<{ apiName: string; files: string[] }> = [];
    for (const [apiName, files] of fileApiNameMap.entries()) {
        if (files.length > 1) {
            fileDuplicates.push({ apiName, files });
        }
    }
    
    if (fileDuplicates.length > 0) {
        console.log(`⚠️  Found ${fileDuplicates.length} duplicate API Name(s) in files:\n`);
        for (const dup of fileDuplicates) {
            console.log(`  API Name: "${dup.apiName}"`);
            console.log(`    Found in files:`);
            for (const file of dup.files) {
                console.log(`      - ${file}`);
            }
            console.log('');
        }
    } else {
        console.log('✅ No duplicate API Names found in files.');
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    checkDuplicateApiNames().catch(console.error);
}

export { checkDuplicateApiNames };

