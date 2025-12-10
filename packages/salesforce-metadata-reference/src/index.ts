import { 
    SalesforceMetadataObject, 
    DocumentIndex, 
    SalesforceMetadataCollection 
} from './types.js';

export * from './types.js';

// Statically import the metadata index
// @ts-ignore
import metadataIndexJson from './doc/index.json';

// Cache to avoid re-loading data
const indexCache: { data: DocumentIndex | null; loaded: boolean } = { data: null, loaded: false };
const objectCache = new Map<string, SalesforceMetadataObject>();

/**
 * Load the index file containing all Metadata API objects
 * @param useCache - Whether to use cached data (default: true)
 */
export async function loadIndex(useCache = true): Promise<DocumentIndex | null> {
    if (useCache && indexCache.loaded) {
        return indexCache.data;
    }

    try {
        // The metadata-index.json is a cloud file format, we need to convert it
        const cloudData = metadataIndexJson as any;
        
        // Convert to DocumentIndex format
        const objects: Record<string, any> = {};
        if (cloudData.objects && Array.isArray(cloudData.objects)) {
            cloudData.objects.forEach((name: string) => {
                objects[name] = {
                    description: '',
                    fieldCount: 0,
                    file: `objects/${name[0].toUpperCase()}/${name}.json`
                };
            });
        }
        
        const data: DocumentIndex = {
            version: '1.0.0',
            totalObjects: cloudData.objectCount || cloudData.objects?.length || 0,
            objects
        };
        
        indexCache.data = data;
        indexCache.loaded = true;
        
        return indexCache.data;
    } catch (error) {
        console.warn('Metadata index file not found. Make sure the package is properly installed.');
        console.warn('Error details:', error);
        indexCache.data = null;
        indexCache.loaded = true;
        return null;
    }
}

/**
 * Load a single metadata object from its individual file
 * @param objectName - The name of the Salesforce metadata object
 * @returns The object data or null if not found
 */
async function loadObjectFromFile(objectName: string): Promise<SalesforceMetadataObject | null> {
    try {
        const firstLetter = objectName[0].toUpperCase();
        
        // Dynamic import
        // @ts-ignore
        const objectData = await import(`./doc/objects/${firstLetter}/${objectName}.json`);
        const data = objectData.default || objectData;
        
        const obj = data[objectName];
        return obj || null;
    } catch (error) {
        console.warn(`Metadata object file not found: ${objectName}`);
        return null;
    }
}

/**
 * Get a specific metadata object by name
 * @param objectName - The name of the Salesforce metadata object
 * @param useCache - Whether to use cached data (default: true)
 * @returns The object data or null if not found
 */
export async function getObject(
    objectName: string,
    useCache = true
): Promise<SalesforceMetadataObject | null> {
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
 * Search for metadata objects by name pattern
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
 * Get all metadata object names
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of all metadata object names
 */
export async function getAllObjectNames(useCache = true): Promise<string[]> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    return Object.keys(index.objects).sort();
}

/**
 * Load all metadata object descriptions without loading full object data
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
 * Get description for a specific metadata object without loading the full object data
 * @param objectName - The name of the Salesforce metadata object
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
 * Search for metadata objects by description pattern
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
 * Load all metadata objects
 * @param useCache - Whether to use cached data (default: true)
 * @returns All metadata objects
 */
export async function loadAllObjects(useCache = true): Promise<SalesforceMetadataCollection> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return {};
    }
    
    const collection: SalesforceMetadataCollection = {};
    
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

