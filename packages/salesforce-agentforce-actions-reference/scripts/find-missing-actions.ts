/**
 * Script to find missing actions by comparing source page with index
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ActionIndex {
    version: string;
    totalActions: number;
    generatedAt: string;
    actions: Record<string, {
        name: string;
        file: string;
        description: string;
        propertyCount: number;
        category: string;
        clouds: string[];
        sourceUrl: string;
        apiName: string;
        referenceActionType?: string;
    }>;
}

interface SourceAction {
    name: string;
    sourceUrl: string;
    description: string;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract all action links from the source page
 */
async function extractActionsFromSource(): Promise<SourceAction[]> {
    const url = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
    
    console.log('🌐 Fetching source page...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    
    try {
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(120000);
        page.setDefaultTimeout(120000);
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await delay(5000);
        
        // Scroll to load lazy content
        await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
        await delay(3000);
        
        const html = await page.content();
        const $ = cheerio.load(html);
        
        const actions: SourceAction[] = [];
        const seenUrls = new Set<string>();
        
        // Extract all links that point to action detail pages
        $('a[href*="articleView"]').each((_, el) => {
            const $link = $(el);
            const href = $link.attr('href');
            const text = $link.text().trim();
            
            if (!href || !text) return;
            
            // Convert relative URLs to absolute
            const fullUrl = href.startsWith('http') 
                ? href 
                : new URL(href, url).href;
            
            // Filter out ONLY the main index page and anchor links
            // Allow all other ai.copilot_actions links (they are valid action pages)
            const mainPageUrl = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
            if (fullUrl === mainPageUrl || fullUrl.includes('copilot_actions_ref.htm#')) {
                return; // Skip only main page and anchor links
            }
            
            if (!fullUrl.includes('articleView')) return;
            
            // Skip if we've seen this URL
            if (seenUrls.has(fullUrl)) return;
            seenUrls.add(fullUrl);
            
            // Extract action name from link text
            // Remove prefixes like "B2B Commerce | ", "B2C Commerce | ", etc.
            let actionName = text
                .replace(/^(B2B Commerce|B2C Commerce|Service|Sales|Marketing|Health|Education|Financial Services|Automotive|Field Service|Data Cloud|Agentforce for Service|Public Sector|Nonprofit|Net Zero)\s*\|\s*/i, '')
                .trim();
            
            if (actionName && actionName.length > 2 && actionName.length < 200) {
                // Try to get description from parent or sibling
                let description = '';
                const $parent = $link.closest('li, div, td');
                if ($parent.length) {
                    const parentText = $parent.text().trim();
                    // Try to extract description after the action name
                    const nameIndex = parentText.indexOf(actionName);
                    if (nameIndex >= 0) {
                        const afterName = parentText.substring(nameIndex + actionName.length).trim();
                        // Remove common separators and get first sentence
                        const cleaned = afterName.replace(/^[:\-–—\s]+/, '').split(/[.\n]/)[0].trim();
                        if (cleaned && cleaned.length > 10) {
                            description = cleaned;
                        }
                    }
                }
                
                actions.push({
                    name: actionName,
                    sourceUrl: fullUrl,
                    description: description || ''
                });
            }
        });
        
        // Also check tree items (common pattern in Salesforce help pages)
        $('[role="treeitem"] a[href*="articleView"]').each((_, el) => {
            const $link = $(el);
            const href = $link.attr('href');
            const text = $link.text().trim();
            const title = $link.closest('[role="treeitem"]').attr('title') || '';
            
            if (!href || (!text && !title)) return;
            
            const fullUrl = href.startsWith('http') 
                ? href 
                : new URL(href, url).href;
            
            // Filter out ONLY the main index page and anchor links
            const mainPageUrl = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
            if (fullUrl === mainPageUrl || fullUrl.includes('copilot_actions_ref.htm#')) {
                return; // Skip only main page and anchor links
            }
            
            if (!fullUrl.includes('articleView')) return;
            if (seenUrls.has(fullUrl)) return;
            seenUrls.add(fullUrl);
            
            let actionName = (title || text)
                .replace(/^(B2B Commerce|B2C Commerce|Service|Sales|Marketing|Health|Education|Financial Services|Automotive|Field Service|Data Cloud|Agentforce for Service|Public Sector|Nonprofit|Net Zero)\s*\|\s*/i, '')
                .trim();
            
            if (actionName && actionName.length > 2 && actionName.length < 200) {
                actions.push({
                    name: actionName,
                    sourceUrl: fullUrl,
                    description: ''
                });
            }
        });
        
        // Remove duplicates by URL
        const uniqueActions = actions.filter((action, index, self) =>
            index === self.findIndex(a => a.sourceUrl === action.sourceUrl)
        );
        
        console.log(`✅ Found ${uniqueActions.length} actions in source page`);
        return uniqueActions;
        
    } finally {
        await browser.close();
    }
}

/**
 * Load current index
 */
async function loadIndex(): Promise<ActionIndex> {
    const indexPath = path.join(__dirname, '..', 'src', 'doc', 'index.json');
    const content = await fs.readFile(indexPath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Find missing actions
 */
async function findMissingActions(): Promise<void> {
    console.log('='.repeat(80));
    console.log('🔍 FINDING MISSING ACTIONS');
    console.log('='.repeat(80));
    
    // Load current index
    console.log('\n📚 Loading current index...');
    const index = await loadIndex();
    const indexActionNames = new Set(Object.keys(index.actions));
    const indexUrls = new Set(
        Object.values(index.actions).map(a => a.sourceUrl).filter(Boolean)
    );
    
    console.log(`   Found ${indexActionNames.size} actions in index`);
    
    // Extract actions from source
    console.log('\n🌐 Extracting actions from source page...');
    const sourceActions = await extractActionsFromSource();
    
    // Find missing actions
    const missingActions: SourceAction[] = [];
    const missingByUrl: SourceAction[] = [];
    
    for (const sourceAction of sourceActions) {
        // Check by name (case-insensitive)
        const foundByName = Array.from(indexActionNames).find(
            name => name.toLowerCase() === sourceAction.name.toLowerCase()
        );
        
        // Check by URL
        const foundByUrl = indexUrls.has(sourceAction.sourceUrl);
        
        if (!foundByName && !foundByUrl) {
            missingActions.push(sourceAction);
            missingByUrl.push(sourceAction);
        } else if (!foundByName && foundByUrl) {
            // Same URL but different name - might be a name mismatch
            const existingAction = Object.values(index.actions).find(
                a => a.sourceUrl === sourceAction.sourceUrl
            );
            if (existingAction) {
                console.log(`\n⚠️  Name mismatch:`);
                console.log(`   Source: "${sourceAction.name}"`);
                console.log(`   Index:  "${existingAction.name}"`);
                console.log(`   URL:    ${sourceAction.sourceUrl}`);
            }
        }
    }
    
    // Report results
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));
    console.log(`\nTotal actions in source: ${sourceActions.length}`);
    console.log(`Total actions in index:  ${indexActionNames.size}`);
    console.log(`Missing actions:          ${missingActions.length}`);
    
    if (missingActions.length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log('❌ MISSING ACTIONS');
        console.log('='.repeat(80));
        
        missingActions.forEach((action, idx) => {
            console.log(`\n${idx + 1}. ${action.name}`);
            console.log(`   URL: ${action.sourceUrl}`);
            if (action.description) {
                console.log(`   Description: ${action.description.substring(0, 100)}...`);
            }
        });
        
        // Save missing actions to file
        const outputPath = path.join(__dirname, 'missing-actions.json');
        await fs.writeFile(
            outputPath,
            JSON.stringify(missingActions, null, 2),
            'utf-8'
        );
        console.log(`\n💾 Saved missing actions to: ${outputPath}`);
    } else {
        console.log('\n✅ No missing actions found!');
    }
    
    // Also check for actions in index that might not be in source (orphaned)
    const sourceUrls = new Set(sourceActions.map(a => a.sourceUrl));
    const orphanedActions = Object.values(index.actions).filter(
        action => action.sourceUrl && !sourceUrls.has(action.sourceUrl)
    );
    
    if (orphanedActions.length > 0) {
        console.log('\n' + '='.repeat(80));
        console.log('⚠️  ORPHANED ACTIONS (in index but not in source)');
        console.log('='.repeat(80));
        orphanedActions.forEach((action, idx) => {
            console.log(`\n${idx + 1}. ${action.name}`);
            console.log(`   URL: ${action.sourceUrl}`);
        });
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    findMissingActions()
        .then(() => {
            console.log('\n✅ Analysis complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Error:', error);
            process.exit(1);
        });
}

export { findMissingActions };

