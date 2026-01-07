#!/usr/bin/env node

/**
 * Script to update the totalActions count in index.json
 * to only include actions that have an API Name
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

async function updateActionCount() {
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const indexPath = path.join(srcDocDir, 'index.json');
    
    console.log('📊 Updating action count in index.json...\n');
    
    // Load index
    let index: ActionIndex;
    try {
        const indexData = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(indexData);
    } catch (e) {
        console.error('❌ Could not load index.json');
        process.exit(1);
    }
    
    const oldCount = index.totalActions;
    const totalEntries = Object.keys(index.actions).length;
    
    // Count only actions with API Name
    const actionsWithApiName = Object.values(index.actions).filter(
        entry => entry.apiName && entry.apiName.trim() !== ''
    );
    
    const newCount = actionsWithApiName.length;
    const filteredOut = totalEntries - newCount;
    
    index.totalActions = newCount;
    index.generatedAt = new Date().toISOString();
    
    // Save updated index
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log(`✅ Updated action count:`);
    console.log(`   Previous count: ${oldCount}`);
    console.log(`   Total entries: ${totalEntries}`);
    console.log(`   Actions with API Name: ${newCount}`);
    console.log(`   Actions without API Name (filtered out): ${filteredOut}`);
    console.log(`   New totalActions: ${newCount}`);
    console.log(`\n✅ Index updated successfully!`);
}

updateActionCount().catch(console.error);

