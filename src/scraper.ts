import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { CONFIGURATION, CHUNK_SIZE } from './config.js';
import { 
    SalesforceObject, 
    DocumentMapping, 
    ObjectIndexEntry, 
    DocumentIndex,
    SalesforceObjectCollection 
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const documentMapping: Record<string, DocumentMapping> = {};

function cleanWhitespace(text: string): string {
    return text
        .replace(/\n/g, ' ')      // Replace newlines with spaces
        .replace(/\t/g, ' ')      // Replace tabs with spaces
        .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
        .trim();                  // Remove leading/trailing whitespace
}

/**
 * Convert a cloud display name to its file name
 * This ensures consistent naming across the codebase
 * @param cloudName - The cloud display name (e.g., "Financial Services Cloud")
 * @returns The file name (e.g., "financial-services-cloud")
 */
function cloudNameToFileName(cloudName: string): string {
    return cloudName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

function removeDuplicates<T>(arr: T[], prop: keyof T): T[] {
    const unique = new Set();
    const result = arr.filter((item) => {
        const val = item[prop];
        const isPresent = unique.has(val);
        unique.add(val);
        return !isPresent;
    });
    return result;
}

export async function fetchDocuments(version: string, specificDoc?: string): Promise<void> {
    console.log(`Fetching documents for version ${version}...`);
    
    const documentsToFetch = specificDoc 
        ? [specificDoc]
        : Object.keys(CONFIGURATION);
    
    console.log(`Fetching ${documentsToFetch.length} documentation(s)...`);
    
    for (const item of documentsToFetch) {
        if (!CONFIGURATION[item]) {
            console.error(`Unknown documentation ID: ${item}`);
            continue;
        }
        await fetchDocumentsSingle(item);
    }
    
    const items = Object.keys(documentMapping)
        .reduce((acc, documentationId) => {
            if (documentMapping[documentationId]?.items) {
                return acc.concat(
                    documentMapping[documentationId].items.map(x => ({ ...x, documentationId }))
                );
            }
            return acc;
        }, [] as any[]);

    console.log(`\nTotal objects found: ${items.length}`);
    await loadAllDocuments(items, version);
}

async function fetchDocumentsSingle(documentationId: string): Promise<void> {
    try {
        console.log(`Fetching ${CONFIGURATION[documentationId]?.label} (${documentationId})...`);
        
        const response = await fetch(`https://developer.salesforce.com/docs/get_document/${documentationId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json() as any;
        const items = removeDuplicates(extraDataFromJson(documentationId, result.toc, []), 'id')
            .sort((a: any, b: any) => (a.text || '').localeCompare(b.text));
        
        documentMapping[documentationId] = {
            items: items,
            header: result
        };
        
        console.log(`  Found ${items.length} objects`);
    } catch (e) {
        console.error(`Error fetching ${documentationId}:`, (e as Error).message);
    }
}

function extraDataFromJson(documentationId: string, items: any[], result: any[]): any[] {
    for (const x of (items || [])) {
        const itemId = x.id || '';
        if (x.children) {
            result = result.concat(extraDataFromJson(documentationId, x.children, []));
        } else {
            // Match both standard objects and tooling API objects
            if (itemId.startsWith('sforce_api_objects_') || itemId.startsWith('tooling_api_objects_')) {
                result.push(x);
            }
        }
    }
    return result;
}

async function fetchContentDocument(documentationId: string, url: string): Promise<Partial<SalesforceObject>> {
    try {
        const header = documentMapping[documentationId].header;
        const contentUrl = `https://developer.salesforce.com/docs/get_document_content/${header.deliverable}/${url}/en-us/${header.version.doc_version}`;
        
        const response = await fetch(contentUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const res = await response.text();
        const data = JSON.parse(res) as any;
        
        const $ = cheerio.load(data.content);
        const desc = $('[id="summary"]');
        let headers = $('[data-title="Field Name"]');
        
        if (headers.length === 0) {
            headers = $('[data-title="Field"]');
        }

        const headerNames: string[] = [];
        const headerDesc: string[] = [];

        headers.each((index, el) => {
            headerNames.push(cleanWhitespace($(el).text()));
        });

        const details = $('[data-title="Details"]');
        const headerTypes: string[] = [];
        
        details.each((index, el) => {
            headerTypes.push(cleanWhitespace($(el).find('dd').first().text()));
            headerDesc.push(cleanWhitespace($(el).find('dd').eq(2)?.text() || ""));
        });

        const properties: Record<string, { type: string; description: string }> = {};
        headerNames.forEach((name, i) => {
            properties[name] = {
                type: headerTypes[i] || '',
                description: headerDesc[i] || '',
            };
        });
        
        // Build the public-facing documentation URL
        // The contentUrl uses: /get_document_content/${deliverable}/${url}/en-us/${version}
        // The public URL uses: /${documentationId}/${deliverable}/${url}
        const publicUrl = `https://developer.salesforce.com/docs/${documentationId}/${header.deliverable}/${url}`;
        
        return { 
            name: data.title, 
            description: cleanWhitespace(desc?.text() || ''), 
            properties, 
            module: CONFIGURATION[documentationId]?.label || '',
            sourceUrl: publicUrl
        };
    } catch (e) {
        console.error(`Error fetching content for ${url}:`, (e as Error).message);
        return {};
    }
}

async function loadAllDocuments(items: any[], version: string): Promise<void> {
    const chunkList = <T,>(list: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < list.length; i += size) {
            chunks.push(list.slice(i, i + size));
        }
        return chunks;
    };

    const docFolder = './doc';
    try {
        await fs.access(docFolder);
    } catch {
        await fs.mkdir(docFolder, { recursive: true });
        console.log(`Created ${docFolder} directory`);
    }

    const itemChunks = chunkList(items.map(x => ({ url: x.a_attr.href, ...x })), CHUNK_SIZE);
    let finalResult: SalesforceObject[] = [];
    
    console.log(`\nProcessing ${items.length} objects in ${itemChunks.length} chunks...`);
    
    for (let i = 0; i < itemChunks.length; i++) {
        const chunk = itemChunks[i];
        const promises = chunk.map(x => fetchContentDocument(x.documentationId, x.url));
        const results = (await Promise.all(promises)).filter(item => item.name) as SalesforceObject[];
        finalResult = [...finalResult, ...results];
        
        const progress = Math.round((finalResult.length / items.length) * 100);
        console.log(`Progress: ${finalResult.length}/${items.length} (${progress}%) - Chunk ${i + 1}/${itemChunks.length}`);
    }

    const resultsByCloud = finalResult.reduce((acc, item) => {
        const module = item.module || 'Unknown';
        if (!acc[module]) {
            acc[module] = [];
        }
        acc[module].push(item);
        return acc;
    }, {} as Record<string, SalesforceObject[]>);

    console.log('\n');
    let totalObjects = 0;
    
    // Load existing index if it exists, otherwise create new
    const indexPath = path.join(docFolder, 'index.json');
    let existingIndex: DocumentIndex | null = null;
    try {
        const existingContent = await fs.readFile(indexPath, 'utf-8');
        existingIndex = JSON.parse(existingContent);
        console.log(`📂 Loaded existing index with ${existingIndex?.totalObjects || 0} objects`);
    } catch {
        console.log('📂 No existing index found, creating new one');
    }
    
    const objectIndex: Record<string, ObjectIndexEntry> = existingIndex?.objects ? { ...existingIndex.objects } : {};
    
    // Create common objects folder for all objects
    const objectsFolder = path.join(docFolder, 'objects');
    try {
        await fs.access(objectsFolder);
    } catch {
        await fs.mkdir(objectsFolder, { recursive: true });
        console.log(`Created ${objectsFolder} directory`);
    }
    
    // Create alphabetical folders (A-Z)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const letter of alphabet) {
        const letterFolder = path.join(objectsFolder, letter);
        try {
            await fs.access(letterFolder);
        } catch {
            await fs.mkdir(letterFolder, { recursive: true });
        }
    }
    
    // Track stats for each cloud
    const cloudStats: Record<string, { objects: string[], count: number }> = {};
    
    // Write individual object files
    for (const item of finalResult) {
        if (!item.name) continue;
        
        const firstLetter = item.name[0].toUpperCase();
        const objectFilePath = path.join(objectsFolder, firstLetter, `${item.name}.json`);
        
        // Check if object file already exists and merge data if it does
        let existingObjectData: SalesforceObject | null = null;
        try {
            const existingContent = await fs.readFile(objectFilePath, 'utf-8');
            const existingFile = JSON.parse(existingContent);
            existingObjectData = existingFile[item.name];
        } catch {
            // File doesn't exist yet, that's fine
        }
        
        // Merge with existing data if found
        let mergedObject: SalesforceObject;
        if (existingObjectData) {
            // Enrich existing object with new data
            mergedObject = {
                ...existingObjectData,
                ...item,
                // Merge properties (fields) - keep all fields from both sources
                properties: {
                    ...existingObjectData.properties,
                    ...item.properties
                },
                // If description is empty in new data, keep the old one
                description: item.description || existingObjectData.description,
                // Keep the most detailed sourceUrl (prefer the new one if it exists)
                sourceUrl: item.sourceUrl || existingObjectData.sourceUrl,
                // Track multiple clouds if object appears in multiple places
                clouds: [
                    ...(existingObjectData.clouds || [existingObjectData.module].filter(Boolean)),
                    item.module
                ].filter((v, i, arr) => arr.indexOf(v) === i) // Remove duplicates
            };
        } else {
            // New object, just use the scraped data
            mergedObject = {
                ...item,
                clouds: [item.module].filter(Boolean)
            };
        }
        
        const objectData = {
            [item.name]: mergedObject
        };
        
        await fs.writeFile(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
        
        const cloudName = item.module || 'Unknown';
        if (!cloudStats[cloudName]) {
            cloudStats[cloudName] = { objects: [], count: 0 };
        }
        cloudStats[cloudName].objects.push(item.name);
        cloudStats[cloudName].count++;
        
        // Update index entry with enriched data
        const existingIndexEntry = objectIndex[item.name];
        objectIndex[item.name] = {
            cloud: existingIndexEntry?.cloud || cloudName,
            file: `objects/${firstLetter}/${item.name}.json`,
            description: item.description || existingIndexEntry?.description || '',
            fieldCount: Object.keys(mergedObject.properties || {}).length,
            sourceUrl: item.sourceUrl || existingIndexEntry?.sourceUrl,
            // Track all clouds this object appears in
            clouds: mergedObject.clouds
        };
        
        totalObjects++;
    }
    
    // Create cloud index files (just list of object names per cloud)
    for (const [cloudName, stats] of Object.entries(cloudStats)) {
        const fileName = cloudNameToFileName(cloudName);
        
        const cloudIndexPath = path.join(docFolder, `${fileName}.json`);
        
        // Find the description from configuration
        const configEntry = Object.values(CONFIGURATION).find(config => config.label === cloudName);
        const description = configEntry?.description || '';
        
        const cloudIndex = {
            cloud: cloudName,
            description: description,
            objectCount: stats.count,
            objects: stats.objects.sort()
        };
        
        await fs.writeFile(cloudIndexPath, JSON.stringify(cloudIndex, null, 2), 'utf-8');
        console.log(`✓ Created index for ${cloudName} with ${stats.count} objects: ${cloudIndexPath}`);
    }
    
    // Create main index
    const sortedIndex = Object.keys(objectIndex)
        .sort()
        .reduce((acc, key) => {
            acc[key] = objectIndex[key];
            return acc;
        }, {} as Record<string, ObjectIndexEntry>);
    
    // Build cloud index by reading all cloud JSON files
    const cloudIndex: Record<string, any> = {};
    const cloudFiles = await fs.readdir(docFolder);
    
    for (const file of cloudFiles) {
        if (file.endsWith('.json') && file !== 'index.json' && file !== 'globalDescribe.json' && file !== 'toolingGlobalDescribe.json') {
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
    
    // Calculate totals from all objects in index (existing + newly scraped)
    const allClouds = new Set(Object.values(sortedIndex).map(obj => obj.cloud));
    const totalObjectsInIndex = Object.keys(sortedIndex).length;
    
    const indexData: DocumentIndex = {
        generated: new Date().toISOString(),
        version: version,
        totalObjects: totalObjectsInIndex,
        totalClouds: Object.keys(cloudIndex).length,
        objects: sortedIndex,
        clouds: cloudIndex
    };
    
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
    
    console.log(`\n✓ Created main index with ${totalObjectsInIndex} objects across ${Object.keys(cloudIndex).length} cloud(s): ${indexPath}`);
    console.log(`✓ This scrape: ${totalObjects} objects saved from ${Object.keys(resultsByCloud).length} cloud(s)`);
    console.log(`✓ All objects stored in: ${objectsFolder}/[A-Z]/`);
}

