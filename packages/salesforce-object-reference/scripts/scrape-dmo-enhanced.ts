/**
 * Enhanced DMO scraper that fetches detailed information including API name, categories, and fields
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DMOField {
    fieldName: string;
    fieldApiName: string;
    description: string;
    dataType: string;
    dataBundle: string;
}

interface DMOObject {
    name: string;
    apiName?: string;
    description: string;
    categories?: string[];
    primaryKey?: string;
    fields?: DMOField[];
    fieldsCount?: number;
    sourceUrl: string;
    module: string;
    clouds: string[];
}

interface DMOIndex {
    generated: string;
    totalObjects: number;
    objects: Record<string, {
        file: string;
        apiName?: string;
        description: string;
        fieldsCount?: number;
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
 * Examples:
 * - "Account" -> "account-dmo"
 * - "Contact Point Email" -> "contact-point-email-dmo"
 * - "Loyalty Program Member" -> "loyalty-program-member-dmo"
 */
function dmoNameToSlug(dmoName: string): string {
    return dmoName
        .toLowerCase()
        .replace(/\s+/g, '-') + '-dmo';
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
        
        // Find all list items that contain DMO definitions
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
        
        console.log(`Found ${dmoObjects.length} DMO objects`);
        return dmoObjects;
        
    } catch (error) {
        console.error('Error fetching DMO list:', error);
        throw error;
    }
}

/**
 * Fetch detailed DMO information from individual DMO page
 */
async function fetchDMODetails(dmoName: string): Promise<Partial<DMOObject> | null> {
    const slug = dmoNameToSlug(dmoName);
    const url = `https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-${slug}.html`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`  ⚠️  No detail page found (${response.status}), using summary data only`);
            return null;
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract API Name (should be in a code block)
        let apiName = '';
        $('code').each((_, el) => {
            const text = $(el).text().trim();
            if (text.includes('ssot__') && text.includes('__dlm')) {
                apiName = text;
                return false; // break
            }
        });
        
        // Extract categories - look for specific text patterns before the API name
        const categories: string[] = [];
        $('p, div').each((_, el) => {
            const text = $(el).text().trim();
            // Categories are typically single words like "Profile", "Party", "Engagement"
            if (text.length < 30 && !text.includes('DMO') && !text.includes('ssot__')) {
                const words = text.split(/\s+/);
                if (words.length === 1 && words[0].length > 2) {
                    categories.push(words[0]);
                }
            }
        });
        
        // Extract Primary Key (field with "primary key" in description)
        let primaryKey = '';
        
        // Extract fields table
        const fields: DMOField[] = [];
        
        $('table').each((_, table) => {
            const $table = $(table);
            const headers: string[] = [];
            
            // Get headers
            $table.find('thead th, thead td').each((_, th) => {
                headers.push(cleanWhitespace($(th).text()));
            });
            
            // Check if this is the fields table
            if (headers.some(h => h.toLowerCase().includes('field name')) && 
                headers.some(h => h.toLowerCase().includes('field api name'))) {
                
                // Extract rows
                $table.find('tbody tr').each((_, row) => {
                    const cells: string[] = [];
                    $(row).find('td').each((_, cell) => {
                        cells.push(cleanWhitespace($(cell).text()));
                    });
                    
                    if (cells.length >= 4) {
                        const field: DMOField = {
                            fieldName: cells[0] || '',
                            fieldApiName: cells[1] || '',
                            description: cells[2] || '',
                            dataType: cells[3] || '',
                            dataBundle: cells[4] || ''
                        };
                        
                        fields.push(field);
                        
                        // Check if this is the primary key
                        if (field.description.toLowerCase().includes('primary key')) {
                            primaryKey = `${field.fieldName} (${field.fieldApiName})`;
                        }
                    }
                });
            }
        });
        
        return {
            apiName: apiName || undefined,
            categories: categories.length > 0 ? categories : undefined,
            primaryKey: primaryKey || undefined,
            fields: fields.length > 0 ? fields : undefined,
            fieldsCount: fields.length,
            sourceUrl: url
        };
        
    } catch (error) {
        console.log(`  ⚠️  Error fetching details: ${error}`);
        return null;
    }
}

/**
 * Save DMO objects to the file system
 */
