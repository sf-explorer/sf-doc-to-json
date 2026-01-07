/**
 * Puppeteer + Cheerio scraper for Salesforce Agentforce standard actions
 * Uses Puppeteer to browse (handle JavaScript-rendered content) and Cheerio to parse HTML
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

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

interface ActionIndex {
    version?: string;
    generatedAt: string;
    totalActions: number;
    actions: Record<string, {
        name: string;
        file: string;
        description: string;
        propertyCount?: number;
        category?: string;
        clouds?: string[];
        sourceUrl: string;
        apiName: string; // Required - all actions must have API Name
        referenceActionType?: string;
    }>;
}

interface ProgressState {
    processedActions: string[];
    totalActions: number;
    lastUpdated: string;
    startTime: string;
}

function cleanWhitespace(text: string): string {
    return text
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Delay helper function (replaces deprecated waitForTimeout)
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate abbreviated slug for IT Service actions
 * Example: "Create Incident Resolution Summary" -> "createincdtresltionsumry"
 */
function generateITServiceSlug(actionName: string): string {
    const lower = actionName.toLowerCase();
    
    // Common abbreviations for IT Service actions (order matters - longer words first)
    const abbreviations: Record<string, string> = {
        'resolution': 'resltion',
        'incident': 'incdt',
        'summary': 'sumry',
        'problem': 'prblm',
        'create': 'create',
        'check': 'check',
        'root': 'root',
        'cause': 'cause'
    };
    
    // Replace common words with abbreviations (using word boundaries)
    let slug = lower;
    for (const [word, abbrev] of Object.entries(abbreviations)) {
        // Use word boundaries to match whole words only
        slug = slug.replace(new RegExp(`\\b${word}\\b`, 'gi'), abbrev);
    }
    
    // Remove spaces and special characters
    slug = slug.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    
    return slug;
}

/**
 * Generate abbreviated slug for Financial Services Cloud (FSC) actions
 * Example: "Create Case for Request Loan Payoff Statement" -> "create_case_loan_payoff"
 * Example: "Create Case for Change Billing Cycle" -> "create_case_chng_blng_cycle"
 */
function generateFSCSlug(actionName: string): string {
    const lower = actionName.toLowerCase();
    
    // Common abbreviations for FSC actions (order matters - longer words first)
    const abbreviations: Record<string, string> = {
        'billing': 'blng',
        'change': 'chng',
        'account': 'acct',
        'address': 'addr',
        'settings': 'sttngs',
        'statement': '', // Remove "statement" as it's often redundant in FSC URLs
        'request': '', // Remove "request" as it's often redundant
        'details': 'dtls',
        'financial': 'fin',
        'insurance': 'ins',
        'policyholder': 'plcyhldr',
        'participant': 'prtcpnt'
    };
    
    // Words to remove entirely (common filler words)
    const wordsToRemove = ['for', 'and', 'the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by'];
    
    // Replace abbreviations first
    let slug = lower;
    for (const [word, abbrev] of Object.entries(abbreviations)) {
        slug = slug.replace(new RegExp(`\\b${word}\\b`, 'gi'), abbrev || '');
    }
    
    // Remove filler words
    for (const word of wordsToRemove) {
        slug = slug.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    }
    
    // Split into words and filter out empty strings
    const words = slug.split(/\s+/).filter(w => w.length > 0);
    
    // Join with underscores and remove special characters
    slug = words.join('_').replace(/[^a-z0-9_]/g, '');
    
    // Clean up multiple underscores
    slug = slug.replace(/_+/g, '_').replace(/^_|_$/g, '');
    
    return slug;
}

/**
 * Extract category from action name, description, and clouds
 */
function extractCategory(actionName: string, description: string, clouds: string[]): string {
    const descLower = description.toLowerCase();
    const nameLower = actionName.toLowerCase();
    
    // First check for explicit mentions in description
    if (descLower.includes('agentforce for service')) {
        return 'Agentforce for Service';
    }
    if (descLower.includes('ai agent for employees')) {
        return 'AI Agent for Employees';
    }
    
    // Map clouds to categories
    const cloudToCategory: Record<string, string> = {
        'Agentforce for Service': 'Agentforce for Service',
        'AI Agent for Employees': 'AI Agent for Employees',
        'Public Sector Cloud': 'Public Sector',
        'Automotive Cloud': 'Automotive',
        'Health Cloud': 'Health',
        'Financial Services Cloud': 'Financial Services',
        'Education Cloud': 'Education',
        'Manufacturing Cloud': 'Manufacturing',
        'Nonprofit Cloud': 'Nonprofit',
        'Field Service Lightning': 'Field Service',
        'Scheduler': 'Scheduler',
        'Loyalty': 'Loyalty',
        'Commerce Cloud': 'Commerce',
        'Marketing Cloud': 'Marketing',
        'Sales Cloud': 'Sales',
        'Service Cloud': 'Service',
        'Experience Cloud': 'Experience',
        'Data Cloud': 'Data Cloud',
        'Net Zero Cloud': 'Net Zero',
        'Energy and Utilities Cloud': 'Energy & Utilities',
        'Consumer Goods Cloud': 'Consumer Goods',
        'Revenue Lifecycle Management': 'Revenue',
    };
    
    // Use cloud to determine category if available
    for (const cloud of clouds) {
        if (cloudToCategory[cloud]) {
            return cloudToCategory[cloud];
        }
    }
    
    // Check action name for patterns
    if (nameLower.includes('automotive') || nameLower.includes('vehicle')) {
        return 'Automotive';
    }
    if (nameLower.includes('health') || nameLower.includes('patient') || nameLower.includes('fhir') || nameLower.includes('medical')) {
        return 'Health';
    }
    if (nameLower.includes('financial') || nameLower.includes('account') || nameLower.includes('loan') || nameLower.includes('payment')) {
        return 'Financial Services';
    }
    if (nameLower.includes('education') || nameLower.includes('campus') || nameLower.includes('student') || nameLower.includes('academic')) {
        return 'Education';
    }
    if (nameLower.includes('public sector') || nameLower.includes('complaint') || nameLower.includes('regulatory') || nameLower.includes('violation')) {
        return 'Public Sector';
    }
    if (nameLower.includes('nonprofit') || nameLower.includes('philanthropic') || nameLower.includes('fundraising')) {
        return 'Nonprofit';
    }
    if (nameLower.includes('manufacturing') || nameLower.includes('factory')) {
        return 'Manufacturing';
    }
    if (nameLower.includes('commerce') || nameLower.includes('cart') || nameLower.includes('order') || nameLower.includes('product')) {
        return 'Commerce';
    }
    if (nameLower.includes('field service') || nameLower.includes('appointment') || nameLower.includes('service resource')) {
        return 'Field Service';
    }
    if (nameLower.includes('scheduler') || nameLower.includes('schedule')) {
        return 'Scheduler';
    }
    if (nameLower.includes('loyalty') || nameLower.includes('promotion')) {
        return 'Loyalty';
    }
    if (nameLower.includes('marketing') || nameLower.includes('campaign')) {
        return 'Marketing';
    }
    if (nameLower.includes('sales') || nameLower.includes('opportunity') || nameLower.includes('quote') || nameLower.includes('lead')) {
        return 'Sales';
    }
    if (nameLower.includes('service') || nameLower.includes('case') || nameLower.includes('incident') || nameLower.includes('problem')) {
        return 'Service';
    }
    
    // Check description for edition mentions
    if (descLower.includes('enterprise') || descLower.includes('unlimited') || descLower.includes('performance') || descLower.includes('developer edition')) {
        return 'Standard';
    }
    
    return 'Standard'; // Default to Standard instead of Uncategorized
}

/**
 * Extract clouds from action description
 * Looks for patterns like "Available in: Financial Services Cloud", "Health Cloud", etc.
 */
/**
 * Infer API Name from action name (PascalCase conversion)
 * Example: "Get Most Recent Orders" -> "GetMostRecentOrders"
 */
