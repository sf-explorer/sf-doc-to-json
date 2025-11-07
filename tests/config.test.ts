import { CONFIGURATION, CHUNK_SIZE } from '../src/config.js';

describe('Configuration', () => {
    describe('CONFIGURATION', () => {
        it('should have documentation configurations', () => {
            expect(Object.keys(CONFIGURATION).length).toBeGreaterThan(0);
        });

        it('should have valid structure', () => {
            Object.entries(CONFIGURATION).forEach(([key, value]) => {
                expect(key).toMatch(/^atlas\.en-us\./);
                expect(value).toHaveProperty('label');
                expect(typeof value.label).toBe('string');
                expect(value.label.length).toBeGreaterThan(0);
            });
        });

        it('should have Financial Services Cloud configuration', () => {
            const fscKey = 'atlas.en-us.financial_services_cloud_object_reference.meta';
            expect(fscKey in CONFIGURATION).toBe(true);
            expect(CONFIGURATION[fscKey].label).toBe('Financial Services Cloud');
        });

        it('should have Core Salesforce configuration', () => {
            const coreKey = 'atlas.en-us.object_reference.meta';
            expect(coreKey in CONFIGURATION).toBe(true);
            expect(CONFIGURATION[coreKey].label).toBe('Core Salesforce');
        });

        it('should have Health Cloud configuration', () => {
            const healthKey = 'atlas.en-us.health_cloud_object_reference.meta';
            expect(healthKey in CONFIGURATION).toBe(true);
            expect(CONFIGURATION[healthKey].label).toBe('Health Cloud');
        });

        it('should have unique labels', () => {
            const labels = Object.values(CONFIGURATION).map(config => config.label);
            const uniqueLabels = new Set(labels);
            expect(labels.length).toBe(uniqueLabels.size);
        });
    });

    describe('CHUNK_SIZE', () => {
        it('should be defined', () => {
            expect(CHUNK_SIZE).toBeDefined();
        });

        it('should be a positive number', () => {
            expect(typeof CHUNK_SIZE).toBe('number');
            expect(CHUNK_SIZE).toBeGreaterThan(0);
        });

        it('should be 50', () => {
            expect(CHUNK_SIZE).toBe(50);
        });
    });
});

