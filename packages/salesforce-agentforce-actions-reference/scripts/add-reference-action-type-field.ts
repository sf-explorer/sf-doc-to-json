#!/usr/bin/env node

/**
 * Script to add referenceActionType as a dedicated field in the index
 * - Keep category as business category (Commerce, Sales, Service, etc.)
 * - Add referenceActionType field (Standard, Flow, Prompt Template, etc.)
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

async function addReferenceActionTypeField() {
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const indexPath = path.join(srcDocDir, 'index.json');
    
    console.log('📊 Adding referenceActionType field to index...\n');
    
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
            
            // Get original category from action file (business category)
            const originalCategory = action.category;
            
            // Add referenceActionType field
            actionMetadata.referenceActionType = referenceType;
            
            // Restore category to original business category if it exists
            if (originalCategory && originalCategory !== actionMetadata.category) {
                actionMetadata.category = originalCategory;
            }
            
            // Map category to cloud name and add to clouds if not already present
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
            
            const businessCategory = actionMetadata.category || originalCategory;
            const cloudToAdd = businessCategory ? categoryToCloud[businessCategory] : null;
            const currentClouds = actionMetadata.clouds || [];
            
            if (cloudToAdd && !currentClouds.includes(cloudToAdd)) {
                actionMetadata.clouds = [...currentClouds, cloudToAdd];
            }
            
            updatedCount++;
            console.log(`  ✅ ${actionName}: added referenceActionType "${referenceType}", category: "${actionMetadata.category || '(none)'}", cloud: ${cloudToAdd || 'none'}`);
            
        } catch (error) {
            console.error(`  ❌ Error processing ${actionName}:`, error);
            errorCount++;
        }
    }
    
    // Save updated index
    index.generatedAt = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log(`\n✅ Reference Action Type field added:`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped (no Reference Action Type): ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`\n✅ Index updated successfully!`);
}

addReferenceActionTypeField().catch(console.error);