async function saveDMOObjects(dmoObjects: DMOObject[]): Promise<void> {
    const docFolder = path.join(__dirname, '../src/doc');
    const ssotObjectsFolder = path.join(docFolder, 'ssot__objects');
    
    // Create ssot__objects folder
    try {
        await fs.access(ssotObjectsFolder);
    } catch {
        await fs.mkdir(ssotObjectsFolder, { recursive: true });
    }
    
    // Create alphabetical folders (A-Z)
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const letter of alphabet) {
        const letterFolder = path.join(ssotObjectsFolder, letter);
        try {
            await fs.access(letterFolder);
        } catch {
            await fs.mkdir(letterFolder, { recursive: true });
        }
    }
    
    const objectIndex: Record<string, { file: string; apiName?: string; description: string; fieldsCount?: number; sourceUrl: string }> = {};
    let savedCount = 0;
    
    for (const dmoObject of dmoObjects) {
        const firstLetter = dmoObject.name[0].toUpperCase();
        const objectFilePath = path.join(ssotObjectsFolder, firstLetter, `${dmoObject.name}.json`);
        
        // Check if object already exists and merge if needed
        let existingObject: DMOObject | null = null;
        try {
            const existingContent = await fs.readFile(objectFilePath, 'utf-8');
            const existingFile = JSON.parse(existingContent);
            existingObject = existingFile[dmoObject.name];
        } catch {
            // File doesn't exist yet
        }
        
        // Merge with existing data
        const mergedObject: DMOObject = existingObject
            ? {
                ...existingObject,
                ...dmoObject,
                clouds: [...new Set([...(existingObject.clouds || []), ...dmoObject.clouds])]
            }
            : dmoObject;
        
        const objectData = {
            [dmoObject.name]: mergedObject
        };
        
        await fs.writeFile(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
        
        objectIndex[dmoObject.name] = {
            file: `ssot__objects/${firstLetter}/${dmoObject.name}.json`,
            apiName: dmoObject.apiName,
            description: dmoObject.description,
            fieldsCount: dmoObject.fieldsCount,
            sourceUrl: dmoObject.sourceUrl
        };
        
        savedCount++;
    }
    
    // Create DMO index
    const dmoIndexPath = path.join(docFolder, 'dmo-index.json');
    const dmoIndexData: DMOIndex = {
        generated: new Date().toISOString(),
        totalObjects: savedCount,
        objects: Object.keys(objectIndex)
            .sort()
            .reduce((acc, key) => {
                acc[key] = objectIndex[key];
                return acc;
            }, {} as Record<string, any>)
    };
    
    await fs.writeFile(dmoIndexPath, JSON.stringify(dmoIndexData, null, 2), 'utf-8');
    
    console.log(`\n✅ Saved ${savedCount} DMO objects`);
    console.log(`📊 Created DMO index: ${dmoIndexPath}`);
    console.log(`📁 Objects stored in: ${ssotObjectsFolder}/[A-Z]/`);
}

/**
 * Main function to scrape DMO documentation
 */
async function scrapeDMO(): Promise<void> {
    console.log('🚀 Starting Enhanced DMO scraper...\n');
    
    try {
        // Fetch list of DMO objects from main page
        const dmoList = await fetchDMOList();
        
        if (dmoList.length === 0) {
            console.warn('⚠️  No DMO objects found');
            return;
        }
        
        // Fetch details for each DMO
        console.log('\n📥 Processing DMO objects...\n');
        const dmoObjects: DMOObject[] = [];
        
        for (const dmo of dmoList) {
            console.log(`Processing: ${dmo.name}`);
            
            // Fetch detailed information
            const details = await fetchDMODetails(dmo.name);
            
            // Build complete DMO object
            const dmoObject: DMOObject = {
                name: dmo.name,
                description: dmo.description,
                sourceUrl: details?.sourceUrl || 'https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html',
                module: 'Data Cloud',
                clouds: ['Data Cloud'],
                ...details
            };
            
            dmoObjects.push(dmoObject);
            
            // Show what we got
            if (dmoObject.apiName) {
                console.log(`  ✓ API Name: ${dmoObject.apiName}`);
            }
            if (dmoObject.fieldsCount && dmoObject.fieldsCount > 0) {
                console.log(`  ✓ Fields: ${dmoObject.fieldsCount}`);
            }
            
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Save to file system
        console.log('\n💾 Saving DMO objects...\n');
        await saveDMOObjects(dmoObjects);
        
        console.log('\n✨ DMO scraping complete!\n');
        
        // Summary statistics
        const withApiName = dmoObjects.filter(d => d.apiName).length;
        const withFields = dmoObjects.filter(d => d.fieldsCount && d.fieldsCount > 0).length;
        const totalFields = dmoObjects.reduce((sum, d) => sum + (d.fieldsCount || 0), 0);
        
        console.log('📊 Summary:');
        console.log(`   Total DMOs: ${dmoObjects.length}`);
        console.log(`   With API Names: ${withApiName}`);
        console.log(`   With Fields: ${withFields}`);
        console.log(`   Total Fields: ${totalFields}`);
        
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

