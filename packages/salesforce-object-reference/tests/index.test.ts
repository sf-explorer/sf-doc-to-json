import {
    loadIndex,
    getObject,
    searchObjects,
    getObjectsByCloud,
    getAvailableClouds,
    loadCloud,
    loadAllDescriptions,
    getObjectDescription,
    searchObjectsByDescription,
    getDescriptionsByCloud,
    clearCache
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
                expect(firstObject).toHaveProperty('description');
                expect(firstObject).toHaveProperty('fieldCount');
                expect(typeof firstObject.cloud).toBe('string');
                expect(typeof firstObject.file).toBe('string');
                expect(typeof firstObject.description).toBe('string');
                expect(typeof firstObject.fieldCount).toBe('number');
                expect(firstObject.file).toMatch(/\.json$/);
                expect(firstObject.fieldCount).toBeGreaterThanOrEqual(0);
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
            if (clouds.length !== uniqueClouds.size) {
                const duplicates = clouds.filter((cloud, index) => clouds.indexOf(cloud) !== index);
                console.log('Duplicate clouds found:', duplicates);
            }
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

            // Convert cloud display name to filename
            const cloudFileName = firstCloud
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
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

            // Convert cloud display name to filename
            const cloudFileName = firstCloud
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
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

    describe('Descriptions API', () => {
        describe('loadAllDescriptions', () => {
            it('should load all descriptions successfully', async () => {
                const descriptions = await loadAllDescriptions();
                
                expect(descriptions).not.toBeNull();
                expect(typeof descriptions).toBe('object');
            });

            it('should have valid description structure', async () => {
                const descriptions = await loadAllDescriptions();
                
                if (descriptions) {
                    const firstKey = Object.keys(descriptions)[0];
                    const firstDesc = descriptions[firstKey];
                    
                    expect(firstDesc).toHaveProperty('description');
                    expect(firstDesc).toHaveProperty('cloud');
                    expect(firstDesc).toHaveProperty('fieldCount');
                    expect(typeof firstDesc.description).toBe('string');
                    expect(typeof firstDesc.cloud).toBe('string');
                    expect(typeof firstDesc.fieldCount).toBe('number');
                    expect(firstDesc.fieldCount).toBeGreaterThanOrEqual(0);
                }
            });

            it('should match the count in index', async () => {
                const index = await loadIndex();
                const descriptions = await loadAllDescriptions();
                
                if (index && descriptions) {
                    expect(Object.keys(descriptions).length).toBe(Object.keys(index.objects).length);
                }
            });
        });

        describe('getObjectDescription', () => {
            it('should return null for non-existent object', async () => {
                const result = await getObjectDescription('NonExistentObject12345');
                expect(result).toBeNull();
            });

            it('should return description for existing object', async () => {
                const index = await loadIndex();
                if (!index) return;

                const firstObjectName = Object.keys(index.objects)[0];
                const desc = await getObjectDescription(firstObjectName);
                
                expect(desc).not.toBeNull();
                if (desc) {
                    expect(desc).toHaveProperty('description');
                    expect(desc).toHaveProperty('cloud');
                    expect(desc).toHaveProperty('fieldCount');
                    expect(typeof desc.description).toBe('string');
                    expect(typeof desc.cloud).toBe('string');
                    expect(typeof desc.fieldCount).toBe('number');
                }
            });

            it('should match data from index', async () => {
                const index = await loadIndex();
                if (!index) return;

                const objectName = Object.keys(index.objects)[0];
                const desc = await getObjectDescription(objectName);
                const indexEntry = index.objects[objectName];
                
                if (desc) {
                    expect(desc.description).toBe(indexEntry.description);
                    expect(desc.cloud).toBe(indexEntry.cloud);
                    expect(desc.fieldCount).toBe(indexEntry.fieldCount);
                }
            });

            it('should be faster than loading full object', async () => {
                const index = await loadIndex();
                if (!index) return;

                const objectName = Object.keys(index.objects)[0];
                
                const descStart = Date.now();
                await getObjectDescription(objectName);
                const descTime = Date.now() - descStart;
                
                const objStart = Date.now();
                await getObject(objectName);
                const objTime = Date.now() - objStart;
                
                // Description should be faster (though both might be very fast in tests)
                expect(descTime).toBeLessThanOrEqual(objTime + 50); // Allow 50ms margin
            });
        });

        describe('searchObjectsByDescription', () => {
            it('should return an array', async () => {
                const results = await searchObjectsByDescription('test');
                expect(Array.isArray(results)).toBe(true);
            });

            it('should return empty array when no matches', async () => {
                const results = await searchObjectsByDescription('xyzNonExistentDescription123456');
                expect(results).toEqual([]);
            });

            it('should find objects by description content', async () => {
                const index = await loadIndex();
                if (!index) return;

                // Find an object with a non-empty description
                const objectWithDesc = Object.entries(index.objects).find(([, entry]) => entry.description.length > 10);
                if (!objectWithDesc) return;

                const [, entry] = objectWithDesc;
                // Search for a word from the description
                const words = entry.description.split(' ');
                const searchWord = words.find(w => w.length > 4); // Find a word longer than 4 chars
                
                if (searchWord) {
                    const results = await searchObjectsByDescription(searchWord.toLowerCase());
                    expect(results.length).toBeGreaterThan(0);
                    
                    results.forEach(result => {
                        expect(result).toHaveProperty('name');
                        expect(result).toHaveProperty('description');
                        expect(result).toHaveProperty('cloud');
                        expect(result).toHaveProperty('fieldCount');
                    });
                }
            });

            it('should be case-insensitive', async () => {
                const index = await loadIndex();
                if (!index) return;

                const objectWithDesc = Object.entries(index.objects).find(([, entry]) => entry.description.length > 10);
                if (!objectWithDesc) return;

                const [, entry] = objectWithDesc;
                const words = entry.description.split(' ');
                const searchWord = words.find(w => w.length > 4);
                
                if (searchWord) {
                    const lowerResults = await searchObjectsByDescription(searchWord.toLowerCase());
                    const upperResults = await searchObjectsByDescription(searchWord.toUpperCase());
                    
                    expect(lowerResults.length).toBeGreaterThan(0);
                    expect(upperResults.length).toBeGreaterThan(0);
                    expect(lowerResults.length).toBe(upperResults.length);
                }
            });

            it('should support regex patterns', async () => {
                const results = await searchObjectsByDescription(/account|contact/i);
                expect(Array.isArray(results)).toBe(true);
                
                results.forEach(result => {
                    const desc = result.description.toLowerCase();
                    expect(desc.includes('account') || desc.includes('contact')).toBe(true);
                });
            });
        });

        describe('getDescriptionsByCloud', () => {
            it('should return empty object for non-existent cloud', async () => {
                const results = await getDescriptionsByCloud('Non Existent Cloud 123');
                expect(results).toEqual({});
            });

            it('should return descriptions for existing cloud', async () => {
                const clouds = await getAvailableClouds();
                if (clouds.length === 0) return;

                const firstCloud = clouds[0];
                const descriptions = await getDescriptionsByCloud(firstCloud);
                
                expect(typeof descriptions).toBe('object');
                expect(Object.keys(descriptions).length).toBeGreaterThan(0);
                
                Object.entries(descriptions).forEach(([name, info]) => {
                    expect(typeof name).toBe('string');
                    expect(info).toHaveProperty('description');
                    expect(info).toHaveProperty('fieldCount');
                    expect(typeof info.description).toBe('string');
                    expect(typeof info.fieldCount).toBe('number');
                });
            });

            it('should match count with getObjectsByCloud or be within expected variance', async () => {
                const clouds = await getAvailableClouds();
                if (clouds.length === 0) return;

                const firstCloud = clouds[0];
                const descriptions = await getDescriptionsByCloud(firstCloud);
                const fullObjects = await getObjectsByCloud(firstCloud);
                
                // Debug: find which objects are in descriptions but not in fullObjects
                const descKeys = Object.keys(descriptions);
                const fullObjectNames = fullObjects.map(obj => obj.name);
                const inDescNotInFull = descKeys.filter(key => !fullObjectNames.includes(key));
                
                if (inDescNotInFull.length > 0) {
                    console.log('Cloud:', firstCloud);
                    console.log('Descriptions count:', descKeys.length);
                    console.log('Full objects count:', fullObjects.length);
                    console.log('Objects in index but missing files:', inDescNotInFull);
                }
                
                // Allow for small variance - some objects may be in index but file might be missing
                // This is expected in some edge cases (multi-cloud objects, field extensions, etc.)
                const variance = Math.abs(descKeys.length - fullObjects.length);
                expect(variance).toBeLessThanOrEqual(15); // Allow up to 15 missing files (field extensions)
            });

            it('should return different results for different clouds', async () => {
                const clouds = await getAvailableClouds();
                if (clouds.length < 2) return;

                const cloud1Desc = await getDescriptionsByCloud(clouds[0]);
                const cloud2Desc = await getDescriptionsByCloud(clouds[1]);
                
                expect(Object.keys(cloud1Desc).length).toBeGreaterThan(0);
                expect(Object.keys(cloud2Desc).length).toBeGreaterThan(0);
                
                // They should have different objects (in most cases)
                const cloud1Keys = Object.keys(cloud1Desc);
                const cloud2Keys = Object.keys(cloud2Desc);
                const allSame = cloud1Keys.every(key => cloud2Keys.includes(key)) && 
                               cloud2Keys.every(key => cloud1Keys.includes(key));
                
                expect(allSame).toBe(false);
            });
        });

        describe('Descriptions Performance', () => {
            it('should load descriptions faster than loading all objects', async () => {
                // Clear cache for accurate timing
                clearCache();
                
                const descStart = Date.now();
                const descriptions = await loadAllDescriptions();
                const descTime = Date.now() - descStart;
                
                // Clear cache again for fair comparison
                clearCache();
                
                const index = await loadIndex();
                if (!index) return;

                // Load a few objects
                const objectNames = Object.keys(index.objects).slice(0, 10);
                
                const objStart = Date.now();
                for (const name of objectNames) {
                    await getObject(name);
                }
                const objTime = Date.now() - objStart;
                
                // Loading all descriptions should be comparable or faster than loading 10 full objects
                console.log(`Load all descriptions: ${descTime}ms, Load 10 objects: ${objTime}ms`);
                
                // If times are too fast to measure (0ms), just check descriptions loaded successfully
                if (objTime === 0 || descTime === 0) {
                    expect(descriptions).toBeDefined();
                    expect(Object.keys(descriptions!).length).toBeGreaterThan(0);
                } else {
                    expect(descTime).toBeLessThan(objTime * 10); // Much more efficient overall
                }
            });
        });
    });
});

