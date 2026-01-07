/**
 * Rebuild the index file from all action files
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DocumentIndex {
    version: string;
    totalActions: number;
    generatedAt: string;
    actions: Record<string, {
        name: string;
        description: string;
        propertyCount: number;
        label?: string;
        category?: string;
        clouds?: string[];
        file: string;
        apiName: string; // Required - all actions must have API Name
        referenceActionType?: string;
        sourceUrl?: string;
    }>;
}

async function rebuildIndex(): Promise<void> {
    const actionsFolder = path.join(__dirname, '..', 'src', 'doc', 'actions');
    const indexPath = path.join(__dirname, '..', 'src', 'doc', 'index.json');
    
    // Load existing index to preserve version
    let existingIndex: DocumentIndex | null = null;
    try {
        const content = await fs.readFile(indexPath, 'utf-8');
        existingIndex = JSON.parse(content);
    } catch {
        // No existing index
    }
    
    if (!await fs.access(actionsFolder).then(() => true).catch(() => false)) {
        console.error('Actions folder does not exist. Run the scraper first.');
        return;
    }
    
    const index: DocumentIndex = {
        version: existingIndex?.version || '1.0.0',
        totalActions: 0,
        generatedAt: new Date().toISOString(),
        actions: {}
    };
    
    // Read all action files
    const letters = await fs.readdir(actionsFolder);
    
    for (const letter of letters) {
        const letterPath = path.join(actionsFolder, letter);
        const stat = await fs.stat(letterPath);
        
        if (stat.isDirectory()) {
            const files = await fs.readdir(letterPath);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = path.join(letterPath, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const action = JSON.parse(content) as AgentforceAction;
                    const actionName = action.name;
                    
                    if (action) {
                        // Use the description from the action file (should be enhanced from detail page)
                        // Filter out "Available in:" text if it's still there
                        let description = action.description || '';
                        
                        // If description starts with "Available in:", try to find a better one
                        if (description.toLowerCase().startsWith('available in:') || 
                            description.toLowerCase().includes('requires each user')) {
                            // This is likely edition info, not the actual description
                            // Try to extract a meaningful description
                            const parts = description.split(/\.\s+/);
                            const meaningfulParts = parts.filter(p => 
                                !p.toLowerCase().startsWith('available in:') &&
                                !p.toLowerCase().includes('requires each user') &&
                                !p.toLowerCase().includes('edition') &&
                                p.length > 10
                            );
                            
                            if (meaningfulParts.length > 0) {
                                description = meaningfulParts[0];
                            } else {
                                // Fallback: use action name as description if we can't find better
                                description = `Action: ${actionName}`;
                            }
                        }
                        
                        // Extract API name from properties if available
                        let apiName: string | undefined;
                        if (action.properties && action.properties['API Name']) {
                            apiName = action.properties['API Name'].type || action.properties['API Name'].description;
                        }
                        
                        // Skip actions without API Name - they are not conform
                        if (!apiName || apiName.trim() === '') {
                            continue; // Don't add to index if no API Name
                        }
                        
                        // Extract Reference Action Type from properties if available
                        // Prefer description over type (description has the actual value like "Flow", "Standard Action", etc.)
                        let referenceActionType: string | undefined;
                        if (action.properties && action.properties['Reference Action Type']) {
                            referenceActionType = action.properties['Reference Action Type'].description || 
                                                 action.properties['Reference Action Type'].type;
                            // Filter out generic "string" values
                            if (referenceActionType === 'string' || referenceActionType === 'boolean') {
                                referenceActionType = undefined;
                            }
                        }
                        
                        // Count properties excluding "API Name"
                        const cleanProperties = { ...(action.properties || {}) };
                        delete cleanProperties['API Name'];
                        const propertyCount = Object.keys(cleanProperties).length;
                        
                        const indexEntry: any = {
                            name: actionName,
                            description: description,
                            propertyCount: propertyCount,
                            label: action.label,
                            category: action.category,
                            clouds: action.clouds || ['Core Salesforce'],
                            file: `actions/${letter}/${file}`,
                            apiName: apiName,
                            sourceUrl: action.sourceUrl
                        };
                        
                        // Add referenceActionType if it exists
                        if (referenceActionType) {
                            indexEntry.referenceActionType = referenceActionType;
                        }
                        
                        index.actions[actionName] = indexEntry;
                        index.totalActions++;
                    }
                }
            }
        }
    }
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`✅ Rebuilt index with ${index.totalActions} actions`);
}

rebuildIndex().catch(console.error);