function inferApiNameFromActionName(actionName: string): string {
    return actionName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

function extractClouds(description: string): string[] {
    const clouds: string[] = [];
    const descLower = description.toLowerCase();
    
    // First, check for "Agentforce for [Cloud]" patterns (more specific)
    const agentforcePatterns = [
        { pattern: /agentforce for (?:public sector|public sector cloud)/i, name: 'Public Sector Cloud' },
        { pattern: /agentforce for automotive/i, name: 'Automotive Cloud' },
        { pattern: /agentforce for health cloud/i, name: 'Health Cloud' },
        { pattern: /agentforce for service/i, name: 'Agentforce for Service' },
        { pattern: /agentforce for financial services/i, name: 'Financial Services Cloud' },
        { pattern: /agentforce for education/i, name: 'Education Cloud' },
        { pattern: /agentforce for manufacturing/i, name: 'Manufacturing Cloud' },
        { pattern: /agentforce for nonprofit/i, name: 'Nonprofit Cloud' },
    ];
    
    for (const { pattern, name } of agentforcePatterns) {
        if (pattern.test(description)) {
            clouds.push(name);
        }
    }
    
    // If we found Agentforce-specific clouds, return them (don't add generic ones)
    if (clouds.length > 0) {
        return clouds;
    }
    
    // List of known Salesforce clouds (generic patterns)
    const cloudPatterns = [
        { pattern: /financial services cloud/i, name: 'Financial Services Cloud' },
        { pattern: /health cloud/i, name: 'Health Cloud' },
        { pattern: /service cloud/i, name: 'Service Cloud' },
        { pattern: /sales cloud/i, name: 'Sales Cloud' },
        { pattern: /marketing cloud/i, name: 'Marketing Cloud' },
        { pattern: /commerce cloud/i, name: 'Commerce Cloud' },
        { pattern: /experience cloud/i, name: 'Experience Cloud' },
        { pattern: /education cloud/i, name: 'Education Cloud' },
        { pattern: /manufacturing cloud/i, name: 'Manufacturing Cloud' },
        { pattern: /consumer goods cloud/i, name: 'Consumer Goods Cloud' },
        { pattern: /automotive cloud/i, name: 'Automotive Cloud' },
        { pattern: /energy and utilities cloud/i, name: 'Energy and Utilities Cloud' },
        { pattern: /nonprofit cloud/i, name: 'Nonprofit Cloud' },
        { pattern: /public sector cloud/i, name: 'Public Sector Cloud' },
        { pattern: /public sector/i, name: 'Public Sector Cloud' },
        { pattern: /net zero cloud/i, name: 'Net Zero Cloud' },
        { pattern: /data cloud/i, name: 'Data Cloud' },
        { pattern: /revenue lifecycle management/i, name: 'Revenue Lifecycle Management' },
        { pattern: /field service/i, name: 'Field Service Lightning' },
        { pattern: /scheduler/i, name: 'Scheduler' },
        { pattern: /loyalty/i, name: 'Loyalty' },
        { pattern: /agentforce for service/i, name: 'Agentforce for Service' },
        { pattern: /ai agent for employees/i, name: 'AI Agent for Employees' },
    ];
    
    for (const { pattern, name } of cloudPatterns) {
        if (pattern.test(description) && !clouds.includes(name)) {
            clouds.push(name);
        }
    }
    
    // Only default to Core Salesforce if:
    // 1. No cloud patterns found AND
    // 2. Mentions standard editions (Enterprise, Performance, Unlimited, Developer) AND
    // 3. Doesn't mention any add-on or specific cloud
    if (clouds.length === 0) {
        const hasStandardEditions = descLower.includes('enterprise') || 
                                   descLower.includes('unlimited') || 
                                   descLower.includes('performance') || 
                                   descLower.includes('developer edition');
        const hasAddon = descLower.includes('add-on') || 
                        descLower.includes('addon') ||
                        descLower.includes('edition');
        
        // If it mentions standard editions but no add-on, it's Core Salesforce
        if (hasStandardEditions && !hasAddon) {
            clouds.push('Core Salesforce');
        } else if (hasStandardEditions && hasAddon) {
            // Has editions and add-on but we didn't match a cloud - might be a new cloud
            // Leave empty or default to Core Salesforce
            clouds.push('Core Salesforce');
        } else {
            // No clear indication - default to Core Salesforce
            clouds.push('Core Salesforce');
        }
    }
    
    return clouds.length > 0 ? clouds : ['Core Salesforce'];
}

/**
 * Fetch actions using Puppeteer to handle JavaScript-rendered content
 */
async function fetchActionsWithPuppeteer(): Promise<AgentforceAction[]> {
    const url = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
    
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set longer timeouts
        page.setDefaultNavigationTimeout(120000); // 2 minutes
        page.setDefaultTimeout(120000);
        
        console.log('Navigating to:', url);
        try {
            await page.goto(url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 120000 
            });
        } catch (error: any) {
            if (error.message.includes('timeout') || error.message.includes('ERR_TIMED_OUT')) {
                console.log('Initial navigation timed out, but page may have loaded. Continuing...');
                // Page might still be usable even if timeout occurred
            } else {
                throw error;
            }
        }
        
        // Wait for content to load
        console.log('Waiting for page to load...');
        await delay(5000);
        
        // Try to accept cookies if present
        try {
            console.log('Checking for cookie dialog...');
            // Try to find accept button using various methods
            const acceptButton = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(btn => {
                    const text = btn.textContent?.toUpperCase() || '';
                    return text.includes('ACCEPT') || text.includes('ACCEPT ALL');
                }) || null;
            });
            
            if (acceptButton && acceptButton.asElement()) {
                console.log('Found cookie button, clicking...');
                await acceptButton.asElement()!.click();
                await delay(2000);
            }
        } catch (e) {
            console.log('No cookie button found or error clicking:', e);
        }
        
        // Scroll to load lazy-loaded content
        console.log('Scrolling to load content...');
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
        
        // Get the HTML content
        const html = await page.content();
        
        // Save HTML for debugging
        const debugPath = path.join(__dirname, 'page-debug.html');
        await fs.writeFile(debugPath, html, 'utf-8');
        console.log(`Saved HTML to: ${debugPath}`);
        
        // Use Puppeteer's DOM API directly instead of cheerio
        const actions: AgentforceAction[] = [];
        
        // Method 1: Look for tables using Puppeteer's DOM API
        console.log('Searching for tables...');
        const tables = await page.$$('table');
        console.log(`Found ${tables.length} tables`);
        
        for (const table of tables) {
            try {
                const rows = await table.$$('tr');
                
                for (const row of rows) {
                    try {
                        const cells = await row.$$eval('td, th', (elements) => 
                            elements.map(el => el.textContent?.trim() || '').filter(text => text.length > 0)
                        );
                        
                        if (cells.length >= 2) {
                            const actionName = cells[0] || '';
                            const description = cells[1] || cells.slice(1).join(' ') || '';
                            
                            if (actionName && 
                                actionName.length > 2 && 
                                actionName.length < 100 &&
                                !actionName.toLowerCase().includes('action name') &&
                                !actionName.toLowerCase().includes('description') &&
                                !actionName.toLowerCase().includes('parameter') &&
                                !actionName.toLowerCase().includes('header')) {
                                // Extract clouds first, then category
                                const clouds = extractClouds(description);
                                const category = extractCategory(actionName, description, clouds);
                                
                                // Table rows don't have links - set empty sourceUrl (no detail page available)
                                actions.push({
                                    name: actionName,
                                    description: description,
                                    category: category,
                                    clouds: clouds,
                                    properties: {},
                                    sourceUrl: '', // No link found in table - empty string instead of copilot page
                                    module: 'Agentforce'
                                });
                            }
                        }
                    } catch (e) {
                        // Skip this row if there's an error
                        continue;
                    }
                }
            } catch (e) {
                // Skip this table if there's an error
                continue;
            }
        }
        
        // Also try cheerio as fallback for additional parsing
        const $ = cheerio.load(html);
        
        // Method 2b: Look for definition lists using cheerio
        console.log('Searching for definition lists with cheerio...');
        $('dl').each((_, dl) => {
            const $dl = $(dl);
            let currentAction: Partial<AgentforceAction> | null = null;
            
            $dl.find('dt, dd').each((_, element) => {
                const $el = $(element);
                const text = cleanWhitespace($el.text());
                
                if ($el.is('dt')) {
                    if (currentAction && currentAction.name) {
                        // No link extraction for this method - set empty sourceUrl
                        actions.push({
                            name: currentAction.name,
                            description: currentAction.description || '',
                            properties: currentAction.properties || {},
                            sourceUrl: '', // No link found - empty string instead of copilot page
                            module: 'Agentforce'
                        });
                    }
                    currentAction = { name: text, description: '', properties: {} };
                } else if ($el.is('dd') && currentAction) {
                    if (!currentAction.description) {
                        currentAction.description = text;
                    }
                }
            });
            
            if (currentAction && currentAction.name) {
                // No link extraction for this method - set empty sourceUrl
                actions.push({
                    name: currentAction.name,
                    description: currentAction.description || '',
                    properties: currentAction.properties || {},
                    sourceUrl: '', // No link found - empty string instead of copilot page
                    module: 'Agentforce'
                });
            }
        });
        
        // Method 3: Look for headings using Puppeteer
        console.log('Searching for headings...');
        const headings = await page.$$('h1, h2, h3, h4, h5');
        console.log(`Found ${headings.length} headings`);
        
        for (const heading of headings) {
            try {
                const headingText = await heading.evaluate(el => el.textContent?.trim() || '');
                
                if (headingText && 
                    headingText.length > 3 && 
                    headingText.length < 100 &&
                    !headingText.toLowerCase().includes('table of contents') &&
                    !headingText.toLowerCase().includes('cookie')) {
                    
                    // Get next sibling content
                    let description = '';
                    try {
                        const nextElement = await heading.evaluateHandle((el) => {
                            let next = el.nextElementSibling;
                            while (next && (next.tagName === 'SCRIPT' || next.tagName === 'STYLE')) {
                                next = next.nextElementSibling;
                            }
                            return next;
                        });
                        
                        if (nextElement && nextElement.asElement()) {
                            const text = await nextElement.asElement()!.evaluate(el => {
                                const p = el.querySelector('p');
                                return p ? p.textContent?.trim() : el.textContent?.trim() || '';
                            });
                            description = text || '';
                        }
                    } catch (e) {
                        // Ignore errors getting description
                    }
                    
                    // Extract link from heading if it exists
                    // Check multiple patterns: heading wrapped in <a>, <a> inside heading, or <a> as sibling
                    let actionUrl: string | undefined = undefined; // Don't default to main page - only set if we find a valid link
                    try {
                        const link = await heading.evaluate((el: HTMLElement) => {
                            // Pattern 1: Heading itself is wrapped in an anchor
                            let current: HTMLElement | null = el;
                            while (current && current !== document.body) {
                                if (current.tagName === 'A') {
                                    return (current as HTMLAnchorElement).href;
                                }
                                current = current.parentElement;
                            }
                            
                            // Pattern 2: Anchor tag directly inside heading
                            const anchor = el.querySelector('a');
                            if (anchor) {
                                return (anchor as HTMLAnchorElement).href;
                            }
                            
                            // Pattern 3: Check next sibling for anchor
                            let next = el.nextElementSibling;
                            while (next && next !== null) {
                                if (next.tagName === 'A') {
                                    return (next as HTMLAnchorElement).href;
                                }
                                const anchorInSibling = next.querySelector('a');
                                if (anchorInSibling) {
                                    return (anchorInSibling as HTMLAnchorElement).href;
                                }
                                // Stop if we hit another heading or significant content
                                if (next.tagName.match(/^H[1-6]$/i) || next.textContent?.trim().length > 50) {
                                    break;
                                }
                                next = next.nextElementSibling;
                            }
                            
                            return null;
                        });
                        // Only set actionUrl if we found a valid link (not the main page, not an anchor link)
                        // Allow all ai.copilot_actions links EXCEPT the main index page
                        const mainPageUrl = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
                        if (link && 
                            link !== url && 
                            link !== mainPageUrl &&
                            !link.includes('copilot_actions_ref.htm#') &&
                            !link.includes('copilot_actions_ref.htm&type=5') && // Only skip exact main page
                            link.includes('articleView')) {
                            actionUrl = link;
                        }
                    } catch (e) {
                        // Ignore errors getting link
                        console.log(`  ⚠️  Could not extract link for "${headingText}": ${e}`);
                    }
                    
                    // Extract clouds first, then category
                    const clouds = extractClouds(description);
                    const category = extractCategory(headingText, description, clouds);
                    
                    // Only set sourceUrl if we found a valid link - NEVER fallback to copilot page
                    // If no link found, use empty string to indicate no detail page available
                    const finalSourceUrl = actionUrl || ''; // Empty string if no valid link found
                    actions.push({
                        name: headingText,
                        description: description,
                        category: category,
                        clouds: clouds,
                        properties: {},
                        sourceUrl: finalSourceUrl,
                        module: 'Agentforce'
                    });
                }
            } catch (e) {
                // Skip this heading if there's an error
                continue;
            }
        }
        
        // Method 3b: Also try cheerio for headings
        $('h1, h2, h3, h4, h5').each((_, heading) => {
            const $heading = $(heading);
            const headingText = cleanWhitespace($heading.text());
            
            if (headingText && 
                headingText.length > 3 && 
                headingText.length < 100 &&
                !headingText.toLowerCase().includes('table of contents') &&
                !headingText.toLowerCase().includes('cookie')) {
                
                // Extract link from heading if it exists
                let actionUrl = url; // Default to main page
                const $link = $heading.find('a').first();
                if ($link.length) {
                    const href = $link.attr('href');
                    if (href) {
                        // Convert relative URLs to absolute
                        actionUrl = href.startsWith('http') ? href : new URL(href, url).href;
                    }
                }
                
                let description = '';
                let $next = $heading.next();
                
                // Get description from next elements
                for (let i = 0; i < 3 && $next.length; i++) {
                    if ($next.is('p')) {
                        description = cleanWhitespace($next.text());
                        break;
                    } else {
                        const $p = $next.find('p').first();
                        if ($p.length) {
                            description = cleanWhitespace($p.text());
                            break;
                        }
                    }
                    $next = $next.next();
                }
                
                // Extract clouds first, then category
                const clouds = extractClouds(description || '');
                const category = extractCategory(headingText, description || '', clouds);
                
                actions.push({
                    name: headingText,
                    description: description || '',
                    category: category,
                    clouds: clouds,
                    properties: {},
                    sourceUrl: actionUrl,
                    module: 'Agentforce'
                });
            }
        });
        
        // Method 4: Look for list items using Puppeteer
        console.log('Searching for list items...');
        const listItems = await page.$$('ul li, ol li');
        console.log(`Found ${listItems.length} list items`);
        
        for (const li of listItems) {
            try {
                // Extract link from list item if it exists
                const linkData = await li.evaluate((el: HTMLElement) => {
                    const link = el.querySelector('a');
                    if (link && link.href) {
                        return {
                            href: link.href,
                            linkText: link.textContent?.trim() || ''
                        };
                    }
                    return null;
                });
                
                const text = await li.evaluate(el => el.textContent?.trim() || '');
                
                if (text && text.length > 10 && text.length < 500) {
                    const parts = text.split(/[:\-–—]/);
                    if (parts.length >= 2) {
                        const name = parts[0].trim();
                        const description = parts.slice(1).join(' ').trim();
                        
                        if (name && description && name.length > 2 && name.length < 100) {
                            // Use link URL if found, otherwise use main page URL
                            let actionUrl = url;
                            if (linkData && linkData.href) {
                                actionUrl = linkData.href;
                            }
                            
                            // Extract clouds first, then category
                            const clouds = extractClouds(description);
                            const category = extractCategory(name, description, clouds);
                            
                            actions.push({
                                name: name,
                                description: description,
                                category: category,
                                clouds: clouds,
                                properties: {},
                                sourceUrl: actionUrl,
                                module: 'Agentforce'
                            });
                        }
                    }
                }
            } catch (e) {
                // Skip this list item if there's an error
                continue;
            }
        }
        
        // Method 4b: Also try cheerio for list items
        $('ul li, ol li').each((_, li) => {
            const $li = $(li);
            const text = cleanWhitespace($li.text());
            
            if (text && text.length > 10 && text.length < 500) {
                const parts = text.split(/[:\-–—]/);
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const description = parts.slice(1).join(' ').trim();
                    
                    if (name && description && name.length > 2 && name.length < 100) {
                        // Extract link from list item if it exists
                        let actionUrl = url; // Default to main page
                        const $link = $li.find('a').first();
                        if ($link.length) {
                            const href = $link.attr('href');
                            if (href) {
                                // Convert relative URLs to absolute
                                actionUrl = href.startsWith('http') ? href : new URL(href, url).href;
                            }
                        }
                        
                        // Extract clouds first, then category
                        const clouds = extractClouds(description);
                        const category = extractCategory(name, description, clouds);
                        
                        actions.push({
                            name: name,
                            description: description,
                            category: category,
                            clouds: clouds,
                            properties: {},
                            sourceUrl: actionUrl,
                            module: 'Agentforce'
                        });
                    }
                }
            }
        });
        
        // Remove duplicates and filter
        const uniqueActions = actions
            .filter((action, index, self) =>
                index === self.findIndex(a => a.name.toLowerCase() === action.name.toLowerCase())
            )
            .filter(action => 
                action.name.length > 2 && 
                action.name.length < 100 &&
                !action.name.toLowerCase().includes('action name') &&
                !action.name.toLowerCase().includes('description') &&
                !action.name.toLowerCase().includes('parameter') &&
                !action.name.toLowerCase().includes('table of contents') &&
                !action.name.toLowerCase().includes('cookie')
            );
        
        console.log(`\nFound ${uniqueActions.length} unique actions`);
        
        if (uniqueActions.length > 0) {
            console.log('\nSample actions:');
            uniqueActions.slice(0, 10).forEach(action => {
                console.log(`  - ${action.name}: ${action.description.substring(0, 60)}...`);
            });
        }
        
        return uniqueActions;
        
    } finally {
        await browser.close();
    }
}

