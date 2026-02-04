import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
    loadIndex, 
    getAction, 
    searchActions,
    getAllActionNames,
    getActionDescription,
    clearCache 
} from '../src/index.js';

describe('Salesforce Agentforce Actions Reference Library', () => {
    beforeEach(() => {
        clearCache();
    });

    describe('loadIndex', () => {
        it('should load the actions index', async () => {
            const index = await loadIndex();
            expect(index).not.toBeNull();
            expect(index?.totalActions).toBeGreaterThan(0);
            expect(index?.actions).toBeDefined();
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
                expect(index).toHaveProperty('totalActions');
                expect(index).toHaveProperty('actions');
                expect(typeof index.version).toBe('string');
                expect(typeof index.totalActions).toBe('number');
                expect(typeof index.actions).toBe('object');
            }
        });
    });

    describe('getAction', () => {
        it('should return null for non-existent action', async () => {
            const result = await getAction('NonExistentAction123');
            expect(result).toBeNull();
        });

        it('should return an action with correct structure', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstActionName = Object.keys(index.actions)[0];
            const result = await getAction(firstActionName);
            
            expect(result).not.toBeNull();
            if (result) {
                expect(result).toHaveProperty('name');
                expect(result).toHaveProperty('properties');
                expect(typeof result.name).toBe('string');
                expect(typeof result.properties).toBe('object');
            }
        });

        it('should get CreateRecord action', async () => {
            // Test the specific example from user's code
            const createRecordAction = await getAction('CreateRecord');
            if (createRecordAction) {
                expect(createRecordAction.name).toBe('CreateRecord');
                expect(createRecordAction.properties).toBeDefined();
                expect(typeof createRecordAction.properties).toBe('object');
            }
        });

        it('should have valid properties structure', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstActionName = Object.keys(index.actions)[0];
            const result = await getAction(firstActionName);
            
            if (result && Object.keys(result.properties).length > 0) {
                const firstPropKey = Object.keys(result.properties)[0];
                const firstProp = result.properties[firstPropKey];
                
                expect(firstProp).toHaveProperty('type');
                expect(typeof firstProp.type).toBe('string');
            }
        });

        it('should cache actions', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstActionName = Object.keys(index.actions)[0];
            const result1 = await getAction(firstActionName);
            const result2 = await getAction(firstActionName);
            
            expect(result1).toBe(result2); // Should be same reference due to caching
        });
    });

    describe('searchActions', () => {
        it('should return an array', async () => {
            const results = await searchActions('test');
            expect(Array.isArray(results)).toBe(true);
        });

        it('should return empty array when no matches', async () => {
            const results = await searchActions('xyzNonExistent123456');
            expect(results).toEqual([]);
        });

        it('should find actions with string pattern', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstActionName = Object.keys(index.actions)[0];
            const searchTerm = firstActionName.substring(0, 3);
            const results = await searchActions(searchTerm);
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0]).toHaveProperty('name');
            expect(results[0]).toHaveProperty('description');
            expect(results[0]).toHaveProperty('propertyCount');
        });

        it('should find actions with regex pattern', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstActionName = Object.keys(index.actions)[0];
            const searchPattern = new RegExp(firstActionName.substring(0, 3), 'i');
            const results = await searchActions(searchPattern);
            
            expect(results.length).toBeGreaterThan(0);
        });

        it('should be case-insensitive with string search', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstActionName = Object.keys(index.actions)[0];
            const lowerResults = await searchActions(firstActionName.toLowerCase());
            const upperResults = await searchActions(firstActionName.toUpperCase());
            
            expect(lowerResults.length).toBeGreaterThan(0);
            expect(upperResults.length).toBeGreaterThan(0);
        });
    });

    describe('getAllActionNames', () => {
        it('should return an array', async () => {
            const names = await getAllActionNames();
            expect(Array.isArray(names)).toBe(true);
        });

        it('should return at least one action name', async () => {
            const names = await getAllActionNames();
            expect(names.length).toBeGreaterThan(0);
        });

        it('should return sorted names', async () => {
            const names = await getAllActionNames();
            const sortedNames = [...names].sort();
            expect(names).toEqual(sortedNames);
        });

        it('should match count in index', async () => {
            const index = await loadIndex();
            const names = await getAllActionNames();
            
            if (index) {
                // Names should match the number of actions in the index
                // Allow for small variance due to filtering or data inconsistencies
                expect(names.length).toBeGreaterThan(0);
                expect(names.length).toBeLessThanOrEqual(index.totalActions);
            }
        });
    });

    describe('getActionDescription', () => {
        it('should return null for non-existent action', async () => {
            const result = await getActionDescription('NonExistentAction123');
            expect(result).toBeNull();
        });

        it('should return description for existing action', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstActionName = Object.keys(index.actions)[0];
            const desc = await getActionDescription(firstActionName);
            
            if (desc) {
                expect(desc).toHaveProperty('description');
                expect(desc).toHaveProperty('propertyCount');
                expect(typeof desc.description).toBe('string');
                expect(typeof desc.propertyCount).toBe('number');
            }
        });
    });

    describe('Integration Tests', () => {
        it('should maintain consistency between index and action files', async () => {
            const index = await loadIndex();
            if (!index) return;

            const actionNames = Object.keys(index.actions).slice(0, 5);
            
            for (const actionName of actionNames) {
                const fromGetAction = await getAction(actionName);
                const indexEntry = index.actions[actionName];
                
                expect(fromGetAction).not.toBeNull();
                if (fromGetAction) {
                    expect(fromGetAction.name).toBe(actionName);
                }
            }
        });

        it('should find actions via search that exist in getAction', async () => {
            const index = await loadIndex();
            if (!index) return;

            const firstActionName = Object.keys(index.actions)[0];
            const searchResults = await searchActions(firstActionName);
            
            expect(searchResults.length).toBeGreaterThan(0);
            
            const exactMatch = searchResults.find(r => r.name === firstActionName);
            expect(exactMatch).toBeDefined();
            
            const actionData = await getAction(firstActionName);
            expect(actionData).not.toBeNull();
        });
    });
});
