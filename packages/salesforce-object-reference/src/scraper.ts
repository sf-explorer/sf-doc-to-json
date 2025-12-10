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

/**
 * Normalize Salesforce types to JSON standard types
 * Salesforce documentation uses types like "textarea", "picklist", etc.
 * which should be normalized to standard JSON types
 */
function normalizeType(sfType: string): string {
    if (!sfType) return 'string';
    
    const type = sfType.toLowerCase().trim();
    
    // Map of Salesforce types to JSON standard types
    const typeMap: Record<string, string> = {
        // Text types
        'textarea': 'string',
        'email': 'string',
        'phone': 'string',
        'url': 'string',
        'picklist': 'string',
        'multipicklist': 'string',
        'combobox': 'string',
        'reference': 'string',
        'id': 'string',
        'encryptedstring': 'string',
        'datacategorygroupreference': 'string',
        'base64': 'string',
        'address': 'string',
        'location': 'string',
        
        // Numeric types
        'currency': 'number',
        'percent': 'number',
        'int': 'number',
        'long': 'number',
        'decimal': 'number',
        
        // Date/Time types
        'date': 'date',
        'datetime': 'dateTime',
        'time': 'time',
        
        // Boolean types
        'checkbox': 'boolean',
        
        // Already standard types
        'string': 'string',
        'boolean': 'boolean',
        'number': 'number',
        'integer': 'integer',
        'double': 'double',
        'object': 'object',
        'array': 'array'
    };
    
    return typeMap[type] || 'string'; // Default to string for unknown types
}

function cleanWhitespace(text: string): string {
    return text
        .replace(/\n/g, ' ')      // Replace newlines with spaces
        .replace(/\t/g, ' ')      // Replace tabs with spaces
        .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
        .trim();                  // Remove leading/trailing whitespace
}

/**
 * Extract permission names from access rules text
 * Examples:
 * - "To access this object, you must have the View Event Log Object Data user permission."
 *   -> ["View Event Log Object Data"]
 * - "You must have the "Email Administration," "Customize Application," and "View Setup" user permissions."
 *   -> ["Email Administration", "Customize Application", "View Setup"]
 * - "You must have the "Edit" permission on documents."
 *   -> ["Edit"]
 * - "You must have the Manage Chatter Messages and Direct Messages permission enabled."
 *   -> ["Manage Chatter Messages and Direct Messages"]
 * - "To access this object, you must have Tableau Next enabled in your org and a Tableau Next permission set."
 *   -> ["Tableau Next"]
 * - "This object is available as part of the Shield and Salesforce Platform Encryption add-on subscriptions."
 *   -> ["Shield", "Salesforce Platform Encryption"]
 * - "Users that have access to Data Cloud."
 *   -> ["Data Cloud"]
 * - "Your org must have one or more of these licenses: A, B, or C."
 *   -> ["A", "B", "C"]
 * - "This object is available if sales account plans are turned on."
 *   -> ["sales account plans"]
 * - "Research results are only available in orgs that have Einstein features with Einstein generative AI enabled."
 *   -> ["Einstein features with Einstein generative AI"]
 */
