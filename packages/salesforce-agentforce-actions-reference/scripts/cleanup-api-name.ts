#!/usr/bin/env node

/**
 * Script to clean up existing action files:
 * 1. Extract API Name from properties and add to index
 * 2. Remove "API Name" from properties in action files
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ActionProperty {
    type: string;
    description: string;
    required?: boolean;
    default?: string;
}

interface AgentforceAction {
    name: string;
    description: string;
    label?: string;
    category?: string;
    clouds?: string[];
    properties: Record<string, ActionProperty>;
    returnType?: string;
    sourceUrl: string;
    module: string;
}

interface ActionIndex {
    version?: string;
    generatedAt: string;
    totalActions: number;
    actions: Record<string, {
        name: string;
        file: string;
        description: string;
        propertyCount?: number;
        category?: string;
        clouds?: string[];
        sourceUrl: string;
        apiName?: string;
    }>;
}

async function cleanupApiName() {
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const actionsFolder = path.join(srcDocDir, 'actions');
    const indexPath = path.join(srcDocDir, 'index.json');
    
    console.log('🧹 Cleaning up API Name from action files and updating index...\n');
    
    // Load index
    let index: ActionIndex;
    try {
        const indexData = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(indexData);
    } catch (e) {
        console.error('❌ Could not load index.json');
        process.exit(1);
    }
    
    // Find all action JSON files recursively
    async function findJsonFiles(dir: string): Promise<string[]> {
        const files: string[] = [];
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const subFiles = await findJsonFiles(fullPath);
                files.push(...subFiles);
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
                files.push(fullPath);
            }
        }
        
        return files;
    }
    
    const files = await findJsonFiles(actionsFolder);
    
    console.log(`📁 Found ${files.length} action files\n`);
    
    let updatedFiles = 0;
    let updatedIndexEntries = 0;
    
    for (const filePath of files) {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const action: AgentforceAction = JSON.parse(fileContent);
            const actionName = action.name;
            
            if (!action || !action.properties) {
                continue;
            }
            
            // Check if "API Name" exists in properties
            const apiNameProperty = action.properties["API Name"];
            if (!apiNameProperty) {
                continue; // No API Name to extract
            }
            
            // Extract API Name
            const apiName = apiNameProperty.type || apiNameProperty.description;
            
            // Remove "API Name" from properties
            const { "API Name": _, ...cleanProperties } = action.properties;
            
            // Update action file
            const updatedAction = {
                ...action,
                properties: cleanProperties
            };
            
            await fs.writeFile(filePath, JSON.stringify(updatedAction, null, 2), 'utf-8');
            updatedFiles++;
            
            // Update index entry
            if (index.actions[actionName]) {
                const indexEntry = index.actions[actionName];
                
                // Update propertyCount (excluding API Name)
                const propertyCount = Object.keys(cleanProperties).length;
                indexEntry.propertyCount = propertyCount;
                
                // Add apiName if not already present
                if (apiName && !indexEntry.apiName) {
                    indexEntry.apiName = apiName;
                    updatedIndexEntries++;
                }
            }
            
            console.log(`  ✅ ${actionName}: extracted "${apiName}", removed from properties`);
        } catch (e: any) {
            console.error(`  ⚠️  Error processing ${filePath}: ${e?.message || e}`);
        }
    }
    
    // Save updated index
    index.generatedAt = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Updated ${updatedFiles} action files`);
    console.log(`   Updated ${updatedIndexEntries} index entries`);
}

cleanupApiName().catch(console.error);

