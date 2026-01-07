#!/usr/bin/env node

/**
 * Script to update the category field in index.json
 * based on the "Reference Action Type" property from each action JSON file
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
    }>;
}

async function updateCategoriesFromReferenceType() {
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const indexPath = path.join(srcDocDir, 'index.json');
    
    console.log('📊 Updating categories from Reference Action Type...\n');
    
    // Load index
    let index: ActionIndex;
    try {
        const indexData = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(indexData);
    } catch (e) {
        console.error('❌ Could not load index.json');
        process.exit(1);
    }
    
    let updatedCount = 0;
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
                console.log(`  ⚠️  File not found: ${actionMetadata.file}`);
                skippedCount++;
                continue;
            }
            
            // Read action file
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const action = JSON.parse(fileContent) as AgentforceAction;
            
            if (!action || !action.properties) {
                skippedCount++;
                continue;
            }
            
            // Extract "Reference Action Type"
            const referenceActionType = action.properties["Reference Action Type"];
            
            if (!referenceActionType) {
                skippedCount++;
                continue;
            }
            
            // Get the type value (or description as fallback)
            const referenceType = referenceActionType.type || referenceActionType.description;
            
            if (!referenceType) {
                skippedCount++;
                continue;
            }
            
            // Keep the original category from the action file (for cloud filtering)
            // Add referenceActionType as a separate field
            const originalCategory = action.category || actionMetadata.category || '';
            
            // Update referenceActionType field (not category)
            const oldReferenceType = (actionMetadata as any).referenceActionType || '';
            if (oldReferenceType !== referenceType) {
                (actionMetadata as any).referenceActionType = referenceType;
                // Ensure category is preserved from action file
                if (originalCategory && actionMetadata.category !== originalCategory) {
                    actionMetadata.category = originalCategory;
                }
                updatedCount++;
                console.log(`  ✅ ${actionName}: referenceActionType "${oldReferenceType || '(none)'}" → "${referenceType}"`);
            } else {
                // Already correct, but still counted as processed
            }
            
        } catch (error) {
            console.error(`  ❌ Error processing ${actionName}:`, error);
            errorCount++;
        }
    }
    
    // Save updated index
    index.generatedAt = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log(`\n✅ Categories updated:`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped (no Reference Action Type): ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n✅ Index updated successfully!`);
}

updateCategoriesFromReferenceType().catch(console.error);

