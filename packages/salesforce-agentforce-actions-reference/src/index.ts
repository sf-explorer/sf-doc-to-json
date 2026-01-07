import { 
    AgentforceAction, 
    DocumentIndex, 
    AgentforceActionCollection 
} from './types.js';

export * from './types.js';

// Cache to avoid re-loading data
const indexCache: { data: DocumentIndex | null; loaded: boolean } = { data: null, loaded: false };
const actionCache = new Map<string, AgentforceAction>();

/**
 * Load the index file containing all Agentforce actions
 * @param useCache - Whether to use cached data (default: true)
 */
export async function loadIndex(useCache = true): Promise<DocumentIndex | null> {
    if (useCache && indexCache.loaded) {
        return indexCache.data;
    }

    try {
        // Dynamic import - Vite handles JSON automatically (no attribute needed)
        // @ts-ignore
        const index = await import('./doc/index.json');
        const data = (index.default || index) as DocumentIndex;
        
        indexCache.data = data;
        indexCache.loaded = true;
        
        return indexCache.data;
    } catch (error) {
        console.warn('Index file not found. Make sure the package is properly installed.');
        console.warn('Error details:', error);
        indexCache.data = null;
        indexCache.loaded = true;
        return null;
    }
}

/**
 * Load a single action from its individual file
 * @param actionName - The name of the Agentforce action
 * @param filePath - Optional file path from index (uses API Name for filename)
 * @returns The action data or null if not found
 */
async function loadActionFromFile(actionName: string, filePath?: string): Promise<AgentforceAction | null> {
    try {
        // If filePath is provided from index, use it directly (it's based on API Name)
        if (filePath) {
            // filePath format: "actions/R/RefinePostWorkSummary.json"
            // Remove "actions/" prefix and use the rest
            const relativePath = filePath.replace(/^actions\//, '');
            // @ts-ignore
            const actionData = await import(`./doc/actions/${relativePath}`);
            const data = actionData.default || actionData;
            return data as AgentforceAction || null;
        }
        
        // Fallback: try to construct filename from action name (for backward compatibility)
        const firstLetter = actionName[0].toUpperCase();
        // Sanitize action name to match file naming convention (spaces -> underscores)
        const fileName = actionName.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Dynamic import - Vite handles JSON automatically (no attribute needed)
        // File extension must be in the static part for dynamic-import-vars plugin
        // Pattern: ./doc/actions/{letter}/{fileName}.json
        // Note: fileName is sanitized to match actual file names (e.g., "Add Case Comment" -> "Add_Case_Comment")
        // @ts-ignore
        const actionData = await import(`./doc/actions/${firstLetter}/${fileName}.json`);
        const data = actionData.default || actionData;
        
        // The JSON file contains the action directly (not wrapped in an object key)
        return data as AgentforceAction || null;
    } catch (error) {
        console.warn(`Action file not found: ${actionName}`, error);
        return null;
    }
}

/**
 * Get a specific action by name
 * @param actionName - The name of the Agentforce action
 * @param useCache - Whether to use cached data (default: true)
 * @returns The action data or null if not found
 */
export async function getAction(
    actionName: string,
    useCache = true
): Promise<AgentforceAction | null> {
    if (useCache && actionCache.has(actionName)) {
        return actionCache.get(actionName)!;
    }

    // First, try to get the file path from the index (uses API Name for filename)
    const index = await loadIndex(useCache);
    let filePath: string | undefined;
    
    if (index && index.actions[actionName]) {
        filePath = index.actions[actionName].file;
    }
    
    // Load action using file path from index (preferred) or fallback to action name
    const action = await loadActionFromFile(actionName, filePath);
    
    if (action && useCache) {
        actionCache.set(actionName, action);
    }
    
    return action;
}

/**
 * Search for actions by name pattern
 * @param pattern - Regex pattern or string to search for
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of matching action names with their info
 */
export async function searchActions(
    pattern: string | RegExp,
    useCache = true
): Promise<Array<{ name: string; description: string; propertyCount: number; category?: string; clouds?: string[] }>> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    
    return Object.entries(index.actions)
        .filter(([name]) => regex.test(name))
        .map(([name, info]) => ({
            name,
            description: info.description,
            propertyCount: info.propertyCount,
            category: info.category,
            clouds: info.clouds
        }));
}

