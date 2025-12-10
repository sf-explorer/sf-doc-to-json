/**
 * Enhanced DMO scraper with progressive saving and JSON Schema-like structure
 * Matches the standard Salesforce object format
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DMOProperty {
    type: string;
    description: string;
    dataBundle?: string;
}

interface ChildRelationship {
    relatedDMO: string;
    field?: string;
    relationshipType?: string;
    description?: string;
}

interface DMOObject {
    name: string;
    apiName?: string;
    description: string;
    properties: Record<string, DMOProperty>;
    categories?: string[];
    primaryKey?: string;
    childRelationships?: ChildRelationship[];
    sourceUrl: string;
    module: string;
    clouds: string[];
}

interface DMOIndex {
    generated: string;
    totalObjects: number;
    objects: Record<string, {
        name: string;
        apiName?: string;
        file: string;
        description: string;
        fieldCount?: number;
        sourceUrl: string;
    }>;
}

function cleanWhitespace(text: string): string {
    return text
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Convert DMO name to URL slug
 */
function dmoNameToSlug(dmoName: string): string {
    return dmoName
        .toLowerCase()
        .replace(/\s+/g, '-') + '-dmo';
}

/**
 * Normalize data type to standard JSON Schema types
 */
function normalizeDataType(dataType: string): string {
    if (!dataType) return 'string';
    
    const type = dataType.toLowerCase().trim();
    
    const typeMap: Record<string, string> = {
        'text': 'string',
        'number': 'number',
        'datetime': 'dateTime',
        'date': 'date',
        'boolean': 'boolean',
        'picklist': 'picklist',
        'reference': 'reference',
        'id': 'id',
        'string': 'string'
    };
    
    return typeMap[type] || 'string';
}

/**
 * Fetch list of DMOs from the main page
 */
