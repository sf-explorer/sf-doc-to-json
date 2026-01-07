/**
 * Update descriptions in existing action files by re-fetching from detail pages
 * Only updates actions that have "Available in:" as their description
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AgentforceAction {
    name: string;
    description: string;
    label?: string;
    category?: string;
    clouds?: string[];
    properties: Record<string, any>;
    returnType?: string;
    sourceUrl: string;
    module: string;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch enhanced description from action detail page
 */
async function fetchDescriptionFromDetailPage(action: AgentforceAction): Promise<string | null> {
    if (!action.sourceUrl || action.sourceUrl.includes('copilot_actions_ref.htm#')) {
        return null; // No detail page URL
    }
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(30000);
        
        await page.goto(action.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(3000); // Increased wait time for dynamic content
        
        // Comprehensive strategy to find the real description
        try {
            const descriptionText = await page.evaluate(() => {
                const main = document.querySelector('main, article, [role="main"]');
                if (!main) return '';
                
                // Get all paragraphs in the main content area
                const paragraphs = Array.from(main.querySelectorAll('p'));
                
                // Filter out paragraphs that are clearly not the description
                const isDescriptionParagraph = (text: string): boolean => {
                    const lower = text.toLowerCase();
                    // Skip "Available in:" patterns
                    if (lower.startsWith('available in:') || 
                        lower.includes('requires each user') ||
                        lower.includes('edition') ||
                        lower.includes('cookie') ||
                        lower.includes('privacy')) {
                        return false;
                    }
                    // Must be substantial and look like a description
                    if (text.length < 30 || text.length > 1000) {
                        return false;
                    }
                    // Look for action verbs that indicate a description
                    const actionVerbs = ['finds', 'creates', 'associates', 'generates', 'updates', 'deletes', 
                                        'sends', 'retrieves', 'validates', 'processes', 'executes', 'performs'];
                    const firstWord = text.split(/\s+/)[0]?.toLowerCase();
                    if (actionVerbs.some(verb => firstWord?.startsWith(verb))) {
                        return true;
                    }
                    // If it's a substantial paragraph that doesn't match exclusion patterns, consider it
                    return text.length > 50;
                };
                
                // Try to find the description by looking for the h1 title first
                const h1 = main.querySelector('h1');
                if (h1) {
                    // Find the first substantial paragraph after the h1
                    let foundH1 = false;
                    for (const p of paragraphs) {
                        if (!foundH1) {
                            // Check if this paragraph comes after the h1
                            if (h1.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) {
                                foundH1 = true;
                            }
                        }
                        if (foundH1) {
                            const text = p.textContent?.trim() || '';
                            if (isDescriptionParagraph(text)) {
                                return text;
                            }
                        }
                    }
                }
                
                // Fallback: check all paragraphs and find the best match
                for (const p of paragraphs) {
                    const text = p.textContent?.trim() || '';
                    if (isDescriptionParagraph(text)) {
                        return text;
                    }
                }
                
                return '';
            });
            
            if (descriptionText && descriptionText.length > 20) {
                return descriptionText.substring(0, 500);
            }
        } catch (e) {
            // Fall back to original strategy if evaluation fails
        }
        
        // Fallback: Try multiple strategies to find the real description
        const descriptionSelectors = [
            'main p:first-of-type',
            'article p:first-of-type',
            '[role="main"] p:first-of-type',
            '.content p:first-of-type',
            'main > p',
            'article > p',
            '.slds-text-longform p:first-of-type',
            'div[class*="content"] p:first-of-type'
        ];
        
        for (const selector of descriptionSelectors) {
            try {
                const descElement = await page.$(selector);
                if (descElement) {
                    const text = await descElement.evaluate(el => el.textContent?.trim() || '');
                    // Filter out "Available in:" patterns
                    if (text && 
                        !text.toLowerCase().startsWith('available in:') &&
                        !text.toLowerCase().includes('requires each user') &&
                        text.length > 20 &&
                        text.length < 1000) {
                        return text.substring(0, 500);
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        return null;
    } catch (error) {
        console.log(`    Error fetching: ${error}`);
        return null;
    } finally {
        await browser.close();
    }
}

async function updateDescriptionInFile(filePath: string): Promise<boolean> {
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const action: AgentforceAction = JSON.parse(fileContent);
        const currentDesc = action.description || '';
        
        // Only update if description is "Available in:" text
        if (currentDesc.toLowerCase().startsWith('available in:') ||
            currentDesc.toLowerCase().includes('requires each user') ||
            (currentDesc.length < 50 && currentDesc.toLowerCase().includes('edition'))) {
            
            console.log(`  Fetching description for: ${action.name}`);
            const newDescription = await fetchDescriptionFromDetailPage(action);
            
            if (newDescription && newDescription !== currentDesc) {
                action.description = newDescription;
                await fs.writeFile(filePath, JSON.stringify(action, null, 2), 'utf-8');
                console.log(`    ✅ Updated: ${newDescription.substring(0, 80)}...`);
                await delay(1000); // Rate limiting
                return true;
            } else {
                console.log(`    ⚠️  Could not find better description`);
            }
        }
        
        return false;
    } catch (error) {
        console.error(`  Error updating ${filePath}:`, error);
        return false;
    }
}

async function updateAllDescriptions(): Promise<void> {
    console.log('Updating descriptions in action files...\n');
    console.log('This will re-fetch descriptions from detail pages for actions with "Available in:" text.\n');
    
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const actionsFolder = path.join(srcDocDir, 'actions');
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let totalUpdated = 0;
    let totalFiles = 0;
    let totalChecked = 0;
    
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
                
                if (action && action.description) {
                    const desc = action.description.toLowerCase();
                    if (desc.startsWith('available in:') ||
                        desc.includes('requires each user') ||
                        (desc.length < 50 && desc.includes('edition'))) {
                        totalChecked++;
                        console.log(`\n[${totalChecked}] Processing: ${actionName}`);
                        const updated = await updateDescriptionInFile(filePath);
                        if (updated) {
                            totalUpdated++;
                        }
                    }
                }
            }
        } catch (error) {
            // Folder doesn't exist, skip
            continue;
        }
    }
    
    console.log(`\n✅ Updated ${totalUpdated} out of ${totalChecked} action files that needed description updates`);
    console.log(`   Total files checked: ${totalFiles}`);
    console.log('\nNow run: npm run rebuild-index && npm run build');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    updateAllDescriptions().catch(console.error);
}

export { updateAllDescriptions };

