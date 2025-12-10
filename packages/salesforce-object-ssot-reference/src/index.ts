import { 
    SalesforceObject, 
    DocumentIndex, 
    SalesforceObjectCollection 
} from './types.js';

export * from './types.js';

// Statically import the DMO index
// @ts-ignore
import dmoIndexJson from './doc/index.json';

// Cache to avoid re-loading data
const indexCache: { data: DocumentIndex | null; loaded: boolean } = { data: null, loaded: false };
const objectCache = new Map<string, SalesforceObject>();

/**
 * Load the index file containing all SSOT objects from DMO APIs
 * @param useCache - Whether to use cached data (default: true)
 */
export async function loadIndex(useCache = true): Promise<DocumentIndex | null> {
    if (useCache && indexCache.loaded) {
        return indexCache.data;
    }

    try {
        // The dmo-index.json already has the right structure
        const rawData = dmoIndexJson as any;
        
        const data: DocumentIndex = {
            version: rawData.generated || '1.0.0',
            totalObjects: rawData.totalObjects,
            generatedAt: rawData.generated,
            objects: rawData.objects
        };
        
        indexCache.data = data;
        indexCache.loaded = true;
        
        return indexCache.data;
    } catch (error) {
        console.warn('DMO index file not found. Make sure the package is properly installed.');
        console.warn('Error details:', error);
        indexCache.data = null;
        indexCache.loaded = true;
        return null;
    }
}

/**
 * Load a single SSOT object from its individual file
 * @param objectName - The display name of the Salesforce SSOT object (e.g., "Account Contact")
 * @returns The object data or null if not found
 */
async function loadObjectFromFile(objectName: string): Promise<SalesforceObject | null> {
    try {
        const firstLetter = objectName[0].toUpperCase();
        
        // Dynamic import - file is named by display name
        // @ts-ignore
        const objectData = await import(`./doc/objects/${firstLetter}/${objectName}.json`);
        const data = objectData.default || objectData;
        
        // The JSON structure has the API name as the key (e.g., "ssot__AccountContact__dlm")
        // So we need to get the first (and only) key from the object
        const keys = Object.keys(data);
        if (keys.length === 0) {
            return null;
        }
        
        const apiName = keys[0];
        const obj = data[apiName];
        return obj || null;
    } catch (error) {
        console.warn(`SSOT object file not found: ${objectName}`);
        return null;
    }
}

/**
 * Get a specific SSOT object by name
 * @param objectName - The name of the Salesforce object
 * @param useCache - Whether to use cached data (default: true)
 * @returns The object data or null if not found
 */
export async function getObject(
    objectName: string,
    useCache = true
): Promise<SalesforceObject | null> {
    if (useCache && objectCache.has(objectName)) {
        return objectCache.get(objectName)!;
    }

    const obj = await loadObjectFromFile(objectName);
    
    if (obj && useCache) {
        objectCache.set(objectName, obj);
    }
    
    return obj;
}

/**
 * Search for SSOT objects by name pattern
 * @param pattern - Regex pattern or string to search for
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of matching object names with their info
 */
export async function searchObjects(
    pattern: string | RegExp,
    useCache = true
): Promise<Array<{ name: string; description: string; fieldCount: number }>> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    
    return Object.entries(index.objects)
        .filter(([name]) => regex.test(name))
        .map(([name, info]) => ({
            name,
            description: info.description,
            fieldCount: info.fieldCount
        }));
}

/**
 * Get all SSOT object names
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of all SSOT object names
 */
export async function getAllObjectNames(useCache = true): Promise<string[]> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    return Object.keys(index.objects).sort();
}

/**
 * Load all SSOT object descriptions without loading full object data
 * This is much more efficient when you only need descriptions
 * @param useCache - Whether to use cached data (default: true)
 * @returns Object mapping object names to their descriptions and metadata
 */
export async function loadAllDescriptions(useCache = true): Promise<Record<string, { description: string; fieldCount: number; label?: string }> | null> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return null;
    }

    const descriptions: Record<string, { description: string; fieldCount: number; label?: string }> = {};
    
    for (const [name, entry] of Object.entries(index.objects)) {
        descriptions[name] = {
            description: entry.description,
            fieldCount: entry.fieldCount,
            label: entry.label
        };
    }
    
    return descriptions;
}

/**
 * Get description for a specific SSOT object without loading the full object data
 * @param objectName - The name of the Salesforce object
 * @param useCache - Whether to use cached data (default: true)
 * @returns The object description and metadata, or null if not found
 */
export async function getObjectDescription(
    objectName: string,
    useCache = true
): Promise<{ description: string; fieldCount: number; label?: string } | null> {
    const index = await loadIndex(useCache);
    
    if (!index || !index.objects[objectName]) {
        return null;
    }
    
    const entry = index.objects[objectName];
    return {
        description: entry.description,
        fieldCount: entry.fieldCount,
        label: entry.label
    };
}

/**
 * Search for SSOT objects by description pattern
 * @param pattern - Regex pattern or string to search for in descriptions
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of matching objects with their descriptions
 */
export async function searchObjectsByDescription(
    pattern: string | RegExp,
    useCache = true
): Promise<Array<{ name: string; description: string; fieldCount: number; label?: string }>> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    
    return Object.entries(index.objects)
        .filter(([, entry]) => regex.test(entry.description))
        .map(([name, entry]) => ({
            name,
            description: entry.description,
            fieldCount: entry.fieldCount,
            label: entry.label
        }));
}

/**
 * Load all SSOT objects
 * @param useCache - Whether to use cached data (default: true)
 * @returns All SSOT objects
 */
export async function loadAllObjects(useCache = true): Promise<SalesforceObjectCollection> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return {};
    }
    
    const collection: SalesforceObjectCollection = {};
    
    await Promise.all(
        Object.keys(index.objects).map(async (objectName) => {
            const obj = await getObject(objectName, useCache);
            if (obj) {
                collection[objectName] = obj;
            }
        })
    );
    
    return collection;
}

/**
 * Clear all cached data
 * Useful for testing or when you need to reload fresh data
 */
export function clearCache(): void {
    indexCache.data = null;
    indexCache.loaded = false;
    objectCache.clear();
}

