import { 
    SalesforceObject, 
    DocumentIndex, 
    CloudData, 
    SalesforceObjectCollection 
} from './types.js';

export * from './types.js';
export { CONFIGURATION } from './config.js';

// Cache to avoid re-loading data
const indexCache: { data: DocumentIndex | null; loaded: boolean } = { data: null, loaded: false };
const cloudCache = new Map<string, SalesforceObjectCollection>();

/**
 * Load the index file containing all objects and their cloud associations
 * @param useCache - Whether to use cached data (default: true)
 */
export async function loadIndex(useCache = true): Promise<DocumentIndex | null> {
    if (useCache && indexCache.loaded) {
        return indexCache.data;
    }

    try {
        // Dynamic import for tree-shaking - bundlers will handle this
        const index = await import('../doc/index.json', { assert: { type: 'json' } });
        const data = index.default || index;
        
        indexCache.data = data as DocumentIndex;
        indexCache.loaded = true;
        
        return indexCache.data;
    } catch (error) {
        console.warn('Index file not found. Make sure the package is properly installed.');
        indexCache.data = null;
        indexCache.loaded = true;
        return null;
    }
}

/**
 * Load objects for a specific cloud
 * @param cloudFileName - The cloud file name without extension
 * @param useCache - Whether to use cached data (default: true)
 */
export async function loadCloud(
    cloudFileName: string, 
    useCache = true
): Promise<SalesforceObjectCollection | null> {
    if (useCache && cloudCache.has(cloudFileName)) {
        return cloudCache.get(cloudFileName)!;
    }

    try {
        // Dynamic import based on cloud name
        const cloudData = await import(`../doc/${cloudFileName}.json`, { assert: { type: 'json' } });
        const data = (cloudData.default || cloudData) as SalesforceObjectCollection;
        
        if (useCache) {
            cloudCache.set(cloudFileName, data);
        }
        
        return data;
    } catch (error) {
        console.warn(`Cloud file not found: ${cloudFileName}.json`);
        return null;
    }
}

/**
 * Load all cloud data
 * @param useCache - Whether to use cached data (default: true)
 */
export async function loadAllClouds(useCache = true): Promise<CloudData> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return {};
    }
    
    // Get unique cloud file names from index
    const cloudFiles = new Set(
        Object.values(index.objects).map(obj => obj.file.replace('.json', ''))
    );
    
    const cloudData: CloudData = {};
    
    await Promise.all(
        Array.from(cloudFiles).map(async (cloudFileName) => {
            const data = await loadCloud(cloudFileName, useCache);
            if (data) {
                cloudData[cloudFileName] = data;
            }
        })
    );
    
    return cloudData;
}

/**
 * Get a specific object by name
 * @param objectName - The name of the Salesforce object
 * @param useCache - Whether to use cached data (default: true)
 * @returns The object data or null if not found
 */
export async function getObject(
    objectName: string,
    useCache = true
): Promise<SalesforceObject | null> {
    const index = await loadIndex(useCache);
    
    if (!index || !index.objects[objectName]) {
        return null;
    }
    
    const entry = index.objects[objectName];
    const cloudFileName = entry.file.replace('.json', '');
    const cloudData = await loadCloud(cloudFileName, useCache);
    
    return cloudData?.[objectName] || null;
}

/**
 * Search for objects by name pattern
 * @param pattern - Regex pattern or string to search for
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of matching object names with their cloud info
 */
export async function searchObjects(
    pattern: string | RegExp,
    useCache = true
): Promise<Array<{ name: string; cloud: string; file: string }>> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    
    return Object.entries(index.objects)
        .filter(([name]) => regex.test(name))
        .map(([name, info]) => ({
            name,
            cloud: info.cloud,
            file: info.file
        }));
}

/**
 * Get all objects for a specific cloud
 * @param cloudName - The cloud name (e.g., "Financial Services Cloud")
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of objects in that cloud
 */
export async function getObjectsByCloud(
    cloudName: string,
    useCache = true
): Promise<SalesforceObject[]> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    const objectsInCloud = Object.entries(index.objects)
        .filter(([, info]) => info.cloud === cloudName)
        .map(([name]) => name);
    
    if (objectsInCloud.length === 0) {
        return [];
    }
    
    const cloudFileName = index.objects[objectsInCloud[0]].file.replace('.json', '');
    const cloudData = await loadCloud(cloudFileName, useCache);
    
    if (!cloudData) {
        return [];
    }
    
    return Object.values(cloudData);
}

/**
 * Get list of all available clouds
 * @param useCache - Whether to use cached data (default: true)
 */
export async function getAvailableClouds(useCache = true): Promise<string[]> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return [];
    }
    
    const clouds = new Set(Object.values(index.objects).map(entry => entry.cloud));
    return Array.from(clouds).sort();
}

/**
 * Clear all cached data
 * Useful for testing or when you need to reload fresh data
 */
export function clearCache(): void {
    indexCache.data = null;
    indexCache.loaded = false;
    cloudCache.clear();
}

/**
 * Preload specific clouds into cache for better performance
 * @param cloudFileNames - Array of cloud file names to preload
 */
export async function preloadClouds(cloudFileNames: string[]): Promise<void> {
    await Promise.all(
        cloudFileNames.map(cloudFileName => loadCloud(cloudFileName, true))
    );
}
