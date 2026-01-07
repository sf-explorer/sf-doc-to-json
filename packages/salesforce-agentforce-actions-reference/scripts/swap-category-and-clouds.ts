#!/usr/bin/env node

/**
 * Script to swap category and clouds:
 * - Set category to referenceActionType (Standard, Flow, Prompt Template, etc.)
 * - Add original category to clouds array (Commerce, Sales, Service, etc.)
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

async function swapCategoryAndClouds() {
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const indexPath = path.join(srcDocDir, 'index.json');
    
    console.log('📊 Swapping category and clouds...\n');
    
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
        try {
            // actionMetadata.file is already relative to src/doc (e.g., "actions/A/Add_Item_To_Cart.json")
            const filePath = path.join(srcDocDir, actionMetadata.file);
            
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
            
            const referenceType = referenceActionType.type || referenceActionType.description;
            if (!referenceType) {
                skippedCount++;
                continue;
            }
            
            const oldCategory = actionMetadata.category || action.category || '';
            const oldClouds = actionMetadata.clouds || [];
            
            // Map category to cloud name (business category -> cloud)
            const categoryToCloud: Record<string, string> = {
                'Commerce': 'Commerce Cloud',
                'Sales': 'Sales Cloud',
                'Service': 'Service Cloud',
                'Financial Services': 'Financial Services Cloud',
                'Education': 'Education Cloud',
                'Health': 'Health Cloud',
                'Automotive': 'Automotive Cloud',
                'Manufacturing': 'Manufacturing Cloud',
                'Field Service': 'Field Service Lightning',
                'Public Sector': 'Public Sector Cloud',
                'Nonprofit': 'Nonprofit Cloud',
                'Marketing': 'Marketing Cloud',
                'Experience': 'Experience Cloud',
                'Data Cloud': 'Data Cloud',
                'Net Zero': 'Net Zero Cloud',
                'Loyalty': 'Loyalty',
                'Scheduler': 'Scheduler',
                'Agentforce for Service': 'Agentforce for Service',
                'AI Agent for Employees': 'AI Agent for Employees',
            };
            
            // Set category to referenceActionType
            actionMetadata.category = referenceType;
            
            // Add original category to clouds if it maps to a cloud
            const cloudToAdd = categoryToCloud[oldCategory];
            if (cloudToAdd) {
                // Add cloud if not already present
                if (!oldClouds.includes(cloudToAdd)) {
                    actionMetadata.clouds = [...oldClouds, cloudToAdd];
                } else {
                    actionMetadata.clouds = oldClouds;
                }
            } else {
                // No cloud mapping, keep existing clouds
                actionMetadata.clouds = oldClouds;
            }
            
            updatedCount++;
            console.log(`  ✅ ${actionName}: category "${oldCategory}" → "${referenceType}", cloud added: ${cloudToAdd || 'none'}`);
            
        } catch (error) {
            console.error(`  ❌ Error processing ${actionName}:`, error);
            errorCount++;
        }
    }
    
    // Save updated index
    index.generatedAt = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log(`\n✅ Category and clouds swapped:`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped (no referenceActionType): ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n✅ Index updated successfully!`);
}

swapCategoryAndClouds().catch(console.error);

