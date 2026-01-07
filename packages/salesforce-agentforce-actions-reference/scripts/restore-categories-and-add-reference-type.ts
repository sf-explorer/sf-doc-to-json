#!/usr/bin/env node

/**
 * Script to restore original categories from action files and add referenceActionType
 * based on the "Reference Action Type" property
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ActionIndex {
    version?: string;
    generatedAt: string;
    totalActions: number;
    actions: Record<string, {
        name?: string;
        file: string;
        description: string;
        propertyCount?: number;
        category?: string;
        clouds?: string[];
        sourceUrl?: string;
        apiName?: string;
        referenceActionType?: string;
    }>;
}

async function restoreCategoriesAndAddReferenceType() {
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const indexPath = path.join(srcDocDir, 'index.json');
    
    console.log('📊 Restoring categories and adding referenceActionType...\n');
    
    // Load index
    let index: ActionIndex;
    try {
        const indexData = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(indexData);
    } catch (e) {
        console.error('❌ Could not load index.json');
        process.exit(1);
    }
    
    let categoryRestored = 0;
    let referenceTypeAdded = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each action in the index
    for (const [actionName, actionMetadata] of Object.entries(index.actions)) {
        // actionMetadata.file is already relative to src/doc (e.g., "actions/A/Add_Item_To_Cart.json")
        const filePath = path.join(srcDocDir, actionMetadata.file);
        
        try {
            // Check if file exists
            try {
                await fs.access(filePath);
            } catch {
                skippedCount++;
                continue;
            }
            
            // Read action file
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const action = JSON.parse(fileContent) as AgentforceAction;
            
            if (!action) {
                skippedCount++;
                continue;
            }
            
            // Restore original category from action file
            if (action.category && action.category !== actionMetadata.category) {
                const oldCategory = actionMetadata.category || '(none)';
                actionMetadata.category = action.category;
                categoryRestored++;
                console.log(`  ✅ ${actionName}: restored category "${oldCategory}" → "${action.category}"`);
            }
            
            // Extract "Reference Action Type" and add as separate field
            if (action.properties && action.properties["Reference Action Type"]) {
                const referenceActionType = action.properties["Reference Action Type"];
                const referenceType = referenceActionType.type || referenceActionType.description;
                
                if (referenceType && referenceType !== actionMetadata.referenceActionType) {
                    const oldRefType = actionMetadata.referenceActionType || '(none)';
                    actionMetadata.referenceActionType = referenceType;
                    referenceTypeAdded++;
                    console.log(`  ✅ ${actionName}: added referenceActionType "${oldRefType}" → "${referenceType}"`);
                }
            }
            
        } catch (error) {
            console.error(`  ❌ Error processing ${actionName}:`, error);
            errorCount++;
        }
    }
    
    // Save updated index
    index.generatedAt = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log(`\n✅ Categories and referenceActionType updated:`);
    console.log(`   Categories restored: ${categoryRestored}`);
    console.log(`   Reference types added: ${referenceTypeAdded}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n✅ Index updated successfully!`);
}

restoreCategoriesAndAddReferenceType().catch(console.error);

