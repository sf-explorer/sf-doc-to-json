/**
 * Rebuild index.json from existing object files
 * This script reads all object JSON files and regenerates the index
 * with all metadata including accessRules
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FieldProperty {
    type: string;
    description: string;
    [key: string]: any;
}

interface SalesforceObject {
    name: string;
    description: string;
    properties: Record<string, FieldProperty>;
    module: string;
    sourceUrl?: string;
    clouds?: string[];
    accessRules?: string;
}

interface ObjectIndexEntry {
    cloud: string;
    file: string;
    description: string;
    fieldCount: number;
    keyPrefix?: string;
    label?: string;
    sourceUrl?: string;
    icon?: string;
    clouds?: string[];
    accessRules?: string;
}

interface DocumentIndex {
    generated: string;
    version: string;
    totalObjects: number;
    totalClouds: number;
    objects: Record<string, ObjectIndexEntry>;
    clouds?: Record<string, CloudIndexEntry>;
}

interface CloudIndexEntry {
    count: number;
    objects: string[];
}

async function rebuildIndex() {
    console.log('🔄 Rebuilding index.json from existing object files...\n');
    
    const docFolder = path.join(__dirname, '..', 'src', 'doc');
    const objectsFolder = path.join(docFolder, 'objects');
    const indexPath = path.join(docFolder, 'index.json');
    
    // Load existing index to preserve version info
    let existingIndex: DocumentIndex | null = null;
    try {
        const content = await fs.readFile(indexPath, 'utf-8');
        existingIndex = JSON.parse(content);
        console.log(`📂 Loaded existing index (version: ${existingIndex?.version})\n`);
    } catch (error) {
        console.log('📂 No existing index found\n');
    }
    
    // Start with existing index objects to preserve objects without files
    const objectIndex: Record<string, ObjectIndexEntry> = existingIndex?.objects ? { ...existingIndex.objects } : {};
    const cloudStats: Record<string, { objects: string[], count: number }> = {};
    let filesProcessed = 0;
    let objectsEnriched = 0;
    let objectsWithAccessRules = 0;
    
    console.log(`📝 Starting with ${Object.keys(objectIndex).length} objects from existing index\n`);
    
    // Read all alphabetical folders
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    
    for (const letter of alphabet) {
        const letterFolder = path.join(objectsFolder, letter);
        
        try {
            const files = await fs.readdir(letterFolder);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(letterFolder, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const data = JSON.parse(content);
                    
                    // Get the object (the file contains a single object with the object name as key)
                    const objectName = Object.keys(data)[0];
                    const objectData: SalesforceObject = data[objectName];
                    
                    if (!objectData) {
                        console.warn(`⚠️  Skipping ${file}: No object data found`);
                        continue;
                    }
                    
                    // Default to "Core Salesforce" instead of "Unknown" for objects without a specific cloud
                    const cloudName = objectData.module && objectData.module !== 'N/A' ? objectData.module : 'Core Salesforce';
                    
                    // Track cloud stats
                    if (!cloudStats[cloudName]) {
                        cloudStats[cloudName] = { objects: [], count: 0 };
                    }
                    cloudStats[cloudName].objects.push(objectName);
                    cloudStats[cloudName].count++;
                    
                    // Get existing entry if it exists
                    const existingEntry = objectIndex[objectName];
                    
                    // Enrich/update the index entry (preserve ALL existing data, update/add new data)
                    objectIndex[objectName] = {
                        ...existingEntry, // Preserve ALL existing fields (icon, keyPrefix, label, etc.)
                        cloud: existingEntry?.cloud || cloudName,
                        file: `objects/${letter}/${file}`,
                        description: objectData.description || existingEntry?.description || '',
                        fieldCount: Object.keys(objectData.properties || {}).length,
                        clouds: objectData.clouds || existingEntry?.clouds || [cloudName],
                        accessRules: objectData.accessRules || existingEntry?.accessRules
                    };
                    
                    if (objectData.accessRules) {
                        objectsWithAccessRules++;
                    }
                    
                    filesProcessed++;
                    if (existingEntry) {
                        objectsEnriched++;
                    }
                }
            }
        } catch (error) {
            // Letter folder doesn't exist, skip
        }
    }
    
    const totalObjects = Object.keys(objectIndex).length;
    
    // Build cloud index by reading all cloud JSON files (like core-salesforce.json, health-cloud.json)
    const cloudIndex: Record<string, CloudIndexEntry> = {};
    const cloudFiles = await fs.readdir(docFolder);
    
    for (const file of cloudFiles) {
        if (file.endsWith('.json') && file !== 'index.json' && file !== 'globalDescribe.json' && file !== 'toolingGlobalDescribe.json' && file !== 'metadata.json') {
            const cloudFilePath = path.join(docFolder, file);
            try {
                const cloudContent = await fs.readFile(cloudFilePath, 'utf-8');
                const cloudData = JSON.parse(cloudContent);
                
                // Only include files that have the cloud index structure (with 'cloud' and 'objects' fields)
                if (cloudData.cloud && cloudData.objects) {
                    const fileName = file.replace('.json', '');
                    cloudIndex[fileName] = {
                        cloud: cloudData.cloud,
                        fileName: fileName,
                        description: cloudData.description || '',
                        objectCount: cloudData.objectCount || 0,
                        emoji: cloudData.emoji,
                        iconFile: cloudData.iconFile
                    };
                }
            } catch (e) {
                // Skip files that can't be parsed or don't match the expected structure
            }
        }
    }
    
    // Create the index document
    const index: DocumentIndex = {
        generated: new Date().toISOString(),
        version: existingIndex?.version || 'unknown',
        totalObjects,
        totalClouds: Object.keys(cloudIndex).length,
        objects: objectIndex,
        clouds: cloudIndex
    };
    
    // Write the index
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    
    console.log('✅ Index enriched successfully!\n');
    console.log(`📊 Statistics:`);
    console.log(`   Total objects in index: ${totalObjects}`);
    console.log(`   Files processed: ${filesProcessed}`);
    console.log(`   Objects enriched: ${objectsEnriched}`);
    console.log(`   Objects added: ${filesProcessed - objectsEnriched}`);
    console.log(`   Objects preserved (no file): ${totalObjects - filesProcessed}`);
    console.log(`   Objects with access rules: ${objectsWithAccessRules}`);
    console.log(`\n📁 Clouds:`);
    
    for (const [cloudName, stats] of Object.entries(cloudStats)) {
        console.log(`   ${cloudName}: ${stats.count} objects processed`);
    }
    
    console.log(`\n💾 Index saved to: ${indexPath}`);
}

rebuildIndex().catch(error => {
    console.error('❌ Error rebuilding index:', error);
    process.exit(1);
});