/**
 * Fetch detailed action information from individual action page
 */
async function fetchActionDetails(action: AgentforceAction, page: any): Promise<AgentforceAction> {
    // Get browser from page for detail page fetching
    const browser = page.browser();
    
    // If action already has a proper URL (not the main page), use it directly
    // IMPORTANT: Always use the URL extracted from the index page - never construct URLs
    const mainPageUrl = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
    if (action.sourceUrl && 
        action.sourceUrl !== mainPageUrl &&
        !action.sourceUrl.includes('copilot_actions_ref.htm#') &&
        action.sourceUrl.includes('articleView')) {
        console.log(`  Using existing URL from index page: ${action.sourceUrl}`);
        return await fetchActionDetailsFromUrl(action, action.sourceUrl, browser);
    }
    
    // If we don't have a proper URL, try to find it on the page
    // The link extraction during initial scraping might have failed, so try again
    if (!action.sourceUrl || action.sourceUrl === mainPageUrl || action.sourceUrl.includes('copilot_actions_ref.htm#')) {
        console.log(`  No link found during initial extraction for "${action.name}", searching page for links...`);
    }
    
    // Try to find a link to the action's detail page
    try {
        // First, try to find links in the main page that might point to detail pages
        // Make sure we're on the main page and wait for it to fully load
        const currentUrl = page.url();
        if (!currentUrl.includes('copilot_actions_ref.htm')) {
            console.log(`  Navigating to main page to search for links...`);
            await page.goto(mainPageUrl, { waitUntil: 'networkidle0', timeout: 60000 });
            
            // Wait for content to be visible
            await page.waitForSelector('h1, h2, h3, a', { timeout: 30000 }).catch(() => {
                // Continue even if selectors don't appear
            });
            
            // Wait additional time for JavaScript-rendered content
            await delay(3000);
        } else {
            // Even if we're on the right page, wait for it to be fully loaded
            await page.waitForSelector('h1, h2, h3, a', { timeout: 10000 }).catch(() => {});
            await delay(1000);
        }
        
        const actionLinks = await page.$$eval('a', (links: HTMLAnchorElement[], actionName: string) => {
            return links
                .map(link => ({
                    href: link.href,
                    text: link.textContent?.trim() || '',
                    title: link.title || '',
                    innerHTML: link.innerHTML || ''
                }))
                .filter(link => 
                    link.href && 
                    link.href.includes('articleView') && // Must be an articleView link
                    !link.href.includes('copilot_actions_ref.htm#') && // Not an anchor link
                    (link.href.includes('copilot') || 
                     link.href.includes('action') ||
                     link.href.includes('agent_ref') ||
                     link.text.toLowerCase().includes(actionName.toLowerCase()) ||
                     link.innerHTML.toLowerCase().includes(actionName.toLowerCase()))
                );
        }, action.name);
        
        console.log(`  Found ${actionLinks.length} potential links on page`);
        
        // Try to find a link that matches the action name (exact or partial)
        const actionNameLower = action.name.toLowerCase();
        const actionNameSlug = actionNameLower.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        
        // Score links by how well they match
        const scoredLinks = actionLinks.map(link => {
            const linkTextLower = link.text.toLowerCase();
            const linkHrefLower = link.href.toLowerCase();
            let score = 0;
            
            // Exact text match (highest priority)
            if (linkTextLower === actionNameLower) {
                score += 100;
            }
            
            // Link text contains full action name
            if (linkTextLower.includes(actionNameLower)) {
                score += 50;
            }
            
            // Check if href contains a slug version of the action name
            if (linkHrefLower.includes(actionNameSlug)) {
                score += 30;
            }
            
            // Check if href contains hyphenated version
            const hyphenated = actionNameLower.replace(/\s+/g, '-');
            if (linkHrefLower.includes(hyphenated)) {
                score += 25;
            }
            
            // Check if link text contains most of the action name words
            const actionWords = actionNameLower.split(/\s+/).filter(w => w.length > 3);
            const matchingWords = actionWords.filter(word => 
                linkTextLower.includes(word) || linkHrefLower.includes(word)
            );
            score += matchingWords.length * 10;
            
            return { link, score };
        }).filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score);
        
        const matchingLink = scoredLinks.length > 0 ? scoredLinks[0].link : null;
        
        if (matchingLink && matchingLink.href) {
            console.log(`  ✅ Found link on page: ${matchingLink.href}`);
            const updatedAction = await fetchActionDetailsFromUrl(action, matchingLink.href, browser);
            // Update sourceUrl to the found link
            updatedAction.sourceUrl = matchingLink.href;
            return updatedAction;
        }
        
        // Try clicking on the heading if it's a link
        try {
            const headingLinks = await page.$$eval('h1 a, h2 a, h3 a, h4 a, h5 a', 
                (links: HTMLAnchorElement[], actionName: string) => {
                    return links
                        .map(link => ({
                            href: link.href,
                            text: link.textContent?.trim() || '',
                            parentText: link.closest('h1, h2, h3, h4, h5')?.textContent?.trim() || ''
                        }))
                        .filter(link => 
                            link.href && 
                            (link.text.toLowerCase().includes(actionName.toLowerCase()) ||
                             link.parentText.toLowerCase().includes(actionName.toLowerCase()))
                        );
                }, action.name);
            
            if (headingLinks.length > 0) {
                const bestMatch = headingLinks.find(link => 
                    link.text.toLowerCase() === action.name.toLowerCase() ||
                    link.parentText.toLowerCase() === action.name.toLowerCase()
                ) || headingLinks[0];
                
                if (bestMatch && bestMatch.href) {
                    console.log(`  ✅ Found heading link: ${bestMatch.href}`);
                    const updatedAction = await fetchActionDetailsFromUrl(action, bestMatch.href, browser);
                    // Update sourceUrl to the found link
                    updatedAction.sourceUrl = bestMatch.href;
                    return updatedAction;
                }
            }
        } catch (e) {
            console.log(`  ⚠️  Error searching for links on index page: ${e?.message || e}`);
        }
        
        // DO NOT construct URLs - all links should be extracted from the index page
        // If no link was found, log a warning and return the action without details
        // Only skip if it's the exact main page or an anchor link - allow all other ai.copilot_actions links
        if (!action.sourceUrl || 
            action.sourceUrl === mainPageUrl ||
            action.sourceUrl.includes('copilot_actions_ref.htm#')) {
            console.log(`  ⚠️  No link found on index page for "${action.name}" - skipping detail fetch`);
        }
    } catch (e: any) {
        console.log(`  Could not find detail page for ${action.name}: ${e?.message || e}`);
    }
    
    // Log if we couldn't find a link (sourceUrl is still the main page or anchor link)
    // Allow all other ai.copilot_actions links (they are valid action detail pages)
    const mainPageUrlCheck = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
    if (!action.sourceUrl || 
        action.sourceUrl.includes('copilot_actions_ref.htm#') ||
        action.sourceUrl === mainPageUrlCheck) {
        console.log(`  ℹ️  No detail page URL found for "${action.name}" - will use basic info`);
    }
    
    return action;
}

/**
 * Fetch action details from a specific URL
 * Uses Puppeteer to browse (handle JavaScript-rendered content) and Cheerio to parse
 */
