#!/usr/bin/env node

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get description for a cloud name
 */
function getCloudDescription(cloudName) {
    const descriptions = {
        'Core Salesforce': 'Standard Salesforce objects including Account, Contact, Opportunity, Case, Lead, and other core CRM functionality.',
        'Feedback Management': 'Objects for collecting, managing, and analyzing customer feedback and survey responses.',
        'Scheduler': 'Objects for scheduling appointments, managing availability, and coordinating resources.',
        'Field Service Lightning': 'Objects for managing field service operations, work orders, service appointments, and mobile workforce.',
        'Loyalty': 'Objects for loyalty program management including member enrollment, points, rewards, and promotions.',
        'Public Sector Cloud': 'Objects for government and public sector organizations including permits, inspections, and regulatory compliance.',
        'Net Zero Cloud': 'Objects for sustainability management, carbon accounting, emissions tracking, and environmental reporting.',
        'Education Cloud': 'Objects for educational institutions including student recruitment, enrollment, academic programs, and alumni relations.',
        'Automotive Cloud': 'Objects for automotive industry including vehicle inventory, sales, service, warranties, and dealership management.',
        'Energy and Utilities Cloud': 'Objects for energy and utility companies including meter management, billing, consumption tracking, and grid operations.',
        'Health Cloud': 'Objects for healthcare and life sciences including patient care, clinical data, care plans, and health assessments.',
        'Consumer Goods Cloud': 'Objects for consumer goods and retail including store operations, promotions, product assortment, and retail execution.',
        'Financial Services Cloud': 'Objects for financial services including banking, wealth management, insurance, client relationships, and financial accounts.',
        'Manufacturing Cloud': 'Objects for manufacturing operations including sales agreements, forecasting, production planning, and partner management.',
        'Nonprofit Cloud': 'Objects for nonprofit organizations including fundraising, donor management, grant tracking, and program management.'
    };
    return descriptions[cloudName] || '';
}

/**
 * Migrates existing large JSON files to the new split structure
 * with individual object files organized alphabetically
 */

const DOC_FOLDER = path.join(__dirname, '../doc');
const OBJECTS_FOLDER = path.join(DOC_FOLDER, 'objects');

console.log('🚀 Starting migration to split structure...\n');

async function main() {
    // Create objects folder if it doesn't exist
    try {
        await fs.access(OBJECTS_FOLDER);
    } catch {
        await fs.mkdir(OBJECTS_FOLDER, { recursive: true });
        console.log(`📁 Created ${OBJECTS_FOLDER} directory\n`);
    }
    
    // Create alphabetical folders (A-Z)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const letter of alphabet) {
        const letterFolder = path.join(OBJECTS_FOLDER, letter);
        try {
            await fs.access(letterFolder);
        } catch {
            await fs.mkdir(letterFolder, { recursive: true });
        }
    }
    
    // Get all JSON files in doc folder (except index.json)
    const files = await fs.readdir(DOC_FOLDER);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
    
    console.log(`📚 Found ${jsonFiles.length} cloud documentation files to migrate\n`);
    
    const cloudStats = {};
    let totalObjects = 0;
    const objectIndex = {};
    
    for (const file of jsonFiles) {
        const filePath = path.join(DOC_FOLDER, file);
        const stats = await fs.stat(filePath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`\n📖 Processing ${file} (${sizeMB} MB)...`);
        
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        const objectNames = Object.keys(data);
        console.log(`  Found ${objectNames.length} objects`);
        
        const cloudName = data[objectNames[0]]?.module || file.replace('.json', '');
        
        if (!cloudStats[cloudName]) {
            cloudStats[cloudName] = { objects: [], count: 0 };
        }
        
        // Write each object to individual file
        for (const objectName of objectNames) {
            const obj = data[objectName];
            const firstLetter = objectName[0].toUpperCase();
            const objectFilePath = path.join(OBJECTS_FOLDER, firstLetter, `${objectName}.json`);
            
            const objectData = {
                [objectName]: obj
            };
            
            await fs.writeFile(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
            
            cloudStats[cloudName].objects.push(objectName);
            cloudStats[cloudName].count++;
            
            objectIndex[objectName] = {
                cloud: cloudName,
                file: `objects/${firstLetter}/${objectName}.json`
            };
            
            totalObjects++;
        }
        
        console.log(`  ✓ Migrated ${objectNames.length} objects to split structure`);
        
        // Create cloud index file (list of objects)
        const cloudIndex = {
            cloud: cloudName,
            description: getCloudDescription(cloudName),
            objectCount: cloudStats[cloudName].count,
            objects: cloudStats[cloudName].objects.sort()
        };
        
        await fs.writeFile(filePath, JSON.stringify(cloudIndex, null, 2), 'utf-8');
        console.log(`  ✓ Converted ${file} to object list (${sizeMB} MB → ${(JSON.stringify(cloudIndex).length / 1024).toFixed(2)} KB)`);
    }
    
    // Update main index
    const indexPath = path.join(DOC_FOLDER, 'index.json');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    const indexData = JSON.parse(indexContent);
    
    // Update index with new file paths
    for (const [objectName, info] of Object.entries(indexData.objects)) {
        const firstLetter = objectName[0].toUpperCase();
        indexData.objects[objectName] = {
            ...info,
            file: `objects/${firstLetter}/${objectName}.json`
        };
    }
    
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
    
    // Print statistics
    console.log('\n\n✅ Migration complete!\n');
    console.log('📊 Statistics by letter:');
    console.log('─'.repeat(50));
    
    const letterCounts = {};
    for (const objectName of Object.keys(objectIndex)) {
        const letter = objectName[0].toUpperCase();
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }
    
    Object.keys(letterCounts)
        .sort()
        .forEach((letter) => {
            const count = letterCounts[letter];
            const bar = '█'.repeat(Math.ceil(count / 10));
            console.log(`${letter}: ${count.toString().padStart(5)} ${bar}`);
        });
    
    console.log('─'.repeat(50));
    console.log(`Total: ${totalObjects} objects\n`);
    
    console.log('📊 Statistics by cloud:');
    console.log('─'.repeat(50));
    Object.entries(cloudStats)
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([cloud, stats]) => {
            console.log(`${cloud}: ${stats.count} objects`);
        });
    
    console.log('\n📁 New structure:');
    console.log(`   ${DOC_FOLDER}/`);
    console.log(`   ├── index.json (${totalObjects} object references)`);
    console.log(`   ├── core-salesforce.json (object list only)`);
    console.log(`   ├── financial-services-cloud.json (object list only)`);
    console.log(`   ├── ... (other cloud index files)`);
    console.log(`   └── objects/`);
    Object.keys(letterCounts)
        .sort()
        .forEach((letter) => {
            console.log(`       ├── ${letter}/ (${letterCounts[letter]} files)`);
        });
    
    console.log('\n✨ Done!\n');
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});

