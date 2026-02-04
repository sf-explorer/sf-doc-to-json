import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
    loadIndex, 
    getObject, 
    searchObjects,
    getAllObjectNames,
    getObjectDescription,
    clearCache 
} from '../src/index.js';

describe('SSOT Package (Data Model Objects - DMOs)', () => {
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

        it('should have DMO API names as keys (ssot__*__dlm format)', async () => {
            const index = await loadIndex();
            if (!index) return;
            
            const keys = Object.keys(index.objects);
            expect(keys.length).toBeGreaterThan(0);
            // All keys should be in ssot__*__dlm format
            expect(keys.every(key => key.startsWith('ssot__') && key.endsWith('__dlm'))).toBe(true);
        });
    });

    describe('getObject', () => {
        it('should get a DMO by API name (ssot__Individual__dlm)', async () => {
            // Use the proper SSOT API name format
            const individual = await getObject('ssot__Individual__dlm');
            if (individual) {
                expect(individual.name).toBe('Individual');
                expect(individual.properties).toBeDefined();
                expect(typeof individual.description).toBe('string');
            }
        });

        it('should get a DMO by display name (Individual)', async () => {
            // Can also lookup by display name
            const individual = await getObject('Individual');
            if (individual) {
                expect(individual.name).toBe('Individual');
                expect(individual.properties).toBeDefined();
            }
        });

        it('should return null for non-existent object', async () => {
            const obj = await getObject('NonExistentObject123');
            expect(obj).toBeNull();
        });

        it('should return null for standard SF objects (not DMOs)', async () => {
            // Standard Salesforce objects like "Contact" don't exist in SSOT
            // (SSOT has "Individual" DMO instead)
            const contact = await getObject('Contact');
            expect(contact).toBeNull();
        });
    });

    describe('searchObjects', () => {
        it('should search DMOs by API name pattern', async () => {
            const results = await searchObjects(/ssot__.*Individual/i);
            expect(Array.isArray(results)).toBe(true);
            if (results.length > 0) {
                expect(results[0]).toHaveProperty('name');
                expect(results[0]).toHaveProperty('description');
                expect(results[0]).toHaveProperty('fieldCount');
            }
        });

        it('should search DMOs by string pattern', async () => {
            const results = await searchObjects('Loyalty');
            expect(Array.isArray(results)).toBe(true);
            // SSOT has many Loyalty-related DMOs
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('getAllObjectNames', () => {
        it('should return all DMO API names', async () => {
            const names = await getAllObjectNames();
            expect(Array.isArray(names)).toBe(true);
            expect(names.length).toBeGreaterThan(0);
            // API names should be in ssot__*__dlm format
            expect(names.some(name => name === 'ssot__Individual__dlm')).toBe(true);
        });
    });

    describe('getObjectDescription', () => {
        it('should get DMO description by API name', async () => {
            const desc = await getObjectDescription('ssot__Individual__dlm');
            if (desc) {
                expect(desc).toHaveProperty('description');
                expect(desc).toHaveProperty('fieldCount');
                expect(typeof desc.description).toBe('string');
                expect(typeof desc.fieldCount).toBe('number');
                expect(desc.description).toContain('Individual');
            }
        });

        it('should get DMO description by display name', async () => {
            const desc = await getObjectDescription('Individual');
            if (desc) {
                expect(desc.description).toContain('Individual');
            }
        });
    });
});

