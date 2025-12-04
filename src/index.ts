import { 
    SalesforceObject, 
    DocumentIndex, 
    CloudData, 
    SalesforceObjectCollection 
} from './types.js';

export * from './types.js';
export { CONFIGURATION } from './config.js';

// Statically import all cloud JSON files for bundlers
// @ts-ignore
import automotiveCloudJson from './doc/automotive-cloud.json';
// @ts-ignore
import consumerGoodsCloudJson from './doc/consumer-goods-cloud.json';
// @ts-ignore
import coreSalesforceJson from './doc/core-salesforce.json';
// @ts-ignore
import educationCloudJson from './doc/education-cloud.json';
// @ts-ignore
import energyAndUtilitiesCloudJson from './doc/energy-and-utilities-cloud.json';
// @ts-ignore
import feedbackManagementJson from './doc/feedback-management.json';
// @ts-ignore
import fieldServiceLightningJson from './doc/field-service-lightning.json';
// @ts-ignore
import financialServicesCloudJson from './doc/financial-services-cloud.json';
// @ts-ignore
import healthCloudJson from './doc/health-cloud.json';
// @ts-ignore
import loyaltyCloudJson from './doc/loyalty-cloud.json';
// @ts-ignore
import manufacturingCloudJson from './doc/manufacturing-cloud.json';
// @ts-ignore
import metadataJson from './doc/metadata.json';
// @ts-ignore
import netZeroCloudJson from './doc/net-zero-cloud.json';
// @ts-ignore
import nonprofitCloudJson from './doc/nonprofit-cloud.json';
// @ts-ignore
import publicSectorCloudJson from './doc/public-sector-cloud.json';
// @ts-ignore
import revenueLifecycleManagementJson from './doc/revenue-lifecycle-management.json';
// @ts-ignore
import salesCloudJson from './doc/sales-cloud.json';
// @ts-ignore
import schedulerJson from './doc/scheduler.json';
// @ts-ignore
import serviceCloudJson from './doc/service-cloud.json';
// @ts-ignore
import toolingApiJson from './doc/tooling-api.json';

// Create a lookup map for cloud data by filename
const CLOUD_DATA_MAP: Record<string, any> = {
    'automotive-cloud.json': automotiveCloudJson,
    'consumer-goods-cloud.json': consumerGoodsCloudJson,
    'core-salesforce.json': coreSalesforceJson,
    'education-cloud.json': educationCloudJson,
    'energy-and-utilities-cloud.json': energyAndUtilitiesCloudJson,
    'feedback-management.json': feedbackManagementJson,
    'field-service-lightning.json': fieldServiceLightningJson,
    'financial-services-cloud.json': financialServicesCloudJson,
    'health-cloud.json': healthCloudJson,
    'loyalty-cloud.json': loyaltyCloudJson,
    'manufacturing-cloud.json': manufacturingCloudJson,
    'metadata.json': metadataJson,
    'net-zero-cloud.json': netZeroCloudJson,
    'nonprofit-cloud.json': nonprofitCloudJson,
    'public-sector-cloud.json': publicSectorCloudJson,
    'revenue-lifecycle-management.json': revenueLifecycleManagementJson,
    'sales-cloud.json': salesCloudJson,
    'scheduler.json': schedulerJson,
    'service-cloud.json': serviceCloudJson,
    'tooling-api.json': toolingApiJson
};

// Cache to avoid re-loading data
const indexCache: { data: DocumentIndex | null; loaded: boolean } = { data: null, loaded: false };
const cloudCache = new Map<string, SalesforceObjectCollection>();

/**
 * Convert a cloud display name to its file name
 * This ensures consistent naming across the codebase
 * @param cloudName - The cloud display name (e.g., "Financial Services Cloud")
 * @returns The file name (e.g., "financial-services-cloud")
 */
