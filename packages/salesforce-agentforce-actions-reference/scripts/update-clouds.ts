/**
 * Update cloud information in existing action files
 * Re-extracts clouds using improved logic
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

/**
 * Extract category from action name, description, and clouds (same logic as scraper)
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
 * Extract clouds from action description (same logic as scraper)
 */
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

async function updateCloudsInFile(filePath: string): Promise<boolean> {
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const action: AgentforceAction = JSON.parse(fileContent);
        const newClouds = extractClouds(action.description);
        const oldClouds = action.clouds || ['Core Salesforce'];
        const newCategory = extractCategory(action.name, action.description, newClouds);
        const oldCategory = action.category || 'Uncategorized';
        
        // Check if clouds changed
        const cloudsChanged = JSON.stringify(newClouds.sort()) !== JSON.stringify(oldClouds.sort());
        const categoryChanged = newCategory !== oldCategory;
        
        if (cloudsChanged || categoryChanged) {
            action.clouds = newClouds;
            action.category = newCategory;
            const changes = [];
            if (cloudsChanged) {
                changes.push(`clouds: ${oldClouds.join(', ')} → ${newClouds.join(', ')}`);
            }
            if (categoryChanged) {
                changes.push(`category: ${oldCategory} → ${newCategory}`);
            }
            console.log(`  Updated ${action.name}: ${changes.join(', ')}`);
            await fs.writeFile(filePath, JSON.stringify(action, null, 2), 'utf-8');
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`  Error updating ${filePath}:`, error);
        return false;
    }
}

async function updateAllClouds(): Promise<void> {
    console.log('Updating cloud and category information in action files...\n');
    
    const srcDocDir = path.join(__dirname, '..', 'src', 'doc');
    const actionsFolder = path.join(srcDocDir, 'actions');
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let totalUpdated = 0;
    let totalFiles = 0;
    
    for (const letter of letters) {
        const letterFolder = path.join(actionsFolder, letter);
        
        try {
            const files = await fs.readdir(letterFolder);
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            for (const file of jsonFiles) {
                totalFiles++;
                const filePath = path.join(letterFolder, file);
                const updated = await updateCloudsInFile(filePath);
                if (updated) {
                    totalUpdated++;
                }
            }
        } catch (error) {
            // Folder doesn't exist, skip
            continue;
        }
    }
    
    console.log(`\n✅ Updated ${totalUpdated} out of ${totalFiles} action files`);
    console.log('Now run: npm run rebuild-index && npm run build');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    updateAllClouds().catch(console.error);
}

export { updateAllClouds };

