/**
 * Update action files by re-fetching descriptions AND properties from detail pages
 * Updates actions that have:
 * - Empty properties
 * - "Available in:" descriptions
 * - Wrong sourceUrl (pointing to main index page)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';
import { fetchActionDetailsFromUrl } from './scrape-actions-puppeteer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ActionProperty {
    type: string;
    description: string;
    required?: boolean;
    default?: string;
}

interface AgentforceAction {
    name: string;
    description: string;
    label?: string;
    category?: string;
    clouds?: string[];
    properties: Record<string, ActionProperty>;
    returnType?: string;
    sourceUrl: string;
    module: string;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function needsUpdate(action: AgentforceAction): boolean {
    // Check if properties are empty
    const hasEmptyProperties = !action.properties || Object.keys(action.properties).length === 0;
    
    // Check if description is just "Available in:" text
    const desc = action.description?.toLowerCase() || '';
    const hasBadDescription = desc.startsWith('available in:') ||
                              desc.includes('requires each user') ||
                              (desc.length < 50 && desc.includes('edition'));
    
    // Check if sourceUrl is wrong (pointing to main index page)
    const hasWrongUrl = !action.sourceUrl ||
                       action.sourceUrl.includes('copilot_actions_ref.htm#') ||
                       action.sourceUrl === 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
    
    return hasEmptyProperties || hasBadDescription || hasWrongUrl;
}

async function updateActionDetails(filePath: string, browser: Browser): Promise<boolean> {
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const action: AgentforceAction = JSON.parse(fileContent);
        
        if (!needsUpdate(action)) {
            return false; // Already has good data
        }
        
        // If sourceUrl is wrong, we can't fetch details
        if (!action.sourceUrl || 
            action.sourceUrl.includes('copilot_actions_ref.htm#') ||
            action.sourceUrl === 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5') {
            console.log(`  ⚠️  Skipping "${action.name}" - no valid detail page URL`);
            return false;
        }
        
        console.log(`  Fetching details for: ${action.name}`);
        console.log(`    URL: ${action.sourceUrl}`);
        
        try {
            const updatedAction = await fetchActionDetailsFromUrl(action, action.sourceUrl, browser);
            
            // Check if we got better data
            const gotProperties = Object.keys(updatedAction.properties || {}).length > 0;
            const gotBetterDescription = updatedAction.description &&
                                       !updatedAction.description.toLowerCase().startsWith('available in:') &&
                                       updatedAction.description.length > 30;
            
            if (gotProperties || gotBetterDescription) {
                // Merge updates
                action.description = updatedAction.description || action.description;
                action.properties = updatedAction.properties || action.properties;
                action.returnType = updatedAction.returnType || action.returnType;
                action.sourceUrl = updatedAction.sourceUrl || action.sourceUrl;
                
                await fs.writeFile(filePath, JSON.stringify(action, null, 2), 'utf-8');
                
                const propsCount = Object.keys(action.properties).length;
                const descPreview = action.description.substring(0, 80);
                console.log(`    ✅ Updated: ${descPreview}... (${propsCount} properties)`);
                
                await delay(1000); // Rate limiting
                return true;
            } else {
                console.log(`    ⚠️  No improvements found`);
                return false;
            }
        } catch (error: any) {
            console.log(`    ❌ Error fetching: ${error?.message || error}`);
            return false;
        }
    } catch (error) {
        console.error(`  Error updating ${filePath}:`, error);
        return false;
    }
}

async function updateAllActionDetails(): Promise<void> {
    console.log('Updating action details (descriptions + properties) from detail pages...\n');
    console.log('This will re-fetch details for actions with:\n');
    console.log('  - Empty properties\n');
    console.log('  - "Available in:" descriptions\n');
    console.log('  - Wrong sourceUrl\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
        const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
        const actionsFolder = path.join(srcDocDir, 'actions');
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        let totalUpdated = 0;
        let totalFiles = 0;
        let totalNeedsUpdate = 0;
        
        for (const letter of letters) {
            const letterFolder = path.join(actionsFolder, letter);
            
            try {
                const files = await fs.readdir(letterFolder);
                const jsonFiles = files.filter(f => f.endsWith('.json'));
                
                for (const file of jsonFiles) {
                    totalFiles++;
                    const filePath = path.join(letterFolder, file);
                    
                    // Check if file needs updating
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    const action: AgentforceAction = JSON.parse(fileContent);
                    
                    if (needsUpdate(action)) {
                        totalNeedsUpdate++;
                        console.log(`\n[${totalNeedsUpdate}] Processing: ${action.name}`);
                        const updated = await updateActionDetails(filePath, browser);
                        if (updated) {
                            totalUpdated++;
                        }
                    }
                }
            } catch (error) {
                // Folder doesn't exist, skip
                continue;
            }
        }
        
        console.log(`\n✅ Updated ${totalUpdated} out of ${totalNeedsUpdate} action files that needed updates`);
        console.log(`   Total files checked: ${totalFiles}`);
        console.log('\nNow run: npm run rebuild-index && npm run build');
    } finally {
        await browser.close();
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    updateAllActionDetails().catch(console.error);
}

export { updateAllActionDetails };

