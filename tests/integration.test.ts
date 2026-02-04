import { describe, it, expect } from '@jest/globals';

// Standard objects
import { getObject } from '@sf-explorer/salesforce-object-reference';

// Metadata objects
import { getObject as getMetadata } from '@sf-explorer/salesforce-metadata-reference';

// SSOT objects
import { getObject as getSSOT } from '@sf-explorer/salesforce-object-ssot-reference';

// Agentforce actions
import { getAction } from '@sf-explorer/salesforce-agentforce-actions-reference';

describe('Integration Tests - All Package Imports', () => {
    describe('Standard Objects - salesforce-object-reference', () => {
        it('should import and use getObject from salesforce-object-reference', async () => {
            const account = await getObject('Account');
            if (account) {
                expect(account.name).toBe('Account');
                expect(account.properties).toBeDefined();
                expect(typeof account.description).toBe('string');
                expect(typeof account.module).toBe('string');
            }
        });

        it('should return null for non-existent object', async () => {
            const result = await getObject('NonExistentObject12345');
            expect(result).toBeNull();
        });
    });

    describe('Metadata Objects - salesforce-metadata-reference', () => {
        it('should import and use getObject as getMetadata from salesforce-metadata-reference', async () => {
            const customObject = await getMetadata('CustomObject');
            if (customObject) {
                expect(customObject.name).toBe('CustomObject');
                expect(customObject.properties).toBeDefined();
                expect(typeof customObject.properties).toBe('object');
            }
        });

        it('should return null for non-existent metadata object', async () => {
            const result = await getMetadata('NonExistentMetadataObject123');
            expect(result).toBeNull();
        });
    });

    describe('SSOT Objects (DMOs) - salesforce-object-ssot-reference', () => {
        it('should import and use getObject as getSSOT from salesforce-object-ssot-reference', async () => {
            // SSOT objects are Data Model Objects (DMOs) for Data Cloud
            // Use the API name format: ssot__ObjectName__dlm
            const individual = await getSSOT('ssot__Individual__dlm');
            if (individual) {
                expect(individual.name).toBe('Individual');
                expect(individual.properties).toBeDefined();
                expect(typeof individual.description).toBe('string');
            }
        });

        it('should also work with display name', async () => {
            // Can also lookup by display name (e.g., "Individual" instead of "ssot__Individual__dlm")
            const individual = await getSSOT('Individual');
            if (individual) {
                expect(individual.name).toBe('Individual');
            }
        });

        it('should return null for non-existent SSOT object', async () => {
            const result = await getSSOT('NonExistentSSOTObject123');
            expect(result).toBeNull();
        });
    });

    describe('Agentforce Actions - salesforce-agentforce-actions-reference', () => {
        it('should import and use getAction from salesforce-agentforce-actions-reference', async () => {
            const createRecordAction = await getAction('CreateRecord');
            if (createRecordAction) {
                expect(createRecordAction.name).toBe('CreateRecord');
                expect(createRecordAction.properties).toBeDefined();
                expect(typeof createRecordAction.properties).toBe('object');
            }
        });

        it('should return null for non-existent action', async () => {
            const result = await getAction('NonExistentAction123');
            expect(result).toBeNull();
        });
    });

    describe('Cross-Package Consistency', () => {
        it('should be able to use all packages in the same test', async () => {
            // Test that all imports work together
            const account = await getObject('Account');           // Standard SF object
            const customObject = await getMetadata('CustomObject'); // Metadata API object
            const individual = await getSSOT('Individual');        // SSOT DMO object
            const createRecordAction = await getAction('CreateRecord');

            // At least one should return data (depending on what's available)
            const hasData = account || customObject || individual || createRecordAction;
            expect(hasData).toBeTruthy();
        });

        it('should handle different object types correctly', async () => {
            // Standard Salesforce object (CRM Account)
            const standardAccount = await getObject('Account');
            
            // SSOT DMO object (Data Cloud Individual - NOT the same as CRM Contact!)
            const ssotIndividual = await getSSOT('Individual');
            
            if (standardAccount) {
                expect(standardAccount.name).toBe('Account');
                // Standard objects have 'module' property for cloud categorization
                expect(standardAccount).toHaveProperty('module');
            }
            if (ssotIndividual) {
                expect(ssotIndividual.name).toBe('Individual');
                // DMO descriptions mention "DMO"
                expect(ssotIndividual.description).toContain('DMO');
            }
        });
    });
});
