/**
 * Scraper for Salesforce Agentforce standard actions
 * Fetches actions from: https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

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
    properties: Record<string, ActionProperty>;
    returnType?: string;
    sourceUrl: string;
    module: string;
}

interface ActionIndex {
    generated: string;
    totalActions: number;
    actions: Record<string, {
        name: string;
        file: string;
        description: string;
        propertyCount?: number;
        category?: string;
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
 * Fetch actions from the Salesforce documentation page
 */
async function fetchActions(): Promise<AgentforceAction[]> {
    const url = 'https://help.salesforce.com/s/articleView?id=ai.copilot_actions_ref.htm&type=5';
    
    console.log('Fetching Agentforce actions from:', url);
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const actions: AgentforceAction[] = [];
        
        // Try multiple selectors to find action tables/sections
        // Common patterns in Salesforce docs:
        // 1. Tables with action information
        // 2. Definition lists (dl/dt/dd)
        // 3. Sections with headings
        // 4. List items
        
        // Method 1: Look for tables (less strict - try all tables)
        $('table').each((_, table) => {
            const $table = $(table);
            const headers: string[] = [];
            
            // Get headers
            $table.find('thead th, thead td, tr:first-child th, tr:first-child td').each((_, header) => {
                headers.push(cleanWhitespace($(header).text()));
            });
            
            // Try to extract data from tables - be less strict about headers
            const rows: string[][] = [];
            $table.find('tbody tr, tr:not(:first-child)').each((_, row) => {
                const $row = $(row);
                const cells: string[] = [];
                
                $row.find('td, th').each((_, cell) => {
                    const text = cleanWhitespace($(cell).text());
                    if (text) {
                        cells.push(text);
                    }
                });
                
                if (cells.length >= 2) {
                    rows.push(cells);
                }
            });
            
            // If we found rows with at least 2 columns, treat as action data
            if (rows.length > 0) {
                rows.forEach(cells => {
                    const actionName = cells[0] || '';
                    const description = cells[1] || cells.slice(1).join(' ') || '';
                    
                    // Filter out obvious non-action rows
                    if (actionName && 
                        actionName.length > 2 && 
                        actionName.length < 100 &&
                        !actionName.toLowerCase().includes('action name') &&
                        !actionName.toLowerCase().includes('description') &&
                        !actionName.toLowerCase().includes('parameter')) {
                        actions.push({
                            name: actionName,
                            description: description,
                            properties: {},
                            sourceUrl: url,
                            module: 'Agentforce'
                        });
                    }
                });
            }
        });
        
        // Method 2: Look for definition lists
        if (true) { // Try this method regardless
            $('dl').each((_, dl) => {
                const $dl = $(dl);
                let currentAction: Partial<AgentforceAction> | null = null;
                
                $dl.find('dt, dd').each((_, element) => {
                    const $el = $(element);
                    const text = cleanWhitespace($el.text());
                    
                    if ($el.is('dt')) {
                        // Save previous action
                        if (currentAction && currentAction.name) {
                            actions.push({
                                name: currentAction.name,
                                description: currentAction.description || '',
                                properties: currentAction.properties || {},
                                sourceUrl: url,
                                module: 'Agentforce'
                            });
                        }
                        
                        // Start new action
                        currentAction = {
                            name: text,
                            description: '',
                            properties: {}
                        };
                    } else if ($el.is('dd') && currentAction) {
                        if (!currentAction.description) {
                            currentAction.description = text;
                        }
                    }
                });
                
                // Save last action
                if (currentAction && currentAction.name) {
                    actions.push({
                        name: currentAction.name,
                        description: currentAction.description || '',
                        properties: currentAction.properties || {},
                        sourceUrl: url,
                        module: 'Agentforce'
                    });
                }
            });
        }
        
        // Method 3: Look for sections with headings
        if (true) { // Try this method regardless
            $('h2, h3, h4').each((_, heading) => {
                const $heading = $(heading);
                const headingText = cleanWhitespace($heading.text());
                
                // Check if this looks like an action name
                if (headingText && headingText.length > 0 && headingText.length < 100) {
                    const $next = $heading.next();
                    let description = '';
                    
                    // Get description from next paragraph or list
                    if ($next.is('p')) {
                        description = cleanWhitespace($next.text());
                    } else {
                        const $p = $next.find('p').first();
                        if ($p.length) {
                            description = cleanWhitespace($p.text());
                        }
                    }
                    
                    if (headingText && !headingText.toLowerCase().includes('table of contents')) {
                        actions.push({
                            name: headingText,
                            description: description || '',
                            properties: {},
                            sourceUrl: url,
                            module: 'Agentforce'
                        });
                    }
                }
            });
        }
        
        // Method 4: Look for list items with action names
        if (true) { // Try this method regardless
            $('ul li, ol li').each((_, li) => {
                const $li = $(li);
                const text = cleanWhitespace($li.text());
                
                // Check if this looks like an action entry
                if (text && text.length > 10 && text.length < 500) {
                    // Try to extract action name and description
                    const parts = text.split(/[:\-–—]/);
                    if (parts.length >= 2) {
                        const name = parts[0].trim();
                        const description = parts.slice(1).join(' ').trim();
                        
                        if (name && description) {
                            actions.push({
                                name: name,
                                description: description,
                                properties: {},
                                sourceUrl: url,
                                module: 'Agentforce'
                            });
                        }
                    } else if (text) {
                        // Just use the text as name and description
                        actions.push({
                            name: text.substring(0, 100),
                            description: text,
                            properties: {},
                            sourceUrl: url,
                            module: 'Agentforce'
                        });
                    }
                }
            });
        }
        
        // Method 5: Look for code blocks or pre elements with action names
        $('code, pre, .code, .code-block').each((_, el) => {
            const $el = $(el);
            const text = cleanWhitespace($el.text());
            
            // Look for patterns like "ActionName" or "actionName"
            const matches = text.match(/\b[A-Z][a-zA-Z0-9]+\b/g);
            if (matches) {
                matches.forEach(match => {
                    if (match.length > 3 && match.length < 50) {
                        const parentText = cleanWhitespace($el.parent().text());
                        actions.push({
                            name: match,
                            description: parentText.substring(0, 200),
                            properties: {},
                            sourceUrl: url,
                            module: 'Agentforce'
                        });
                    }
                });
            }
        });
        
        // Method 6: Look for divs with data attributes or specific classes
        $('[data-action], [class*="action"], [id*="action"]').each((_, el) => {
            const $el = $(el);
            const actionName = $el.attr('data-action') || 
                              $el.attr('id')?.replace(/[^a-zA-Z0-9]/g, '') ||
                              $el.text().trim().substring(0, 50);
            
            if (actionName && actionName.length > 2) {
                const description = cleanWhitespace($el.text()).substring(0, 200);
                actions.push({
                    name: actionName,
                    description: description,
                    properties: {},
                    sourceUrl: url,
                    module: 'Agentforce'
                });
            }
        });
        
        // Remove duplicates and filter out invalid entries
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
                !action.name.toLowerCase().includes('table of contents')
            );
        
        console.log(`Found ${uniqueActions.length} unique actions\n`);
        
        // Debug: log first few actions if found
        if (uniqueActions.length > 0) {
            console.log('Sample actions:');
            uniqueActions.slice(0, 5).forEach(action => {
                console.log(`  - ${action.name}: ${action.description.substring(0, 60)}...`);
            });
        } else {
            console.log('No actions found. The page structure may need investigation.');
            console.log('Try running: node scripts/inspect-page.ts to see the page structure');
        }
        
        return uniqueActions;
        
    } catch (error) {
        console.error('Error fetching actions:', error);
        throw error;
    }
}