/**
 * Get all action names
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of all action names
 */
export async function getAllActionNames(useCache = true): Promise<string[]> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    return Object.keys(index.actions).sort();
}

/**
 * Load all action descriptions without loading full action data
 * This is much more efficient when you only need descriptions
 * @param useCache - Whether to use cached data (default: true)
 * @returns Object mapping action names to their descriptions and metadata
 */
export async function loadAllDescriptions(useCache = true): Promise<Record<string, { description: string; propertyCount: number; category?: string; clouds?: string[]; label?: string }> | null> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return null;
    }

    const descriptions: Record<string, { description: string; propertyCount: number; category?: string; clouds?: string[]; label?: string }> = {};
    
    for (const [name, entry] of Object.entries(index.actions)) {
        descriptions[name] = {
            description: entry.description,
            propertyCount: entry.propertyCount,
            category: entry.category,
            clouds: entry.clouds,
            label: entry.label
        };
    }
    
    return descriptions;
}

/**
 * Get description for a specific action without loading the full action data
 * @param actionName - The name of the Agentforce action
 * @param useCache - Whether to use cached data (default: true)
 * @returns The action description and metadata, or null if not found
 */
export async function getActionDescription(
    actionName: string,
    useCache = true
): Promise<{ description: string; propertyCount: number; category?: string; clouds?: string[]; label?: string } | null> {
    const index = await loadIndex(useCache);
    
    if (!index || !index.actions[actionName]) {
        return null;
    }
    
    const entry = index.actions[actionName];
    return {
        description: entry.description,
        propertyCount: entry.propertyCount,
        category: entry.category,
        clouds: entry.clouds,
        label: entry.label
    };
}

/**
 * Search for actions by description pattern
 * @param pattern - Regex pattern or string to search for in descriptions
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of matching actions with their descriptions
 */
export async function searchActionsByDescription(
    pattern: string | RegExp,
    useCache = true
): Promise<Array<{ name: string; description: string; propertyCount: number; category?: string; clouds?: string[]; label?: string }>> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    
    return Object.entries(index.actions)
        .filter(([, entry]) => regex.test(entry.description))
        .map(([name, entry]) => ({
            name,
            description: entry.description,
            propertyCount: entry.propertyCount,
            category: entry.category,
            clouds: entry.clouds,
            label: entry.label
        }));
}

/**
 * Load all actions
 * @param useCache - Whether to use cached data (default: true)
 * @returns All actions
 */
export async function loadAllActions(useCache = true): Promise<AgentforceActionCollection> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return {};
    }
    
    const collection: AgentforceActionCollection = {};
    
    await Promise.all(
        Object.keys(index.actions).map(async (actionName) => {
            const action = await getAction(actionName, useCache);
            if (action) {
                collection[actionName] = action;
            }
        })
    );
    
    return collection;
}

/**
 * Get all unique clouds from actions
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of unique cloud names
 */
export async function getAllClouds(useCache = true): Promise<string[]> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    const cloudsSet = new Set<string>();
    
    for (const entry of Object.values(index.actions)) {
        if (entry.clouds && Array.isArray(entry.clouds)) {
            entry.clouds.forEach(cloud => cloudsSet.add(cloud));
        }
    }
    
    return Array.from(cloudsSet).sort();
}

/**
 * Get actions for a specific cloud
 * @param cloudName - The cloud name (e.g., "Financial Services Cloud")
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of action names in the specified cloud
 */
export async function getActionsByCloud(
    cloudName: string,
    useCache = true
): Promise<string[]> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    return Object.entries(index.actions)
        .filter(([, entry]) => {
            if (!entry.clouds || !Array.isArray(entry.clouds)) {
                return cloudName === 'Core Salesforce';
            }
            return entry.clouds.includes(cloudName);
        })
        .map(([name]) => name)
        .sort();
}

/**
 * Clear all cached data
 * Useful for testing or when you need to reload fresh data
 */
export function clearCache(): void {
    indexCache.data = null;
    indexCache.loaded = false;
    actionCache.clear();
}

// Backward compatibility aliases (matching other packages' API)
export const getObject = getAction;
export const searchObjects = searchActions;
export const getAllObjectNames = getAllActionNames;
export const getObjectDescription = getActionDescription;
export const searchObjectsByDescription = searchActionsByDescription;
export const loadAllObjects = loadAllActions;

