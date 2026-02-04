import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
    loadIndex, 
    getObject, 
    searchObjects,
    getAllObjectNames,
    getObjectDescription,
    clearCache 
} from '../src/index.js';

describe('Salesforce Metadata Reference Library', () => {
    beforeEach(() => {
        clearCache();
    });

    describe('loadIndex', () => {
        it('should load the metadata index', async () => {
            const index = await loadIndex();
            expect(index).not.toBeNull();
            expect(index?.totalObjects).toBeGreaterThan(0);
            expect(index?.objects).toBeDefined();
        });

        it('should cache the index', async () => {
            const index1 = await loadIndex();
            const index2 = await loadIndex();
            expect(index1).toBe(index2);
        });

        it('should have valid index structure', async () => {
            const index = await loadIndex();
            if (index) {
                expect(index).toHaveProperty('version');
                expect(index).toHaveProperty('totalObjects');
                expect(index).toHaveProperty('objects');
                expect(typeof index.version).toBe('string');
                expect(typeof index.totalObjects).toBe('number');
                expect(typeof index.objects).toBe('object');
            }
        });
    });

    describe('getObject', () => {
        it('should return null for non-existent object', async () => {
            const result = await getObject('NonExistentMetadataObject123');
            expect(result).toBeNull();
        });

        it('should return a metadata object with correct structure', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstObjectName = Object.keys(index.objects)[0];
            const result = await getObject(firstObjectName);
            
            expect(result).not.toBeNull();
            if (result) {
                expect(result).toHaveProperty('name');
                expect(result).toHaveProperty('properties');
                expect(typeof result.name).toBe('string');
                expect(typeof result.properties).toBe('object');
            }
        });

        it('should get CustomObject metadata', async () => {
            // Test the specific example from user's code
            const customObject = await getObject('CustomObject');
            if (customObject) {
                expect(customObject.name).toBe('CustomObject');
                expect(customObject.properties).toBeDefined();
                expect(typeof customObject.properties).toBe('object');
            }
        });

        it('should have valid properties structure', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstObjectName = Object.keys(index.objects)[0];
            const result = await getObject(firstObjectName);
            
            if (result && Object.keys(result.properties).length > 0) {
                const firstPropKey = Object.keys(result.properties)[0];
                const firstProp = result.properties[firstPropKey];
                
                expect(firstProp).toHaveProperty('type');
                expect(typeof firstProp.type).toBe('string');
            }
        });

        it('should cache objects', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstObjectName = Object.keys(index.objects)[0];
            const result1 = await getObject(firstObjectName);
            const result2 = await getObject(firstObjectName);
            
            expect(result1).toBe(result2); // Should be same reference due to caching
        });
    });

    describe('searchObjects', () => {
        it('should return an array', async () => {
            const results = await searchObjects('test');
            expect(Array.isArray(results)).toBe(true);
        });

        it('should return empty array when no matches', async () => {
            const results = await searchObjects('xyzNonExistent123456');
            expect(results).toEqual([]);
        });

        it('should find objects with string pattern', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstObjectName = Object.keys(index.objects)[0];
            const searchTerm = firstObjectName.substring(0, 3);
            const results = await searchObjects(searchTerm);
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0]).toHaveProperty('name');
            expect(results[0]).toHaveProperty('description');
            expect(results[0]).toHaveProperty('fieldCount');
        });

        it('should find objects with regex pattern', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstObjectName = Object.keys(index.objects)[0];
            const searchPattern = new RegExp(firstObjectName.substring(0, 3), 'i');
            const results = await searchObjects(searchPattern);
            
            expect(results.length).toBeGreaterThan(0);
        });

        it('should be case-insensitive with string search', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstObjectName = Object.keys(index.objects)[0];
            const lowerResults = await searchObjects(firstObjectName.toLowerCase());
            const upperResults = await searchObjects(firstObjectName.toUpperCase());
            
            expect(lowerResults.length).toBeGreaterThan(0);
            expect(upperResults.length).toBeGreaterThan(0);
        });
    });

    describe('getAllObjectNames', () => {
        it('should return an array', async () => {
            const names = await getAllObjectNames();
            expect(Array.isArray(names)).toBe(true);
        });

        it('should return at least one object name', async () => {
            const names = await getAllObjectNames();
            expect(names.length).toBeGreaterThan(0);
        });

        it('should return sorted names', async () => {
            const names = await getAllObjectNames();
            const sortedNames = [...names].sort();
            expect(names).toEqual(sortedNames);
        });

        it('should match count in index', async () => {
            const index = await loadIndex();
            const names = await getAllObjectNames();
            
            if (index) {
                expect(names.length).toBe(index.totalObjects);
            }
        });
    });

    describe('getObjectDescription', () => {
        it('should return null for non-existent object', async () => {
            const result = await getObjectDescription('NonExistentMetadataObject123');
            expect(result).toBeNull();
        });

        it('should return description for existing object', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstObjectName = Object.keys(index.objects)[0];
            const desc = await getObjectDescription(firstObjectName);
            
            if (desc) {
                expect(desc).toHaveProperty('description');
                expect(desc).toHaveProperty('fieldCount');
                expect(typeof desc.description).toBe('string');
                expect(typeof desc.fieldCount).toBe('number');
            }
        });
    });

    describe('Integration Tests', () => {
        it('should maintain consistency between index and object files', async () => {
            const index = await loadIndex();
            if (!index) return;

            const objectNames = Object.keys(index.objects).slice(0, 5);
            
            for (const objectName of objectNames) {
                const fromGetObject = await getObject(objectName);
                const indexEntry = index.objects[objectName];
                
                expect(fromGetObject).not.toBeNull();
                if (fromGetObject) {
                    expect(fromGetObject.name).toBe(objectName);
                }
            }
        });

        it('should find objects via search that exist in getObject', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstObjectName = Object.keys(index.objects)[0];
            const searchResults = await searchObjects(firstObjectName);
            
            expect(searchResults.length).toBeGreaterThan(0);
            
            const exactMatch = searchResults.find(r => r.name === firstObjectName);
            expect(exactMatch).toBeDefined();
            
            const objectData = await getObject(firstObjectName);
            expect(objectData).not.toBeNull();
        });
    });
});
