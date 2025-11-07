import * as fs from 'fs';
import * as path from 'path';
import {
    loadIndex,
    getObject,
    searchObjects,
    getObjectsByCloud,
    getAvailableClouds,
    loadCloud
} from '../src/index.js';

describe('Salesforce Object Reference Library', () => {
    
    describe('loadIndex', () => {
        it('should load the index file successfully', async () => {
            const index = await loadIndex();
            
            expect(index).not.toBeNull();
            expect(index).toHaveProperty('generated');
            expect(index).toHaveProperty('version');
            expect(index).toHaveProperty('totalObjects');
            expect(index).toHaveProperty('totalClouds');
            expect(index).toHaveProperty('objects');
        });

        it('should have valid structure', async () => {
            const index = await loadIndex();
            
            if (index) {
                expect(typeof index.generated).toBe('string');
                expect(typeof index.version).toBe('string');
                expect(typeof index.totalObjects).toBe('number');
                expect(typeof index.totalClouds).toBe('number');
                expect(typeof index.objects).toBe('object');
            }
        });

        it('should have objects in the index', async () => {
            const index = await loadIndex();
            
            if (index) {
                expect(Object.keys(index.objects).length).toBeGreaterThan(0);
                expect(index.totalObjects).toBeGreaterThan(0);
                expect(index.totalClouds).toBeGreaterThan(0);
            }
        });

        it('should have valid object entries', async () => {
            const index = await loadIndex();
            
            if (index) {
                const firstObjectKey = Object.keys(index.objects)[0];
                const firstObject = index.objects[firstObjectKey];
                
                expect(firstObject).toHaveProperty('cloud');
                expect(firstObject).toHaveProperty('file');
                expect(typeof firstObject.cloud).toBe('string');
                expect(typeof firstObject.file).toBe('string');
                expect(firstObject.file).toMatch(/\.json$/);
            }
        });
    });

    describe('getObject', () => {
        it('should return null for non-existent object', async () => {
            const result = await getObject('NonExistentObject12345');
            expect(result).toBeNull();
        });

        it('should return an object with correct structure', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstObjectName = Object.keys(index.objects)[0];
            const result = await getObject(firstObjectName);
            
            expect(result).not.toBeNull();
            if (result) {
                expect(result).toHaveProperty('name');
                expect(result).toHaveProperty('description');
                expect(result).toHaveProperty('module');
                expect(result).toHaveProperty('properties');
                expect(typeof result.name).toBe('string');
                expect(typeof result.description).toBe('string');
                expect(typeof result.module).toBe('string');
                expect(typeof result.properties).toBe('object');
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
                expect(firstProp).toHaveProperty('description');
                expect(typeof firstProp.type).toBe('string');
                expect(typeof firstProp.description).toBe('string');
            }
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
            expect(results[0]).toHaveProperty('cloud');
            expect(results[0]).toHaveProperty('file');
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

    describe('getObjectsByCloud', () => {
        it('should return an array', async () => {
            const results = await getObjectsByCloud('Core Salesforce');
            expect(Array.isArray(results)).toBe(true);
        });

        it('should return empty array for non-existent cloud', async () => {
            const results = await getObjectsByCloud('Non Existent Cloud 123');
            expect(results).toEqual([]);
        });

        it('should return objects from correct cloud', async () => {
            const clouds = await getAvailableClouds();
            if (clouds.length === 0) return;

            const firstCloud = clouds[0];
            const results = await getObjectsByCloud(firstCloud);
            
            expect(results.length).toBeGreaterThan(0);
            results.forEach(obj => {
                expect(obj.module).toBe(firstCloud);
                expect(obj).toHaveProperty('name');
                expect(obj).toHaveProperty('description');
                expect(obj).toHaveProperty('properties');
            });
        });

        it('should return different objects for different clouds', async () => {
            const clouds = await getAvailableClouds();
            if (clouds.length < 2) return;

            const cloud1Results = await getObjectsByCloud(clouds[0]);
            const cloud2Results = await getObjectsByCloud(clouds[1]);
            
            expect(cloud1Results.length).toBeGreaterThan(0);
            expect(cloud2Results.length).toBeGreaterThan(0);
            
            // Check that they are different clouds
            if (cloud1Results.length > 0 && cloud2Results.length > 0) {
                expect(cloud1Results[0].module).not.toBe(cloud2Results[0].module);
            }
        });
    });

    describe('getAvailableClouds', () => {
        it('should return an array', async () => {
            const clouds = await getAvailableClouds();
            expect(Array.isArray(clouds)).toBe(true);
        });

        it('should return at least one cloud', async () => {
            const clouds = await getAvailableClouds();
            expect(clouds.length).toBeGreaterThan(0);
        });

        it('should return unique cloud names', async () => {
            const clouds = await getAvailableClouds();
            const uniqueClouds = new Set(clouds);
            expect(clouds.length).toBe(uniqueClouds.size);
        });

        it('should return sorted cloud names', async () => {
            const clouds = await getAvailableClouds();
            const sortedClouds = [...clouds].sort();
            expect(clouds).toEqual(sortedClouds);
        });

        it('should have valid cloud names', async () => {
            const clouds = await getAvailableClouds();
            clouds.forEach(cloud => {
                expect(typeof cloud).toBe('string');
                expect(cloud.length).toBeGreaterThan(0);
            });
        });
    });

    describe('loadCloud', () => {
        it('should return null for non-existent cloud', async () => {
            const result = await loadCloud('non-existent-cloud-123');
            expect(result).toBeNull();
        });

        it('should load cloud data successfully', async () => {
            const clouds = await getAvailableClouds();
            if (clouds.length === 0) return;

            const index = await loadIndex();
            if (!index) return;

            const firstCloud = clouds[0];
            const firstObjectEntry = Object.values(index.objects).find(obj => obj.cloud === firstCloud);
            if (!firstObjectEntry) return;

            const cloudFileName = firstObjectEntry.file.replace('.json', '');
            const cloudData = await loadCloud(cloudFileName);
            
            expect(cloudData).not.toBeNull();
            if (cloudData) {
                expect(typeof cloudData).toBe('object');
                expect(Object.keys(cloudData).length).toBeGreaterThan(0);
            }
        });

        it('should have valid object structure in cloud data', async () => {
            const clouds = await getAvailableClouds();
            if (clouds.length === 0) return;

            const index = await loadIndex();
            if (!index) return;

            const firstCloud = clouds[0];
            const firstObjectEntry = Object.values(index.objects).find(obj => obj.cloud === firstCloud);
            if (!firstObjectEntry) return;

            const cloudFileName = firstObjectEntry.file.replace('.json', '');
            const cloudData = await loadCloud(cloudFileName);
            
            if (cloudData) {
                const firstObjectKey = Object.keys(cloudData)[0];
                const firstObject = cloudData[firstObjectKey];
                
                expect(firstObject).toHaveProperty('name');
                expect(firstObject).toHaveProperty('description');
                expect(firstObject).toHaveProperty('module');
                expect(firstObject).toHaveProperty('properties');
            }
        });
    });

    describe('Integration Tests', () => {
        it('should maintain consistency between index and cloud files', async () => {
            const index = await loadIndex();
            if (!index) return;

            const objectNames = Object.keys(index.objects).slice(0, 5);
            
            for (const objectName of objectNames) {
                const fromGetObject = await getObject(objectName);
                const indexEntry = index.objects[objectName];
                
                expect(fromGetObject).not.toBeNull();
                if (fromGetObject) {
                    expect(fromGetObject.name).toBe(objectName);
                    expect(fromGetObject.module).toBe(indexEntry.cloud);
                }
            }
        });

        it('should return same objects via different methods', async () => {
            const clouds = await getAvailableClouds();
            if (clouds.length === 0) return;

            const firstCloud = clouds[0];
            const objectsByCloud = await getObjectsByCloud(firstCloud);
            
            if (objectsByCloud.length > 0) {
                const firstObject = objectsByCloud[0];
                const objectByName = await getObject(firstObject.name);
                
                expect(objectByName).not.toBeNull();
                if (objectByName) {
                    expect(objectByName.name).toBe(firstObject.name);
                    // Note: Same object name can exist in multiple clouds
                    // The index will return the first one it finds
                    expect(typeof objectByName.module).toBe('string');
                    expect(objectByName.module.length).toBeGreaterThan(0);
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

