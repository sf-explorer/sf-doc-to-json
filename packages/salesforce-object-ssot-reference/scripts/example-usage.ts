/**
 * Example script showing how to work with DMO (Data Model Objects) data
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

/**
 * Load the DMO index
 */
async function loadDMOIndex(): Promise<DMOIndex> {
    const indexPath = path.join(__dirname, '../../src/doc/dmo-index.json');
    const content = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Load a specific DMO object by name
 */
async function loadDMO(name: string): Promise<DMOObject | null> {
    const docFolder = path.join(__dirname, '../../src/doc');
    const firstLetter = name[0].toUpperCase();
    const objectFilePath = path.join(docFolder, 'ssot__objects', firstLetter, `${name}.json`);
    
    try {
        const content = await fs.readFile(objectFilePath, 'utf-8');
        const data = JSON.parse(content);
        return data[name] || null;
    } catch (error) {
        console.error(`Error loading DMO "${name}":`, error);
        return null;
    }
}

/**
 * Search DMO objects by keyword in name or description
 */
async function searchDMOs(keyword: string): Promise<Array<{ name: string; description: string }>> {
    const index = await loadDMOIndex();
    const lowerKeyword = keyword.toLowerCase();
    
    return Object.entries(index.objects)
        .filter(([name, info]) => 
            name.toLowerCase().includes(lowerKeyword) || 
            info.description.toLowerCase().includes(lowerKeyword)
        )
        .map(([name, info]) => ({
            name,
            description: info.description
        }));
}

/**
 * Get all DMOs by category (based on name patterns)
 */
async function getDMOsByCategory(category: string): Promise<string[]> {
    const index = await loadDMOIndex();
    const lowerCategory = category.toLowerCase();
    
    const categories: Record<string, (name: string) => boolean> = {
        'loyalty': (name) => name.toLowerCase().includes('loyalty'),
        'contact': (name) => name.toLowerCase().startsWith('contact point'),
        'engagement': (name) => name.toLowerCase().includes('engagement'),
        'financial': (name) => name.toLowerCase().includes('financial') || 
                               name.toLowerCase().includes('account') ||
                               name.toLowerCase().includes('investment') ||
                               name.toLowerCase().includes('loan'),
        'survey': (name) => name.toLowerCase().includes('survey'),
        'consent': (name) => name.toLowerCase().includes('consent') || 
                             name.toLowerCase().includes('authorization'),
        'party': (name) => name.toLowerCase().includes('party'),
        'product': (name) => name.toLowerCase().includes('product'),
        'order': (name) => name.toLowerCase().includes('order')
    };
    
    const filter = categories[lowerCategory];
    if (!filter) {
        throw new Error(`Unknown category: ${category}. Available: ${Object.keys(categories).join(', ')}`);
    }
    
    return Object.keys(index.objects).filter(filter);
}

/**
 * Example usage
 */
async function main() {
    console.log('🔍 DMO Data Examples\n');
    
    // 1. Load and display the index summary
    const index = await loadDMOIndex();
    console.log(`📊 Total DMOs: ${index.totalObjects}`);
    console.log(`📅 Generated: ${new Date(index.generated).toLocaleString()}\n`);
    
    // 2. Load a specific DMO
    console.log('📖 Loading "Loyalty Program" DMO:');
    const loyaltyProgram = await loadDMO('Loyalty Program');
    if (loyaltyProgram) {
        console.log(`   Name: ${loyaltyProgram.name}`);
        console.log(`   Description: ${loyaltyProgram.description}`);
        console.log(`   Module: ${loyaltyProgram.module}`);
        console.log(`   Clouds: ${loyaltyProgram.clouds.join(', ')}\n`);
    }
    
    // 3. Search for DMOs
    console.log('🔎 Searching for "email" DMOs:');
    const emailDMOs = await searchDMOs('email');
    emailDMOs.forEach(dmo => {
        console.log(`   - ${dmo.name}: ${dmo.description.substring(0, 80)}...`);
    });
    console.log('');
    
    // 4. Get DMOs by category
    console.log('📂 Loyalty-related DMOs:');
    const loyaltyDMOs = await getDMOsByCategory('loyalty');
    loyaltyDMOs.forEach(name => {
        console.log(`   - ${name}`);
    });
    console.log('');
    
    console.log('📂 Contact Point DMOs:');
    const contactDMOs = await getDMOsByCategory('contact');
    contactDMOs.forEach(name => {
        console.log(`   - ${name}`);
    });
    console.log('');
    
    console.log('📂 Engagement DMOs:');
    const engagementDMOs = await getDMOsByCategory('engagement');
    console.log(`   Found ${engagementDMOs.length} engagement DMOs`);
    console.log('');
    
    // 5. List all DMOs (first 20)
    console.log('📋 First 20 DMOs:');
    const allDMOs = Object.keys(index.objects).slice(0, 20);
    allDMOs.forEach(name => {
        console.log(`   - ${name}`);
    });
    console.log(`   ... and ${index.totalObjects - 20} more\n`);
}

// Run the example
main().catch(console.error);