/**
 * Fetch detailed action information if available
 */
async function fetchActionDetails(action: AgentforceAction): Promise<AgentforceAction> {
    // If the action has a detail URL, fetch it
    // For now, we'll return the action as-is
    // This can be enhanced to fetch parameter details from individual pages
    return action;
}

/**
 * Save action to file
 */
async function saveAction(action: AgentforceAction, actionsFolder: string): Promise<void> {
    const firstLetter = action.name[0].toUpperCase();
    const letterFolder = path.join(actionsFolder, firstLetter);
    
    await fs.mkdir(letterFolder, { recursive: true });
    
    const fileName = `${action.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    const filePath = path.join(letterFolder, fileName);
    
    await fs.writeFile(filePath, JSON.stringify(action, null, 2), 'utf-8');
    console.log(`  Saved: ${firstLetter}/${fileName}`);
}

/**
 * Generate index file
 */
async function generateIndex(actions: AgentforceAction[], indexPath: string): Promise<void> {
    const index: ActionIndex = {
        generated: new Date().toISOString(),
        totalActions: actions.length,
        actions: {}
    };
    
    for (const action of actions) {
        const firstLetter = action.name[0].toUpperCase();
        const fileName = `${action.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        
        index.actions[action.name] = {
            name: action.name,
            file: `actions/${firstLetter}/${fileName}`,
            description: action.description,
            propertyCount: Object.keys(action.properties).length,
            category: action.category,
            sourceUrl: action.sourceUrl
        };
    }
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`\nGenerated index with ${actions.length} actions`);
}

/**
 * Main scraping function
 */
async function scrapeActions(): Promise<void> {
    console.log('Starting Agentforce actions scraper...\n');
    
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const actionsFolder = path.join(srcDocDir, 'actions');
    const indexPath = path.join(srcDocDir, 'index.json');
    
    // Create directories
    await fs.mkdir(actionsFolder, { recursive: true });
    
    try {
        // Fetch actions
        const actions = await fetchActions();
        
        if (actions.length === 0) {
            console.warn('No actions found. The page structure may have changed.');
            console.warn('Please check the documentation URL and update the scraper accordingly.');
            return;
        }
        
        // Fetch details and save each action
        console.log('\nSaving actions...');
        for (const action of actions) {
            const detailedAction = await fetchActionDetails(action);
            await saveAction(detailedAction, actionsFolder);
        }
        
        // Generate index
        await generateIndex(actions, indexPath);
        
        console.log('\n✅ Scraping completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during scraping:', error);
        throw error;
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    scrapeActions().catch(console.error);
}

export { scrapeActions };

