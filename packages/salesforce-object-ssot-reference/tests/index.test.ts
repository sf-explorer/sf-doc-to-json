import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
    loadIndex, 
    getObject, 
    searchObjects,
    getAllObjectNames,
    getObjectDescription,
    clearCache 
} from '../src/index.js';

describe('SSOT Package', () => {
    beforeEach(() => {
        clearCache();
    });

    describe('loadIndex', () => {
        it('should load the DMO index', async () => {
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
    });

    describe('getObject', () => {
        it('should get an SSOT object by name', async () => {
            const obj = await getObject('Account');
            if (obj) {
                expect(obj.name).toBe('Account');
                expect(obj.properties).toBeDefined();
                expect(typeof obj.description).toBe('string');
            }
        });

        it('should return null for non-existent object', async () => {
            const obj = await getObject('NonExistentObject123');
            expect(obj).toBeNull();
        });
    });

    describe('searchObjects', () => {
        it('should search objects by regex pattern', async () => {
            const results = await searchObjects(/account/i);
            expect(Array.isArray(results)).toBe(true);
            if (results.length > 0) {
                expect(results[0]).toHaveProperty('name');
                expect(results[0]).toHaveProperty('description');
                expect(results[0]).toHaveProperty('fieldCount');
            }
        });

        it('should search objects by string pattern', async () => {
            const results = await searchObjects('Account');
            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('getAllObjectNames', () => {
        it('should return all object names', async () => {
            const names = await getAllObjectNames();
            expect(Array.isArray(names)).toBe(true);
            expect(names.length).toBeGreaterThan(0);
            // The index keys are now API names like ssot__Account__dlm
            expect(names.some(name => name.includes('Account'))).toBe(true);
        });
    });

    describe('getObjectDescription', () => {
        it('should get object description without loading full object', async () => {
            const desc = await getObjectDescription('Account');
            if (desc) {
                expect(desc).toHaveProperty('description');
                expect(desc).toHaveProperty('fieldCount');
                expect(typeof desc.description).toBe('string');
                expect(typeof desc.fieldCount).toBe('number');
            }
        });
    });
});