async function fetchDMOList(): Promise<Array<{ name: string; description: string }>> {
    const baseUrl = 'https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html';
    
    console.log('Fetching DMO list from:', baseUrl);
    
    try {
        const response = await fetch(baseUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const dmoObjects: Array<{ name: string; description: string }> = [];
        
        $('ul li').each((_, element) => {
            const $el = $(element);
            const strongTag = $el.find('strong').first();
            
            if (strongTag.length > 0) {
                const fullName = cleanWhitespace(strongTag.text());
                const name = fullName.replace(/\s+DMO$/, '').trim();
                let description = cleanWhitespace($el.text().replace(fullName, '').trim());
                description = description.replace(/^[-–—]\s*/, '');
                
                if (name && description) {
                    dmoObjects.push({ name, description });
                }
            }
        });
        
        console.log(`Found ${dmoObjects.length} DMO objects\n`);
        return dmoObjects;
        
    } catch (error) {
        console.error('Error fetching DMO list:', error);
        throw error;
    }
}

/**
 * Fetch detailed DMO information from individual DMO page
 */
async function fetchDMODetails(dmoName: string): Promise<{ apiName?: string; categories?: string[]; primaryKey?: string; properties: Record<string, DMOProperty>; childRelationships?: Array<{ relatedDMO: string; description?: string }>; sourceUrl: string } | null> {
    const slug = dmoNameToSlug(dmoName);
    const url = `https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-${slug}.html`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return null;
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract API Name
        let apiName = '';
        $('code').each((_, el) => {
            const text = $(el).text().trim();
            if (text.includes('ssot__') && text.includes('__dlm')) {
                apiName = text;
                return false;
            }
        });
        
        // Extract categories
        const categories: string[] = [];
        
        // Extract Primary Key
        let primaryKey = '';
        
        // Extract Related DMOs / Child Relationships
        const childRelationships: Array<{ relatedDMO: string; description?: string }> = [];
        
        // Look for "Related DMOs" or similar sections
        $('h2, h3, h4').each((_, heading) => {
            const headingText = $(heading).text().toLowerCase();
            if (headingText.includes('related') && (headingText.includes('dmo') || headingText.includes('object'))) {
                // Found related DMOs section
                let nextElement = $(heading).next();
                
                // Check if there's a list or table after this heading
                while (nextElement.length && !nextElement.is('h2, h3, h4')) {
                    if (nextElement.is('ul, ol')) {
                        nextElement.find('li').each((_, li) => {
                            const text = cleanWhitespace($(li).text());
                            // Extract DMO names - they usually contain "DMO" or are in links
                            const link = $(li).find('a');
                            if (link.length) {
                                const href = link.attr('href') || '';
                                const linkText = cleanWhitespace(link.text());
                                if (linkText) {
                                    childRelationships.push({
                                        relatedDMO: linkText.replace(/\s+DMO$/, '').trim(),
                                        description: text.replace(linkText, '').replace(/^[-–—:]\s*/, '').trim() || undefined
                                    });
                                }
                            }
                        });
                    } else if (nextElement.is('table')) {
                        // Could be a table with related DMOs
                        nextElement.find('tbody tr').each((_, row) => {
                            const cells = $(row).find('td');
                            if (cells.length >= 1) {
                                const relatedName = cleanWhitespace($(cells[0]).text()).replace(/\s+DMO$/, '').trim();
                                const description = cells.length > 1 ? cleanWhitespace($(cells[1]).text()) : undefined;
                                if (relatedName) {
                                    childRelationships.push({
                                        relatedDMO: relatedName,
                                        description: description || undefined
                                    });
                                }
                            }
                        });
                    } else if (nextElement.is('p')) {
                        // Sometimes related DMOs are mentioned in paragraphs
                        const text = nextElement.text();
                        const matches = text.match(/(\w+(?:\s+\w+)*)\s+DMO/g);
                        if (matches) {
                            matches.forEach(match => {
                                const dmoName = match.replace(/\s+DMO$/, '').trim();
                                if (!childRelationships.some(r => r.relatedDMO === dmoName)) {
                                    childRelationships.push({ relatedDMO: dmoName });
                                }
                            });
                        }
                    }
                    nextElement = nextElement.next();
                }
            }
        });
        
        // Extract fields and convert to properties
        const properties: Record<string, DMOProperty> = {};
        
        $('table').each((_, table) => {
            const $table = $(table);
            const headers: string[] = [];
            
            $table.find('thead th, thead td').each((_, th) => {
                headers.push(cleanWhitespace($(th).text()));
            });
            
            const headersLower = headers.map(h => h.toLowerCase());
            
            // Check if this is a field properties table
            if (headersLower.some(h => h.includes('field name')) && 
                headersLower.some(h => h.includes('field api name'))) {
                
                $table.find('tbody tr').each((_, row) => {
                    const cells: string[] = [];
                    $(row).find('td').each((_, cell) => {
                        cells.push(cleanWhitespace($(cell).text()));
                    });
                    
                    if (cells.length >= 4) {
                        const fieldName = cells[0] || '';
                        const fieldApiName = cells[1] || '';
                        const description = cells[2] || '';
                        const dataType = cells[3] || '';
                        const dataBundle = cells[4] || '';
                        
                        if (fieldApiName) {
                            const property: DMOProperty = {
                                type: normalizeDataType(dataType),
                                description: description
                            };
                            
                            if (dataBundle) {
                                property.dataBundle = dataBundle;
                            }
                            
                            properties[fieldApiName] = property;
                            
                            // Check if this is the primary key
                            if (description.toLowerCase().includes('primary key')) {
                                primaryKey = fieldApiName;
                            }
                        }
                    }
                });
            }
            // Check if this is a relationship table
            else if (headersLower.some(h => h.includes('related object'))) {
                const relatedObjectIdx = headersLower.findIndex(h => h.includes('related object'));
                const relatedFieldIdx = headersLower.findIndex(h => h.includes('related field'));
                const relationshipTypeIdx = headersLower.findIndex(h => h.includes('relationship'));
                
                $table.find('tbody tr').each((_, row) => {
                    const cells: string[] = [];
                    $(row).find('td').each((_, cell) => {
                        cells.push(cleanWhitespace($(cell).text()));
                    });
                    
                    if (cells.length > relatedObjectIdx && cells[relatedObjectIdx]) {
                        const relatedObject = cells[relatedObjectIdx];
                        const relatedField = relatedFieldIdx !== -1 ? cells[relatedFieldIdx] : undefined;
                        const relationshipType = relationshipTypeIdx !== -1 ? cells[relationshipTypeIdx] : undefined;
                        
                        // Skip self-references and duplicates
                        if (relatedObject && 
                            relatedObject.toLowerCase() !== dmoName.toLowerCase() &&
                            !childRelationships.some(r => r.relatedDMO === relatedObject)) {
                            
                            childRelationships.push({
                                relatedDMO: relatedObject,
                                field: relatedField,
                                relationshipType: relationshipType
                            });
                        }
                    }
                });
            }
        });
        
        return {
            apiName: apiName || undefined,
            categories: categories.length > 0 ? categories : undefined,
            primaryKey: primaryKey || undefined,
            childRelationships: childRelationships.length > 0 ? childRelationships : undefined,
            properties,
            sourceUrl: url
        };
        
    } catch (error) {
        return null;
    }
}