export async function fetchActionDetailsFromUrl(action: AgentforceAction, url: string, browser?: any): Promise<AgentforceAction> {
    // Skip ONLY the main index page - all other ai.copilot_actions links should be scraped
    const mainPageUrl = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
    // Only skip if it's the exact main page URL or an anchor link to the main page
    if (url === mainPageUrl || url.includes('copilot_actions_ref.htm#')) {
        console.log(`  ⚠️  Skipping main index page - no action details available`);
        return action; // Return action as-is without fetching details
    }
    // Allow all other ai.copilot_actions links (like ai.copilot_actions_ref_draft_or_revise_email.htm, etc.)
    
    try {
        let html: string;
        
        // Use Puppeteer if browser is provided (for JavaScript-rendered content)
        if (browser) {
            const page = await browser.newPage();
            page.setDefaultNavigationTimeout(60000);
            page.setDefaultTimeout(60000);
            
            try {
                await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
                
                // Wait for h1 to appear (content is loaded)
                await page.waitForSelector('h1', { timeout: 30000 }).catch(() => {
                    // If h1 doesn't appear, continue anyway
                });
                
                // Wait for tables or definition lists that might contain properties
                await page.waitForSelector('table, dl, main, article', { timeout: 10000 }).catch(() => {
                    // Continue even if these don't appear
                });
                
                // Wait additional time for all content to render (JavaScript-rendered content)
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                html = await page.content();
            } finally {
                await page.close();
            }
        } else {
            // Fallback to fetch for non-JS pages
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            html = await response.text();
        }
        
        const $ = cheerio.load(html);
        
        // Extract parameters/properties from the detail page
        const properties: Record<string, ActionProperty> = {};
        
        // Look for parameter tables
        $('table').each((_, table) => {
            try {
                const $table = $(table);
                const headers: string[] = [];
                
                // Get headers from thead or first row
                $table.find('thead th, thead td, tr:first-child th, tr:first-child td').each((_, el) => {
                    const text = cleanWhitespace($(el).text());
                    if (text.length > 0) {
                        headers.push(text);
                    }
                });
                
                // Check if this looks like a parameters/properties table
                // Look for headers with parameter/name/type/description, OR
                // Look for tables with "Action Details" heading or similar property tables
                const hasParameterHeaders = headers.some(h => h.toLowerCase().includes('parameter') || 
                                   h.toLowerCase().includes('name') ||
                                   h.toLowerCase().includes('type') ||
                                   h.toLowerCase().includes('description'));
                
                // Check if this is an "Action Details" table (two-column name/value table)
                const isActionDetailsTable = $table.closest('div').find('h2').text().toLowerCase().includes('action details') ||
                                           $table.prevAll('h2').first().text().toLowerCase().includes('action details') ||
                                           $table.siblings('h2').first().text().toLowerCase().includes('action details');
                
                // Also check for tables with exactly 2 columns and property-like structure
                const rowCount = $table.find('tbody tr, tr').length;
                const firstRowCells = $table.find('tbody tr:first-child td, tr:first-child td').length;
                const isTwoColumnTable = firstRowCells === 2 && rowCount > 0;
                
                // Check if table contains "API Name" row - this is a strong indicator it's a properties table
                const tableText = $table.text().toLowerCase();
                const hasApiNameRow = tableText.includes('api name');
                
                if (hasParameterHeaders || isActionDetailsTable || isTwoColumnTable || hasApiNameRow) {
                    // Process rows (skip header row if it exists)
                    $table.find('tbody tr, tr').each((_, row) => {
                        try {
                            const cells: string[] = [];
                            $(row).find('td, th').each((_, cell) => {
                                // Get text content, handling nested elements and whitespace
                                // Use .text() which gets all text including nested elements
                                let text = $(cell).text();
                                // Clean whitespace (handles newlines, tabs, multiple spaces)
                                text = cleanWhitespace(text);
                                // Include ALL cells, even empty ones - API Name might be in a cell that appears empty
                                cells.push(text);
                            });
                            
                            // Debug: log rows that might contain API Name
                            const rowText = cells.join(' | ').toLowerCase();
                            if (rowText.includes('api') && rowText.includes('name')) {
                                console.log(`  🔍 Found potential API Name row: [${cells.length} cells] ${cells.map((c, i) => `[${i}]: "${c}"`).join(', ')}`);
                            }
                            
                            // Skip header rows (cells that look like headers)
                            const firstCellLower = (cells[0] || '').toLowerCase().trim();
                            const isApiNameRow = firstCellLower === 'api name' || 
                                                firstCellLower === 'api name:' ||
                                                firstCellLower.startsWith('api name') ||
                                                rowText.includes('api name');
                            
                            // Skip if it's a header row (has both 'name' AND 'type', or is 'parameter')
                            // BUT don't skip "API Name" - it's a valid property name
                            if (!isApiNameRow && (
                                (firstCellLower.includes('parameter') && !firstCellLower.includes('api name')) || 
                                (firstCellLower.includes('name') && firstCellLower.includes('type') && !firstCellLower.includes('api')) ||
                                firstCellLower === 'user permissions needed')) {
                                return; // Skip this row
                            }
                            
                            // Check all cells for API Name - it might not be in the first cell
                            let foundApiName = false;
                            for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
                                const cellText = cells[cellIdx] || '';
                                const cellTextLower = cellText.toLowerCase().trim();
                                
                                // Check if this cell contains "API Name"
                                if (cellTextLower === 'api name' || 
                                    cellTextLower === 'api name:' ||
                                    cellTextLower.startsWith('api name') ||
                                    cellTextLower.includes('api name')) {
                                    // Look for the API name value in subsequent cells (skip empty cells)
                                    for (let valueIdx = cellIdx + 1; valueIdx < cells.length; valueIdx++) {
                                        const apiNameValue = cells[valueIdx].trim().replace(/^[:.]/, '').trim();
                                        // Check if this looks like an API name
                                        // More lenient: starts with letter, contains letters/numbers, reasonable length
                                        // Don't require strict CamelCase since some might have different formats
                                        if (apiNameValue && 
                                            apiNameValue.length > 2 && 
                                            apiNameValue.length < 150 &&
                                            /^[A-Za-z][A-Za-z0-9]*$/.test(apiNameValue) &&
                                            !apiNameValue.toLowerCase().includes('api name') &&
                                            !apiNameValue.toLowerCase().includes('reference action')) {
                                            properties["API Name"] = {
                                                type: apiNameValue,
                                                description: apiNameValue,
                                                required: false
                                            };
                                            console.log(`  ✅ Extracted API Name: ${apiNameValue} (from cell ${valueIdx})`);
                                            foundApiName = true;
                                            break;
                                        } else if (apiNameValue && apiNameValue.length > 2 && apiNameValue.length < 150) {
                                            // Log when we find a potential value but it doesn't match the pattern
                                            console.log(`  ⚠️  Found potential API Name value but validation failed: "${apiNameValue}" (pattern: ${/^[A-Za-z][A-Za-z0-9]*$/.test(apiNameValue)})`);
                                        }
                                    }
                                    if (foundApiName) break;
                                    
                                    // Fallback: if no valid API name found, check if the cell itself contains the value
                                    // Sometimes "API Name" and value are in the same cell separated by colon or space
                                    const parts = cellText.split(/[::]/);
                                    if (parts.length > 1) {
                                        const potentialValue = parts[parts.length - 1].trim();
                                        if (potentialValue && 
                                            potentialValue.length > 3 && 
                                            potentialValue.length < 100 &&
                                            /^[A-Z][a-zA-Z0-9]+$/.test(potentialValue)) {
                                            properties["API Name"] = {
                                                type: potentialValue,
                                                description: potentialValue,
                                                required: false
                                            };
                                            console.log(`  ✅ Extracted API Name from same cell: ${potentialValue}`);
                                            foundApiName = true;
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            if (cells.length >= 2 && !foundApiName) {
                                const paramName = cells[0] || '';
                                const paramNameLower = paramName.toLowerCase().trim();
                                // For Action Details tables, second cell is usually the value/description
                                // Try to detect type from the value
                                const value = cells[1] || '';
                                
                                // Special handling for API Name - check multiple variations
                                // Handle "API Name", "Api Name", "api name", etc.
                                if (paramNameLower === 'api name' || 
                                    paramNameLower === 'api name:' ||
                                    paramNameLower.startsWith('api name')) {
                                    // The value is the actual API name (e.g., "PostSwarmingSummaryToFeedItem")
                                    // Clean up the value - remove any extra whitespace or colons
                                    const apiNameValue = value.trim().replace(/^[:.]/, '').trim();
                                    if (apiNameValue && apiNameValue.length > 0 && apiNameValue.length < 100) {
                                        properties["API Name"] = {
                                            type: apiNameValue, // API name itself
                                            description: apiNameValue, // API name as description too
                                            required: false
                                        };
                                        console.log(`  ✅ Extracted API Name: ${apiNameValue}`);
                                    }
                                } else {
                                    // For other properties, detect type from value
                                    const paramType = cells.find(c => 
                                        ['string', 'number', 'boolean', 'object', 'array'].some(t => 
                                            c.toLowerCase().includes(t)
                                        )
                                    ) || (value.match(/^(yes|no|true|false)$/i) ? 'boolean' : 'string');
                                    const paramDesc = cells.slice(1).join(' ') || '';
                                    
                                    // Only add if it looks like a property name (not a header or navigation)
                                    if (paramName && 
                                        paramName.length > 0 && 
                                        paramName.length < 100 &&
                                        !paramName.toLowerCase().includes('available in') &&
                                        !paramName.toLowerCase().includes('user permissions')) {
                                        properties[paramName] = {
                                            type: paramType,
                                            description: paramDesc,
                                            required: paramDesc.toLowerCase().includes('required')
                                        };
                                    }
                                }
                            }
                        } catch (e) {
                            // Skip this row
                        }
                    });
                }
            } catch (e) {
                // Skip this table
            }
        });
        
        // Look for definition lists with parameters
        $('dl').each((_, dl) => {
            try {
                const $dl = $(dl);
                const dts = $dl.find('dt').toArray();
                const dds = $dl.find('dd').toArray();
                
                for (let i = 0; i < dts.length; i++) {
                    const dtText = cleanWhitespace($(dts[i]).text());
                    const ddText = i < dds.length ? cleanWhitespace($(dds[i]).text()) : '';
                    const dtTextLower = dtText.toLowerCase().trim();
                    
                    if (dtText && dtText.length > 0 && dtText.length < 100) {
                        // Special handling for API Name in definition lists
                        if (dtTextLower === 'api name' || 
                            dtTextLower === 'api name:' ||
                            dtTextLower.startsWith('api name')) {
                            const apiNameValue = ddText.trim().replace(/^:/, '').trim();
                            if (apiNameValue && apiNameValue.length > 0) {
                                properties["API Name"] = {
                                    type: apiNameValue,
                                    description: apiNameValue,
                                    required: false
                                };
                                console.log(`  ✅ Extracted API Name from definition list: ${apiNameValue}`);
                            }
                        } else {
                            // Try to extract type from description
                            const typeMatch = ddText.match(/(?:type|Type):\s*(\w+)/i) || 
                                            ddText.match(/(string|number|boolean|object|array)/i);
                            const paramType = typeMatch ? typeMatch[1] : 'string';
                            
                            properties[dtText] = {
                                type: paramType,
                                description: ddText,
                                required: ddText.toLowerCase().includes('required')
                            };
                        }
                    }
                }
            } catch (e) {
                // Skip this definition list
            }
        });
        
        // Extract action name from "Reference Action" property if available
        // This is the correct action name, not the module/category name
        let correctActionName = action.name;
        const referenceActionProperty = properties["Reference Action"];
        if (referenceActionProperty) {
            const referenceActionName = referenceActionProperty.description || referenceActionProperty.type;
            // Filter out generic values like "string", "boolean", etc.
            if (referenceActionName && 
                referenceActionName !== 'string' && 
                referenceActionName !== 'boolean' && 
                referenceActionName.trim() !== '') {
                correctActionName = referenceActionName;
            }
        }
        
        // If no Reference Action, try to derive from API Name
        if (correctActionName === action.name) {
            const apiNameProperty = properties["API Name"];
            if (apiNameProperty) {
                const apiName = apiNameProperty.type || apiNameProperty.description;
                if (apiName && apiName.trim() !== '') {
                    // Convert API Name to readable format: "AddCaseComment" -> "Add Case Comment"
                    correctActionName = apiName
                        .replace(/([a-z])([A-Z])/g, '$1 $2')
                        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
                }
            }
        }
        
        // Extract return type if mentioned
        let returnType = '';
        const pageText = cleanWhitespace($('body').text());
        const returnMatch = pageText.match(/(?:returns?|return type):\s*(\w+)/i);
        if (returnMatch) {
            returnType = returnMatch[1];
        }
        
        // Extract enhanced description from detail page using cheerio
        // Look for the actual description, not the "Available in:" text
        let enhancedDescription = action.description;
        
        try {
            // Helper function to check if text is a valid description
            const isDescriptionParagraph = (text: string): boolean => {
                const lower = text.toLowerCase();
                // Skip "Available in:" patterns and sidebar text
                if (lower.startsWith('available in:') || 
                    lower.includes('requires each user') ||
                    lower.includes('edition') ||
                    lower.includes('cookie') ||
                    lower.includes('privacy') ||
                    lower.includes('table of contents') ||
                    lower.includes('use gen ai to create an agent') ||
                    lower.includes('legacy builder')) {
                    return false;
                }
                
                // Aggressively filter out navigation/sidebar text
                // Check for "Bypass the Welcome Message" pattern first (exact match)
                if (lower.includes('bypass the welcome message') ||
                    lower.includes('bypass the welcome') ||
                    (lower.includes('bypass') && lower.includes('welcome') && lower.includes('message')) ||
                    (lower.includes('bypass') && lower.includes('handing off'))) {
                    return false;
                }
                
                const navigationPatterns = [
                    'bypass',
                    'welcome message',
                    'handing off',
                    'ongoing conversations',
                    'handoff',
                    'previous',
                    'next',
                    'see also',
                    'related articles',
                    'related topics',
                    'navigation',
                    'skip to',
                    'jump to',
                    'handing off ongoing',  // More specific pattern
                    'welcome message when'  // More specific pattern
                ];
                
                for (const pattern of navigationPatterns) {
                    if (lower.includes(pattern)) {
                        return false;
                    }
                }
                
                // Must be substantial
                if (text.length < 30 || text.length > 1000) {
                    return false;
                }
                
                // Must not be mostly navigation text
                const navigationWords = ['bypass', 'welcome', 'message', 'handing', 'conversations', 
                                       'handoff', 'previous', 'next', 'skip', 'jump'];
                const words = lower.split(/\s+/);
                const navigationWordCount = words.filter(w => navigationWords.some(nw => w.includes(nw))).length;
                if (navigationWordCount > words.length * 0.3) {
                    return false; // More than 30% navigation words = likely navigation text
                }
                
                return true;
            };
            
            // Get h1 text (action name) for keyword matching
            const h1Text = cleanWhitespace($('h1').first().text());
            const h1Keywords = h1Text.toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 3)
                .slice(0, 3);
            
            const unrelatedWords = ['welcome', 'message', 'handing', 'conversations', 'bypass', 
                                  'handoff', 'ongoing', 'previous', 'next', 'see also', 
                                  'related articles', 'table of contents', 'skip to', 'jump to',
                                  'navigation', 'hand off', 'handing off'];
            
            // Strategy 1: Find first paragraph after h1 in main content
            // Try #content first (Salesforce Help pages use this)
            let main = $('#content').first();
            // Fallback: try main/article if #content not found
            if (!main.length) {
                main = $('main, article, [role="main"]').first();
            }
            // Fallback: try body if nothing else found
            if (!main.length) {
                main = $('body');
            }
            if (main.length) {
                const h1 = main.find('h1').first();
                if (h1.length) {
                    // First, try the immediate next sibling paragraph (most common case)
                    const immediateNextP = h1.next('p');
                    if (immediateNextP.length) {
                        const text = cleanWhitespace(immediateNextP.text());
                        const textLower = text.toLowerCase();
                        // Aggressively reject navigation text - check BEFORE isDescriptionParagraph
                        if (textLower.includes('bypass') ||
                            textLower.includes('welcome message') ||
                            textLower.includes('handing off') ||
                            textLower.includes('ongoing conversations') ||
                            textLower.startsWith('bypass') ||
                            textLower.startsWith('welcome') ||
                            textLower.startsWith('handing') ||
                            textLower.includes('handoff')) {
                            // Skip this paragraph - it's navigation text
                        } else if (isDescriptionParagraph(text)) {
                            enhancedDescription = text.substring(0, 500);
                        }
                    }
                    
                    // If immediate next didn't work, try all paragraphs after h1
                    if (!enhancedDescription || enhancedDescription === action.description) {
                        // Use nextAll() to get all elements after h1, then filter for paragraphs
                        // This is more reliable than using index()
                        let bestMatch: string | null = null;
                        let bestScore = 0;
                        let foundGoodMatch = false;
                        
                        // Get all paragraphs that come after the h1
                        h1.nextAll('p').each((_, p) => {
                            if (foundGoodMatch) return false; // Exit if we found a good match
                            
                            const text = cleanWhitespace($(p).text());
                            const textLower = text.toLowerCase();
                            
                            // Aggressively reject navigation text BEFORE checking isDescriptionParagraph
                            if (textLower.includes('bypass') ||
                                textLower.includes('welcome message') ||
                                textLower.includes('handing off') ||
                                textLower.includes('ongoing conversations') ||
                                textLower.startsWith('bypass') ||
                                textLower.startsWith('welcome') ||
                                textLower.startsWith('handing') ||
                                (textLower.includes('bypass') && textLower.includes('welcome')) ||
                                (textLower.includes('bypass') && textLower.includes('handing'))) {
                                return; // Skip this paragraph completely
                            }
                            
                            if (isDescriptionParagraph(text)) {
                                let score = 0;
                                
                                // Score based on keywords from action name
                                for (const keyword of h1Keywords) {
                                    if (textLower.includes(keyword)) {
                                        score += 10;
                                    }
                                }
                                
                                // Prefer shorter paragraphs
                                if (text.length < 300) {
                                    score += 3;
                                }
                                
                                // Heavily penalize unrelated words - if any found, reject this paragraph
                                if (unrelatedWords.some(word => textLower.includes(word))) {
                                    score = -100; // Strong rejection
                                }
                                
                                // Also check if text starts with navigation patterns
                                if (textLower.startsWith('bypass') || 
                                    textLower.startsWith('welcome') ||
                                    textLower.startsWith('handing') ||
                                    textLower.startsWith('skip') ||
                                    textLower.startsWith('jump')) {
                                    score = -100;
                                }
                                
                                // Only consider paragraphs with positive scores
                                if (score > 0 && score > bestScore) {
                                    bestScore = score;
                                    bestMatch = text;
                                    
                                    // If good match found, use it immediately
                                    if (score > 5) {
                                        enhancedDescription = text.substring(0, 500);
                                        foundGoodMatch = true;
                                        return false; // Exit the each loop
                                    }
                                }
                            }
                        });
                        
                        // Only use best match if it has a positive score (not rejected)
                        if (bestMatch && bestScore > 0 && !foundGoodMatch) {
                            enhancedDescription = bestMatch.substring(0, 500);
                        }
                        
                        // If still no match, check paragraphs inside divs/sections that come after h1
                        // This handles cases where paragraphs are nested inside containers
                        if (!enhancedDescription || enhancedDescription === action.description) {
                        let divBestMatch: string | null = null;
                        let divBestScore = 0;
                        let divFoundGoodMatch = false;
                        
                        h1.nextAll('div, section').each((_, elem) => {
                            if (divFoundGoodMatch) return false;
                            
                            const $elem = $(elem);
                            // Check ALL paragraphs in this div/section, not just the first
                            $elem.find('p').each((_, p) => {
                                if (divFoundGoodMatch) return false;
                                
                                const text = cleanWhitespace($(p).text());
                                const textLower = text.toLowerCase();
                                
                                // Aggressively reject navigation text BEFORE checking isDescriptionParagraph
                                if (textLower.includes('bypass') ||
                                    textLower.includes('welcome message') ||
                                    textLower.includes('handing off') ||
                                    textLower.includes('ongoing conversations') ||
                                    textLower.startsWith('bypass') ||
                                    textLower.startsWith('welcome') ||
                                    textLower.startsWith('handing') ||
                                    (textLower.includes('bypass') && textLower.includes('welcome')) ||
                                    (textLower.includes('bypass') && textLower.includes('handing'))) {
                                    return; // Skip this paragraph completely
                                }
                                
                                if (isDescriptionParagraph(text)) {
                                    let score = 0;
                                    
                                    // Score based on keywords
                                    for (const keyword of h1Keywords) {
                                        if (textLower.includes(keyword)) {
                                            score += 10;
                                        }
                                    }
                                    
                                    // Prefer shorter paragraphs
                                    if (text.length < 300) {
                                        score += 3;
                                    }
                                    
                                    // Reject if contains navigation words
                                    if (unrelatedWords.some(word => textLower.includes(word)) ||
                                        textLower.startsWith('bypass') ||
                                        textLower.startsWith('welcome') ||
                                        textLower.startsWith('handing')) {
                                        score = -100;
                                    }
                                    
                                    // Only consider paragraphs with positive scores
                                    if (score > 0) {
                                        if (score > divBestScore || !divBestMatch) {
                                            divBestScore = score;
                                            divBestMatch = text;
                                        }
                                        
                                        // If good match found, use it immediately
                                        if (score > 5) {
                                            enhancedDescription = text.substring(0, 500);
                                            divFoundGoodMatch = true;
                                            return false;
                                        }
                                    }
                                }
                            });
                        });
                        
                        // Use best match from divs if we found one
                        if (divBestMatch && divBestScore > 0 && !divFoundGoodMatch) {
                            enhancedDescription = divBestMatch.substring(0, 500);
                        }
                    }
                    }
                }
            }
            
            // Strategy 2: If no good match, try all paragraphs in main content
            if (!enhancedDescription || enhancedDescription === action.description) {
                // Try #content first (Salesforce Help pages use this)
                let main = $('#content').first();
                // Fallback: try main/article if #content not found
                if (!main.length) {
                    main = $('main, article, [role="main"]').first();
                }
                // Fallback: try body if nothing else found
                if (!main.length) {
                    main = $('body');
                }
                if (main.length) {
                    let bestMatch: string | null = null;
                    let bestScore = 0;
                    
                    main.find('p').each((_, p) => {
                        const text = cleanWhitespace($(p).text());
                        if (isDescriptionParagraph(text)) {
                            const textLower = text.toLowerCase();
                            let score = 0;
                            
                            // Score based on keywords
                            for (const keyword of h1Keywords) {
                                if (textLower.includes(keyword)) {
                                    score += 10;
                                }
                            }
                            
                            // Heavily penalize unrelated words - if any found, reject this paragraph
                            if (unrelatedWords.some(word => textLower.includes(word))) {
                                score = -100; // Strong rejection
                            }
                            
                            // Also check if text starts with navigation patterns
                            if (textLower.startsWith('bypass') || 
                                textLower.startsWith('welcome') ||
                                textLower.startsWith('handing') ||
                                textLower.startsWith('skip') ||
                                textLower.startsWith('jump')) {
                                score = -100;
                            }
                            
                            if (score > bestScore) {
                                bestScore = score;
                                bestMatch = text;
                            }
                        }
                    });
                    
                    if (bestMatch && bestScore > 0) {
                        enhancedDescription = bestMatch.substring(0, 500);
                    }
                }
            }
            
            // Strategy 3: Try specific selectors as fallback
            if (!enhancedDescription || enhancedDescription === action.description) {
                const selectors = [
                    'main p:first-of-type',
                    'article p:first-of-type',
                    '[role="main"] p:first-of-type',
                    '.content p:first-of-type',
                    'main > p:first-of-type',
                    'article > p:first-of-type',
                    '.article-body p:first-of-type',
                    'section p:first-of-type',
                    'div[class*="content"] p:first-of-type',
                    'div[class*="article"] p:first-of-type'
                ];
                
                for (const selector of selectors) {
                    const $p = $(selector).first();
                    if ($p.length) {
                        const text = cleanWhitespace($p.text());
                        const textLower = text.toLowerCase();
                        
                        // Skip navigation text
                        if (textLower.includes('bypass') ||
                            textLower.includes('welcome message') ||
                            textLower.includes('handing off') ||
                            textLower.startsWith('bypass') ||
                            textLower.startsWith('welcome')) {
                            continue;
                        }
                        
                        if (isDescriptionParagraph(text)) {
                            enhancedDescription = text.substring(0, 500);
                            break;
                        }
                    }
                }
            }
            
            // Strategy 4: Try finding text content in divs/spans after h1
            if (!enhancedDescription || enhancedDescription === action.description) {
                const h1 = $('main h1, article h1, [role="main"] h1').first();
                if (h1.length) {
                    // Try to find text in the next sibling div or section
                    const nextDiv = h1.next('div, section').first();
                    if (nextDiv.length) {
                        const text = cleanWhitespace(nextDiv.text());
                        const textLower = text.toLowerCase();
                        
                        // Skip navigation text
                        if (!textLower.includes('bypass') &&
                            !textLower.includes('welcome message') &&
                            !textLower.includes('handing off') &&
                            !textLower.startsWith('bypass') &&
                            !textLower.startsWith('welcome') &&
                            text.length > 30 && text.length < 1000) {
                            // Try to extract first sentence or paragraph
                            const firstSentence = text.split(/[.!?]/)[0].trim();
                            if (firstSentence.length > 30 && firstSentence.length < 500) {
                                enhancedDescription = firstSentence;
                            } else if (text.length > 30 && text.length < 500) {
                                enhancedDescription = text.substring(0, 500);
                            }
                        }
                    }
                }
            }
            
            // Strategy 5: Try extracting from definition lists or tables
            if (!enhancedDescription || enhancedDescription === action.description) {
                // Look for definition lists (dl/dt/dd) - sometimes descriptions are in dd elements
                const $dd = $('dl dd').first();
                if ($dd.length) {
                    const text = cleanWhitespace($dd.text());
                    const textLower = text.toLowerCase();
                    
                    if (!textLower.includes('bypass') &&
                        !textLower.includes('welcome message') &&
                        !textLower.includes('handing off') &&
                        text.length > 30 && text.length < 500 &&
                        !textLower.startsWith('available in:')) {
                        enhancedDescription = text.substring(0, 500);
                    }
                }
            }
        } catch (e) {
            // Fall back to original strategy if evaluation fails
            const descriptionSelectors = [
                'main p:first-of-type',
                'article p:first-of-type',
                '[role="main"] p:first-of-type',
                '.content p:first-of-type',
                'main > p',
                'article > p',
                '.slds-text-longform p:first-of-type',
                'div[class*="content"] p:first-of-type',
                'div[class*="description"] p',
                'section p:first-of-type',
                '.article-body p:first-of-type',
                '[data-testid*="content"] p',
                '[data-testid*="description"] p'
            ];
            
            for (const selector of descriptionSelectors) {
                try {
                    const descElement = await page.$(selector);
                    if (descElement) {
                        const text = await descElement.evaluate(el => el.textContent?.trim() || '');
                        // Filter out "Available in:" patterns and common sidebar text
                        if (text && 
                            !text.toLowerCase().startsWith('available in:') &&
                            !text.toLowerCase().includes('requires each user') &&
                            !text.toLowerCase().includes('cookie') &&
                            !text.toLowerCase().includes('privacy') &&
                            !text.toLowerCase().includes('use gen ai to create an agent') &&
                            !text.toLowerCase().includes('legacy builder') &&
                            text.length > 20 &&
                            text.length < 1000) {
                            enhancedDescription = text;
                            break;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
        }
        
        // If we still don't have a good description, try extracting from the page text directly
        if (!enhancedDescription || 
            enhancedDescription.toLowerCase().startsWith('available in:') ||
            enhancedDescription.length < 30) {
            try {
                const pageText = await page.evaluate(() => {
                    // Get all text content and find the first substantial paragraph
                    const body = document.body;
                    const walker = document.createTreeWalker(
                        body,
                        NodeFilter.SHOW_TEXT,
                        null
                    );
                    
                    let text = '';
                    let node;
                    while (node = walker.nextNode()) {
                        const parent = node.parentElement;
                        if (parent && (parent.tagName === 'P' || parent.tagName === 'DIV')) {
                            const parentText = parent.textContent?.trim() || '';
                            if (parentText.length > 50 && 
                                parentText.length < 1000 &&
                                !parentText.toLowerCase().startsWith('available in:') &&
                                !parentText.toLowerCase().includes('requires each user') &&
                                !parentText.toLowerCase().includes('cookie') &&
                                !parentText.toLowerCase().includes('use gen ai to create an agent') &&
                                !parentText.toLowerCase().includes('legacy builder')) {
                                // Check if this looks like a description
                                if (parentText.includes('.') || parentText.split(' ').length > 10) {
                                    return parentText;
                                }
                            }
                        }
                    }
                    return '';
                });
                
                if (pageText && pageText.length > 30) {
                    enhancedDescription = pageText.substring(0, 500);
                }
            } catch (e) {
                // Ignore errors
            }
        }
        
        // Clean up the description - remove "Available in:" prefix and sidebar text if present
        const descLower = enhancedDescription.toLowerCase();
        if (descLower.startsWith('available in:') || 
            descLower.includes('available in:') ||
            descLower.includes('use gen ai to create an agent') ||
            descLower.includes('legacy builder') ||
            descLower.includes('bypass') ||
            descLower.includes('welcome message') ||
            descLower.includes('handing off') ||
            descLower.includes('ongoing conversations') ||
            (descLower.includes('bypass') && descLower.includes('welcome')) ||
            (descLower.includes('bypass') && descLower.includes('handing'))) {
            // Try to extract just the part after "Available in:" or find a better description
            const parts = enhancedDescription.split(/\.\s+/);
            const nonEditionParts = parts.filter(p => {
                const pLower = p.toLowerCase();
                return !pLower.includes('available in:') &&
                    !pLower.includes('requires each user') &&
                    !pLower.includes('edition') &&
                    !pLower.includes('use gen ai to create an agent') &&
                    !pLower.includes('legacy builder') &&
                    !pLower.includes('bypass') &&
                    !pLower.includes('welcome message') &&
                    !pLower.includes('handing off') &&
                    !pLower.includes('ongoing conversations') &&
                    !(pLower.includes('bypass') && pLower.includes('welcome')) &&
                    !(pLower.includes('bypass') && pLower.includes('handing'));
            });
            if (nonEditionParts.length > 0) {
                enhancedDescription = nonEditionParts[0];
            } else {
                // If we couldn't extract a good description, try one more time with a simpler approach
                const afterAvailable = enhancedDescription.split(/available in:/i)[1];
                const afterLower = afterAvailable ? afterAvailable.toLowerCase() : '';
                if (afterAvailable && afterAvailable.trim().length > 30 &&
                    !afterLower.includes('use gen ai to create an agent') &&
                    !afterLower.includes('legacy builder') &&
                    !afterLower.includes('bypass') &&
                    !afterLower.includes('welcome message') &&
                    !afterLower.includes('handing off') &&
                    !afterLower.includes('ongoing conversations')) {
                    enhancedDescription = afterAvailable.trim();
                } else {
                    // If description still contains sidebar text, reset to empty so it can be re-fetched
                    const finalCheckLower = enhancedDescription.toLowerCase();
                    if (finalCheckLower.includes('use gen ai to create an agent') ||
                        finalCheckLower.includes('legacy builder') ||
                        finalCheckLower.includes('bypass') ||
                        finalCheckLower.includes('welcome message') ||
                        finalCheckLower.includes('handing off') ||
                        finalCheckLower.includes('ongoing conversations') ||
                        (finalCheckLower.includes('bypass') && finalCheckLower.includes('welcome')) ||
                        (finalCheckLower.includes('bypass') && finalCheckLower.includes('handing'))) {
                        enhancedDescription = action.description; // Keep original, will be fixed on next scrape
                    }
                }
            }
        }
        
        // Final check: Reject any navigation/sidebar text that might have slipped through
        const finalDescLower = enhancedDescription.toLowerCase();
        if (finalDescLower.includes('bypass') ||
            finalDescLower.includes('welcome message') ||
            finalDescLower.includes('handing off') ||
            finalDescLower.includes('ongoing conversations') ||
            finalDescLower.startsWith('bypass') ||
            finalDescLower.startsWith('welcome') ||
            finalDescLower.startsWith('handing') ||
            (finalDescLower.includes('bypass') && finalDescLower.includes('welcome')) ||
            (finalDescLower.includes('bypass') && finalDescLower.includes('handing'))) {
            // Reset to original description or empty string if original also contains navigation text
            if (action.description.toLowerCase().includes('bypass') ||
                action.description.toLowerCase().includes('welcome message') ||
                action.description.toLowerCase().includes('handing off')) {
                enhancedDescription = ''; // Will be fixed on next scrape
            } else {
                enhancedDescription = action.description; // Keep original if it's not navigation text
            }
        }
        
        // Final check: if we still have "Available in:" as the description and we're on a detail page,
        // try one more time to extract from page text
        if ((enhancedDescription.toLowerCase().startsWith('available in:') || 
             enhancedDescription.toLowerCase().includes('available in:')) &&
            url !== 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5') {
            // Last resort: try to extract from the main content text, looking for first substantial sentence
            const mainText = cleanWhitespace($('main, article, [role="main"]').first().text());
            if (mainText.length > 100) {
                // Find the h1 and get text after it
                const h1Index = mainText.toLowerCase().indexOf($('h1').first().text().toLowerCase());
                if (h1Index >= 0) {
                    const afterH1 = mainText.substring(h1Index + $('h1').first().text().length);
                    const sentences = afterH1.split(/[.!?]/).filter(s => {
                        const sLower = s.trim().toLowerCase();
                        return s.trim().length > 30 &&
                               s.trim().length < 500 &&
                               !sLower.includes('bypass') &&
                               !sLower.includes('welcome message') &&
                               !sLower.includes('handing off') &&
                               !sLower.includes('available in:') &&
                               !sLower.startsWith('bypass') &&
                               !sLower.startsWith('welcome');
                    });
                    
                    if (sentences.length > 0) {
                        enhancedDescription = sentences[0].trim().substring(0, 500);
                    }
                }
            }
            
            // If still no good description, log a warning
            if (enhancedDescription.toLowerCase().startsWith('available in:') || 
                enhancedDescription.toLowerCase().includes('available in:')) {
                console.log(`  ⚠️  Warning: Could not extract description from ${url}, description may be incomplete`);
            }
        }
        
        // Merge properties: use extracted ones, but preserve ALL existing properties
        // IMPORTANT: Documentation scraping might return fewer fields than what exists
        // We should ADD new fields but NEVER remove existing ones
        let finalProperties: Record<string, ActionProperty>;
        
        const existingProps = action.properties || {};
        const existingCount = Object.keys(existingProps).length;
        const newCount = Object.keys(properties).length;
        
        if (existingCount > 0 && newCount === 0) {
            // New data has NO properties - keep existing entirely
            finalProperties = existingProps;
            console.log(`  ℹ️  ${action.name}: Kept ${existingCount} existing properties (new data had none)`);
        } else if (newCount > 0) {
            // We extracted some properties - merge with existing
            // Start with existing properties to preserve all of them
            finalProperties = { ...existingProps };
            
            // Merge in extracted properties (add new ones or update existing ones)
            for (const [key, value] of Object.entries(properties)) {
                if (finalProperties[key]) {
                    // Property exists - merge metadata, don't replace
                    finalProperties[key] = {
                        ...finalProperties[key],     // Keep all existing metadata
                        ...value                     // Update/add from new data
                    };
                } else {
                    // New property - add it
                    finalProperties[key] = { ...value };
                }
            }
            
            const mergedCount = Object.keys(finalProperties).length;
            if (mergedCount > existingCount) {
                console.log(`  ℹ️  ${action.name}: Merged properties (${existingCount} existing + ${newCount} new = ${mergedCount} total)`);
            }
        } else {
            // No properties extracted and no existing - use empty object
            finalProperties = {};
        }
        
        // Only update description if we got a better one
        // Filter out "Available in:" patterns and other non-descriptive text
        const isValidDescription = (desc: string): boolean => {
            if (!desc || desc.trim().length < 30) return false;
            const lower = desc.toLowerCase();
            if (lower.startsWith('available in:') ||
                lower.includes('requires each user') ||
                (lower.includes('edition') && lower.includes('with the')) ||
                lower.includes('cookie') ||
                lower.includes('privacy')) {
                return false;
            }
            return true;
        };
        
        const finalDescription = (enhancedDescription && isValidDescription(enhancedDescription))
            ? enhancedDescription
            : (action.description && isValidDescription(action.description))
                ? action.description
                : enhancedDescription || action.description || ''; // Fallback to whatever we have
        
        return {
            ...action,
            name: correctActionName, // Use the correct action name from Reference Action or API Name
            description: finalDescription,
            properties: finalProperties,
            returnType: returnType || action.returnType,
            sourceUrl: url
        };
        
    } catch (error) {
        console.error(`Error fetching details from ${url}:`, error);
        // Return action with original data if fetch fails - preserve everything we had
        // DON'T update sourceUrl to failed URL - keep original (especially don't overwrite with copilot page)
        const mainPageUrl = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
        // Only skip if it's the exact main page - allow all other ai.copilot_actions links
        if (url === mainPageUrl || url.includes('copilot_actions_ref.htm#')) {
            // If we tried to fetch from main copilot page and failed, keep original sourceUrl
            return action;
        }
        // For other URLs, keep original sourceUrl too - don't overwrite with failed URL
        return action;
    }
}

/**
 * Load progress state from file
 */
async function loadProgress(progressPath: string): Promise<ProgressState | null> {
    try {
        const data = await fs.readFile(progressPath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

/**
 * Save progress state to file
 */
async function saveProgress(progressPath: string, progress: ProgressState): Promise<void> {
    await fs.writeFile(progressPath, JSON.stringify(progress, null, 2), 'utf-8');
}

/**
 * Update progress state
 */
async function updateProgress(progressPath: string, actionName: string, totalActions: number, startTime: string): Promise<void> {
    let progress = await loadProgress(progressPath);
    
    if (!progress) {
        progress = {
            processedActions: [],
            totalActions,
            lastUpdated: new Date().toISOString(),
            startTime
        };
    }
    
    if (!progress.processedActions.includes(actionName)) {
        progress.processedActions.push(actionName);
    }
    
    progress.lastUpdated = new Date().toISOString();
    progress.totalActions = totalActions;
    
    await saveProgress(progressPath, progress);
}

/**
 * Save action to file
 */
async function saveAction(action: AgentforceAction, actionsFolder: string): Promise<void> {
    // Extract API Name from properties if it exists
    let apiNameProperty = action.properties?.["API Name"];
    let apiName = apiNameProperty?.type || apiNameProperty?.description;
    
    // If no API Name found, infer it from action name
    if (!apiName || apiName.trim() === '') {
        apiName = inferApiNameFromActionName(action.name);
        console.log(`  ℹ️  No API Name found for "${action.name}", inferring: "${apiName}"`);
        
        // Add inferred API Name to properties
        if (!action.properties) {
            action.properties = {};
        }
        action.properties["API Name"] = {
            type: apiName,
            description: apiName,
            required: false
        };
        apiNameProperty = action.properties["API Name"];
    }
    
    // Use API Name for filename
    const nameForFile = apiName;
    const firstLetter = nameForFile[0].toUpperCase();
    const letterFolder = path.join(actionsFolder, firstLetter);
    
    await fs.mkdir(letterFolder, { recursive: true });
    
    const fileName = `${nameForFile.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    const filePath = path.join(letterFolder, fileName);
    
    // Check if file exists with old name (based on action name) and rename if needed
    const oldFileName = `${action.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    const oldFirstLetter = action.name[0].toUpperCase();
    const oldLetterFolder = path.join(actionsFolder, oldFirstLetter);
    const oldFilePath = path.join(oldLetterFolder, oldFileName);
    
    // If API Name exists and file name would be different, check for old file and rename
    if (apiName && fileName !== oldFileName) {
        try {
            // Check if old file exists
            await fs.access(oldFilePath);
            // Old file exists - rename it
            await fs.mkdir(letterFolder, { recursive: true });
            await fs.rename(oldFilePath, filePath);
            console.log(`  📝 Renamed file from ${oldFirstLetter}/${oldFileName} to ${firstLetter}/${fileName} (using API Name)`);
        } catch (e) {
            // Old file doesn't exist or rename failed - continue with new file
        }
    }
    
    // Preserve existing properties if file already exists and new properties are empty
    let finalProperties = action.properties;
    let finalSourceUrl = action.sourceUrl || '';
    let finalDescription = action.description || '';
    
    try {
        const existingContent = await fs.readFile(filePath, 'utf-8');
        const existingAction: AgentforceAction = JSON.parse(existingContent);
        
        // Preserve sourceUrl if existing one is better (not empty)
        if (existingAction.sourceUrl && existingAction.sourceUrl.trim() !== '' && 
            (!finalSourceUrl || finalSourceUrl.trim() === '')) {
            finalSourceUrl = existingAction.sourceUrl;
        }
        
        // Preserve description if existing one is better (not "Available in:" pattern)
        if (existingAction.description && 
            !existingAction.description.toLowerCase().startsWith('available in:') &&
            !existingAction.description.toLowerCase().includes('requires each user') &&
            existingAction.description.length > 50) {
            // Only use existing if new one is bad or empty
            if (!finalDescription || 
                finalDescription.toLowerCase().startsWith('available in:') ||
                finalDescription.length < 30) {
                finalDescription = existingAction.description;
            }
        }
        
        // If existing file has properties but new action doesn't, preserve existing
        const existingHasProperties = existingAction.properties && Object.keys(existingAction.properties).length > 0;
        const newHasProperties = action.properties && Object.keys(action.properties).length > 0;
        
        if (existingHasProperties && !newHasProperties) {
            console.log(`  ℹ️  Preserving existing properties for "${action.name}" (${Object.keys(existingAction.properties).length} properties)`);
            finalProperties = existingAction.properties;
        } else if (existingHasProperties && newHasProperties) {
            // Merge: Start with existing properties, then merge in new ones
            // This ensures we preserve all existing properties even if scraper only finds some
            finalProperties = { ...existingAction.properties };
            
            // Merge in new properties (add new ones or update existing ones)
            for (const [key, value] of Object.entries(action.properties)) {
                if (finalProperties[key]) {
                    // Property exists - merge metadata, don't replace
                    finalProperties[key] = {
                        ...finalProperties[key],     // Keep all existing metadata
                        ...value                     // Update/add from new data
                    };
                } else {
                    // New property - add it
                    finalProperties[key] = { ...value };
                }
            }
            
            console.log(`  ℹ️  Merged properties for "${action.name}": ${Object.keys(existingAction.properties).length} existing + ${Object.keys(action.properties).length} new = ${Object.keys(finalProperties).length} total`);
        }
    } catch (e) {
        // File doesn't exist yet, use new properties
    }
    
    const actionData = {
        ...action,
        properties: finalProperties,
        sourceUrl: finalSourceUrl, // Use preserved sourceUrl
        description: finalDescription // Use preserved description
    };
    
    // Final check: ensure the action has an API Name before saving
    let finalApiNameProperty = actionData.properties?.["API Name"];
    let finalApiName = finalApiNameProperty?.type || finalApiNameProperty?.description;
    
    // If still no API Name after merge, infer it
    if (!finalApiName || finalApiName.trim() === '') {
        finalApiName = inferApiNameFromActionName(action.name);
        console.log(`  ℹ️  No API Name after merge for "${action.name}", inferring: "${finalApiName}"`);
        
        if (!actionData.properties) {
            actionData.properties = {};
        }
        actionData.properties["API Name"] = {
            type: finalApiName,
            description: finalApiName,
            required: false
        };
        finalApiNameProperty = actionData.properties["API Name"];
    }
    
    await fs.writeFile(filePath, JSON.stringify(actionData, null, 2), 'utf-8');
    console.log(`  ✅ Saved: ${firstLetter}/${fileName}`);
}

/**
 * Load existing index or create new one
 */
async function loadOrCreateIndex(indexPath: string): Promise<ActionIndex> {
    try {
        const data = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(data);
        // Migrate old format: if it has 'generated' instead of 'generatedAt', convert it
        if (index.generated && !index.generatedAt) {
            index.generatedAt = index.generated;
            delete index.generated;
        }
        // Ensure version exists
        if (!index.version) {
            index.version = '1.0.0';
        }
        return index;
    } catch (e) {
        return {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            totalActions: 0,
            actions: {}
        };
    }
}

/**
 * Update index file incrementally
 */
async function updateIndex(action: AgentforceAction, indexPath: string): Promise<void> {
    const index = await loadOrCreateIndex(indexPath);
    
    // Extract API Name from properties if it exists
    let apiNameProperty = action.properties["API Name"];
    let apiName = apiNameProperty?.type || apiNameProperty?.description || undefined;
    
    // If no API Name found, infer it from action name
    if (!apiName || apiName.trim() === '') {
        apiName = inferApiNameFromActionName(action.name);
        console.log(`  ℹ️  Inferring API Name for "${action.name}": "${apiName}"`);
        
        // Add inferred API Name to properties if not already there
        if (!action.properties) {
            action.properties = {};
        }
        if (!action.properties["API Name"]) {
            action.properties["API Name"] = {
                type: apiName,
                description: apiName,
                required: false
            };
        }
    }
    
    // Use API Name for filename
    const nameForFile = apiName;
    const firstLetter = nameForFile[0].toUpperCase();
    const fileName = `${nameForFile.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    
    // Extract Reference Action Type from properties if it exists
    // Prefer description over type (description has the actual value like "Flow", "Standard Action", etc.)
    const referenceActionTypeProperty = action.properties?.["Reference Action Type"];
    let referenceActionType = referenceActionTypeProperty?.description || referenceActionTypeProperty?.type || undefined;
    // Filter out generic "string" values
    if (referenceActionType === 'string' || referenceActionType === 'boolean') {
        referenceActionType = undefined;
    }
    
    // Count properties excluding "API Name"
    const cleanProperties = { ...action.properties };
    delete cleanProperties["API Name"];
    const propertyCount = Object.keys(cleanProperties).length;
    
    const indexEntry: any = {
        name: action.name,
        file: `actions/${firstLetter}/${fileName}`,
        description: action.description,
        propertyCount,
        category: action.category || 'Uncategorized',
        clouds: action.clouds || ['Core Salesforce'],
        sourceUrl: action.sourceUrl,
        apiName: apiName // Always include API Name since we've verified it exists
    };
    
    // Add referenceActionType if it exists
    if (referenceActionType) {
        indexEntry.referenceActionType = referenceActionType;
    }
    
    index.actions[action.name] = indexEntry;
    
    // Count only actions with API Name
    index.totalActions = Object.values(index.actions).filter(entry => entry.apiName && entry.apiName.trim() !== '').length;
    index.generatedAt = new Date().toISOString();
    if (!index.version) {
        index.version = '1.0.0';
    }
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * Generate index file from all actions
 */
async function generateIndex(actions: AgentforceAction[], indexPath: string): Promise<void> {
    const index: ActionIndex = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        totalActions: 0, // Will be set after filtering actions with API Name
        actions: {}
    };
    
    for (const action of actions) {
        // Extract API Name from properties if it exists
        const apiNameProperty = action.properties["API Name"];
        const apiName = apiNameProperty?.type || apiNameProperty?.description || undefined;
        
        // Skip actions without API Name - they are not conform
        if (!apiName || apiName.trim() === '') {
            continue; // Don't add to index if no API Name
        }
        
        // Use API Name for filename
        const nameForFile = apiName;
        const firstLetter = nameForFile[0].toUpperCase();
        const fileName = `${nameForFile.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        
        // Extract Reference Action Type from properties if it exists
        // Prefer description over type (description has the actual value like "Flow", "Standard Action", etc.)
        const referenceActionTypeProperty = action.properties?.["Reference Action Type"];
        let referenceActionType = referenceActionTypeProperty?.description || referenceActionTypeProperty?.type || undefined;
        // Filter out generic "string" values
        if (referenceActionType === 'string' || referenceActionType === 'boolean') {
            referenceActionType = undefined;
        }
        
        // Count properties excluding "API Name"
        const cleanProperties = { ...action.properties };
        delete cleanProperties["API Name"];
        const propertyCount = Object.keys(cleanProperties).length;
        
        const indexEntry: any = {
            name: action.name,
            file: `actions/${firstLetter}/${fileName}`,
            description: action.description,
            propertyCount,
            category: action.category || 'Uncategorized',
            clouds: action.clouds || ['Core Salesforce'],
            sourceUrl: action.sourceUrl,
            apiName: apiName // Always include API Name since we've verified it exists
        };
        
        // Add referenceActionType if it exists
        if (referenceActionType) {
            indexEntry.referenceActionType = referenceActionType;
        }
        
        index.actions[action.name] = indexEntry;
    }
    
    // Count actions (all should have API Name since we filtered them)
    index.totalActions = Object.keys(index.actions).length;
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`\nGenerated index with ${index.totalActions} actions (${actions.length} total, ${actions.length - index.totalActions} without API Name filtered out)`);
}

/**
 * Main scraping function
 */
async function scrapeActions(): Promise<void> {
    console.log('Starting Agentforce actions scraper with Puppeteer...\n');
    
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const actionsFolder = path.join(srcDocDir, 'actions');
    const indexPath = path.join(srcDocDir, 'index.json');
    const progressPath = path.join(__dirname, 'progress.json');
    
    // Create directories
    await fs.mkdir(actionsFolder, { recursive: true });
    
    // Load existing progress
    const existingProgress = await loadProgress(progressPath);
    const processedSet = new Set(existingProgress?.processedActions || []);
    const startTime = existingProgress?.startTime || new Date().toISOString();
    
    if (existingProgress) {
        console.log(`📊 Resuming from previous session:`);
        console.log(`   Processed: ${existingProgress.processedActions.length}/${existingProgress.totalActions} actions`);
        console.log(`   Last updated: ${existingProgress.lastUpdated}`);
        console.log(`   Start time: ${existingProgress.startTime}\n`);
    }
    
    try {
        // Fetch actions using Puppeteer
        const actions = await fetchActionsWithPuppeteer();
        
        if (actions.length === 0) {
            console.warn('\n⚠️  No actions found.');
            console.warn('Check the saved HTML file at: scripts/page-debug.html');
            console.warn('The page structure may need manual inspection.');
            return;
        }
        
        // Filter out actions that already have an API Name (we already have complete data for them)
        // Use the index.json file for fast lookup
        const actionsToProcess: AgentforceAction[] = [];
        const actionsWithApiName: string[] = [];
        
        // Load existing index to check which actions already have API Names
        let existingIndex: ActionIndex | null = null;
        try {
            const indexContent = await fs.readFile(indexPath, 'utf-8');
            existingIndex = JSON.parse(indexContent);
        } catch (e) {
            // Index doesn't exist yet, all actions need to be processed
        }
        
        // Create a set of action names that already have API Names (from index)
        const actionsWithApiNameSet = new Set<string>();
        if (existingIndex?.actions) {
            for (const actionName in existingIndex.actions) {
                const entry = existingIndex.actions[actionName];
                if (entry.apiName && entry.apiName.trim() !== '') {
                    actionsWithApiNameSet.add(actionName);
                }
            }
        }
        
        // Helper function to check if description needs updating
        const needsDescriptionUpdate = (description: string): boolean => {
            if (!description) return true;
            const desc = description.toLowerCase().trim();
            return desc.startsWith('available in:') ||
                   desc.includes('requires each user') ||
                   (desc.length < 50 && desc.includes('edition'));
        };
        
        let needsUpdateCount = 0;
        
        // Also check files directly (in case index is out of sync)
        for (const action of actions) {
            let hasApiName = false;
            let needsUpdate = false;
            
            // First check index (fast)
            if (actionsWithApiNameSet.has(action.name)) {
                hasApiName = true;
                // Still need to check file for description quality
                const firstLetter = action.name[0].toUpperCase();
                const fileName = `${action.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                const filePath = path.join(actionsFolder, firstLetter, fileName);
                
                try {
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    const existingAction: AgentforceAction = JSON.parse(fileContent);
                    // Check if description needs updating even though API Name exists
                    if (needsDescriptionUpdate(existingAction.description || '')) {
                        needsUpdate = true;
                        needsUpdateCount++;
                    }
                } catch (e) {
                    // File doesn't exist or error reading - need to process
                }
            } else {
                // Check file directly (slower, but more reliable)
                const firstLetter = action.name[0].toUpperCase();
                const fileName = `${action.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                const filePath = path.join(actionsFolder, firstLetter, fileName);
                
                try {
                    const fileContent = await fs.readFile(filePath, 'utf-8');
                    const existingAction: AgentforceAction = JSON.parse(fileContent);
                    const existingApiName = existingAction.properties?.["API Name"];
                    const existingApiNameValue = existingApiName?.type || existingApiName?.description;
                    
                    if (existingApiNameValue && existingApiNameValue.trim() !== '') {
                        hasApiName = true;
                        // Check if description needs updating even though API Name exists
                        if (needsDescriptionUpdate(existingAction.description || '')) {
                            needsUpdate = true;
                            needsUpdateCount++;
                        }
                    }
                } catch (e) {
                    // File doesn't exist or error reading - need to process
                }
            }
            
            // Process if: no API Name OR has API Name but needs description update
            if (!hasApiName || needsUpdate) {
                actionsToProcess.push(action);
            } else {
                actionsWithApiName.push(action.name);
            }
        }
        
        console.log(`\n📊 Action filtering:`);
        console.log(`   Total actions found: ${actions.length}`);
        console.log(`   Already have API Name (complete): ${actionsWithApiName.length}`);
        console.log(`   Need to process: ${actionsToProcess.length}`);
        if (needsUpdateCount > 0) {
            console.log(`   (${needsUpdateCount} have API Name but need description update)`);
        }
        if (actionsWithApiName.length > 0) {
            console.log(`\n   Skipping (already complete):`);
            actionsWithApiName.slice(0, 10).forEach(name => console.log(`     - ${name}`));
            if (actionsWithApiName.length > 10) {
                console.log(`     ... and ${actionsWithApiName.length - 10} more`);
            }
        }
        
        if (actionsToProcess.length === 0) {
            console.log('\n✅ All actions already have API Names!');
            console.log('   No actions need to be fetched.');
            console.log('   Regenerating index from existing files...');
            
            // Load all existing actions and regenerate index
            const allActions: AgentforceAction[] = [];
            for (const action of actions) {
                try {
                    // Try to find file by API Name first, then fallback to action name
                    const apiNameProperty = action.properties?.["API Name"];
                    const apiName = apiNameProperty?.type || apiNameProperty?.description;
                    const nameForFile = apiName || action.name;
                    const firstLetter = nameForFile[0].toUpperCase();
                    let fileName = `${nameForFile.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                    let filePath = path.join(actionsFolder, firstLetter, fileName);
                    
                    // Try API Name file first, then fallback to action name file
                    try {
                        await fs.access(filePath);
                    } catch (e) {
                        // Try old filename (based on action name)
                        const oldFirstLetter = action.name[0].toUpperCase();
                        const oldFileName = `${action.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                        const oldFilePath = path.join(actionsFolder, oldFirstLetter, oldFileName);
                        try {
                            await fs.access(oldFilePath);
                            filePath = oldFilePath;
                            fileName = oldFileName;
                        } catch (e2) {
                            // Neither file exists, skip
                            continue;
                        }
                    }
                    
                    const fileData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
                    allActions.push(fileData[action.name]);
                } catch (e) {
                    // File doesn't exist, skip
                }
            }
            
            await generateIndex(allActions, indexPath);
            console.log(`✅ Index regenerated successfully with ${allActions.length} actions!`);
            
            // Clean up progress file
            try {
                await fs.unlink(progressPath);
                console.log('✅ Progress file cleaned up');
            } catch (e) {
                // Ignore cleanup errors
            }
            
            return;
        }
        
        console.log(`\n📋 Processing summary:`);
        console.log(`   Total actions found: ${actions.length}`);
        console.log(`   Already have API Name (complete): ${actionsWithApiName.length}`);
        console.log(`   Need to fetch: ${actionsToProcess.length}`);
        if (needsUpdateCount > 0) {
            console.log(`   (${needsUpdateCount} have API Name but need description update)`);
        }
        if (actionsToProcess.length > 0) {
            const estimatedMinutes = Math.ceil(actionsToProcess.length * 2 / 60);
            console.log(`   Estimated time remaining: ~${estimatedMinutes} minute${estimatedMinutes !== 1 ? 's' : ''}\n`);
        } else {
            console.log('');
        }
        
        // Fetch details for each action
        console.log('Fetching details for actions...\n');
        const mainUrl = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
        
        // Create a new browser instance for fetching details
        const detailBrowser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        try {
            const detailPage = await detailBrowser.newPage();
            detailPage.setDefaultNavigationTimeout(60000);
            detailPage.setDefaultTimeout(60000);
            
            // Re-navigate to main page to find links
            await detailPage.goto(mainUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await delay(3000);
            
            let processedCount = processedSet.size;
            
            for (let i = 0; i < actionsToProcess.length; i++) {
                const action = actionsToProcess[i];
                const globalIndex = processedCount + i + 1;
                
                console.log(`[${globalIndex}/${actions.length}] Processing: ${action.name}`);
                
                try {
                    // Skip ONLY if action points to main index page or has empty sourceUrl
                    // Allow all other ai.copilot_actions links (they are valid action detail pages)
                    const mainPageUrl = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
                    if (!action.sourceUrl ||
                        action.sourceUrl === '' ||
                        action.sourceUrl === mainPageUrl || 
                        action.sourceUrl.includes('copilot_actions_ref.htm#')) { // Only skip anchor links to main page
                        console.log(`  ⚠️  Skipping "${action.name}" - no valid detail page URL (empty or points to main index page)`);
                        
                        // Load existing file to preserve properties if it exists
                        // Try API Name filename first, then fallback to action name filename
                        const apiNameProperty = action.properties?.["API Name"];
                        const apiName = apiNameProperty?.type || apiNameProperty?.description;
                        const nameForFile = apiName || action.name;
                        const firstLetter = nameForFile[0].toUpperCase();
                        const letterFolder = path.join(actionsFolder, firstLetter);
                        let fileName = `${nameForFile.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                        let filePath = path.join(letterFolder, fileName);
                        
                        // Try API Name file first, then fallback to action name file
                        try {
                            await fs.access(filePath);
                        } catch (e) {
                            // Try old filename (based on action name)
                            const oldFirstLetter = action.name[0].toUpperCase();
                            const oldLetterFolder = path.join(actionsFolder, oldFirstLetter);
                            const oldFileName = `${action.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                            const oldFilePath = path.join(oldLetterFolder, oldFileName);
                            try {
                                await fs.access(oldFilePath);
                                filePath = oldFilePath;
                            } catch (e2) {
                                // Neither file exists, skip loading
                            }
                        }
                        
                        try {
                            const existingContent = await fs.readFile(filePath, 'utf-8');
                            const existingAction: AgentforceAction = JSON.parse(existingContent);
                            
                            // Preserve existing properties and description if they exist
                            if (existingAction.properties && Object.keys(existingAction.properties).length > 0) {
                                action.properties = existingAction.properties;
                                console.log(`  ℹ️  Preserved ${Object.keys(existingAction.properties).length} existing properties`);
                            }
                            
                            // Preserve sourceUrl if it exists
                            if (existingAction.sourceUrl && existingAction.sourceUrl.trim() !== '') {
                                action.sourceUrl = existingAction.sourceUrl;
                            }
                            
                            // Preserve better description if existing one is better
                            if (existingAction.description && 
                                !existingAction.description.toLowerCase().startsWith('available in:') &&
                                !existingAction.description.toLowerCase().includes('requires each user') &&
                                existingAction.description.length > 50) {
                                action.description = existingAction.description;
                            }
                        } catch (e) {
                            // File doesn't exist, use action as-is
                        }
                        
                        // Save the action (saveAction will also preserve properties)
                        await saveAction(action, actionsFolder);
                        await updateIndex(action, indexPath);
                        await updateProgress(progressPath, action.name, actions.length, startTime);
                        processedCount++;
                        continue; // Skip to next action
                    }
                    
                    const detailedAction = await fetchActionDetails(action, detailPage);
                    
                    // Check if we actually got details or just the basic action
                    if (detailedAction.description === action.description && 
                        Object.keys(detailedAction.properties).length === 0 &&
                        !detailedAction.sourceUrl.includes('articleView')) {
                        console.log(`  ⚠️  Could not find detail page for "${action.name}" - using basic info`);
                        console.log(`      Tried to find links but none matched. Action may not have a detail page.`);
                    }
                    
                    // Save immediately after processing
                    await saveAction(detailedAction, actionsFolder);
                    await updateIndex(detailedAction, indexPath);
                    await updateProgress(progressPath, action.name, actions.length, startTime);
                    
                    processedCount++;
                    
                    // Add a small delay to avoid overwhelming the server
                    await delay(1000);
                } catch (e: any) {
                    console.log(`  ⚠️  Error fetching details for "${action.name}": ${e?.message || e}`);
                    console.log(`      Stack: ${e?.stack?.split('\n')[0] || 'N/A'}`);
                    
                    // Still save the basic action
                    await saveAction(action, actionsFolder);
                    await updateIndex(action, indexPath);
                    await updateProgress(progressPath, action.name, actions.length, startTime);
                    
                    processedCount++;
                }
            }
        } finally {
            await detailBrowser.close();
        }
        
        // Final progress update
        const finalProgress = await loadProgress(progressPath);
        if (finalProgress) {
            console.log(`\n📊 Final Progress:`);
            console.log(`   Processed: ${finalProgress.processedActions.length}/${finalProgress.totalActions} actions`);
            console.log(`   Completion: ${((finalProgress.processedActions.length / finalProgress.totalActions) * 100).toFixed(1)}%`);
        }
        
        console.log('\n✅ Scraping completed successfully!');
        
        // Optionally clean up progress file when complete
        if (finalProgress && finalProgress.processedActions.length === finalProgress.totalActions) {
            console.log('\n🧹 Cleaning up progress file (all actions processed)...');
            try {
                await fs.unlink(progressPath);
                console.log('✅ Progress file cleaned up');
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        
    } catch (error) {
        console.error('❌ Error during scraping:', error);
        console.error('\n💾 Progress has been saved. You can resume by running the scraper again.');
        throw error;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    scrapeActions().catch(console.error);
}

export { scrapeActions, saveAction, updateIndex };