function extractPermissions(text: string): string[] {
    const permissions: string[] = [];
    
    // Pattern 1: "must have one or more of these licenses:" followed by list
    const pattern1 = /must have one or more of these licenses?:\s*(.+?)(?:\.|$)/gi;
    let match = pattern1.exec(text);
    if (match) {
        const licensesText = match[1].trim();
        // Split by comma, "or", and "and" to extract individual licenses
        const licenses = licensesText
            .split(/[,;]|\s+or\s+|\s+and\s+/i)
            .map(l => l.trim())
            .filter(l => l.length > 0);
        licenses.forEach(license => permissions.push(license));
    }
    
    // Pattern 2: Multiple quoted permissions like "PermA," "PermB," and "PermC" user permissions
    // Check if text contains quoted permissions
    if (/["']/.test(text) && /(?:user )?permissions?/i.test(text)) {
        // Extract the part with quoted permissions
        const quotedSection = text.match(/(?:you must have|requires?)(.*?)(?:user )?permissions?/i);
        if (quotedSection) {
            // Find all quoted strings
            const quotedPattern = /["']([^"']+?)["']/g;
            let quotedMatch;
            while ((quotedMatch = quotedPattern.exec(quotedSection[1])) !== null) {
                // Clean up trailing punctuation from quoted strings
                const cleaned = quotedMatch[1].trim().replace(/[,;]$/, '');
                if (cleaned) {
                    permissions.push(cleaned);
                }
            }
        }
    }
    
    // Pattern 3: "This object is available if [FEATURE] is/are turned on"
    const pattern3 = /(?:is|are) available if (.+?) (?:is|are) turned on/gi;
    while ((match = pattern3.exec(text)) !== null) {
        permissions.push(match[1].trim());
    }
    
    // Pattern 4: "available in orgs that have [FEATURE] enabled"
    const pattern4 = /available in orgs that have (.+?) enabled/gi;
    while ((match = pattern4.exec(text)) !== null) {
        permissions.push(match[1].trim());
    }
    
    // Pattern 5: "you must have the [PERMISSION] permission enabled"
    const pattern5 = /(?:you must have|requires?) the (.+?) permission enabled/gi;
    while ((match = pattern5.exec(text)) !== null) {
        permissions.push(match[1].trim());
    }
    
    // Pattern 6: "you must have the [PERMISSION] user permission"
    // Only apply this if we haven't already captured quoted permissions
    const pattern6 = /the (.+?) user permission/gi;
    while ((match = pattern6.exec(text)) !== null) {
        const perm = match[1].trim();
        // Skip if already captured by quoted pattern or if it contains quotes
        if (!permissions.includes(perm) && !/["']/.test(perm)) {
            permissions.push(perm);
        }
    }
    
    // Pattern 7: "appropriate access to [FEATURE/OBJECT]"
    const pattern7 = /appropriate access to (?:the )?(.+?)(?:\s+that|\s+in order to|\.|\s+and|$)/gi;
    while ((match = pattern7.exec(text)) !== null) {
        permissions.push(match[1].trim());
    }
    
    // Pattern 8: "you must have [FEATURE] enabled in your org"
    const pattern8 = /(?:you must have|requires?) (.+?) enabled in your org/gi;
    while ((match = pattern8.exec(text)) !== null) {
        permissions.push(match[1].trim());
    }
    
    // Pattern 9: "[PERMISSION] permission set"
    const pattern9 = /(?:and a |with a |have a )(.+?) permission set/gi;
    while ((match = pattern9.exec(text)) !== null) {
        permissions.push(match[1].trim());
    }
    
    // Pattern 10: "available as part of the [FEATURE] add-on subscription(s)"
    const pattern10 = /available as part of the (.+?) add-on subscriptions?/gi;
    while ((match = pattern10.exec(text)) !== null) {
        const featuresText = match[1].trim();
        // Split by "and" to handle multiple features
        const features = featuresText.split(/\s+and\s+/i);
        features.forEach(feature => permissions.push(feature.trim()));
    }
    
    // Pattern 11: "Users that have access to [FEATURE]"
    const pattern11 = /users? (?:that|who) have access to (.+?)(?:\.|$)/gi;
    while ((match = pattern11.exec(text)) !== null) {
        permissions.push(match[1].trim());
    }
    
    // Pattern 12: "available only in [EXPERIENCE]"
    const pattern12 = /available only in (.+?)(?:\.|$)/gi;
    while ((match = pattern12.exec(text)) !== null) {
        permissions.push(match[1].trim());
    }
    
    // Pattern 13: "requires [PERMISSION]" or "need [PERMISSION]" (fallback if no other patterns matched)
    if (permissions.length === 0) {
        const pattern13 = /(?:requires?|needs?) (.+?)(?:\.|$)/gi;
        match = pattern13.exec(text);
        if (match) {
            permissions.push(match[1].trim());
        }
    }
    
    // If no patterns matched, return the full text (fallback)
    if (permissions.length === 0 && text.length > 0) {
        permissions.push(text);
    }
    
    // Remove duplicates
    return [...new Set(permissions)];
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

        // Extract Special Access Rules section and parse permissions
        let accessRules: string | undefined = undefined;
        const specialAccessHeading = $('h2, h3').filter(function(this: cheerio.Element) {
            const text = $(this).text().trim();
            return text === 'Special Access Rules' || text === 'Special Access Rule';
        });
        
        if (specialAccessHeading.length > 0) {
            // Get the content after the Special Access Rules heading
            // Look for the next paragraph or list items
            const nextElement = specialAccessHeading.next();
            if (nextElement.length > 0) {
                let rulesText = '';
                
                // Check if it's a list
                if (nextElement.is('ul') || nextElement.is('ol')) {
                    const listItems: string[] = [];
                    nextElement.find('li').each((_index, el) => {
                        listItems.push(cleanWhitespace($(el).text()));
                    });
                    rulesText = listItems.join(' ');
                } else if (nextElement.is('p')) {
                    // It's a paragraph
                    rulesText = cleanWhitespace(nextElement.text());
                }
                
                if (rulesText) {
                    // Extract permission names from the text
                    const permissions = extractPermissions(rulesText);
                    if (permissions.length > 0) {
                        accessRules = permissions.join(', ');
                    }
                }
            }
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
                type: normalizeType(headerTypes[i] || ''),
                description: headerDesc[i] || '',
            };
        });
        
        // Build the public-facing documentation URL
        // The contentUrl uses: /get_document_content/${deliverable}/${url}/en-us/${version}
        // The public URL uses: /${documentationId}/${deliverable}/${url}
        const publicUrl = `https://developer.salesforce.com/docs/${documentationId}/${header.deliverable}/${url}`;
        
        const result: Partial<SalesforceObject> = { 
            name: data.title, 
            description: cleanWhitespace(desc?.text() || ''), 
            properties, 
            module: CONFIGURATION[documentationId]?.label || '',
            sourceUrl: publicUrl
        };
        
        // Only add accessRules if it was found
        if (accessRules) {
            result.accessRules = accessRules;
        }
        
        return result;
    } catch (e) {
        console.error(`Error fetching content for ${url}:`, (e as Error).message);
        return {};
    }
}