/**
 * Save a single DMO object immediately after processing
 */
async function saveDMOObject(dmoObject: DMOObject, ssotObjectsFolder: string): Promise<void> {
    const firstLetter = dmoObject.name[0].toUpperCase();
    const objectFilePath = path.join(ssotObjectsFolder, firstLetter, `${dmoObject.name}.json`);
    
    // Check if object already exists and merge if needed
    let existingObject: DMOObject | null = null;
    try {
        const existingContent = await fs.readFile(objectFilePath, 'utf-8');
        const existingFile = JSON.parse(existingContent);
        // Get existing object (could be keyed by name or API name)
        existingObject = existingFile[dmoObject.name] || existingFile[dmoObject.apiName || ''] || null;
    } catch {
        // File doesn't exist yet
    }
    
    // Merge with existing data
    const mergedObject: DMOObject = existingObject
        ? {
            ...existingObject,
            ...dmoObject,
            properties: {
                ...existingObject.properties,
                ...dmoObject.properties
            },
            clouds: [...new Set([...(existingObject.clouds || []), ...dmoObject.clouds])]
        }
        : dmoObject;
    
    // Use API name as key if available, otherwise use name
    const objectKey = dmoObject.apiName || dmoObject.name;
    const objectData = {
        [objectKey]: mergedObject
    };
    
    await fs.writeFile(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
}

/**
 * Main function to scrape DMO documentation with progressive saving
 */
async function scrapeDMO(): Promise<void> {
    console.log('🚀 Starting Enhanced DMO scraper (Progressive Save + JSON Schema format)...\n');
    
    try {
        // Setup folders
        const docFolder = path.join(__dirname, '../src/doc');
        const ssotObjectsFolder = path.join(docFolder, 'objects');
        
        try {
            await fs.access(ssotObjectsFolder);
        } catch {
            await fs.mkdir(ssotObjectsFolder, { recursive: true });
        }
        
        // Create alphabetical folders
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        for (const letter of alphabet) {
            const letterFolder = path.join(ssotObjectsFolder, letter);
            try {
                await fs.access(letterFolder);
            } catch {
                await fs.mkdir(letterFolder, { recursive: true });
            }
        }
        
        // Fetch list of DMO objects
        const dmoList = await fetchDMOList();
        
        if (dmoList.length === 0) {
            console.warn('⚠️  No DMO objects found');
            return;
        }
        
        console.log('📥 Processing and saving DMO objects progressively...\n');
        
        const objectIndex: Record<string, { name: string; apiName?: string; file: string; description: string; fieldCount?: number; sourceUrl: string }> = {};
        let processedCount = 0;
        let withApiName = 0;
        let withFields = 0;
        let totalFields = 0;
        
        // Process each DMO and save immediately
        for (const dmo of dmoList) {
            console.log(`[${processedCount + 1}/${dmoList.length}] Processing: ${dmo.name}`);
            
            // Fetch detailed information
            const details = await fetchDMODetails(dmo.name);
            
            // Build complete DMO object
            const dmoObject: DMOObject = {
                name: dmo.name,
                description: dmo.description,
                properties: {},
                sourceUrl: details?.sourceUrl || 'https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html',
                module: 'Data Cloud',
                clouds: ['Data Cloud']
            };
            
            if (details) {
                if (details.apiName) {
                    dmoObject.apiName = details.apiName;
                    withApiName++;
                }
                if (details.categories) {
                    dmoObject.categories = details.categories;
                }
                if (details.primaryKey) {
                    dmoObject.primaryKey = details.primaryKey;
                }
                if (details.childRelationships && details.childRelationships.length > 0) {
                    dmoObject.childRelationships = details.childRelationships;
                }
                if (details.properties && Object.keys(details.properties).length > 0) {
                    dmoObject.properties = details.properties;
                    withFields++;
                    totalFields += Object.keys(details.properties).length;
                }
                dmoObject.sourceUrl = details.sourceUrl;
            }
            
            // Save immediately
            await saveDMOObject(dmoObject, ssotObjectsFolder);
            
            // Update index - use API name as key if available, otherwise use name
            const indexKey = dmoObject.apiName || dmo.name;
            const firstLetter = dmo.name[0].toUpperCase();
            objectIndex[indexKey] = {
                name: dmo.name,
                apiName: dmoObject.apiName,
                file: `objects/${firstLetter}/${dmo.name}.json`,
                description: dmo.description,
                fieldCount: Object.keys(dmoObject.properties).length,
                sourceUrl: dmoObject.sourceUrl
            };
            
            // Show progress
            if (dmoObject.apiName) {
                console.log(`  ✓ API: ${dmoObject.apiName}`);
            }
            const fieldCount = Object.keys(dmoObject.properties).length;
            if (fieldCount > 0) {
                console.log(`  ✓ Fields: ${fieldCount}`);
            }
            if (dmoObject.childRelationships && dmoObject.childRelationships.length > 0) {
                console.log(`  ✓ Related DMOs: ${dmoObject.childRelationships.length}`);
            }
            console.log(`  ✓ Saved`);
            
            processedCount++;
            
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Save index
        console.log('\n💾 Creating DMO index...\n');
        const dmoIndexPath = path.join(docFolder, 'index.json');
        const dmoIndexData: DMOIndex = {
            generated: new Date().toISOString(),
            totalObjects: processedCount,
            objects: Object.keys(objectIndex)
                .sort()
                .reduce((acc, key) => {
                    acc[key] = objectIndex[key];
                    return acc;
                }, {} as Record<string, any>)
        };
        
        await fs.writeFile(dmoIndexPath, JSON.stringify(dmoIndexData, null, 2), 'utf-8');
        
        // Post-process: Convert display names to API names in childRelationships
        console.log('\n🔄 Converting relationship names to API names...\n');
        const displayNameToApiName: Record<string, string> = {};
        
        // Build mapping from display name to API name
        for (const [apiName, indexEntry] of Object.entries(objectIndex)) {
            if (indexEntry.apiName) {
                displayNameToApiName[indexEntry.name] = indexEntry.apiName;
            }
        }
        
        // Update all object files with API names in relationships
        let updatedRelationships = 0;
        for (const [apiName, indexEntry] of Object.entries(objectIndex)) {
            const objectFilePath = path.join(docFolder, indexEntry.file);
            
            try {
                const fileContent = await fs.readFile(objectFilePath, 'utf-8');
                const fileData = JSON.parse(fileContent);
                const objectKey = Object.keys(fileData)[0];
                const objectData = fileData[objectKey];
                
                if (objectData.childRelationships && Array.isArray(objectData.childRelationships)) {
                    let updated = false;
                    
                    for (const relationship of objectData.childRelationships) {
                        const displayName = relationship.relatedDMO;
                        const relatedApiName = displayNameToApiName[displayName];
                        
                        if (relatedApiName && relatedApiName !== displayName) {
                            relationship.relatedDMO = relatedApiName;
                            updated = true;
                        }
                    }
                    
                    if (updated) {
                        await fs.writeFile(objectFilePath, JSON.stringify(fileData, null, 2), 'utf-8');
                        updatedRelationships++;
                    }
                }
            } catch (error) {
                console.warn(`  ⚠️  Could not update relationships for ${indexEntry.name}`);
            }
        }
        
        console.log(`✓ Updated ${updatedRelationships} objects with API names in relationships\n`);
        
        console.log('✨ DMO scraping complete!\n');
        console.log('📊 Summary:');
        console.log(`   Total DMOs: ${processedCount}`);
        console.log(`   With API Names: ${withApiName}`);
        console.log(`   With Fields: ${withFields}`);
        console.log(`   Total Fields: ${totalFields}`);
        console.log(`\n📁 Objects stored in: ${ssotObjectsFolder}/[A-Z]/`);
        console.log(`📊 Index: ${dmoIndexPath}`);
        
    } catch (error) {
        console.error('❌ Error during DMO scraping:', error);
        throw error;
    }
}

// Run the scraper
scrapeDMO().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});

