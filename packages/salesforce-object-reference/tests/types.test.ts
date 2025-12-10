import type {
    SalesforceObject,
    FieldProperty,
    DocumentIndex,
    ObjectIndexEntry,
    CloudData,
    SalesforceObjectCollection,
    CloudConfiguration
} from '../src/types.js';

describe('TypeScript Types', () => {
    describe('FieldProperty', () => {
        it('should accept valid field property', () => {
            const fieldProp: FieldProperty = {
                type: 'String',
                description: 'A test field'
            };
            
            expect(fieldProp.type).toBe('String');
            expect(fieldProp.description).toBe('A test field');
        });
    });

    describe('SalesforceObject', () => {
        it('should accept valid Salesforce object', () => {
            const obj: SalesforceObject = {
                name: 'TestObject',
                description: 'A test object',
                module: 'Core Salesforce',
                properties: {
                    'TestField': {
                        type: 'String',
                        description: 'A test field'
                    }
                }
            };
            
            expect(obj.name).toBe('TestObject');
            expect(obj.module).toBe('Core Salesforce');
            expect(Object.keys(obj.properties).length).toBe(1);
        });
    });

    describe('ObjectIndexEntry', () => {
        it('should accept valid index entry', () => {
            const entry: ObjectIndexEntry = {
                cloud: 'Core Salesforce',
                file: 'core-salesforce.json'
            };
            
            expect(entry.cloud).toBe('Core Salesforce');
            expect(entry.file).toBe('core-salesforce.json');
        });
    });

    describe('DocumentIndex', () => {
        it('should accept valid document index', () => {
            const index: DocumentIndex = {
                generated: '2025-11-07T12:00:00.000Z',
                version: '264.0',
                totalObjects: 100,
                totalClouds: 5,
                objects: {
                    'TestObject': {
                        cloud: 'Core Salesforce',
                        file: 'core-salesforce.json'
                    }
                }
            };
            
            expect(index.version).toBe('264.0');
            expect(index.totalObjects).toBe(100);
            expect(index.totalClouds).toBe(5);
        });
    });

    describe('CloudConfiguration', () => {
        it('should accept valid cloud configuration', () => {
            const config: CloudConfiguration = {
                label: 'Financial Services Cloud'
            };
            
            expect(config.label).toBe('Financial Services Cloud');
        });
    });

    describe('SalesforceObjectCollection', () => {
        it('should accept valid object collection', () => {
            const collection: SalesforceObjectCollection = {
                'Object1': {
                    name: 'Object1',
                    description: 'First object',
                    module: 'Core Salesforce',
                    properties: {}
                },
                'Object2': {
                    name: 'Object2',
                    description: 'Second object',
                    module: 'Core Salesforce',
                    properties: {}
                }
            };
            
            expect(Object.keys(collection).length).toBe(2);
            expect(collection['Object1'].name).toBe('Object1');
        });
    });

    describe('CloudData', () => {
        it('should accept valid cloud data', () => {
            const cloudData: CloudData = {
                'core-salesforce': {
                    'Account': {
                        name: 'Account',
                        description: 'Account object',
                        module: 'Core Salesforce',
                        properties: {}
                    }
                },
                'financial-services-cloud': {
                    'FinancialAccount': {
                        name: 'FinancialAccount',
                        description: 'Financial Account object',
                        module: 'Financial Services Cloud',
                        properties: {}
                    }
                }
            };
            
            expect(Object.keys(cloudData).length).toBe(2);
            expect(cloudData['core-salesforce']['Account'].name).toBe('Account');
        });
    });
});