function cloudNameToFileName(cloudName: string): string {
    return cloudName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

/**
 * Load the index file containing all objects and their cloud associations
 * @param useCache - Whether to use cached data (default: true)
 */
export async function loadIndex(useCache = true): Promise<DocumentIndex | null> {
    if (useCache && indexCache.loaded) {
        return indexCache.data;
    }

    try {
        // Static import works in both Node.js and bundlers
        // @ts-ignore - TypeScript doesn't like JSON imports but bundlers handle them
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
        // Get cloud data from static imports
        const fileName = cloudFileName.endsWith('.json') ? cloudFileName : `${cloudFileName}.json`;
        const cloudModule = CLOUD_DATA_MAP[fileName];
        
        if (!cloudModule) {
            console.warn(`Cloud file not found in static imports: ${fileName}`);
            return null;
        }
        
        const cloudData = cloudModule.default || cloudModule;
        
        // Check if this is the new format (has 'objects' array) or old format (direct object collection)
        if (cloudData.objects && Array.isArray(cloudData.objects)) {
            // New format: Load each object individually
            const collection: SalesforceObjectCollection = {};
            const cloudName = cloudData.cloud;
            
            await Promise.all(
                cloudData.objects.map(async (objectName: string) => {
                    const obj = await loadObjectFromFile(objectName, cloudName);
                    if (obj) {
                        collection[objectName] = obj;
                    }
                })
            );
            
            if (useCache) {
                cloudCache.set(cloudFileName, collection);
            }
            
            return collection;
        } else {
            // Old format: Direct object collection (backwards compatibility)
            const data = cloudData as SalesforceObjectCollection;
            
            if (useCache) {
                cloudCache.set(cloudFileName, data);
            }
            
            return data;
        }
    } catch (error) {
        console.warn(`Cloud file not found: ${cloudFileName}.json`);
        return null;
    }
}

/**
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

/**
 * Get the base path for fetching assets (only works in browser)
 */
function getBasePath(): string {
    if (typeof window === 'undefined') return '/';
    try {
        // @ts-ignore - import.meta.env is a Vite-specific feature
        return import.meta.env?.BASE_URL || '/';
    } catch {
        return '/';
    }
}

/**
 * Load a single object from its individual file
 * @param objectName - The name of the Salesforce object
 * @param expectedCloud - Optional cloud name to set on the object (for multi-cloud objects)
 * @returns The object data or null if not found
 */
async function loadObjectFromFile(objectName: string, expectedCloud?: string): Promise<SalesforceObject | null> {
    try {
        const firstLetter = objectName[0].toUpperCase();
        let data;
        
        // Individual object files are too numerous to statically import
        // In browser, fetch from public folder; in Node.js, use dynamic import
        if (isBrowser()) {
            const basePath = getBasePath();
            const folder = expectedCloud === 'Metadata API' ? 'metadata' : 'objects';
            const response = await fetch(`${basePath}doc/${folder}/${firstLetter}/${objectName}.json`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            data = await response.json();
        } else {
            // In Node.js, use dynamic import
            if (expectedCloud === 'Metadata API') {
                // @ts-ignore
                const objectData = await import(`./doc/metadata/${firstLetter}/${objectName}.json`);
                data = objectData.default || objectData;
            } else {
                // @ts-ignore
                const objectData = await import(`./doc/objects/${firstLetter}/${objectName}.json`);
                data = objectData.default || objectData;
            }
        }
        
        const obj = data[objectName];
        
        // If expectedCloud is provided and different from the object's module, override it
        // This handles objects that appear in multiple clouds
        if (obj && expectedCloud && obj.module !== expectedCloud) {
            return {
                ...obj,
                module: expectedCloud
            };
        }
        
        return obj || null;
    } catch (error) {
        console.warn(`Object file not found: ${objectName}`);
        return null;
    }
}

/**
 * Load all cloud data
 * @param useCache - Whether to use cached data (default: true)
 */
export async function loadAllClouds(useCache = true): Promise<CloudData> {
    const index = await loadIndex(useCache);
    
    if (!index || !index.clouds) {
        console.warn('Cloud index not found. Please regenerate the index.');
        return {};
    }
    
    // Use the cloud index from index.json - no guessing
    const cloudFiles = Object.keys(index.clouds);
    const cloudData: CloudData = {};
    
    await Promise.all(
        cloudFiles.map(async (cloudFileName) => {
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
    
    // Check if file path points to individual object file (new format)
    if (entry.file.startsWith('objects/') || entry.file.startsWith('metadata/')) {
        return await loadObjectFromFile(objectName, entry.cloud);
    }
    
    // Old format: Load from cloud file
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
    
    // Check if using new format (objects/ or metadata/ path)
    const firstEntry = index.objects[objectsInCloud[0]];
    if (firstEntry.file.startsWith('objects/') || firstEntry.file.startsWith('metadata/')) {
        // New format: Load each object individually with the correct cloud name
        const objects = await Promise.all(
            objectsInCloud.map(name => loadObjectFromFile(name, cloudName))
        );
        return objects.filter(obj => obj !== null) as SalesforceObject[];
    } else {
        // Old format: Load from cloud file
        const cloudFileName = firstEntry.file.replace('.json', '');
        const cloudData = await loadCloud(cloudFileName, useCache);
        
        if (!cloudData) {
            return [];
        }
        
        return Object.values(cloudData);
    }
}

/**
 * Get list of all available clouds
 * @param useCache - Whether to use cached data (default: true)
 */
export async function getAvailableClouds(useCache = true): Promise<string[]> {
    const index = await loadIndex(useCache);
    
    if (!index || !index.clouds) {
        console.warn('Cloud index not found. Please regenerate the index.');
        return [];
    }
    
    // Use the cloud index from index.json - no guessing
    return Object.values(index.clouds)
        .map(cloudEntry => cloudEntry.cloud)
        .sort();
}

/**
 * Cloud metadata including description, emoji, and icon file
 */
export interface CloudMetadata {
    cloud: string;
    description: string;
    emoji?: string;
    iconFile?: string | null;
    objectCount: number;
}

/**
 * Get metadata for all clouds including emoji and iconFile
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of cloud metadata objects
 */
export async function getAllCloudMetadata(useCache = true): Promise<CloudMetadata[]> {
    const index = await loadIndex(useCache);
    
    if (!index || !index.clouds) {
        return [];
    }
    
    // Load cloud metadata from static imports
    const cloudPromises = Object.values(index.clouds).map(async (cloudEntry) => {
        try {
            const cloudModule = CLOUD_DATA_MAP[cloudEntry.fileName];
            
            if (!cloudModule) {
                console.warn(`Cloud file not found in static imports: ${cloudEntry.fileName}`);
                return null;
            }
            
            const cloudData = cloudModule.default || cloudModule;
            
            return {
                cloud: cloudEntry.cloud,
                description: cloudData.description || `Discover objects and features for ${cloudEntry.cloud}.`,
                emoji: cloudData.emoji || '☁️',
                iconFile: cloudData.iconFile || null,
                objectCount: cloudData.objectCount || 0
            };
        } catch (error) {
            console.warn(`Failed to load cloud metadata for ${cloudEntry.cloud}:`, error);
            return null;
        }
    });
    
    const results = (await Promise.all(cloudPromises)).filter(
        (result): result is NonNullable<typeof result> => result !== null
    );
    
    return results.sort((a, b) => a.cloud.localeCompare(b.cloud));
}

/**
 * Get metadata for a specific cloud
 * @param cloudName - The cloud name (e.g., "Financial Services Cloud")
 * @param useCache - Whether to use cached data (default: true)
 * @returns Cloud metadata or null if not found
 */
export async function getCloudMetadata(
    cloudName: string,
    useCache = true
): Promise<CloudMetadata | null> {
    const index = await loadIndex(useCache);
    
    if (!index || !index.clouds) {
        return null;
    }
    
    const cloudEntry = Object.values(index.clouds).find(
        entry => entry.cloud === cloudName
    );
    
    if (!cloudEntry) {
        return null;
    }
    
    try {
        const cloudModule = CLOUD_DATA_MAP[cloudEntry.fileName];
        
        if (!cloudModule) {
            console.warn(`Cloud file not found in static imports: ${cloudEntry.fileName}`);
            return null;
        }
        
        const cloudData = cloudModule.default || cloudModule;
        
        return {
            cloud: cloudEntry.cloud,
            description: cloudData.description || `Discover objects and features for ${cloudEntry.cloud}.`,
            emoji: cloudData.emoji || '☁️',
            iconFile: cloudData.iconFile || null,
            objectCount: cloudData.objectCount || 0
        };
    } catch (error) {
        console.warn(`Failed to load cloud metadata for ${cloudName}:`, error);
        return null;
    }
}

/**
 * Load all object descriptions without loading full object data
 * This is much more efficient when you only need descriptions
 * @param useCache - Whether to use cached data (default: true)
 * @returns Object mapping object names to their descriptions and metadata
 */
export async function loadAllDescriptions(useCache = true): Promise<Record<string, { description: string; cloud: string; fieldCount: number; keyPrefix?: string; label?: string; sourceUrl?: string; icon?: string }> | null> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return null;
    }

    const descriptions: Record<string, { description: string; cloud: string; fieldCount: number; keyPrefix?: string; label?: string; sourceUrl?: string; icon?: string }> = {};
    
    for (const [name, entry] of Object.entries(index.objects)) {
        descriptions[name] = {
            description: entry.description,
            cloud: entry.cloud,
            fieldCount: entry.fieldCount,
            keyPrefix: entry.keyPrefix,
            label: entry.label,
            sourceUrl: entry.sourceUrl,
            icon: entry.icon
        };
    }
    
    return descriptions;
}

/**
 * Get description for a specific object without loading the full object data
 * @param objectName - The name of the Salesforce object
 * @param useCache - Whether to use cached data (default: true)
 * @returns The object description and metadata, or null if not found
 */
export async function getObjectDescription(
    objectName: string,
    useCache = true
): Promise<{ description: string; cloud: string; fieldCount: number; keyPrefix?: string; label?: string; sourceUrl?: string } | null> {
    const index = await loadIndex(useCache);
    
    if (!index || !index.objects[objectName]) {
        return null;
    }
    
    const entry = index.objects[objectName];
    return {
        description: entry.description,
        cloud: entry.cloud,
        fieldCount: entry.fieldCount,
        keyPrefix: entry.keyPrefix,
        label: entry.label,
        sourceUrl: entry.sourceUrl
    };
}

/**
 * Search for objects by description pattern
 * @param pattern - Regex pattern or string to search for in descriptions
 * @param useCache - Whether to use cached data (default: true)
 * @returns Array of matching objects with their descriptions
 */
export async function searchObjectsByDescription(
    pattern: string | RegExp,
    useCache = true
): Promise<Array<{ name: string; description: string; cloud: string; fieldCount: number; keyPrefix?: string; label?: string; sourceUrl?: string }>> {
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
            cloud: entry.cloud,
            fieldCount: entry.fieldCount,
            keyPrefix: entry.keyPrefix,
            label: entry.label,
            sourceUrl: entry.sourceUrl
        }));
}

/**
 * Get all descriptions for objects in a specific cloud
 * @param cloudName - The cloud name (e.g., "Financial Services Cloud")
 * @param useCache - Whether to use cached data (default: true)
 * @returns Object mapping object names to their descriptions for that cloud
 */
export async function getDescriptionsByCloud(
    cloudName: string,
    useCache = true
): Promise<Record<string, { description: string; fieldCount: number; keyPrefix?: string; label?: string; sourceUrl?: string }>> {
    const index = await loadIndex(useCache);
    
    if (!index) {
        return {};
    }
    
    const result: Record<string, { description: string; fieldCount: number; keyPrefix?: string; label?: string; sourceUrl?: string }> = {};
    
    for (const [name, entry] of Object.entries(index.objects)) {
        if (entry.cloud === cloudName) {
            result[name] = {
                description: entry.description,
                fieldCount: entry.fieldCount,
                keyPrefix: entry.keyPrefix,
                label: entry.label,
                sourceUrl: entry.sourceUrl
            };
        }
    }
    
    return result;
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
