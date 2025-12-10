import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DMOObject {
    name: string;
    description: string;
    sourceUrl: string;
    module: string;
    clouds: string[];
}

interface DMOIndex {
    generated: string;
    totalObjects: number;
    objects: Record<string, {
        file: string;
        description: string;
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
 * Extract DMO object information from the main documentation page
 */
async function fetchDMOList(): Promise<Array<{ name: string; description: string; link: string }>> {
    const baseUrl = 'https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html';
    
    console.log('Fetching DMO list from:', baseUrl);
    
    try {
        const response = await fetch(baseUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const dmoObjects: Array<{ name: string; description: string; link: string }> = [];
        
        // Find all list items that contain DMO definitions
        // The structure is: <li><strong>Name DMO</strong> - Description</li>
        $('ul li').each((_, element) => {
            const $el = $(element);
            const strongTag = $el.find('strong').first();
            
            if (strongTag.length > 0) {
                const fullName = cleanWhitespace(strongTag.text());
                
                // Extract just the DMO name (remove " DMO" suffix if present)
                const name = fullName.replace(/\s+DMO$/, '').trim();
                
                // Get the description (text after the strong tag)
                let description = cleanWhitespace($el.text().replace(fullName, '').trim());
                // Remove leading dash if present
                description = description.replace(/^[-–—]\s*/, '');
                
                // Try to find a link to the detailed page
                const link = $el.find('a').first().attr('href') || '';
                
                if (name && description) {
                    dmoObjects.push({
                        name,
                        description,
                        link
                    });
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
 * Fetch detailed information for a specific DMO (if individual pages exist)
 * For now, we'll use the information from the main page
 */
async function fetchDMODetails(dmo: { name: string; description: string; link: string }): Promise<DMOObject> {
    // For now, we're using the information from the main page
    // If individual DMO pages exist, we can fetch them here
    
    return {
        name: dmo.name,
        description: dmo.description,
        sourceUrl: 'https://developer.salesforce.com/docs/data/data-cloud-dmo-mapping/guide/c360dm-datamodelobjects.html',
        module: 'Data Cloud',
        clouds: ['Data Cloud']
    };
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
        console.log(`\n📁 Using existing directory: ${ssotObjectsFolder}`);
    } catch {
        await fs.mkdir(ssotObjectsFolder, { recursive: true });
        console.log(`\n📁 Created directory: ${ssotObjectsFolder}`);
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
    
    const objectIndex: Record<string, { file: string; description: string; sourceUrl: string }> = {};
    let savedCount = 0;
    
    console.log('\n💾 Saving DMO objects...\n');
    
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
                description: dmoObject.description || existingObject.description,
                sourceUrl: dmoObject.sourceUrl || existingObject.sourceUrl,
                clouds: [...new Set([...(existingObject.clouds || []), ...dmoObject.clouds])]
            }
            : dmoObject;
        
        const objectData = {
            [dmoObject.name]: mergedObject
        };
        
        await fs.writeFile(objectFilePath, JSON.stringify(objectData, null, 2), 'utf-8');
        
        objectIndex[dmoObject.name] = {
            file: `ssot__objects/${firstLetter}/${dmoObject.name}.json`,
            description: dmoObject.description,
            sourceUrl: dmoObject.sourceUrl
        };
        
        savedCount++;
        console.log(`  ✓ ${dmoObject.name}`);
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
            }, {} as Record<string, { file: string; description: string; sourceUrl: string }>)
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
    console.log('🚀 Starting DMO scraper...\n');
    
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
            const dmoDetails = await fetchDMODetails(dmo);
            dmoObjects.push(dmoDetails);
        }
        
        // Save to file system
        await saveDMOObjects(dmoObjects);
        
        console.log('\n✨ DMO scraping complete!\n');
        
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