async function loadAllDocuments(items: any[], version: string): Promise<void> {
    const docFolder = './src/doc';
    try {
        await fs.access(docFolder);
    } catch {
        await fs.mkdir(docFolder, { recursive: true });
        console.log(`Created ${docFolder} directory`);
    }

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
    
    // Process items in chunks but save files immediately after each object is fetched
    const chunkList = <T,>(list: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < list.length; i += size) {
            chunks.push(list.slice(i, i + size));
        }
        return chunks;
    };

    const itemChunks = chunkList(items.map(x => ({ url: x.a_attr.href, ...x })), CHUNK_SIZE);
    let totalObjects = 0;
    let processedCount = 0;
    
    console.log(`\nProcessing ${items.length} objects in ${itemChunks.length} chunks...`);
    console.log('💾 Files will be saved progressively as objects are fetched\n');
    
    for (let i = 0; i < itemChunks.length; i++) {
        const chunk = itemChunks[i];
        
        // Fetch all objects in the chunk concurrently
        const promises = chunk.map(x => fetchContentDocument(x.documentationId, x.url));
        const results = (await Promise.all(promises)).filter(item => item.name) as SalesforceObject[];
        
        // Immediately save each fetched object to disk
        for (const item of results) {
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
                // ENRICH existing object with new data - preserve ALL existing fields
                // Start with existing data, then selectively add/update only fields that have values in new data
                mergedObject = {
                    ...existingObjectData, // Keep everything from existing object
                };
                
                // Only update/add fields if the new item has actual values for them
                if (item.name) {
                    mergedObject.name = item.name;
                }
                
                // Merge properties (fields) - ALWAYS keep ALL existing properties AND their metadata
                // This is CRITICAL: Properties from describe API have rich metadata (format, maxLength, nullable, etc.)
                // Documentation scraping only provides type & description
                // We must merge at the PROPERTY LEVEL to preserve all metadata
                const existingProps = existingObjectData.properties || {};
                const newProps = item.properties || {};
                
                // Count properties for logging
                const existingCount = Object.keys(existingProps).length;
                const newCount = Object.keys(newProps).length;
                
                // IMPORTANT: Documentation scraping might return fewer fields than describe API
                // We should ADD new fields but NEVER remove existing ones
                if (existingCount > 0 && newCount === 0) {
                    // New data has NO properties - keep existing entirely
                    mergedObject.properties = existingProps;
                    console.log(`ℹ️  ${item.name}: Kept ${existingCount} existing properties (new data had none)`);
                } else {
                    // Merge properties: Start with existing, then merge each property individually
                    const merged: Record<string, any> = {};
                    
                    // First, copy all existing properties with their full metadata
                    for (const [key, value] of Object.entries(existingProps)) {
                        merged[key] = { ...value };
                    }
                    
                    // Then, merge in new properties (add new ones or update existing ones)
                    for (const [key, newValue] of Object.entries(newProps)) {
                        if (merged[key]) {
                            // Property exists - merge metadata, don't replace
                            merged[key] = {
                                ...merged[key],     // Keep all existing metadata
                                ...newValue         // Update/add from new data
                            };
                        } else {
                            // New property - add it
                            merged[key] = { ...newValue };
                        }
                    }
                    
                    mergedObject.properties = merged;
                    
                    const mergedCount = Object.keys(merged).length;
                    
                    // Log if we're potentially losing properties
                    if (mergedCount < existingCount) {
                        console.warn(`⚠️  ${item.name}: Properties reduced from ${existingCount} to ${mergedCount}`);
                    } else if (newCount > 0) {
                        const added = mergedCount - existingCount;
                        if (added > 0) {
                            console.log(`  ${item.name}: ${existingCount} existing + ${added} new = ${mergedCount} total properties`);
                        }
                    }
                }
                
                // Only update description if new one exists and is not empty
                if (item.description) {
                    mergedObject.description = item.description;
                }
                
                // Only update module if new one exists
                if (item.module) {
                    mergedObject.module = item.module;
                }
                
                // Only update sourceUrl if new one exists
                if (item.sourceUrl) {
                    mergedObject.sourceUrl = item.sourceUrl;
                }
                
                // Only add/update accessRules if new one exists
                if (item.accessRules) {
                    mergedObject.accessRules = item.accessRules;
                }
                
                // Track multiple clouds if object appears in multiple places
                const existingClouds = existingObjectData.clouds || [existingObjectData.module].filter(Boolean);
                const newClouds = item.module ? [...existingClouds, item.module] : existingClouds;
                mergedObject.clouds = [...new Set(newClouds)]; // Remove duplicates
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
            
            // 💾 Save file immediately
            await fs.writeFile(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
            
            // Default to "Core Salesforce" instead of "Unknown" for objects without a specific cloud
            const cloudName = item.module && item.module !== 'N/A' ? item.module : 'Core Salesforce';
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
                clouds: mergedObject.clouds,
                // Include access rules if they exist
                accessRules: mergedObject.accessRules || existingIndexEntry?.accessRules
            };
            
            totalObjects++;
        }
        
        processedCount += results.length;
        const progress = Math.round((processedCount / items.length) * 100);
        console.log(`Progress: ${processedCount}/${items.length} (${progress}%) - Chunk ${i + 1}/${itemChunks.length} - ✅ ${results.length} files saved`);
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
    console.log(`✓ This scrape: ${totalObjects} objects saved from ${Object.keys(cloudStats).length} cloud(s)`);
    console.log(`✓ All objects stored in: ${objectsFolder}/[A-Z]/`);
}

